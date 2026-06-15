import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { OllamaEmbeddings } from '@langchain/ollama';
import { Document } from '@langchain/core/documents';
import { RedisService } from '../cache/redis.service';
import { randomUUID } from 'crypto';

const VECTOR_SIZE = 1024; // bge-m3 output dimension
const QDRANT_BATCH = 32;  // points per Qdrant upsert call
const OLLAMA_BATCH = 4;   // texts per Ollama embed call (prevents ECONNRESET)
const MAX_RETRIES = 3;

@Injectable()
export class VectorService {
  private readonly logger = new Logger(VectorService.name);
  private client: QdrantClient;
  private embeddings: OllamaEmbeddings;
  private collectionName: string;

  constructor(config: ConfigService, private redis: RedisService) {
    const qdrantUrl = config.get<string>('qdrant.url') ?? 'http://localhost:6333';
    const collection = config.get<string>('qdrant.collection') ?? 'rag-production';
    const ollamaUrl = config.get<string>('ollama.baseUrl') ?? 'http://127.0.0.1:7998';
    const embedModel = config.get<string>('ollama.embedModel') ?? 'bge-m3';

    this.logger.log(`Connecting to Qdrant: ${qdrantUrl}, collection: ${collection}`);

    this.client = new QdrantClient({ url: qdrantUrl });
    this.collectionName = collection;
    this.embeddings = new OllamaEmbeddings({ baseUrl: ollamaUrl, model: embedModel });

    this.logger.log(`VectorService initialized, client type: ${typeof this.client}`);
  }

  private async ensureCollection(): Promise<void> {
    try {
      await this.client.getCollection(this.collectionName);
    } catch {
      await this.client.createCollection(this.collectionName, {
        vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        optimizers_config: { indexing_threshold: 0 },
      });
      this.logger.log(`Created collection "${this.collectionName}"`);
    }
  }

  /** Returns current number of indexed points (0 if collection doesn't exist) */
  async countPoints(): Promise<number> {
    try {
      const info = await this.client.getCollection(this.collectionName);
      return info.points_count ?? 0;
    } catch {
      return 0;
    }
  }

  /** Embed a single text with Redis cache + retry */
  async embed(text: string): Promise<number[]> {
    const cached = await this.redis.getEmbedding(text);
    if (cached) return cached;

    const [vector] = await this.callOllamaWithRetry([text]);
    await this.redis.setEmbedding(text, vector);
    return vector;
  }

  /**
   * Embed a batch of texts using small Ollama sub-batches (OLLAMA_BATCH=4)
   * to prevent ECONNRESET on long requests. Cache-aware, with retry per sub-batch.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = new Array(texts.length);
    const uncachedIdx: number[] = [];
    const uncachedTexts: string[] = [];

    for (let i = 0; i < texts.length; i++) {
      const cached = await this.redis.getEmbedding(texts[i]);
      if (cached) {
        results[i] = cached;
      } else {
        uncachedIdx.push(i);
        uncachedTexts.push(texts[i]);
      }
    }

    // Send uncached texts to Ollama in small sub-batches with retry
    for (let s = 0; s < uncachedTexts.length; s += OLLAMA_BATCH) {
      const sub = uncachedTexts.slice(s, s + OLLAMA_BATCH);
      const vectors = await this.callOllamaWithRetry(sub);
      for (let j = 0; j < sub.length; j++) {
        const globalIdx = uncachedIdx[s + j];
        results[globalIdx] = vectors[j];
        await this.redis.setEmbedding(sub[j], vectors[j]);
      }
    }

    return results;
  }

  /** Call Ollama embedDocuments with exponential backoff retry on connection errors */
  private async callOllamaWithRetry(texts: string[]): Promise<number[][]> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.embeddings.embedDocuments(texts);
      } catch (err: any) {
        lastError = err;
        const isRetryable = err?.cause?.code === 'ECONNRESET' || err?.cause?.code === 'ECONNREFUSED' || err?.code === 'ECONNRESET';
        if (!isRetryable || attempt === MAX_RETRIES) throw err;
        const delay = attempt * 2000;
        this.logger.warn(`Ollama ${err?.cause?.code ?? err?.code} — retry ${attempt}/${MAX_RETRIES} in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw lastError;
  }

  async upsertDocuments(docs: Document[]): Promise<void> {
    await this.ensureCollection();
    let upserted = 0;

    for (let i = 0; i < docs.length; i += QDRANT_BATCH) {
      const batch = docs.slice(i, i + QDRANT_BATCH);
      const texts = batch.map((d) => d.pageContent);

      // True batch: ONE request to Ollama per 32 texts
      const vectors = await this.embedBatch(texts);

      const points = batch.map((doc, idx) => ({
        id: randomUUID(),
        vector: vectors[idx],
        payload: {
          content: doc.pageContent,
          metadata: doc.metadata ?? {},
        },
      }));

      await this.client.upsert(this.collectionName, { wait: true, points });
      upserted += batch.length;
      if (docs.length > QDRANT_BATCH) {
        this.logger.log(`Upserted ${upserted}/${docs.length} chunks`);
      }
    }
  }

  async search(
    query: string,
    limit = 8,
    scoreThreshold = 0.5,
  ): Promise<{ content: string; score: number; metadata: any }[]> {
    const vector = await this.embed(query);
    const results = await this.client.search(this.collectionName, {
      vector,
      limit,
      with_payload: true,
      score_threshold: scoreThreshold,
    });

    return results.map((r) => ({
      content: (r.payload?.['content'] as string) ?? '',
      score: r.score,
      metadata: r.payload?.['metadata'] ?? {},
    }));
  }

  async recreateCollection(): Promise<void> {
    try {
      await this.client.deleteCollection(this.collectionName);
      this.logger.log(`Deleted old collection "${this.collectionName}"`);
    } catch {
      // collection didn't exist yet
    }
    await this.ensureCollection();
  }
}

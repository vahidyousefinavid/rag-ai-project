import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { OllamaEmbeddings } from '@langchain/ollama';
import { Document } from '@langchain/core/documents';
import { RedisService } from '../cache/redis.service';
import { randomUUID } from 'crypto';

const VECTOR_SIZE = 1024; // bge-m3 output dimension

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
    if (!this.client) {
      throw new Error('QdrantClient is not initialized — check Qdrant URL in .env');
    }
    try {
      await this.client.getCollection(this.collectionName);
      this.logger.log(`Collection "${this.collectionName}" exists`);
    } catch {
      await this.client.createCollection(this.collectionName, {
        vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        optimizers_config: { indexing_threshold: 0 },
      });
      this.logger.log(`Created collection "${this.collectionName}"`);
    }
  }

  async embed(text: string): Promise<number[]> {
    const cached = await this.redis.getEmbedding(text);
    if (cached) return cached;

    const [vector] = await this.embeddings.embedDocuments([text]);
    await this.redis.setEmbedding(text, vector);
    return vector;
  }

  async upsertDocuments(docs: Document[]): Promise<void> {
    const BATCH = 32;
    let upserted = 0;

    for (let i = 0; i < docs.length; i += BATCH) {
      const batch = docs.slice(i, i + BATCH);
      const vectors = await Promise.all(batch.map((d) => this.embed(d.pageContent)));

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
      this.logger.log(`Upserted ${upserted}/${docs.length} chunks`);
    }
  }

  async search(query: string, limit = 5): Promise<{ content: string; score: number; metadata: any }[]> {
    const vector = await this.embed(query);
    const results = await this.client.search(this.collectionName, {
      vector,
      limit,
      with_payload: true,
    });

    return results.map((r) => ({
      content: (r.payload?.['content'] as string) ?? '',
      score: r.score,
      metadata: r.payload?.['metadata'] ?? {},
    }));
  }

  async recreateCollection(): Promise<void> {
    if (!this.client) {
      throw new Error('QdrantClient is not initialized — check Qdrant URL in .env');
    }
    try {
      await this.client.deleteCollection(this.collectionName);
      this.logger.log(`Deleted old collection "${this.collectionName}"`);
    } catch {
      // collection didn't exist yet
    }
    await this.ensureCollection();
  }
}

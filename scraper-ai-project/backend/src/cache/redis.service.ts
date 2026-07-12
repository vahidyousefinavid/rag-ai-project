import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createHash } from 'crypto';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  private readonly EMBED_TTL = 86400;  // 24h — embeddings rarely change
  private readonly RAG_TTL = 300;      // 5min — same query = same answer

  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.config.get<string>('redis.host'),
      port: this.config.get<number>('redis.port'),
      lazyConnect: true,
    });
    this.client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
    this.client.on('connect', () => this.logger.log('Redis connected'));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  private hash(text: string): string {
    return createHash('sha256').update(text).digest('hex').slice(0, 32);
  }

  async getEmbedding(text: string): Promise<number[] | null> {
    try {
      const val = await this.client.get(`emb:v1:${this.hash(text)}`);
      return val ? (JSON.parse(val) as number[]) : null;
    } catch {
      return null;
    }
  }

  async setEmbedding(text: string, embedding: number[]): Promise<void> {
    try {
      await this.client.setex(`emb:v1:${this.hash(text)}`, this.EMBED_TTL, JSON.stringify(embedding));
    } catch (err: any) {
      this.logger.warn(`Failed to cache embedding: ${err.message}`);
    }
  }

  async getRagResult(question: string): Promise<{ answer: string; sources: string[] } | null> {
    try {
      const val = await this.client.get(`rag:v1:${this.hash(question)}`);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  }

  async setRagResult(question: string, result: { answer: string; sources: string[] }): Promise<void> {
    try {
      await this.client.setex(`rag:v1:${this.hash(question)}`, this.RAG_TTL, JSON.stringify(result));
    } catch (err: any) {
      this.logger.warn(`Failed to cache RAG result: ${err.message}`);
    }
  }

  async getCheckpoint(key: string): Promise<number> {
    try {
      const val = await this.client.get(`ckpt:${key}`);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  }

  async setCheckpoint(key: string, offset: number): Promise<void> {
    try {
      await this.client.set(`ckpt:${key}`, String(offset));
    } catch { /* ignore */ }
  }

  async clearCheckpoint(key: string): Promise<void> {
    try {
      await this.client.del(`ckpt:${key}`);
    } catch { /* ignore */ }
  }
}

import {
  Injectable, Logger, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client as PgClient } from 'pg';
import { Document } from '@langchain/core/documents';
import { RagSource } from './entities/source.entity';
import { VectorService } from '../vector/vector.service';
import { splitter } from '../utils/splitter';

@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);

  constructor(
    @InjectRepository(RagSource) private repo: Repository<RagSource>,
    private vector: VectorService,
  ) {}

  /* ── CRUD ────────────────────────────────────────────────────── */

  list(): Promise<RagSource[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async create(dto: { name: string; sourceType: string; config: Record<string, any> }): Promise<RagSource> {
    const source = this.repo.create(dto as any);
    return (await this.repo.save(source)) as unknown as RagSource;
  }

  async remove(id: string): Promise<void> {
    const source = await this.repo.findOneBy({ id });
    if (!source) throw new NotFoundException('Source not found');
    await this.vector.deleteBySource(id);
    await this.repo.remove(source);
  }

  /* ── DB ingestion (runs in background) ──────────────────────── */

  async startIngest(id: string): Promise<{ message: string }> {
    const source = await this.repo.findOneBy({ id });
    if (!source) throw new NotFoundException('Source not found');
    if (source.status === 'indexing') return { message: 'Already indexing' };

    await this.repo.update(id, { status: 'indexing', lastError: null });
    this.runDbIngest(source).catch(() => { /* logged inside */ });
    return { message: 'Ingestion started' };
  }

  private async runDbIngest(source: RagSource): Promise<void> {
    try {
      const rows = await this.fetchRows(source);
      const docs = rows.map(row =>
        new Document({
          pageContent: typeof row === 'object'
            ? Object.entries(row).map(([k, v]) => `${k}: ${v}`).join('\n')
            : String(row),
          metadata: { sourceId: source.id, sourceName: source.name },
        }),
      );
      await this.vector.deleteBySource(source.id);
      const chunks = await splitter.splitDocuments(docs);
      await this.vector.upsertDocuments(chunks);
      await this.repo.update(source.id, { status: 'ready', docCount: chunks.length });
      this.logger.log(`[${source.name}] ✅ ${chunks.length} chunks indexed`);
    } catch (err: any) {
      this.logger.error(`[${source.name}] ❌ ${err.message}`);
      await this.repo.update(source.id, { status: 'error', lastError: err.message });
    }
  }

  private async fetchRows(source: RagSource): Promise<Record<string, any>[]> {
    const { config } = source;
    const query: string = config.query || 'SELECT 1';

    if (source.sourceType === 'postgres') {
      const client = new PgClient({
        host: config.host, port: Number(config.port ?? 5432),
        user: config.user, password: config.password,
        database: config.database,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 8000,
      });
      await client.connect();
      try {
        const res = await client.query(query);
        return res.rows;
      } finally {
        await client.end();
      }
    }

    if (source.sourceType === 'mysql') {
      // dynamic import – install mysql2 if needed
      const mysql = await import('mysql2/promise').catch(() => {
        throw new Error('mysql2 package not installed. Run: npm install mysql2');
      });
      const conn = await mysql.createConnection({
        host: config.host, port: Number(config.port ?? 3306),
        user: config.user, password: config.password,
        database: config.database, connectTimeout: 8000,
      });
      try {
        const [rows] = await conn.execute(query);
        return rows as Record<string, any>[];
      } finally {
        await conn.end();
      }
    }

    if (source.sourceType === 'mongodb') {
      const { MongoClient } = await import('mongodb').catch(() => {
        throw new Error('mongodb package not installed. Run: npm install mongodb');
      });
      const client = new MongoClient(config.uri, { serverSelectionTimeoutMS: 8000 });
      await client.connect();
      try {
        const db = client.db(config.database);
        const col = db.collection(config.collection || 'data');
        const limit = Number(config.limit ?? 2000);
        return await col.find({}).limit(limit).toArray();
      } finally {
        await client.close();
      }
    }

    throw new BadRequestException(`Unknown source type: ${source.sourceType}`);
  }

  /* ── File ingestion ──────────────────────────────────────────── */

  async ingestFile(
    buffer: Buffer,
    mimetype: string,
    originalname: string,
    name: string,
  ): Promise<RagSource> {
    const source = await this.create({ name, sourceType: 'file', config: { filename: originalname } });
    await this.repo.update(source.id, { status: 'indexing' });

    this.runFileIngest(source, buffer, mimetype, originalname).catch(() => { /* logged inside */ });

    return (await this.repo.findOneBy({ id: source.id }))!;
  }

  private async runFileIngest(
    source: RagSource,
    buffer: Buffer,
    mimetype: string,
    originalname: string,
  ): Promise<void> {
    try {
      const text = await this.parseFile(buffer, mimetype, originalname);
      const docs = [new Document({
        pageContent: text,
        metadata: { sourceId: source.id, sourceName: source.name, filename: originalname },
      })];
      await this.vector.deleteBySource(source.id);
      const chunks = await splitter.splitDocuments(docs);
      await this.vector.upsertDocuments(chunks);
      await this.repo.update(source.id, { status: 'ready', docCount: chunks.length });
      this.logger.log(`[${source.name}] ✅ file – ${chunks.length} chunks`);
    } catch (err: any) {
      this.logger.error(`[${source.name}] ❌ ${err.message}`);
      await this.repo.update(source.id, { status: 'error', lastError: err.message });
    }
  }

  private async parseFile(buffer: Buffer, mimetype: string, name: string): Promise<string> {
    const lower = name.toLowerCase();

    if (lower.endsWith('.pdf') || mimetype === 'application/pdf') {
      const pdfParse = await import('pdf-parse').catch(() => {
        throw new Error('pdf-parse not installed. Run: npm install pdf-parse');
      });
      const result = await pdfParse.default(buffer);
      return result.text;
    }

    if (lower.endsWith('.json') || mimetype === 'application/json') {
      const parsed = JSON.parse(buffer.toString('utf-8'));
      if (Array.isArray(parsed)) {
        return parsed.map(r =>
          typeof r === 'object' ? Object.entries(r).map(([k, v]) => `${k}: ${v}`).join('\n') : String(r),
        ).join('\n---\n');
      }
      return JSON.stringify(parsed, null, 2);
    }

    // TXT, CSV, and everything else as plain text
    return buffer.toString('utf-8');
  }

  /* ── Connection test ─────────────────────────────────────────── */

  async testConnection(sourceType: string, config: Record<string, any>): Promise<{ ok: boolean; error?: string }> {
    try {
      if (sourceType === 'postgres') {
        const client = new PgClient({
          host: config.host, port: Number(config.port ?? 5432),
          user: config.user, password: config.password, database: config.database,
          ssl: config.ssl ? { rejectUnauthorized: false } : false,
          connectionTimeoutMillis: 5000,
        });
        await client.connect();
        await client.query('SELECT 1');
        await client.end();
      } else if (sourceType === 'mysql') {
        const mysql = await import('mysql2/promise');
        const conn = await mysql.createConnection({
          host: config.host, port: Number(config.port ?? 3306),
          user: config.user, password: config.password,
          database: config.database, connectTimeout: 5000,
        });
        await conn.execute('SELECT 1');
        await conn.end();
      } else if (sourceType === 'mongodb') {
        const { MongoClient } = await import('mongodb');
        const client = new MongoClient(config.uri, { serverSelectionTimeoutMS: 5000 });
        await client.connect();
        await client.db('admin').command({ ping: 1 });
        await client.close();
      } else {
        throw new Error('Unknown source type');
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }
}

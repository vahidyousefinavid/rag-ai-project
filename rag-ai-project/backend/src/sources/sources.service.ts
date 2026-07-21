import {
  Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client as PgClient } from 'pg';
import { Document } from '@langchain/core/documents';
import * as fs from 'fs';
import * as path from 'path';
import { RagSource } from './entities/source.entity';
import { SourceProfile } from './entities/source-profile.entity';
import { VectorService } from '../vector/vector.service';
import { DataProfilerService } from './data-profiler.service';
import { RedisService } from '../cache/redis.service';
import { splitter } from '../utils/splitter';
import { sampleKeys, detectIdKey, detectDateKey, formatValue } from './record-heuristics';

const UPSERT_BATCH = 32;

@Injectable()
export class SourcesService implements OnModuleInit {
  private readonly logger = new Logger(SourcesService.name);
  private readonly uploadsDir = path.resolve(process.cwd(), 'uploads');
  /** Sources actively being ingested in *this* process — the real "is it running" signal, since DB status alone can't tell if a process died mid-run. */
  private readonly activeIngestions = new Set<string>();

  constructor(
    @InjectRepository(RagSource) private repo: Repository<RagSource>,
    private vector: VectorService,
    private profiler: DataProfilerService,
    private redis: RedisService,
  ) {}

  /** Any source left in "indexing" from a previous process (crash/manual stop) gets resumed automatically from its last checkpoint. */
  async onModuleInit(): Promise<void> {
    const stuck = await this.repo.find({ where: { status: 'indexing' } });
    for (const source of stuck) {
      this.logger.log(`[${source.name}] was left "indexing" — resuming from checkpoint...`);
      this.runIngest(source).catch(() => { /* logged inside */ });
    }
  }

  /* ── CRUD ────────────────────────────────────────────────────── */

  list(): Promise<RagSource[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  getProfile(id: string): Promise<SourceProfile | null> {
    return this.profiler.getProfile(id);
  }

  async create(dto: { name: string; sourceType: string; config: Record<string, any> }): Promise<RagSource> {
    const source = this.repo.create(dto as any);
    return (await this.repo.save(source)) as unknown as RagSource;
  }

  async remove(id: string): Promise<void> {
    const source = await this.repo.findOneBy({ id });
    if (!source) throw new NotFoundException('Source not found');
    await this.vector.deleteBySource(id);
    await this.redis.clearCheckpoint(this.checkpointKey(id));
    if (source.sourceType === 'file' && source.config.storedFile) {
      await fs.promises.rm(path.join(this.uploadsDir, source.config.storedFile), { force: true });
    }
    await this.repo.remove(source);
  }

  /* ── Ingestion (checkpointed, resumable, runs in background) ──── */

  private checkpointKey(sourceId: string): string {
    return `source_ingest:${sourceId}`;
  }

  /** Starts (or, if a checkpoint exists, continues) ingestion. Used both for the DB "sync" button and the file "continue" button. */
  async startIngest(id: string): Promise<{ message: string }> {
    const source = await this.repo.findOneBy({ id });
    if (!source) throw new NotFoundException('Source not found');
    if (this.activeIngestions.has(id)) return { message: 'Already indexing' };

    await this.repo.update(id, { status: 'indexing', lastError: null });
    const updated = (await this.repo.findOneBy({ id }))!;
    this.runIngest(updated).catch(() => { /* logged inside */ });
    return { message: 'Ingestion started' };
  }

  private async runIngest(source: RagSource): Promise<void> {
    if (this.activeIngestions.has(source.id)) return;
    this.activeIngestions.add(source.id);
    const ckptKey = this.checkpointKey(source.id);

    try {
      const checkpoint = await this.redis.getCheckpoint(ckptKey);
      const resuming = checkpoint > 0;
      this.logger.log(`[${source.name}] ${resuming ? `resuming from chunk ${checkpoint}` : 'starting ingestion'}...`);

      const docs = await this.buildDocsForSource(source);
      const chunks = await splitter.splitDocuments(docs);

      // A fresh run replaces whatever was indexed before; a resume must NOT wipe the
      // chunks already upserted in the interrupted run.
      if (!resuming) {
        await this.vector.deleteBySource(source.id);
      }

      await this.repo.update(source.id, { totalChunks: chunks.length, docCount: checkpoint });

      for (let i = checkpoint; i < chunks.length; i += UPSERT_BATCH) {
        const batch = chunks.slice(i, i + UPSERT_BATCH);
        await this.vector.upsertDocuments(batch);
        const progress = i + batch.length;
        await this.redis.setCheckpoint(ckptKey, progress);
        await this.repo.update(source.id, { docCount: progress });
      }

      await this.redis.clearCheckpoint(ckptKey);
      await this.repo.update(source.id, { status: 'ready', docCount: chunks.length });
      this.logger.log(`[${source.name}] ✅ ${docs.length} documents → ${chunks.length} chunks indexed`);
    } catch (err: any) {
      this.logger.error(`[${source.name}] ❌ ${err.message}`);
      await this.repo.update(source.id, { status: 'error', lastError: err.message });
    } finally {
      this.activeIngestions.delete(source.id);
    }
  }

  /** Rebuilds the record set for a source: re-reads the stored upload for files, re-runs the query for DB sources. Deterministic, so it's safe to redo on every (re)start/resume. */
  private async buildDocsForSource(source: RagSource): Promise<Document[]> {
    if (source.sourceType === 'file') {
      const storedFile = source.config.storedFile;
      if (!storedFile) throw new Error('Stored file missing for this source — re-upload it');
      const buffer = await fs.promises.readFile(path.join(this.uploadsDir, storedFile));
      const mimetype: string = source.config.mimetype ?? '';
      const originalname: string = source.config.filename ?? '';
      const lower = originalname.toLowerCase();
      const isJson = lower.endsWith('.json') || mimetype === 'application/json';

      return isJson
        ? await this.buildJsonDocs(buffer, source)
        : [new Document({
            pageContent: await this.parseFile(buffer, mimetype, originalname),
            metadata: { sourceId: source.id, sourceName: source.name, filename: originalname },
          })];
    }

    const rows = await this.fetchRows(source);
    return this.buildRecordDocs(rows, source);
  }

  /**
   * Raw record array for a source (not grouped/chunked into Documents) — used by the
   * stats engine, which needs to aggregate over every record, not just the handful a
   * vector search would retrieve. Returns null for sources with no record structure
   * (e.g. a PDF/plain-text file).
   */
  async getRecordsForStats(sourceId: string): Promise<any[] | null> {
    const source = await this.repo.findOneBy({ id: sourceId });
    if (!source) return null;

    if (source.sourceType === 'file') {
      const storedFile = source.config.storedFile;
      if (!storedFile) return null;
      const mimetype: string = source.config.mimetype ?? '';
      const originalname: string = source.config.filename ?? '';
      const isJson = originalname.toLowerCase().endsWith('.json') || mimetype === 'application/json';
      if (!isJson) return null;
      const buffer = await fs.promises.readFile(path.join(this.uploadsDir, storedFile));
      return this.extractRecords(JSON.parse(buffer.toString('utf-8')));
    }

    return this.fetchRows(source);
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

  /** Files are saved to disk (not just held in memory) so ingestion can be rebuilt and resumed after a crash/restart. */
  async ingestFile(
    buffer: Buffer,
    mimetype: string,
    originalname: string,
    name: string,
  ): Promise<RagSource> {
    const source = await this.create({ name, sourceType: 'file', config: { filename: originalname, mimetype } });

    const storedFile = `${source.id}_${originalname}`;
    await fs.promises.mkdir(this.uploadsDir, { recursive: true });
    await fs.promises.writeFile(path.join(this.uploadsDir, storedFile), buffer);

    await this.repo.update(source.id, {
      status: 'indexing',
      config: { ...source.config, storedFile },
    } as any);

    const updated = (await this.repo.findOneBy({ id: source.id }))!;
    this.runIngest(updated).catch(() => { /* logged inside */ });

    return updated;
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

    // TXT, CSV, and everything else as plain text
    return buffer.toString('utf-8');
  }

  /* ── JSON structured ingestion ───────────────────────────────── */

  /**
   * Builds one Document per record instead of dumping the whole file as a
   * single blob for the char-splitter to chop arbitrarily.
   */
  private async buildJsonDocs(buffer: Buffer, source: RagSource): Promise<Document[]> {
    const parsed = JSON.parse(buffer.toString('utf-8'));
    const records = this.extractRecords(parsed);

    if (!records) {
      return [new Document({
        pageContent: JSON.stringify(parsed, null, 2),
        metadata: { sourceId: source.id, sourceName: source.name },
      })];
    }

    const docs = await this.buildRecordDocs(records, source);
    this.logger.log(`[${source.name}] JSON parsed: ${records.length} records → ${docs.length} documents`);
    return docs;
  }

  /**
   * Shared by DB rows and parsed JSON records: builds one Document per record,
   * or — if a previously-learned profile (or heuristic) finds a repeating
   * id-like field (e.g. status-history rows for the same ticket) — one
   * consolidated Document per entity with a timeline of what changed.
   * Also kicks off a background re-profile so the next ingestion of this
   * or a similar source benefits from what the local model learns here.
   */
  private async buildRecordDocs(records: any[], source: RagSource): Promise<Document[]> {
    if (records.length === 0) return [];

    const profile = await this.profiler.getProfile(source.id);
    const knownKeys = sampleKeys(records.slice(0, 50));
    const profileIdKey = profile?.status === 'ready' && profile.idKey && knownKeys.includes(profile.idKey)
      ? profile.idKey : null;
    const profileDateKey = profile?.status === 'ready' && profile.dateKey && knownKeys.includes(profile.dateKey)
      ? profile.dateKey : null;

    const idKey = profileIdKey ?? detectIdKey(records);
    const docs = idKey
      ? this.buildGroupedDocs(records, idKey, source, profileDateKey)
      : records.map((r, i) => new Document({
          pageContent: r && typeof r === 'object' ? this.recordToText(r) : String(r),
          metadata: { sourceId: source.id, sourceName: source.name, index: i },
        }));

    if (idKey) {
      this.logger.log(`[${source.name}] grouped by "${idKey}"${profileIdKey ? ' (from learned profile)' : ' (heuristic)'} → ${docs.length} documents`);
    }

    // Only kick off a (re)analysis if there's no usable profile yet — avoids re-hitting
    // the local model on every checkpoint resume of the same ingestion.
    if (!profile || profile.status === 'error') {
      this.profiler.profileInBackground(source, records.slice(0, 30));
    }

    return docs;
  }

  /** Finds the array of records in the JSON, whether it's top-level or nested under a common key. */
  private extractRecords(parsed: any): any[] | null {
    if (Array.isArray(parsed)) return parsed.length > 0 ? parsed : null;
    if (parsed && typeof parsed === 'object') {
      const candidates = ['results', 'data', 'items', 'rows', 'records', 'value', 'list', 'entries'];
      for (const key of candidates) {
        if (Array.isArray(parsed[key]) && parsed[key].length > 0) return parsed[key];
      }
      for (const v of Object.values(parsed)) {
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null) return v;
      }
    }
    return null;
  }

  private buildGroupedDocs(records: any[], idKey: string, source: RagSource, dateKeyOverride?: string | null): Document[] {
    const groups = new Map<string, any[]>();
    for (const r of records) {
      if (!r || typeof r !== 'object') continue;
      const id = String(r[idKey] ?? '');
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id)!.push(r);
    }

    const dateKey = dateKeyOverride ?? detectDateKey(records);

    return [...groups.entries()].map(([id, rows]) => {
      const sorted = dateKey
        ? [...rows].sort((a, b) => Date.parse(a[dateKey] ?? 0) - Date.parse(b[dateKey] ?? 0))
        : rows;

      const allKeys = new Set<string>();
      for (const r of sorted) for (const key of Object.keys(r)) allKeys.add(key);

      const constantKeys: string[] = [];
      const varyingKeys: string[] = [];
      for (const key of allKeys) {
        if (key === idKey) continue;
        const values = sorted.map((r) => JSON.stringify(r[key] ?? null));
        (new Set(values).size <= 1 ? constantKeys : varyingKeys).push(key);
      }

      const lines = [`${idKey}: ${id}`];
      for (const key of constantKeys) {
        const v = formatValue(sorted[0][key]);
        if (v) lines.push(`${key}: ${v}`);
      }

      if (varyingKeys.length > 0) {
        lines.push('', `تاریخچه رکوردها (${sorted.length} مورد):`);
        sorted.forEach((row, i) => {
          const rowText = varyingKeys
            .map((k) => [k, formatValue(row[k])] as const)
            .filter(([, v]) => v !== '')
            .map(([k, v]) => `${k}: ${v}`)
            .join(' | ');
          if (rowText) lines.push(`${i + 1}. ${rowText}`);
        });
      }

      return new Document({
        pageContent: lines.join('\n'),
        metadata: { sourceId: source.id, sourceName: source.name, [idKey]: id, recordCount: sorted.length },
      });
    });
  }

  private formatValue(v: any): string {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  private recordToText(r: Record<string, any>): string {
    return Object.entries(r)
      .map(([k, v]) => [k, formatValue(v)] as const)
      .filter(([, v]) => v !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
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

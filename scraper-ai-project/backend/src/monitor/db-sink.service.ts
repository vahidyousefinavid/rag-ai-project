import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Client as PgClient } from 'pg';
import { DbSinkConfig, MonitorTarget } from './entities/monitor-target.entity';
import { decryptSecret } from './crypto.util';

const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const BATCH_SIZE = 200;

/** Connection shape used for both live writes (password already encrypted on the target) and one-off connection tests (plaintext password). */
export interface DbSinkTestConfig extends Omit<DbSinkConfig, 'passwordEncrypted'> {
  password?: string;
}

function ensureValidIdentifier(name: string, label: string): void {
  if (!IDENTIFIER_RE.test(name)) {
    throw new BadRequestException(`${label} "${name}" نامعتبر است — فقط حروف، عدد و _ مجاز است`);
  }
}

function recordKeyOf(record: Record<string, any>, upsertKey?: string | null): string {
  const key = upsertKey && upsertKey in record ? record[upsertKey] : record.url;
  return String(key ?? '');
}

/**
 * Writes extracted records into a database the *user* owns, outside this app. Records are
 * stored generically as (monitor_id, url, record_key, scraped_at, data JSON) rather than
 * dynamic per-field columns — user-chosen field names can't safely become SQL identifiers,
 * and a fixed JSON-column shape avoids schema drift across re-crawls. `data->>'field'`
 * (postgres) / `JSON_EXTRACT(data,'$.field')` (mysql) covers ad-hoc querying needs.
 */
@Injectable()
export class DbSinkService {
  private readonly logger = new Logger(DbSinkService.name);

  async write(target: MonitorTarget, records: Record<string, any>[]): Promise<void> {
    const sink = target.dbSink;
    if (!sink?.enabled || records.length === 0) return;

    ensureValidIdentifier(sink.table, sink.type === 'mongodb' ? 'نام کالکشن' : 'نام جدول');
    const password = sink.passwordEncrypted ? decryptSecret(sink.passwordEncrypted) : '';

    if (sink.type === 'postgres') return this.writePostgres(sink, password, target.id, records);
    if (sink.type === 'mysql') return this.writeMysql(sink, password, target.id, records);
    if (sink.type === 'mongodb') return this.writeMongo(sink, password, target.id, records);
    throw new BadRequestException(`Unknown db sink type: ${sink.type}`);
  }

  async testConnection(cfg: DbSinkTestConfig): Promise<{ ok: boolean; error?: string }> {
    try {
      if (cfg.table) ensureValidIdentifier(cfg.table, cfg.type === 'mongodb' ? 'نام کالکشن' : 'نام جدول');

      if (cfg.type === 'postgres') {
        const client = new PgClient({
          host: cfg.host, port: Number(cfg.port ?? 5432), user: cfg.user, password: cfg.password ?? '',
          database: cfg.database, ssl: cfg.ssl ? { rejectUnauthorized: false } : false, connectionTimeoutMillis: 5000,
        });
        await client.connect();
        await client.query('SELECT 1');
        await client.end();
      } else if (cfg.type === 'mysql') {
        const mysql = await this.loadMysql();
        const conn = await mysql.createConnection({
          host: cfg.host, port: Number(cfg.port ?? 3306), user: cfg.user, password: cfg.password ?? '',
          database: cfg.database, connectTimeout: 5000,
        });
        await conn.execute('SELECT 1');
        await conn.end();
      } else if (cfg.type === 'mongodb') {
        const { MongoClient } = await this.loadMongo();
        const client = new MongoClient(this.mongoUri(cfg, cfg.password ?? ''), { serverSelectionTimeoutMS: 5000 });
        await client.connect();
        await client.db(cfg.database || 'admin').command({ ping: 1 });
        await client.close();
      } else {
        throw new Error('Unknown db sink type');
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  /* ── Postgres ─────────────────────────────────────────────────── */

  private async writePostgres(sink: DbSinkConfig, password: string, monitorId: string, records: Record<string, any>[]): Promise<void> {
    const client = new PgClient({
      host: sink.host, port: Number(sink.port ?? 5432), user: sink.user, password,
      database: sink.database, ssl: sink.ssl ? { rejectUnauthorized: false } : false, connectionTimeoutMillis: 8000,
    });
    await client.connect();
    try {
      const t = sink.table;
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${t}" (
          id SERIAL PRIMARY KEY,
          monitor_id TEXT NOT NULL,
          url TEXT,
          record_key TEXT,
          scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          data JSONB NOT NULL
        )
      `);

      // Only 'upsert' needs (and can rely on) a real uniqueness constraint — 'append'/'replace'
      // records commonly share the same natural key (e.g. every item on one listing page
      // defaults its record_key to the page url), so a constraint there would silently drop rows.
      if (sink.mode === 'upsert') {
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "${t}_monitor_key_uq" ON "${t}" (monitor_id, record_key)`);
      }

      if (sink.mode === 'replace') {
        await client.query(`DELETE FROM "${t}" WHERE monitor_id = $1`, [monitorId]);
      }

      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        for (const r of batch) {
          const key = recordKeyOf(r, sink.upsertKey);
          if (sink.mode === 'upsert') {
            await client.query(
              `INSERT INTO "${t}" (monitor_id, url, record_key, data) VALUES ($1,$2,$3,$4)
               ON CONFLICT (monitor_id, record_key) DO UPDATE SET url = excluded.url, data = excluded.data, scraped_at = now()`,
              [monitorId, r.url ?? null, key, JSON.stringify(r)],
            );
          } else {
            await client.query(
              `INSERT INTO "${t}" (monitor_id, url, record_key, data) VALUES ($1,$2,$3,$4)`,
              [monitorId, r.url ?? null, key, JSON.stringify(r)],
            );
          }
        }
      }
    } finally {
      await client.end();
    }
  }

  /* ── MySQL ────────────────────────────────────────────────────── */

  private async writeMysql(sink: DbSinkConfig, password: string, monitorId: string, records: Record<string, any>[]): Promise<void> {
    const mysql = await this.loadMysql();
    const conn = await mysql.createConnection({
      host: sink.host, port: Number(sink.port ?? 3306), user: sink.user, password,
      database: sink.database, connectTimeout: 8000,
    });
    try {
      const t = sink.table;
      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`${t}\` (
          id INT AUTO_INCREMENT PRIMARY KEY,
          monitor_id VARCHAR(64) NOT NULL,
          url TEXT,
          record_key VARCHAR(255),
          scraped_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          data JSON NOT NULL
        )
      `);

      // See the postgres branch above for why this is 'upsert'-only.
      if (sink.mode === 'upsert') {
        try {
          await conn.query(`ALTER TABLE \`${t}\` ADD UNIQUE KEY monitor_key_uq (monitor_id, record_key)`);
        } catch (err: any) {
          if (err.code !== 'ER_DUP_KEYNAME') throw err; // constraint already added on a previous run
        }
      }

      if (sink.mode === 'replace') {
        await conn.execute(`DELETE FROM \`${t}\` WHERE monitor_id = ?`, [monitorId]);
      }

      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        for (const r of batch) {
          const key = recordKeyOf(r, sink.upsertKey);
          if (sink.mode === 'upsert') {
            await conn.execute(
              `INSERT INTO \`${t}\` (monitor_id, url, record_key, data) VALUES (?,?,?,?)
               ON DUPLICATE KEY UPDATE url = VALUES(url), data = VALUES(data), scraped_at = NOW()`,
              [monitorId, r.url ?? null, key, JSON.stringify(r)],
            );
          } else {
            await conn.execute(
              `INSERT INTO \`${t}\` (monitor_id, url, record_key, data) VALUES (?,?,?,?)`,
              [monitorId, r.url ?? null, key, JSON.stringify(r)],
            );
          }
        }
      }
    } finally {
      await conn.end();
    }
  }

  /* ── MongoDB ──────────────────────────────────────────────────── */

  private async writeMongo(sink: DbSinkConfig, password: string, monitorId: string, records: Record<string, any>[]): Promise<void> {
    const { MongoClient } = await this.loadMongo();
    const client = new MongoClient(this.mongoUri(sink, password), { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    try {
      const col = client.db(sink.database).collection(sink.table);

      if (sink.mode === 'replace') {
        await col.deleteMany({ monitorId });
      }

      const ops = records.map((r) => {
        const key = recordKeyOf(r, sink.upsertKey);
        const doc = { monitorId, url: r.url ?? null, recordKey: key, scrapedAt: new Date(), data: r };
        if (sink.mode === 'upsert') {
          return { updateOne: { filter: { monitorId, recordKey: key }, update: { $set: doc }, upsert: true } };
        }
        return { insertOne: { document: doc } };
      });

      for (let i = 0; i < ops.length; i += BATCH_SIZE) {
        await col.bulkWrite(ops.slice(i, i + BATCH_SIZE) as any, { ordered: false });
      }
    } finally {
      await client.close();
    }
  }

  private mongoUri(cfg: Pick<DbSinkConfig, 'host' | 'port' | 'user' | 'database'>, password: string): string {
    const auth = cfg.user ? `${encodeURIComponent(cfg.user)}:${encodeURIComponent(password)}@` : '';
    const port = cfg.port ? `:${cfg.port}` : '';
    return `mongodb://${auth}${cfg.host}${port}/${encodeURIComponent(cfg.database || '')}`;
  }

  private async loadMysql() {
    return import('mysql2/promise').catch(() => {
      throw new Error('mysql2 package not installed. Run: npm install mysql2');
    });
  }

  private async loadMongo() {
    return import('mongodb').catch(() => {
      throw new Error('mongodb package not installed. Run: npm install mongodb');
    });
  }
}

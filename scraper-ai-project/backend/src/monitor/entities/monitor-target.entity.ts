import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type MonitorStatus = 'idle' | 'checking' | 'ready' | 'error';
export type SchedulePreset = 'hourly' | 'every6h' | 'daily' | 'weekly' | 'custom';
export type NotifyChannel = 'email' | 'telegram' | 'webhook' | 'sms';
/** 1 = fast/shallow, 2 = deep (scroll + "load more"), 3 = maximum thoroughness. See CrawlerService LEVEL_CONFIGS. */
export type CrawlLevel = 1 | 2 | 3;

export interface CompanyInfo {
  emails: string[];
  phones: string[];
  addresses: string[];
  socialLinks: { platform: string; url: string }[];
}

export interface NotifyConfig {
  email?: string;
  telegramChatId?: string;
  webhookUrl?: string;
  smsPhone?: string;
}

/** A single field to pull out of a matched element (or the whole page when there's no itemSelector). */
export interface ExtractionField {
  name: string;
  selector: string;
  /** 'text' (default) | 'html' | any HTML attribute name (e.g. 'href', 'src') */
  attr?: string | null;
}

/**
 * User-defined structured-data schema. When `itemSelector` is set, every matching element
 * produces one record (list/table mode, e.g. product cards). When unset, one record is
 * produced per page from the whole document (single-record mode).
 */
export interface ExtractionSchema {
  itemSelector?: string | null;
  fields: ExtractionField[];
}

export type DbSinkType = 'postgres' | 'mysql' | 'mongodb';
export type DbSinkMode = 'append' | 'replace' | 'upsert';

/** Where to also write extracted records — a database the user owns, outside this app. */
export interface DbSinkConfig {
  enabled: boolean;
  type: DbSinkType;
  host: string;
  port: number;
  user: string;
  passwordEncrypted: string | null;
  database: string;
  /** Table name (postgres/mysql) or collection name (mongodb). */
  table: string;
  mode: DbSinkMode;
  /** Record field used as the natural key for 'upsert' mode. Defaults to 'url' when unset. */
  upsertKey?: string | null;
  ssl?: boolean;
}

@Entity('monitor_targets')
export class MonitorTarget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  url: string;

  @Column({ default: 20 })
  maxPages: number;

  @Column({ default: 1 })
  crawlLevel: CrawlLevel;

  @Column({ default: 'daily' })
  schedulePreset: SchedulePreset;

  @Column({ type: 'varchar', nullable: true })
  scheduleCron: string | null;

  @Column({ type: 'text', nullable: true })
  whatToCheck: string | null;

  /** Natural-language goal for the live LLM crawl agent. When set, this replaces crawlLevel/extractionSchema for navigation+extraction decisions. */
  @Column({ type: 'text', nullable: true })
  agentGoal: string | null;

  /** If set, the crawler logs in (via Playwright form-fill) before crawling — for portals behind auth. */
  @Column({ type: 'varchar', nullable: true })
  loginUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  loginUsername: string | null;

  @Column({ type: 'text', nullable: true })
  loginPasswordEncrypted: string | null;

  @Column({ type: 'varchar', nullable: true })
  loginUsernameSelector: string | null;

  @Column({ type: 'varchar', nullable: true })
  loginPasswordSelector: string | null;

  @Column({ type: 'varchar', nullable: true })
  loginSubmitSelector: string | null;

  @Column('jsonb', { default: [] })
  notifyChannels: NotifyChannel[];

  @Column('jsonb', { default: {} })
  notifyConfig: NotifyConfig;

  @Column({ default: 'idle' })
  status: MonitorStatus;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  /** Set when the external DB sink write failed on the most recent check — the crawl/index itself can still have succeeded. */
  @Column({ type: 'text', nullable: true })
  lastDbSinkError: string | null;

  /** Set when an extraction schema is configured but matched zero records on the most recent check — a hint the selectors are wrong. */
  @Column({ type: 'text', nullable: true })
  lastExtractionWarning: string | null;

  @Column({ type: 'varchar', nullable: true })
  contentHash: string | null;

  @Column({ type: 'text', nullable: true })
  lastContentSnapshot: string | null;

  @Column({ default: 0 })
  pageCount: number;

  @Column({ default: 0 })
  docCount: number;

  @Column('jsonb', { nullable: true })
  companyInfo: CompanyInfo | null;

  /** User-defined CSS-selector schema for pulling structured records out of crawled pages. */
  @Column('jsonb', { nullable: true })
  extractionSchema: ExtractionSchema | null;

  /** Latest structured records from `extractionSchema` (capped) — served by GET /monitors/:id/data. */
  @Column('jsonb', { nullable: true })
  lastExtractedRecords: Record<string, any>[] | null;

  /** sha256 of the issued external API key — the plaintext is shown once and never stored. */
  @Column({ type: 'varchar', nullable: true })
  apiKeyHash: string | null;

  /** First chars of the issued key, kept only so the UI can show which key is active. */
  @Column({ type: 'varchar', nullable: true })
  apiKeyPrefix: string | null;

  /** External database to also write extracted records into. */
  @Column('jsonb', { nullable: true })
  dbSink: DbSinkConfig | null;

  @Column({ type: 'timestamp', nullable: true })
  lastCheckedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastChangedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  nextRunAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

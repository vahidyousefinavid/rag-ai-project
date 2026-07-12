import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type MonitorStatus = 'idle' | 'checking' | 'ready' | 'error';
export type SchedulePreset = 'hourly' | 'every6h' | 'daily' | 'weekly' | 'custom';
export type NotifyChannel = 'email' | 'telegram' | 'webhook' | 'sms';

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

  @Column({ default: 'daily' })
  schedulePreset: SchedulePreset;

  @Column({ type: 'varchar', nullable: true })
  scheduleCron: string | null;

  @Column({ type: 'text', nullable: true })
  whatToCheck: string | null;

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

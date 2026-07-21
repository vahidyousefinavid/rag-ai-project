import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { CronTime } from 'cron';
import { Document } from '@langchain/core/documents';
import {
  MonitorTarget, SchedulePreset, NotifyChannel, NotifyConfig, CrawlLevel,
  ExtractionSchema, DbSinkConfig,
} from './entities/monitor-target.entity';
import { MonitorRun } from './entities/monitor-run.entity';
import { CrawlerService, LoginConfig } from './crawler.service';
import { NotifyService } from './notify/notify.service';
import { DbSinkService } from './db-sink.service';
import { VectorService } from '../vector/vector.service';
import { OllamaService } from '../llm/ollama.service';
import { splitter } from '../utils/splitter';
import { encryptSecret, decryptSecret } from './crypto.util';

const MAX_EXTRACTION_FIELDS = 25;
const MAX_STORED_RECORDS = 2000;
const MAX_EXPORT_LIMIT = 5000;

export type DbSinkInput = (Omit<DbSinkConfig, 'passwordEncrypted'> & { password?: string }) | null;

const SCHEDULE_MS: Record<Exclude<SchedulePreset, 'custom'>, number> = {
  hourly: 60 * 60 * 1000,
  every6h: 6 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

export interface CreateMonitorDto {
  name: string;
  url: string;
  maxPages?: number;
  crawlLevel?: CrawlLevel;
  schedulePreset?: SchedulePreset;
  scheduleCron?: string | null;
  whatToCheck?: string | null;
  notifyChannels?: NotifyChannel[];
  notifyConfig?: NotifyConfig;
  loginUrl?: string | null;
  loginUsername?: string | null;
  loginPassword?: string | null;
  loginUsernameSelector?: string | null;
  loginPasswordSelector?: string | null;
  loginSubmitSelector?: string | null;
  extractionSchema?: ExtractionSchema | null;
  dbSink?: DbSinkInput;
}

export type UpdateMonitorDto = Partial<CreateMonitorDto>;

export type PublicMonitorTarget = Omit<MonitorTarget, 'loginPasswordEncrypted' | 'apiKeyHash' | 'dbSink'> & {
  hasLoginPassword: boolean;
  hasApiKey: boolean;
  dbSink: (Omit<DbSinkConfig, 'passwordEncrypted'> & { hasPassword: boolean }) | null;
};

@Injectable()
export class MonitorService {
  private readonly logger = new Logger(MonitorService.name);

  constructor(
    @InjectRepository(MonitorTarget) private targets: Repository<MonitorTarget>,
    @InjectRepository(MonitorRun) private runs: Repository<MonitorRun>,
    private crawler: CrawlerService,
    private vector: VectorService,
    private ollama: OllamaService,
    private notify: NotifyService,
    private dbSink: DbSinkService,
  ) {}

  private toPublic(target: MonitorTarget): PublicMonitorTarget {
    const { loginPasswordEncrypted, apiKeyHash, dbSink, ...rest } = target;
    const { passwordEncrypted, ...dbSinkRest } = dbSink ?? {} as DbSinkConfig;
    return {
      ...rest,
      hasLoginPassword: !!loginPasswordEncrypted,
      hasApiKey: !!apiKeyHash,
      dbSink: dbSink ? { ...dbSinkRest, hasPassword: !!passwordEncrypted } : null,
    };
  }

  private normalizeExtractionSchema(schema?: ExtractionSchema | null): ExtractionSchema | null {
    if (!schema?.fields?.length) return null;
    const fields = schema.fields
      .filter((f) => f.name?.trim() && f.selector?.trim())
      .slice(0, MAX_EXTRACTION_FIELDS)
      .map((f) => ({ name: f.name.trim(), selector: f.selector.trim(), attr: f.attr?.trim() || null }));
    if (fields.length === 0) return null;
    return { itemSelector: schema.itemSelector?.trim() || null, fields };
  }

  /** `undefined` in the DTO means "leave as-is", `null` means "remove the sink". */
  private buildDbSink(dto: DbSinkInput | undefined, existing: DbSinkConfig | null): DbSinkConfig | null {
    if (dto === undefined) return existing;
    if (dto === null) return null;
    if (!dto.table?.trim()) throw new BadRequestException('نام جدول/کالکشن برای اتصال دیتابیس الزامی است');
    // upsertKey is optional even in 'upsert' mode — write() falls back to "url" as the natural key when unset.
    return {
      enabled: !!dto.enabled,
      type: dto.type,
      host: dto.host,
      port: Number(dto.port) || (dto.type === 'mysql' ? 3306 : dto.type === 'mongodb' ? 27017 : 5432),
      user: dto.user,
      passwordEncrypted: dto.password ? encryptSecret(dto.password) : (existing?.passwordEncrypted ?? null),
      database: dto.database,
      table: dto.table.trim(),
      mode: dto.mode,
      upsertKey: dto.upsertKey?.trim() || null,
      ssl: !!dto.ssl,
    };
  }

  private capRecords(records: Record<string, any>[]): Record<string, any>[] {
    return records.length > MAX_STORED_RECORDS ? records.slice(0, MAX_STORED_RECORDS) : records;
  }

  async list(): Promise<PublicMonitorTarget[]> {
    const targets = await this.targets.find({ order: { createdAt: 'DESC' } });
    return targets.map((t) => this.toPublic(t));
  }

  async get(id: string): Promise<MonitorTarget> {
    const target = await this.targets.findOneBy({ id });
    if (!target) throw new NotFoundException('Monitor not found');
    return target;
  }

  async create(dto: CreateMonitorDto): Promise<PublicMonitorTarget> {
    const target = await this.targets.save(
      this.targets.create({
        name: dto.name,
        url: dto.url,
        maxPages: dto.maxPages ?? 20,
        crawlLevel: dto.crawlLevel ?? 2,
        schedulePreset: dto.schedulePreset ?? 'daily',
        scheduleCron: dto.schedulePreset === 'custom' ? (dto.scheduleCron ?? null) : null,
        whatToCheck: dto.whatToCheck ?? null,
        notifyChannels: dto.notifyChannels ?? [],
        notifyConfig: dto.notifyConfig ?? {},
        loginUrl: dto.loginUrl || null,
        loginUsername: dto.loginUsername || null,
        loginPasswordEncrypted: dto.loginPassword ? encryptSecret(dto.loginPassword) : null,
        loginUsernameSelector: dto.loginUsernameSelector || null,
        loginPasswordSelector: dto.loginPasswordSelector || null,
        loginSubmitSelector: dto.loginSubmitSelector || null,
        extractionSchema: this.normalizeExtractionSchema(dto.extractionSchema),
        dbSink: this.buildDbSink(dto.dbSink, null),
        nextRunAt: new Date(),
      }),
    );

    this.runCheck(target.id).catch(() => { /* logged inside runCheck */ });
    return this.toPublic(target);
  }

  async update(id: string, dto: UpdateMonitorDto): Promise<PublicMonitorTarget> {
    const target = await this.get(id);
    const patch: Partial<MonitorTarget> = {};

    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.url !== undefined) patch.url = dto.url;
    if (dto.maxPages !== undefined) patch.maxPages = dto.maxPages;
    if (dto.crawlLevel !== undefined) patch.crawlLevel = dto.crawlLevel;
    if (dto.schedulePreset !== undefined) patch.schedulePreset = dto.schedulePreset;
    if (dto.schedulePreset !== undefined || dto.scheduleCron !== undefined) {
      const preset = dto.schedulePreset ?? target.schedulePreset;
      patch.scheduleCron = preset === 'custom' ? (dto.scheduleCron ?? target.scheduleCron ?? null) : null;
    }
    if (dto.whatToCheck !== undefined) patch.whatToCheck = dto.whatToCheck || null;
    if (dto.notifyChannels !== undefined) patch.notifyChannels = dto.notifyChannels;
    if (dto.notifyConfig !== undefined) patch.notifyConfig = dto.notifyConfig;
    if (dto.loginUrl !== undefined) patch.loginUrl = dto.loginUrl || null;
    if (dto.loginUsername !== undefined) patch.loginUsername = dto.loginUsername || null;
    if (dto.loginPassword) patch.loginPasswordEncrypted = encryptSecret(dto.loginPassword);
    if (dto.loginUsernameSelector !== undefined) patch.loginUsernameSelector = dto.loginUsernameSelector || null;
    if (dto.loginPasswordSelector !== undefined) patch.loginPasswordSelector = dto.loginPasswordSelector || null;
    if (dto.loginSubmitSelector !== undefined) patch.loginSubmitSelector = dto.loginSubmitSelector || null;
    if (dto.extractionSchema !== undefined) patch.extractionSchema = this.normalizeExtractionSchema(dto.extractionSchema);
    if (dto.dbSink !== undefined) patch.dbSink = this.buildDbSink(dto.dbSink, target.dbSink);

    await this.targets.update(id, patch);
    return this.toPublic((await this.targets.findOneBy({ id }))!);
  }

  async issueApiKey(id: string): Promise<{ apiKey: string }> {
    await this.get(id);
    const apiKey = randomBytes(24).toString('hex');
    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');
    await this.targets.update(id, { apiKeyHash, apiKeyPrefix: apiKey.slice(0, 8) });
    return { apiKey };
  }

  async revokeApiKey(id: string): Promise<void> {
    await this.get(id);
    await this.targets.update(id, { apiKeyHash: null, apiKeyPrefix: null });
  }

  /** Constant-time check so an external caller can't time their way to a valid key. */
  verifyApiKey(target: MonitorTarget, key: string | undefined): boolean {
    if (!target.apiKeyHash || !key) return false;
    const a = Buffer.from(createHash('sha256').update(key).digest('hex'));
    const b = Buffer.from(target.apiKeyHash);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /**
   * Structured records for external consumption: the last extraction-schema run if one is
   * configured, otherwise the crawled page list (url/title) as a useful default even without
   * a custom schema.
   */
  async getExportRecords(id: string, limit?: number): Promise<Record<string, any>[]> {
    const target = await this.get(id);
    const records = target.extractionSchema && target.lastExtractedRecords
      ? target.lastExtractedRecords
      : (await this.vector.listPagesForSource(id, MAX_EXPORT_LIMIT)).map((p) => ({ url: p.url, title: p.title }));

    const cap = limit && limit > 0 ? Math.min(limit, MAX_EXPORT_LIMIT) : records.length;
    return records.slice(0, cap);
  }

  async remove(id: string): Promise<void> {
    const target = await this.get(id);
    await this.vector.deleteBySource(id);
    await this.runs.delete({ targetId: id });
    await this.targets.remove(target);
  }

  getRuns(targetId: string): Promise<MonitorRun[]> {
    return this.runs.find({ where: { targetId }, order: { ranAt: 'DESC' }, take: 30 });
  }

  /** Triggers an out-of-schedule check; no-op if one is already in progress. */
  async checkNow(id: string): Promise<PublicMonitorTarget> {
    const target = await this.get(id);
    if (target.status === 'checking') return this.toPublic(target);
    await this.targets.update(id, { status: 'checking' });
    this.runCheck(id).catch(() => { /* logged inside runCheck */ });
    return this.toPublic({ ...target, status: 'checking' });
  }

  /** Targets whose scheduled next run is due, used by the cron tick. */
  dueTargets(): Promise<MonitorTarget[]> {
    return this.targets
      .createQueryBuilder('t')
      .where('t.status != :checking', { checking: 'checking' })
      .andWhere('(t.nextRunAt IS NULL OR t.nextRunAt <= :now)', { now: new Date() })
      .getMany();
  }

  private buildLoginConfig(target: MonitorTarget): LoginConfig | null {
    if (!target.loginUrl || !target.loginUsername || !target.loginPasswordEncrypted) return null;
    return {
      loginUrl: target.loginUrl,
      username: target.loginUsername,
      password: decryptSecret(target.loginPasswordEncrypted),
      usernameSelector: target.loginUsernameSelector,
      passwordSelector: target.loginPasswordSelector,
      submitSelector: target.loginSubmitSelector,
    };
  }

  private nextRunFrom(target: Pick<MonitorTarget, 'schedulePreset' | 'scheduleCron'>): Date {
    if (target.schedulePreset === 'custom' && target.scheduleCron) {
      try {
        return new CronTime(target.scheduleCron).sendAt().toJSDate();
      } catch {
        this.logger.warn(`Invalid cron "${target.scheduleCron}" — falling back to daily`);
        return new Date(Date.now() + SCHEDULE_MS.daily);
      }
    }
    const ms = SCHEDULE_MS[target.schedulePreset as Exclude<SchedulePreset, 'custom'>] ?? SCHEDULE_MS.daily;
    return new Date(Date.now() + ms);
  }

  async runCheck(id: string): Promise<void> {
    const target = await this.get(id);
    await this.targets.update(id, { status: 'checking' });

    try {
      const login = this.buildLoginConfig(target);
      const { pages, socialLinks, records, lastFailureReason } = await this.crawler.crawl(
        target.url, target.maxPages, login, target.crawlLevel, target.extractionSchema,
      );
      if (pages.length === 0) {
        throw new Error(lastFailureReason ? `هیچ صفحه‌ای قابل دریافت نبود — دلیل: ${lastFailureReason}` : 'هیچ صفحه‌ای قابل دریافت نبود');
      }

      const companyInfo = this.crawler.extractCompanyInfo(pages, socialLinks);
      const combinedText = pages.map((p) => `[${p.url}]\n${p.text}`).join('\n\n');
      const newHash = createHash('sha256').update(combinedText).digest('hex');

      const isFirstRun = !target.contentHash;
      const changed = !isFirstRun && newHash !== target.contentHash;

      // Re-index the vector store with the freshly crawled content.
      await this.vector.deleteBySource(id);
      const docs = pages.map(
        (p) => new Document({
          pageContent: p.text,
          metadata: { sourceId: id, sourceName: target.name, url: p.url, title: p.title },
        }),
      );
      const chunks = await splitter.splitDocuments(docs);
      await this.vector.upsertDocuments(chunks);

      let summary: string | null = null;
      if (changed) {
        summary = await this.summarizeChange(target, target.lastContentSnapshot ?? '', combinedText);
        await this.notify.notifyChange(target, summary);
      }

      // Runs before the target/run rows are saved so both can record the outcome —
      // a failed sink write must stay visible to the user, not just in server logs.
      let dbSinkError: string | null = null;
      if (target.dbSink?.enabled && records.length > 0) {
        try {
          await this.dbSink.write(target, records);
        } catch (err: any) {
          dbSinkError = err.message;
          this.logger.warn(`[${target.name}] db sink write failed: ${err.message}`);
        }
      }

      const extractionWarning = target.extractionSchema && records.length === 0
        ? 'سلکتورهای استخراج تعریف‌شده هیچ رکوردی روی صفحات کرال‌شده پیدا نکردند — سلکتورها رو بررسی کنید.'
        : null;

      await this.runs.save(this.runs.create({
        targetId: id, changed, summary, pagesChecked: pages.length, extractedCount: records.length, dbSinkError,
      }));

      await this.targets.update(id, {
        status: 'ready',
        lastError: null,
        contentHash: newHash,
        lastContentSnapshot: combinedText.slice(0, 200_000),
        pageCount: pages.length,
        docCount: chunks.length,
        companyInfo,
        lastExtractedRecords: target.extractionSchema ? this.capRecords(records) : null,
        lastDbSinkError: dbSinkError,
        lastExtractionWarning: extractionWarning,
        lastCheckedAt: new Date(),
        lastChangedAt: changed ? new Date() : target.lastChangedAt,
        nextRunAt: this.nextRunFrom(target),
      });

      this.logger.log(`[${target.name}] ✅ ${pages.length} pages, ${chunks.length} chunks${records.length ? `, ${records.length} records` : ''}${changed ? ' — CHANGED' : ''}`);
    } catch (err: any) {
      this.logger.error(`[${target.name}] ❌ ${err.message}`);
      await this.runs.save(this.runs.create({ targetId: id, changed: false, pagesChecked: 0, error: err.message }));
      await this.targets.update(id, {
        status: 'error',
        lastError: err.message,
        lastCheckedAt: new Date(),
        nextRunAt: this.nextRunFrom(target),
      });
    }
  }

  private async summarizeChange(target: MonitorTarget, oldText: string, newText: string): Promise<string> {
    const focus = target.whatToCheck
      ? `تمرکز کاربر برای رصد این سایت: «${target.whatToCheck}»\n\n`
      : '';
    const prompt = `تو دستیاری هستی که تغییرات یک وب‌سایت رو بین دو بار بررسی متوالی خلاصه می‌کنی.
${focus}متن نسخه قبلی سایت:
${oldText.slice(0, 6000)}

متن نسخه جدید سایت:
${newText.slice(0, 6000)}

به فارسی و در چند خط کوتاه دقیقاً بگو چه چیزی تغییر کرده (مثلاً قیمت، محصول جدید، خبر، متن صفحه و ...). اگر تغییر معناداری پیدا نکردی همین را بگو.`;

    try {
      return await this.ollama.ask(prompt);
    } catch (err: any) {
      this.logger.warn(`AI diff summary failed: ${err.message}`);
      return 'محتوای سایت تغییر کرده است (خلاصه هوشمند در دسترس نبود).';
    }
  }
}

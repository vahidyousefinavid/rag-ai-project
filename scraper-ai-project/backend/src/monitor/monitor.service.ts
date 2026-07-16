import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { CronTime } from 'cron';
import { Document } from '@langchain/core/documents';
import { MonitorTarget, SchedulePreset, NotifyChannel, NotifyConfig, CrawlLevel } from './entities/monitor-target.entity';
import { MonitorRun } from './entities/monitor-run.entity';
import { CrawlerService, LoginConfig } from './crawler.service';
import { NotifyService } from './notify/notify.service';
import { VectorService } from '../vector/vector.service';
import { OllamaService } from '../llm/ollama.service';
import { splitter } from '../utils/splitter';
import { encryptSecret, decryptSecret } from './crypto.util';

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
}

export type PublicMonitorTarget = Omit<MonitorTarget, 'loginPasswordEncrypted'> & { hasLoginPassword: boolean };

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
  ) {}

  private toPublic(target: MonitorTarget): PublicMonitorTarget {
    const { loginPasswordEncrypted, ...rest } = target;
    return { ...rest, hasLoginPassword: !!loginPasswordEncrypted };
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
        nextRunAt: new Date(),
      }),
    );

    this.runCheck(target.id).catch(() => { /* logged inside runCheck */ });
    return this.toPublic(target);
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
      const { pages, socialLinks } = await this.crawler.crawl(target.url, target.maxPages, login, target.crawlLevel);
      if (pages.length === 0) throw new Error('هیچ صفحه‌ای قابل دریافت نبود');

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

      await this.runs.save(this.runs.create({ targetId: id, changed, summary, pagesChecked: pages.length }));

      await this.targets.update(id, {
        status: 'ready',
        lastError: null,
        contentHash: newHash,
        lastContentSnapshot: combinedText.slice(0, 200_000),
        pageCount: pages.length,
        docCount: chunks.length,
        companyInfo,
        lastCheckedAt: new Date(),
        lastChangedAt: changed ? new Date() : target.lastChangedAt,
        nextRunAt: this.nextRunFrom(target),
      });

      this.logger.log(`[${target.name}] ✅ ${pages.length} pages, ${chunks.length} chunks${changed ? ' — CHANGED' : ''}`);
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

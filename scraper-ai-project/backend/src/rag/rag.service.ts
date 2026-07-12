import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VectorService } from '../vector/vector.service';
import { OllamaService } from '../llm/ollama.service';
import { RedisService } from '../cache/redis.service';
import { MonitorTarget } from '../monitor/entities/monitor-target.entity';

export interface RagResult {
  answer: string;
  sources: string[];
}

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private vector: VectorService,
    private ollama: OllamaService,
    private redis: RedisService,
    @InjectRepository(MonitorTarget) private targets: Repository<MonitorTarget>,
  ) {}

  async ask(question: string, history: HistoryMessage[] = [], sourceId?: string): Promise<RagResult> {
    const cacheKey = sourceId ? `${question}::${sourceId}` : question;
    if (history.length === 0) {
      const cached = await this.redis.getRagResult(cacheKey);
      if (cached) {
        this.logger.debug(`[CACHE HIT] "${question.slice(0, 60)}"`);
        return cached;
      }
    }

    const [results, overview] = await Promise.all([
      this.vector.search(question, 10, 0.5, sourceId),
      this.buildOverview(sourceId),
    ]);

    if (results.length === 0 && !overview) {
      return { answer: 'اطلاعات کافی برای پاسخ به این سوال یافت نشد.', sources: [] };
    }

    const context = results
      .map((d, i) => `[منبع ${i + 1} — ${d.metadata?.url ?? d.metadata?.sourceName ?? ''}]\n${d.content}`)
      .join('\n\n---\n\n');

    const sources = results.map((d) => d.metadata?.url ?? d.content.split('\n')[0]); // page URL, or first line as fallback label

    const answer = await this.ollama.ask(this.buildPrompt(overview, context, question, history));
    const result: RagResult = { answer, sources };

    if (history.length === 0) {
      await this.redis.setRagResult(cacheKey, result);
    }

    return result;
  }

  /**
   * Structured, ground-truth facts about the crawled source(s) — company info, page
   * counts, and the *actual* deduped list of crawled pages (from vector metadata, not
   * similarity search). Lets the model answer meta-questions ("چی پیدا کردی؟", "چه
   * صفحاتی رو کرال کردی؟") completely instead of depending on semantic match luck.
   */
  private async buildOverview(sourceId?: string): Promise<string> {
    if (sourceId) {
      const target = await this.targets.findOneBy({ id: sourceId });
      if (!target) return '';

      const pages = await this.vector.listPagesForSource(sourceId);
      const info = target.companyInfo;
      const lines = [
        `نام منبع: ${target.name}`,
        `آدرس سایت: ${target.url}`,
        `وضعیت: ${target.status}`,
        `تعداد صفحات کرال‌شده: ${target.pageCount}`,
        `تعداد قطعه‌های ایندکس‌شده: ${target.docCount}`,
        `آخرین بررسی: ${target.lastCheckedAt ? new Date(target.lastCheckedAt).toLocaleString('fa-IR') : 'هنوز بررسی نشده'}`,
        `آخرین تغییر شناسایی‌شده: ${target.lastChangedAt ? new Date(target.lastChangedAt).toLocaleString('fa-IR') : 'تاکنون تغییری ثبت نشده'}`,
      ];
      if (info?.emails?.length) lines.push(`ایمیل‌های یافت‌شده: ${info.emails.join('، ')}`);
      if (info?.phones?.length) lines.push(`شماره‌تلفن‌های یافت‌شده: ${info.phones.join('، ')}`);
      if (info?.addresses?.length) lines.push(`آدرس‌های (مکانی) یافت‌شده: ${info.addresses.join(' | ')}`);
      if (info?.socialLinks?.length) {
        lines.push(`شبکه‌های اجتماعی: ${info.socialLinks.map((s) => `${s.platform}: ${s.url}`).join('، ')}`);
      }
      if (pages.length > 0) {
        lines.push(`لیست کامل صفحات کرال‌شده (${pages.length} صفحه):`);
        for (const p of pages) lines.push(`- ${p.title || '(بدون عنوان)'} — ${p.url}`);
      }
      return lines.join('\n');
    }

    const all = await this.targets.find({ order: { createdAt: 'DESC' } });
    if (all.length === 0) return '';

    const lines = [`تعداد کل سایت‌های تحت رصد: ${all.length}`, ''];
    for (const t of all) {
      lines.push(`- ${t.name} (${t.url}) — وضعیت: ${t.status}، ${t.pageCount} صفحه، ${t.docCount} قطعه`);
    }
    return lines.join('\n');
  }

  private buildPrompt(overview: string, context: string, question: string, history: HistoryMessage[]): string {
    const historySection = history.length > 0
      ? `تاریخچه گفتگو:\n${history.map((m) =>
          `${m.role === 'user' ? 'کاربر' : 'دستیار'}: ${m.content}`
        ).join('\n')}\n\n`
      : '';

    // Overview is placed right before the question (not buried under the content
    // chunks) since smaller local models weight the text closest to the question
    // much more heavily — burying it earlier caused it to get ignored in practice.
    const overviewSection = overview
      ? `⚠️ اطلاعات کلی و دقیق زیر همیشه در دسترس توست و اولویت اول پاسخ‌دادن است — هر وقت سوال درباره‌ی خودِ فرآیند کرال بود («چی پیدا کردی»، «چه صفحاتی رو کرال/اسکرپ کردی»، «چند صفحه»، «چند تا سایت داری»، اطلاعات تماس، ایمیل، تلفن، آدرس، شبکه‌های اجتماعی، وضعیت)، پاسخ را کامل و دقیقاً بر اساس همین بخش بده، نه فقط چند نمونه از محتوای صفحات:\n${overview}\n\n`
      : '';

    return `تو یک دستیار هستی که بر اساس محتوای کرال‌شده از وب‌سایت‌های شرکت‌ها به سوالات کاربر پاسخ می‌دهی.

قوانین مهم:
- فقط بر اساس اطلاعات داده‌شده پاسخ بده
- برای سوالات جزئی‌تر درباره محتوای متنی سایت، از بخش «محتوای صفحات کرال‌شده» استفاده کن
- اگر در هیچ‌کدام از بخش‌ها اطلاعات کافی نبود بگو: "اطلاعات کافی در دسترس نیست"
- در صورت وجود، آدرس صفحه منبع را ذکر کن
- پاسخ را به فارسی بده؛ اگر چند مورد وجود دارد، به صورت لیست کامل نمایش بده

${historySection}محتوای صفحات کرال‌شده:
${context || '(چیزی که از نظر معنایی به این سوال مرتبط باشد یافت نشد)'}

${overviewSection}سوال: ${question}

پاسخ:`.trim();
  }
}

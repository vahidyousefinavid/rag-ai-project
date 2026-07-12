import { Injectable, Logger } from '@nestjs/common';
import { VectorService } from '../vector/vector.service';
import { OllamaService } from '../llm/ollama.service';
import { RedisService } from '../cache/redis.service';

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

    const queries = this.buildQueries(question);
    const allResults = await Promise.all(queries.map((q) => this.vector.search(q, 8, 0.5, sourceId)));

    // Deduplicate by content, keep highest score
    const scoreMap = new Map<string, { content: string; score: number; metadata: any }>();
    for (const batch of allResults) {
      for (const doc of batch) {
        const existing = scoreMap.get(doc.content);
        if (!existing || doc.score > existing.score) {
          scoreMap.set(doc.content, doc);
        }
      }
    }

    // Sort by score descending, take top 10
    const uniqueDocs = [...scoreMap.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    if (uniqueDocs.length === 0) {
      return { answer: 'اطلاعات کافی برای پاسخ به این سوال یافت نشد.', sources: [] };
    }

    const context = uniqueDocs
      .map((d, i) => `[منبع ${i + 1}]\n${d.content}`)
      .join('\n\n---\n\n');

    const sources = uniqueDocs.map((d) => d.content.split('\n')[0]); // first line as label

    const answer = await this.ollama.ask(this.buildPrompt(context, question, history));
    const result: RagResult = { answer, sources };

    if (history.length === 0) {
      await this.redis.setRagResult(cacheKey, result);
    }

    return result;
  }

  /**
   * Generates CRM-aware query variants to improve recall.
   * Maps question to relevant CRM entities/dimensions.
   */
  private buildQueries(question: string): string[] {
    const q = question.trim();

    // Detect CRM entity type to generate targeted variants
    const isSales = /فروش|معامله|deal|pipeline|درآمد|revenue/i.test(q);
    const isCustomer = /مشتری|شرکت|customer|account/i.test(q);
    const isTicket = /تیکت|پشتیبانی|ticket|مشکل|شکایت/i.test(q);
    const isOrder = /سفارش|order|خرید|فاکتور/i.test(q);
    const isEmployee = /کارشناس|فروشنده|نماینده|employee|rep/i.test(q);
    const isProduct = /محصول|product|کالا|خدمات/i.test(q);

    const variants: string[] = [q];

    if (isSales) {
      variants.push(`معاملات و فرصت‌های فروش: ${q}`);
      variants.push(`وضعیت pipeline و مراحل فروش: ${q}`);
    } else if (isCustomer) {
      variants.push(`اطلاعات شرکت مشتری و حساب: ${q}`);
      variants.push(`سابقه همکاری و وضعیت مشتری: ${q}`);
    } else if (isTicket) {
      variants.push(`تیکت پشتیبانی و مشکلات مشتریان: ${q}`);
      variants.push(`وضعیت رسیدگی به درخواست‌های پشتیبانی: ${q}`);
    } else if (isOrder) {
      variants.push(`سفارش و وضعیت تحویل: ${q}`);
      variants.push(`فاکتور و پرداخت سفارشات: ${q}`);
    } else if (isEmployee) {
      variants.push(`عملکرد کارشناس فروش و فعالیت‌ها: ${q}`);
      variants.push(`معاملات و تماس‌های کارشناس: ${q}`);
    } else if (isProduct) {
      variants.push(`مشخصات و قیمت محصول: ${q}`);
      variants.push(`فروش و موجودی محصول: ${q}`);
    } else {
      variants.push(`اطلاعات CRM درباره: ${q}`);
      variants.push(`گزارش و آمار: ${q}`);
    }

    return variants;
  }

  private buildPrompt(context: string, question: string, history: HistoryMessage[]): string {
    const historySection = history.length > 0
      ? `تاریخچه گفتگو:\n${history.map((m) =>
          `${m.role === 'user' ? 'کاربر' : 'دستیار'}: ${m.content}`
        ).join('\n')}\n\n`
      : '';

    return `تو یک دستیار تحلیلگر CRM هستی که به سوالات درباره مشتریان، معاملات، سفارشات و عملکرد فروش پاسخ می‌دهی.

قوانین مهم:
- فقط بر اساس اطلاعات داده‌شده پاسخ بده
- اگر اطلاعات کافی نداری بگو: "اطلاعات کافی در دسترس نیست"
- اعداد و ارقام را دقیق ذکر کن
- پاسخ را به فارسی و مختصر بده
- اگر چند مورد وجود دارد، به صورت لیست نمایش بده

${historySection}اطلاعات پایگاه داده CRM:
${context}

سوال: ${question}

پاسخ:`.trim();
  }
}

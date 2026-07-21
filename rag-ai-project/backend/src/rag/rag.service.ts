import { Injectable, Logger } from '@nestjs/common';
import { tool } from '@langchain/core/tools';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { VectorService } from '../vector/vector.service';
import { OllamaService } from '../llm/ollama.service';
import { RedisService } from '../cache/redis.service';
import { DataProfilerService } from '../sources/data-profiler.service';
import { StatsService } from '../sources/stats.service';

export interface RagResult {
  answer: string;
  sources: string[];
}

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_AGENT_STEPS = 4;

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private vector: VectorService,
    private ollama: OllamaService,
    private redis: RedisService,
    private profiler: DataProfilerService,
    private stats: StatsService,
  ) {}

  /**
   * Agentic entry point: the model itself decides, per question, whether to look up
   * specific records (search_records) or run a filter/group/aggregate query over the
   * whole dataset (query_records — vector search alone can never answer "how many/what
   * %/top N/trend" questions since it only ever sees a handful of semantically-similar
   * chunks). It can chain multiple tool calls across a few steps before writing the
   * final answer — e.g. discover field names, then query the specific one.
   */
  async ask(question: string, history: HistoryMessage[] = [], sourceId?: string): Promise<RagResult> {
    const cacheKey = sourceId ? `${question}::${sourceId}` : question;
    if (history.length === 0) {
      const cached = await this.redis.getRagResult(cacheKey);
      if (cached) {
        this.logger.debug(`[CACHE HIT] "${question.slice(0, 60)}"`);
        return cached;
      }
    }

    const collectedSources: string[] = [];
    const tools = this.buildTools(sourceId, collectedSources);
    const chat = this.ollama.getChatModel();
    const boundChat = chat.bindTools(tools);

    const profile = sourceId ? await this.profiler.getProfile(sourceId) : null;
    const domainSummary = profile?.status === 'ready' ? profile.domainSummary : null;
    const knownFields = profile?.status === 'ready' ? { idKey: profile.idKey, dateKey: profile.dateKey } : null;

    const messages: BaseMessage[] = [
      new SystemMessage(this.buildSystemPrompt(domainSummary, knownFields, tools.length > 1)),
      ...history.map((m) => (m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content))),
      new HumanMessage(question),
    ];

    let answer: string | null = null;

    for (let step = 0; step < MAX_AGENT_STEPS && answer === null; step++) {
      const res = await boundChat.invoke(messages);

      if (!res.tool_calls || res.tool_calls.length === 0) {
        this.logger.debug(`[agent] step ${step}: final answer (no tool call)`);
        answer = this.contentToText(res.content);
        break;
      }

      messages.push(res);
      for (const call of res.tool_calls) {
        this.logger.debug(`[agent] step ${step}: tool call ${call.name}(${JSON.stringify(call.args)})`);
        const match = tools.find((t) => t.name === call.name);
        const output = match ? await match.invoke(call.args as any) : `ابزار "${call.name}" شناخته‌شده نیست.`;
        this.logger.debug(`[agent] step ${step}: tool result ${String(output).slice(0, 300)}`);
        messages.push(new ToolMessage({ content: String(output), tool_call_id: call.id ?? call.name, name: call.name }));
      }
    }

    if (answer === null) {
      // Ran out of steps without a final text answer — force one plain completion, no more tool calls.
      const res = await chat.invoke([...messages, new HumanMessage('بر اساس اطلاعاتی که تا الان جمع‌آوری کردی، همین حالا پاسخ نهایی را به فارسی بده.')]);
      answer = this.contentToText(res.content);
    }

    const result: RagResult = { answer, sources: collectedSources };

    if (history.length === 0) {
      await this.redis.setRagResult(cacheKey, result);
    }

    return result;
  }

  private contentToText(content: unknown): string {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map((c) => (typeof c === 'string' ? c : (c as any)?.text ?? '')).join('');
    }
    return String(content ?? '');
  }

  private buildTools(sourceId: string | undefined, collectedSources: string[]) {
    const searchTool = tool(
      async ({ query }: { query: string }) => {
        const context = await this.runSearch(query, sourceId, collectedSources);
        return context;
      },
      {
        name: 'search_records',
        description: 'جستجوی معنایی برای پیدا کردن رکوردهای مرتبط با یک موضوع، شخص، شناسه یا مورد خاص. برای سوالات جزئی/موردی مناسب است، نه برای شمارش یا آمار کل داده.',
        schema: z.object({ query: z.string().describe('عبارت جستجو، به فارسی و نزدیک به زبان سوال کاربر') }),
      },
    );

    const toolList: any[] = [searchTool];

    if (sourceId) {
      const filterSchema = z.object({
        field: z.string().describe('نام دقیق فیلد (از خروجی discovery یا سوال کاربر)'),
        op: z.enum(['eq', 'neq', 'contains', 'gt', 'gte', 'lt', 'lte']).describe('نوع مقایسه'),
        value: z.union([z.string(), z.number()]),
      });

      const queryTool = tool(
        async (spec: {
          groupBy?: string; dateBucket?: 'day' | 'month' | 'year';
          aggregate?: 'count' | 'sum' | 'avg' | 'min' | 'max'; aggregateField?: string;
          filter?: { field: string; op: any; value: string | number }[];
          sortDir?: 'asc' | 'desc'; limit?: number;
        }) => {
          const result = await this.stats.runQuery(sourceId, spec);
          if (!result || result.totalRecords === 0) return 'داده‌ای برای این منبع در دسترس نیست.';
          // A guessed/wrong field name silently produces an empty-but-valid-looking group list,
          // which local models tend to fill in with fabricated numbers instead of retrying —
          // so surface it as an explicit correction instead of quietly returning nothing.
          if (spec.groupBy && (!result.groups || result.groups.length === 0)) {
            return `فیلد "${spec.groupBy}" در داده پیدا نشد یا مقداری نداشت — این نام فیلد وجود ندارد. دوباره query_records را این‌بار بدون پارامتر groupBy صدا بزن تا نام دقیق فیلدهای موجود را ببینی، سپس با یکی از همان نام‌های دقیق دوباره تلاش کن. هرگز عددی که از تابع نگرفته‌ای را در پاسخ نگو.`;
          }
          return JSON.stringify(result);
        },
        {
          name: 'query_records',
          description: `موتور تحلیل عمومی که روی تمام رکوردهای این منبع کار می‌کند (نه فقط چند نمونه بازیابی‌شده). برای هر سوال آماری، شمارشی، روندی، مقایسه‌ای، فیلترشده یا "چند تا/میانگین/مجموع/بیشترین/کمترین/N مورد برتر" از این استفاده کن، نه search_records.

نحوه استفاده:
- اگر اسم دقیق فیلدها را نمی‌دانی: اول بدون groupBy صدا بزن تا فیلدهای موجود، چند نمونه از هرکدام (availableFields)، و لیست فیلدهای تاریخ (dateFields) را ببینی (discovery)، بعد دوباره با groupBy دقیق صدا بزن
- برای تعداد/تفکیک بر اساس یک بعد (وضعیت، دسته‌بندی و ...): groupBy را همان فیلد از availableFields بگذار
- برای روند زمانی (ماهانه/سالانه): groupBy را دقیقاً یکی از dateFields بگذار (نه یک اسم حدسی مثل "date" یا "تاریخ") و dateBucket را month یا year کن
- برای مجموع/میانگین/بیشترین/کمترین یک فیلد عددی (مثلاً مبلغ): aggregate و aggregateField را پر کن
- برای فیلتر کردن قبل از تجمیع (مثلاً فقط یک مشتری یا بازه خاص): از filter استفاده کن
- برای "N مورد برتر": limit را بگذار و sortDir را desc کن (پیش‌فرض)`,
          schema: z.object({
            groupBy: z.string().optional().describe('فیلدی که آمار بر اساس آن گروه‌بندی شود؛ خالی = حالت discovery (لیست فیلدهای موجود)'),
            dateBucket: z.enum(['day', 'month', 'year']).optional().describe('اگر groupBy یک فیلد تاریخ است، بازه‌ی تجمیع زمانی'),
            aggregate: z.enum(['count', 'sum', 'avg', 'min', 'max']).optional().describe('نوع محاسبه در هر گروه؛ پیش‌فرض شمارش تعداد'),
            aggregateField: z.string().optional().describe('فیلد عددی برای sum/avg/min/max'),
            filter: z.array(filterSchema).optional().describe('شرط‌های فیلتر روی رکوردها قبل از گروه‌بندی (AND بین همه)'),
            sortDir: z.enum(['asc', 'desc']).optional().describe('ترتیب گروه‌ها بر اساس مقدار؛ پیش‌فرض نزولی'),
            limit: z.number().optional().describe('حداکثر تعداد گروه برگشتی؛ پیش‌فرض 20، برای "N مورد برتر" همین را تنظیم کن'),
          }),
        },
      );
      toolList.push(queryTool);
    }

    return toolList;
  }

  /** The existing CRM-aware retrieval path, now exposed as the search_records tool. */
  private async runSearch(query: string, sourceId: string | undefined, collectedSources: string[]): Promise<string> {
    const queries = this.buildQueries(query);
    const allResults = await Promise.all(queries.map((q) => this.vector.search(q, 8, 0.5, sourceId)));

    const scoreMap = new Map<string, { content: string; score: number; metadata: any }>();
    for (const batch of allResults) {
      for (const doc of batch) {
        const existing = scoreMap.get(doc.content);
        if (!existing || doc.score > existing.score) {
          scoreMap.set(doc.content, doc);
        }
      }
    }

    const uniqueDocs = [...scoreMap.values()].sort((a, b) => b.score - a.score).slice(0, 10);
    if (uniqueDocs.length === 0) return 'هیچ رکورد مرتبطی یافت نشد.';

    collectedSources.push(...uniqueDocs.map((d) => d.content.split('\n')[0]));

    return uniqueDocs.map((d, i) => `[منبع ${i + 1}]\n${d.content}`).join('\n\n---\n\n');
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

  private buildSystemPrompt(
    domainSummary: string | null | undefined,
    knownFields: { idKey: string | null; dateKey: string | null } | null,
    hasStatsTool: boolean,
  ): string {
    const domainSection = domainSummary ? `توضیح کلی درباره این منبع داده: ${domainSummary}\n` : '';
    const fieldsLines = [
      knownFields?.idKey ? `فیلد شناسه‌ی موجودیت اصلی این منبع: ${knownFields.idKey}` : '',
      knownFields?.dateKey ? `فیلد تاریخ اصلی این منبع (برای سوالات روند زمانی از همین استفاده کن، نیازی به کشف نیست): ${knownFields.dateKey}` : '',
    ].filter(Boolean).join('\n');
    const fieldsSection = fieldsLines ? `${fieldsLines}\n\n` : '';

    const statsRule = hasStatsTool
      ? '- برای هر سوال آماری، شمارشی، درصدی، روندی، مقایسه‌ای یا "چند تا/چقدر/میانگین/مجموع/N مورد برتر" حتماً query_records را صدا بزن — هرگز این‌ها را از روی چند رکورد بازیابی‌شده حدس نزن\n- اگر کاربر یک بعد خاص را نام برده و اسم دقیق فیلدش را بالا (فیلد شناسه/فیلد تاریخ) یا در سوال نمی‌بینی، اول query_records را بدون groupBy صدا بزن تا فیلدها را کشف کنی، بعد حتماً یک بار دیگر با groupBy دقیق صدا بزن — توقف قبل از این مرحله‌ی دوم یعنی پاسخ ناقص است\n'
      : '';

    return `تو یک دستیار تحلیلگر داده هستی که به یک منبع داده خاص (که می‌تواند CRM، تیکت‌های پشتیبانی، سفارشات، بیمه‌نامه یا هر داده ساختاریافته دیگری باشد) دسترسی داری و از ابزارهای در دسترس برای پاسخ به سوالات استفاده می‌کنی.

${domainSection}${fieldsSection}قوانین مهم:
${statsRule}- برای پیدا کردن یک مورد خاص، شخص، شناسه یا موضوع از search_records استفاده کن
- فقط بر اساس نتیجه‌ی ابزارها پاسخ بده، نه دانش عمومی خودت یا حدس
- هرگز عدد، درصد یا لیستی که مستقیماً از خروجی یک ابزار نگرفته‌ای را در پاسخ ننویس؛ اگر ابزار خطا داد یا گفت فیلدی وجود ندارد، دوباره با روش درست تلاش کن یا صادقانه بگو نمی‌دانی — هیچ‌وقت به‌جای آن عدد نساز
- اگر اطلاعات کافی نداری بگو: "اطلاعات کافی در دسترس نیست"
- اعداد، ارقام و شناسه‌ها را دقیقاً همان‌طور که از ابزار گرفتی گزارش کن، تغییرشان نده یا گرد نکن
- پاسخ نهایی را به فارسی، دقیق و مختصر بده؛ اگر چند مورد وجود دارد به‌صورت لیست نمایش بده
- اگر رکوردی چند بار با وضعیت‌های متفاوت (تاریخچه) آمده، آخرین وضعیت را به‌عنوان وضعیت فعلی در نظر بگیر مگر اینکه از روند تغییرات سوال شده باشد`;
  }
}

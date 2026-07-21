import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OllamaService } from '../llm/ollama.service';
import { SourceProfile } from './entities/source-profile.entity';
import { RagSource } from './entities/source.entity';

const SAMPLE_SIZE = 20;
const RECENT_PROFILES_FOR_CONTEXT = 5;

interface ParsedProfile {
  domainSummary?: string;
  idKey?: string | null;
  dateKey?: string | null;
  notes?: string;
}

@Injectable()
export class DataProfilerService {
  private readonly logger = new Logger(DataProfilerService.name);

  constructor(
    @InjectRepository(SourceProfile) private repo: Repository<SourceProfile>,
    private ollama: OllamaService,
  ) {}

  async getProfile(sourceId: string): Promise<SourceProfile | null> {
    return this.repo.findOneBy({ sourceId });
  }

  /** Fire-and-forget: analyzes a sample of records with the local model and stores a profile document for this source. */
  profileInBackground(source: RagSource, sampleRecords: any[]): void {
    if (sampleRecords.length === 0) return;
    this.run(source, sampleRecords).catch((err: any) => {
      this.logger.error(`[${source.name}] profiling failed: ${err.message}`);
    });
  }

  private async run(source: RagSource, sampleRecords: any[]): Promise<void> {
    await this.repo.upsert({ sourceId: source.id, status: 'pending' }, ['sourceId']);

    try {
      const priorContext = await this.buildPriorContext();
      const prompt = this.buildPrompt(source, sampleRecords, priorContext);
      const raw = await this.ollama.analyze(prompt);
      const parsed = this.parseResponse(raw);

      await this.repo.upsert(
        {
          sourceId: source.id,
          status: 'ready',
          domainSummary: parsed.domainSummary ?? null,
          idKey: parsed.idKey ?? null,
          dateKey: parsed.dateKey ?? null,
          notes: parsed.notes ?? null,
          rawResponse: raw,
          lastError: null,
        },
        ['sourceId'],
      );
      this.logger.log(
        `[${source.name}] profile ready — domain: "${parsed.domainSummary ?? '-'}", idKey: ${parsed.idKey ?? '-'}, dateKey: ${parsed.dateKey ?? '-'}`,
      );
    } catch (err: any) {
      await this.repo.upsert({ sourceId: source.id, status: 'error', lastError: err.message }, ['sourceId']);
      throw err;
    }
  }

  /** Digest of recently learned profiles, fed as few-shot context so profiling quality compounds as more sources get analyzed. */
  private async buildPriorContext(): Promise<string> {
    const recent = await this.repo.find({
      where: { status: 'ready' },
      order: { updatedAt: 'DESC' },
      take: RECENT_PROFILES_FOR_CONTEXT,
    });
    if (recent.length === 0) return '';

    const lines = recent.map(
      (p) => `- حوزه: ${p.domainSummary ?? 'نامشخص'} | فیلد شناسه: ${p.idKey ?? '-'} | فیلد تاریخ: ${p.dateKey ?? '-'}${p.notes ? ` | نکته: ${p.notes}` : ''}`,
    );
    return `تحلیل‌های قبلی که روی منابع داده مشابه انجام شده (برای کمک به تصمیم بهتر، الزاماً همان ساختار نیست):\n${lines.join('\n')}\n`;
  }

  private buildPrompt(source: RagSource, sampleRecords: any[], priorContext: string): string {
    const sampleJson = JSON.stringify(sampleRecords.slice(0, SAMPLE_SIZE), null, 2).slice(0, 6000);

    return `تو یک تحلیلگر داده هستی که ساختار رکوردهای ورودی به یک سیستم RAG را بررسی می‌کند تا بهترین استراتژی نمایه‌سازی را پیشنهاد دهد.
${priorContext}
نام منبع: ${source.name}
نمونه‌ای از رکوردها (${sampleRecords.length} رکورد کل، ${Math.min(sampleRecords.length, SAMPLE_SIZE)} نمونه نمایش داده شده):
${sampleJson}

فیلدها را با دقت بررسی کن. اگر یک فیلد شبیه شناسه است و مقدارش در چند رکورد تکرار شده (یعنی چند رکورد به یک موجودیت مربوط‌اند، مثل تاریخچه وضعیت یک تیکت)، آن را به‌عنوان idKey معرفی کن. اگر فیلدی تاریخ/زمان رویداد است، آن را dateKey معرفی کن.

فقط یک شیء JSON با دقیقاً این ساختار برگردان، بدون هیچ متن یا توضیح اضافه:
{
  "domainSummary": "توضیح یک یا دو جمله‌ای که این داده درباره چیست",
  "idKey": "نام فیلد شناسه تکرارشونده یا null",
  "dateKey": "نام فیلد تاریخ/زمان یا null",
  "notes": "یک نکته کوتاه که به پاسخ‌دهی بهتر روی این داده کمک می‌کند، یا رشته خالی"
}`;
  }

  private parseResponse(raw: string): ParsedProfile {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('پاسخ مدل شامل JSON معتبر نبود');
    const obj = JSON.parse(match[0]);
    const clean = (v: any): string | null => (typeof v === 'string' && v.trim() && v !== 'null' ? v.trim() : null);
    return {
      domainSummary: clean(obj.domainSummary) ?? undefined,
      idKey: clean(obj.idKey),
      dateKey: clean(obj.dateKey),
      notes: clean(obj.notes) ?? undefined,
    };
  }
}

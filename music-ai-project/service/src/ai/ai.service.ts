import { Injectable } from '@nestjs/common';
import { MusicSearchService, SearchResult } from '../music-search/music-search.service';

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:7998';
const LLM_MODEL = process.env.OLLAMA_LLM_MODEL || 'llama3.1';

@Injectable()
export class AiService {
  constructor(private musicSearch: MusicSearchService) {}

  async search(message: string): Promise<{ reply: string; tracks: SearchResult[] }> {
    const { searchQuery, replyMessage } = await this.interpret(message);
    const tracks = await this.musicSearch.search(searchQuery);
    return { reply: replyMessage, tracks };
  }

  private async interpret(message: string): Promise<{ searchQuery: string; replyMessage: string }> {
    const prompt = `تو یک دستیار هوشمند موزیک هستی که به زبان فارسی صحبت می‌کنی.
کاربر توضیح می‌دهد دلش چه آهنگ یا حس موسیقایی‌ای می‌خواهد. وظیفهٔ تو دو چیز است:
1. یک عبارت جستجوی مناسب انگلیسی یا فارسی برای یوتیوب بساز (searchQuery) که بهترین نتیجه را بدهد.
2. یک پاسخ کوتاه و دوستانهٔ فارسی (replyMessage) که نشان می‌دهد پیشنهادت چیست.

فقط و فقط یک JSON با همین دو کلید برگردان، بدون توضیح اضافه:
{"searchQuery": "...", "replyMessage": "..."}

درخواست کاربر: ${message}`;

    try {
      const resp = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: LLM_MODEL, prompt, stream: false, format: 'json' }),
      });
      if (!resp.ok) throw new Error('Ollama error');
      const data = await resp.json();
      const parsed = JSON.parse(data.response);
      if (parsed.searchQuery && parsed.replyMessage) {
        return { searchQuery: parsed.searchQuery, replyMessage: parsed.replyMessage };
      }
      throw new Error('invalid shape');
    } catch {
      return { searchQuery: message, replyMessage: `این‌ها رو برای «${message}» پیدا کردم:` };
    }
  }
}

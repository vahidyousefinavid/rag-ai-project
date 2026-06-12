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

  async ask(question: string, history: HistoryMessage[] = []): Promise<RagResult> {
    // Skip cache when conversation history is present — context changes the answer
    if (history.length === 0) {
      const cached = await this.redis.getRagResult(question);
      if (cached) {
        this.logger.debug(`[CACHE HIT] "${question.slice(0, 60)}"`);
        return cached;
      }
    }

    const queries = [
      question,
      `اطلاعات درباره ${question}`,
      `توضیح دهید ${question}`,
    ];

    const allResults = await Promise.all(queries.map((q) => this.vector.search(q, 5)));

    const seen = new Set<string>();
    const uniqueDocs = allResults.flat().filter((d) => {
      if (seen.has(d.content)) return false;
      seen.add(d.content);
      return true;
    });

    const context = uniqueDocs.map((d, i) => `[${i + 1}] ${d.content}`).join('\n\n');
    const sources = uniqueDocs.map((d) => d.content.slice(0, 150));

    const answer = await this.ollama.ask(this.buildPrompt(context, question, history));
    const result: RagResult = { answer, sources };

    if (history.length === 0) {
      await this.redis.setRagResult(question, result);
    }

    return result;
  }

  private buildPrompt(context: string, question: string, history: HistoryMessage[]): string {
    const historySection = history.length > 0
      ? `\nConversation so far:\n${history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}\n`
      : '';

    return `You are a helpful assistant. Answer ONLY based on the context below.
If the answer is not in the context, say "نمی‌دانم" and nothing else.
Answer in the same language as the question. Be concise and direct.
${historySection}
Context:
${context}

Question: ${question}

Answer:`.trim();
  }
}

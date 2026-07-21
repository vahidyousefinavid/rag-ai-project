import { Injectable } from "@nestjs/common";
import { Ollama, ChatOllama } from "@langchain/ollama";

const BASE_URL = "http://127.0.0.1:7998";
const MODEL = "llama3.1";

@Injectable()
export class OllamaService {
  private llm: Ollama;
  private chatModel: ChatOllama;

  constructor() {
    this.llm = new Ollama({
      baseUrl: BASE_URL,
      model: MODEL,
      temperature: 0.2,       // صفر = قطعی‌ترین پاسخ
      numPredict: 256,       // محدود کردن طول پاسخ — جلوگیری از hallucination
      repeatPenalty: 1.3,    // جلوگیری از تکرار بی‌معنی
    });

    // Chat-style model for tool-calling (the crawl agent): needs .bindTools(), which the
    // plain completion-style Ollama wrapper above doesn't support.
    this.chatModel = new ChatOllama({
      baseUrl: BASE_URL,
      model: MODEL,
      temperature: 0.1,
    });
  }

  async ask(prompt: string): Promise<string> {
    return this.llm.invoke(prompt);
  }

  /** Returns the shared chat model instance — callers bind their own tools per request via .bindTools(). */
  getChatModel(): ChatOllama {
    return this.chatModel;
  }
}

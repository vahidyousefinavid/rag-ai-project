import { Injectable } from "@nestjs/common";
import { Ollama } from "@langchain/ollama";

@Injectable()
export class OllamaService {
  private llm: Ollama;

  constructor() {
    this.llm = new Ollama({
      baseUrl: "http://127.0.0.1:7998",
      model: "llama3.1",
      temperature: 0.2,       // صفر = قطعی‌ترین پاسخ
      numPredict: 256,       // محدود کردن طول پاسخ — جلوگیری از hallucination
      repeatPenalty: 1.3,    // جلوگیری از تکرار بی‌معنی
    });
  }

  async ask(prompt: string): Promise<string> {
    return this.llm.invoke(prompt);
  }
}
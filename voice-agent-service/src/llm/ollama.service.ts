import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';

const BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:7998';
const MODEL = process.env.OLLAMA_LLM_MODEL || 'llama3.1';

@Injectable()
export class OllamaService {
  private chatModel: ChatOllama;

  constructor() {
    this.chatModel = new ChatOllama({
      baseUrl: BASE_URL,
      model: MODEL,
      temperature: 0.1,
    });
  }

  /** Returns the shared chat model instance — callers bind their own tools per request via .bindTools(). */
  getChatModel(): ChatOllama {
    return this.chatModel;
  }
}

import { Injectable } from "@nestjs/common";
import { VectorService } from "../vector/vector.service";
import { OllamaService } from "../llm/ollama.service";

@Injectable()
export class RagService {
  private vectorStore: any;

  constructor(
    private vectorService: VectorService,
    private ollama: OllamaService
  ) { }

  async ask(question: string): Promise<string> {
    if (!this.vectorStore) {
      this.vectorStore = await this.vectorService.getStore();
    }

    const queries = [
      question,
      `اطلاعات درباره ${question}`,
      `توضیح دهید ${question}`
    ];

    let docs: any[] = [];

    for (const q of queries) {
      const res = await this.vectorStore.similaritySearch(q, 5);
      docs.push(...res);
    }

    const uniqueDocs = Array.from(
      new Map(docs.map(d => [d.pageContent, d])).values()
    );

    const context = uniqueDocs
      .map((doc, i) => `Source ${i + 1}: ${doc.pageContent}`)
      .join("\n\n");

    console.log("QUESTION:", question);
    console.log("RETRIEVED DOCS:", uniqueDocs);

    return this.ollama.ask(this.buildPrompt(context, question));
  }

  private buildPrompt(context: string, question: string): string {
    return `You are a helpful assistant. Answer ONLY based on the provided context below.
If the answer is not in the context, say "نمی‌دانم" and nothing else.
Answer in the same language as the question.
Be concise and direct.

Context:
${context}

Question: ${question}

Answer:`.trim();
  }
}
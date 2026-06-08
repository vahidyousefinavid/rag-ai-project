import { Injectable } from "@nestjs/common";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Document } from "@langchain/core/documents";

@Injectable()
export class VectorService {
    private store: Chroma | null = null;

    private embeddings = new OllamaEmbeddings({
        baseUrl: "http://127.0.0.1:7998",
        model: "bge-m3",
    });

    async createVectorStore(splitDocs: Document[]): Promise<void> {
        // اول collection قدیمی رو حذف کن
        try {
            const { ChromaClient } = await import("chromadb");
            const client = new ChromaClient({ path: "http://localhost:8000" });
            await client.deleteCollection({ name: "rag-demo" });
            // console.log("🗑️ Old collection deleted");
        } catch {
            console.log("ℹ️ No existing collection to delete");
        }

        console.log(`📥 Ingesting ${splitDocs.length} chunks...`);

        this.store = await Chroma.fromDocuments(splitDocs, this.embeddings, {
            collectionName: "rag-demo",
            url: "http://localhost:8000",
            collectionMetadata: { "hnsw:space": "cosine" },
        });

        const count = await this.store.collection?.count();
        console.log(`✅ Chroma collection has ${count} documents`);
    }

    async getStore(): Promise<Chroma> {
        // دیباگ
        console.log("🔎 getStore called, store is:", this.store ? "ready" : "NULL");

        if (this.store) return this.store;
        throw new Error("VectorStore هنوز آماده نشده");
    }
}
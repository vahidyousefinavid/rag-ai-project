import { Injectable, OnModuleInit } from "@nestjs/common";
import { splitter } from "../utils/splitter";
import { docs } from "../data/documents";
import { VectorService } from "../vector/vector.service";

@Injectable()
export class IngestService implements OnModuleInit {

  constructor(
    private vectorService: VectorService
  ) {}

  async onModuleInit() {

    console.log("Starting document ingestion...");

    const splitDocs = await splitter.splitDocuments(docs);

    await this.vectorService.createVectorStore(splitDocs);

    console.log("✅ Ingestion completed");

  }
}

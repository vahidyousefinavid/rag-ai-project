import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { splitter } from '../utils/splitter';
import { docs } from '../data/documents';
import { VectorService } from '../vector/vector.service';

@Injectable()
export class IngestService implements OnModuleInit {
  private readonly logger = new Logger(IngestService.name);

  constructor(private vector: VectorService) {}

  async onModuleInit() {
    this.logger.log('Starting document ingestion into Qdrant...');
    await this.vector.recreateCollection();
    const splitDocs = await splitter.splitDocuments(docs);
    await this.vector.upsertDocuments(splitDocs);
    this.logger.log(`✅ Ingestion complete: ${splitDocs.length} chunks indexed`);
  }
}

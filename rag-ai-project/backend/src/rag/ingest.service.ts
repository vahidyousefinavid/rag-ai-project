import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { splitter } from '../utils/splitter';
import { docs } from '../data/documents';
import { VectorService } from '../vector/vector.service';

@Injectable()
export class IngestService implements OnModuleInit {
  private readonly logger = new Logger(IngestService.name);

  constructor(private vector: VectorService) {}

  async onModuleInit() {
    const count = await this.vector.countPoints();
    if (count > 0) {
      this.logger.log(`Qdrant already has ${count} points — skipping static ingestion`);
      return;
    }

    this.logger.log('Collection empty — ingesting static documents...');
    const splitDocs = await splitter.splitDocuments(docs);
    await this.vector.upsertDocuments(splitDocs);
    this.logger.log(`✅ Ingestion complete: ${splitDocs.length} chunks indexed`);
  }
}

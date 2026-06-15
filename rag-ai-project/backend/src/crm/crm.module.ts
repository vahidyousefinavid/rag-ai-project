import { Module } from '@nestjs/common';
import { CrmIngestService } from './crm-ingest.service';
import { CrmController } from './crm.controller';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [RagModule],
  providers: [CrmIngestService],
  controllers: [CrmController],
})
export class CrmModule {}

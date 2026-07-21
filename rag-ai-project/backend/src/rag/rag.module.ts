import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { IngestService } from './ingest.service';
import { VectorService } from '../vector/vector.service';
import { OllamaService } from '../llm/ollama.service';
import { RedisService } from '../cache/redis.service';
import { SourcesModule } from '../sources/sources.module';

@Module({
  imports: [SourcesModule],
  controllers: [RagController],
  providers: [RagService, IngestService, VectorService, OllamaService, RedisService],
  exports: [RagService, VectorService, RedisService],
})
export class RagModule {}

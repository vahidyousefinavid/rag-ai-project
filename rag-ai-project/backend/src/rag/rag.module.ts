import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { IngestService } from './ingest.service';
import { VectorService } from '../vector/vector.service';
import { OllamaService } from '../llm/ollama.service';
import { RedisService } from '../cache/redis.service';

@Module({
  controllers: [RagController],
  providers: [RagService, IngestService, VectorService, OllamaService, RedisService],
  exports: [RagService],
})
export class RagModule {}

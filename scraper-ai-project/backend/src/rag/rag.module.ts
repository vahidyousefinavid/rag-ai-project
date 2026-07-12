import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { VectorService } from '../vector/vector.service';
import { OllamaService } from '../llm/ollama.service';
import { RedisService } from '../cache/redis.service';
import { MonitorTarget } from '../monitor/entities/monitor-target.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MonitorTarget])],
  controllers: [RagController],
  providers: [RagService, VectorService, OllamaService, RedisService],
  exports: [RagService, VectorService, RedisService],
})
export class RagModule {}

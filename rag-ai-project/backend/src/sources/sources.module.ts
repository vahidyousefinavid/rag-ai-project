import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RagSource } from './entities/source.entity';
import { SourceProfile } from './entities/source-profile.entity';
import { SourcesService } from './sources.service';
import { SourcesController } from './sources.controller';
import { DataProfilerService } from './data-profiler.service';
import { StatsService } from './stats.service';
import { VectorService } from '../vector/vector.service';
import { RedisService } from '../cache/redis.service';
import { OllamaService } from '../llm/ollama.service';

@Module({
  imports: [TypeOrmModule.forFeature([RagSource, SourceProfile])],
  controllers: [SourcesController],
  providers: [SourcesService, DataProfilerService, StatsService, VectorService, RedisService, OllamaService],
  exports: [SourcesService, DataProfilerService, StatsService],
})
export class SourcesModule {}

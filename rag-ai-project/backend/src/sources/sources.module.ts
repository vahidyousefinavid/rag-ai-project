import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RagSource } from './entities/source.entity';
import { SourcesService } from './sources.service';
import { SourcesController } from './sources.controller';
import { VectorService } from '../vector/vector.service';
import { RedisService } from '../cache/redis.service';

@Module({
  imports: [TypeOrmModule.forFeature([RagSource])],
  controllers: [SourcesController],
  providers: [SourcesService, VectorService, RedisService],
  exports: [SourcesService],
})
export class SourcesModule {}

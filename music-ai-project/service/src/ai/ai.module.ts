import { Module } from '@nestjs/common';
import { MusicSearchModule } from '../music-search/music-search.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [MusicSearchModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}

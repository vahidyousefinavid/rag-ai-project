import { Module } from '@nestjs/common';
import { MusicSearchController } from './music-search.controller';
import { MusicSearchService } from './music-search.service';
import { YoutubeSearchService } from './youtube-search.service';
import { JamendoSearchService } from './jamendo-search.service';

@Module({
  controllers: [MusicSearchController],
  providers: [MusicSearchService, YoutubeSearchService, JamendoSearchService],
  exports: [MusicSearchService],
})
export class MusicSearchModule {}

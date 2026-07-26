import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { YoutubeSearchService } from './youtube-search.service';
import { JamendoSearchService } from './jamendo-search.service';
import { SearchResult } from './types';

export { SearchResult } from './types';

@Injectable()
export class MusicSearchService {
  constructor(
    private youtube: YoutubeSearchService,
    private jamendo: JamendoSearchService,
  ) {}

  async search(query: string): Promise<SearchResult[]> {
    if (!this.youtube.configured && !this.jamendo.configured) {
      throw new ServiceUnavailableException('هیچ منبع جستجویی تنظیم نشده (YOUTUBE_API_KEY یا JAMENDO_CLIENT_ID)');
    }

    const [ytResults, jamendoResults] = await Promise.all([
      this.youtube.search(query).catch(() => [] as SearchResult[]),
      this.jamendo.search(query).catch(() => [] as SearchResult[]),
    ]);

    return interleave(ytResults, jamendoResults);
  }
}

function interleave(a: SearchResult[], b: SearchResult[]): SearchResult[] {
  const out: SearchResult[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

import { Injectable } from '@nestjs/common';
import { SearchResult } from './types';

const YT_API = 'https://youtube.googleapis.com/youtube/v3';

function parseIsoDuration(iso: string): number | null {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return null;
  const [, h, min, s] = m;
  return (Number(h) || 0) * 3600 + (Number(min) || 0) * 60 + (Number(s) || 0);
}

@Injectable()
export class YoutubeSearchService {
  private get apiKey() {
    return process.env.YOUTUBE_API_KEY || '';
  }

  get configured() {
    return !!this.apiKey;
  }

  async search(query: string, maxResults = 10): Promise<SearchResult[]> {
    if (!this.apiKey) return [];

    const searchUrl = new URL(`${YT_API}/search`);
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('videoCategoryId', '10'); // Music
    searchUrl.searchParams.set('maxResults', String(maxResults));
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('key', this.apiKey);

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();

    const items: any[] = searchData.items || [];
    const videoIds = items.map((i) => i.id?.videoId).filter(Boolean);
    if (videoIds.length === 0) return [];

    const durations = await this.fetchDurations(videoIds);

    return items
      .filter((i) => i.id?.videoId)
      .map((i) => ({
        provider: 'youtube' as const,
        providerId: i.id.videoId as string,
        title: i.snippet?.title as string,
        artist: i.snippet?.channelTitle as string,
        thumbnail: i.snippet?.thumbnails?.medium?.url || i.snippet?.thumbnails?.default?.url || '',
        durationSec: durations[i.id.videoId] ?? null,
      }));
  }

  private async fetchDurations(videoIds: string[]): Promise<Record<string, number | null>> {
    const url = new URL(`${YT_API}/videos`);
    url.searchParams.set('part', 'contentDetails');
    url.searchParams.set('id', videoIds.join(','));
    url.searchParams.set('key', this.apiKey);

    const res = await fetch(url);
    if (!res.ok) return {};
    const data = await res.json();
    const map: Record<string, number | null> = {};
    for (const item of data.items || []) {
      map[item.id] = parseIsoDuration(item.contentDetails?.duration || '');
    }
    return map;
  }
}

import { Injectable } from '@nestjs/common';
import { SearchResult } from './types';

const JAMENDO_API = 'https://api.jamendo.com/v3.0';

@Injectable()
export class JamendoSearchService {
  private get clientId() {
    return process.env.JAMENDO_CLIENT_ID || '';
  }

  get configured() {
    return !!this.clientId;
  }

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    if (!this.clientId) return [];

    const url = new URL(`${JAMENDO_API}/tracks/`);
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('namesearch', query);
    url.searchParams.set('audioformat', 'mp32');

    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const results: any[] = data.results || [];

    return results
      .filter((t) => t.audio)
      .map((t) => ({
        provider: 'jamendo' as const,
        providerId: String(t.id),
        title: t.name as string,
        artist: t.artist_name as string,
        thumbnail: t.album_image || t.image || '',
        durationSec: typeof t.duration === 'number' ? t.duration : null,
        streamUrl: t.audio as string,
      }));
  }
}

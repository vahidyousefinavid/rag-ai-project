export type MusicProvider = 'youtube' | 'jamendo';

export interface SearchResult {
  provider: MusicProvider;
  providerId: string;
  title: string;
  artist: string;
  thumbnail: string;
  durationSec: number | null;
  /** Direct, legally-licensed stream URL — only set for providers that don't need an embedded player (e.g. Jamendo). */
  streamUrl?: string;
}

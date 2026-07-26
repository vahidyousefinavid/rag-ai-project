const BASE = '/api';

function token() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('mtoken') || '';
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    register: (d: { phone: string; name: string }) => req<AuthRes>('POST', '/auth/register', d),
    login: (phone: string) => req<AuthRes>('POST', '/auth/login', { phone }),
  },
  search: {
    query: (q: string) => req<SearchResult[]>('GET', `/search?q=${encodeURIComponent(q)}`),
  },
  ai: {
    search: (message: string) => req<{ reply: string; tracks: SearchResult[] }>('POST', '/ai/search', { message }),
  },
  library: {
    list: () => req<Track[]>('GET', '/library'),
    add: (t: SearchResult) => req<Track>('POST', '/library', {
      provider: t.provider, providerId: t.providerId, title: t.title, artist: t.artist,
      thumbnailUrl: t.thumbnail, durationSec: t.durationSec ?? undefined, streamUrl: t.streamUrl,
    }),
    remove: (id: string) => req<void>('DELETE', `/library/${id}`),
  },
  playlists: {
    list: () => req<Playlist[]>('GET', '/playlists'),
    create: (name: string, color?: string) => req<Playlist>('POST', '/playlists', { name, color }),
    remove: (id: string) => req<void>('DELETE', `/playlists/${id}`),
    detail: (id: string) => req<PlaylistDetail>('GET', `/playlists/${id}`),
    addTrack: (id: string, trackId: string) => req<void>('POST', `/playlists/${id}/tracks`, { trackId }),
    removeTrack: (id: string, trackId: string) => req<void>('DELETE', `/playlists/${id}/tracks/${trackId}`),
  },
};

export type MusicProvider = 'youtube' | 'jamendo';

export interface AuthRes { access_token: string; user: User }
export interface User { id: string; phone: string; name: string }

export interface SearchResult {
  provider: MusicProvider;
  providerId: string;
  title: string;
  artist: string;
  thumbnail: string;
  durationSec: number | null;
  /** Direct, legally-licensed stream URL — only set for non-embedded providers (e.g. Jamendo). */
  streamUrl?: string;
}

export interface Track {
  id: string;
  provider: MusicProvider;
  providerId: string;
  title: string;
  artist?: string;
  thumbnailUrl?: string;
  durationSec?: number;
  streamUrl?: string;
  createdAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  color: string;
  trackCount: number;
  createdAt: string;
}

export interface PlaylistDetail extends Playlist {
  tracks: Track[];
}

export function formatDuration(sec?: number | null): string {
  if (!sec && sec !== 0) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

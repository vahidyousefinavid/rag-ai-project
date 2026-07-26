'use client';
import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import YouTube from 'react-youtube';

export type MusicProvider = 'youtube' | 'jamendo' | 'local';

export interface PlayerTrack {
  provider: MusicProvider;
  providerId: string;
  title: string;
  artist?: string;
  thumbnailUrl?: string;
  durationSec?: number;
  /** Required when provider !== 'youtube' — a direct, legally-licensed audio URL. */
  streamUrl?: string;
}

interface PlayerCtx {
  current: PlayerTrack | null;
  isPlaying: boolean;
  error: string | null;
  hasNext: boolean;
  hasPrev: boolean;
  play: (track: PlayerTrack, queue?: PlayerTrack[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
}

const Ctx = createContext<PlayerCtx | null>(null);

function sameTrack(a: PlayerTrack, b: PlayerTrack) {
  return a.provider === b.provider && a.providerId === b.providerId;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ytRef = useRef<any>(null);
  const ytReadyRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const current = queue[index] ?? null;

  const play = useCallback((track: PlayerTrack, list?: PlayerTrack[]) => {
    const q = list && list.length ? list : [track];
    const idx = Math.max(0, q.findIndex(t => sameTrack(t, track)));
    setError(null);
    setQueue(q);
    setIndex(idx);
  }, []);

  // Keep a ref mirror of the queue for use inside stable callbacks (onEnd handlers).
  const queueRef = useRef(queue);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  const goTo = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= queueRef.current.length) return;
    setError(null);
    setIndex(newIndex);
  }, []);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  const handleEnd = useCallback(() => {
    setIndex(i => {
      const q = queueRef.current;
      if (i + 1 < q.length) return i + 1;
      setIsPlaying(false);
      return i;
    });
  }, []);

  // Load whichever track is current into the right playback engine, pausing the other.
  useEffect(() => {
    if (!current) return;
    if (current.provider === 'youtube') {
      audioRef.current?.pause();
      if (ytReadyRef.current) ytRef.current?.loadVideoById(current.providerId);
    } else {
      ytRef.current?.pauseVideo?.();
      const el = audioRef.current;
      if (el && current.streamUrl) {
        el.src = current.streamUrl;
        el.play().catch(() => {});
      }
    }
    setIsPlaying(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.provider, current?.providerId]);

  const toggle = useCallback(() => {
    if (!current) return;
    if (current.provider === 'youtube') {
      if (!ytRef.current) return;
      if (isPlaying) { ytRef.current.pauseVideo(); setIsPlaying(false); }
      else { ytRef.current.playVideo(); setIsPlaying(true); }
    } else {
      const el = audioRef.current;
      if (!el) return;
      if (isPlaying) { el.pause(); setIsPlaying(false); }
      else { el.play(); setIsPlaying(true); }
    }
  }, [isPlaying, current]);

  function onYtReady(e: any) {
    ytRef.current = e.target;
    ytReadyRef.current = true;
    if (current?.provider === 'youtube') e.target.loadVideoById(current.providerId);
  }

  function onYtError() {
    setError('پخش این آهنگ در یوتیوب امکان‌پذیر نیست، رفتیم سراغ بعدی');
    handleEnd();
  }

  function onYtStateChange(e: any) {
    if (current?.provider !== 'youtube') return;
    if (e.data === 1) setIsPlaying(true);
    if (e.data === 2) setIsPlaying(false);
  }

  function onAudioError() {
    if (current && current.provider !== 'youtube') {
      setError('پخش این آهنگ امکان‌پذیر نیست، رفتیم سراغ بعدی');
      handleEnd();
    }
  }

  return (
    <Ctx.Provider value={{
      current, isPlaying, error,
      hasNext: index + 1 < queue.length,
      hasPrev: index > 0,
      play, toggle, next, prev,
    }}>
      {children}
      <div style={{ position: 'fixed', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none', bottom: 0, insetInlineStart: 0 }}>
        <YouTube
          opts={{ height: '1', width: '1', playerVars: { autoplay: 1 } }}
          onReady={onYtReady}
          onEnd={handleEnd}
          onError={onYtError}
          onStateChange={onYtStateChange}
        />
        <audio
          ref={audioRef}
          onEnded={handleEnd}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={onAudioError}
        />
      </div>
    </Ctx.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}

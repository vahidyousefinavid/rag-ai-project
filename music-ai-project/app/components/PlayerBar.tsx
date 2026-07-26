'use client';
import { usePlayer } from '@/contexts/PlayerContext';
import { C } from './ui';
import { PlayIcon, PauseIcon, SkipNextIcon, SkipPrevIcon, MusicIcon } from './icons';

export default function PlayerBar() {
  const { current, isPlaying, error, hasNext, hasPrev, toggle, next, prev } = usePlayer();

  if (!current) return null;

  return (
    <div
      style={{
        position: 'fixed', bottom: 64, left: 0, right: 0, zIndex: 39,
        background: 'rgba(28,18,48,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${C.border}`,
        padding: '9px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
        background: C.surfaceSolid, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {current.thumbnailUrl
          ? <img src={current.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <MusicIcon size={18} color={C.muted} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {current.title}
        </p>
        <p style={{ margin: 0, fontSize: 10.5, fontWeight: 500, color: error ? '#F87171' : C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {error || current.artist || ''}
        </p>
      </div>

      <button
        type="button" onClick={prev} disabled={!hasPrev} aria-label="قبلی"
        style={{ background: 'none', border: 'none', color: hasPrev ? C.text : C.subtle, cursor: hasPrev ? 'pointer' : 'default', padding: 4 }}
      >
        <SkipPrevIcon size={18} />
      </button>

      <button
        type="button" onClick={toggle} aria-label={isPlaying ? 'مکث' : 'پخش'}
        style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDark})`,
          border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 14px ${C.purpleGlow}`, cursor: 'pointer',
        }}
      >
        {isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
      </button>

      <button
        type="button" onClick={next} disabled={!hasNext} aria-label="بعدی"
        style={{ background: 'none', border: 'none', color: hasNext ? C.text : C.subtle, cursor: hasNext ? 'pointer' : 'default', padding: 4 }}
      >
        <SkipNextIcon size={18} />
      </button>
    </div>
  );
}

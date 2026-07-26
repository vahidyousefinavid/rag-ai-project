'use client';
import { C } from './ui';
import { MusicIcon, PlayIcon, PauseIcon } from './icons';
import { formatDuration } from '@/lib/api';
import { usePlayer, MusicProvider } from '@/contexts/PlayerContext';

export default function TrackRow({
  provider, providerId, title, subtitle, thumbnailUrl, durationSec, onPlay, actions,
}: {
  provider: MusicProvider;
  providerId: string;
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  durationSec?: number | null;
  onPlay: () => void;
  actions?: React.ReactNode;
}) {
  const { current, isPlaying } = usePlayer();
  const isCurrent = current?.provider === provider && current?.providerId === providerId;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px' }}>
      <button
        type="button" onClick={onPlay} aria-label="پخش"
        style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
          background: C.surfaceSolid, border: 'none', cursor: 'pointer', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {thumbnailUrl
          ? <img src={thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <MusicIcon size={18} color={C.muted} />}
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
          opacity: isCurrent ? 1 : 0, transition: 'opacity 0.15s',
        }}>
          {isCurrent && isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
        </div>
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 13, fontWeight: 700, color: isCurrent ? C.purple : C.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{title}</p>
        <p style={{
          margin: 0, fontSize: 11, fontWeight: 500, color: C.muted,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {subtitle}{durationSec ? ` · ${formatDuration(durationSec)}` : ''}
          {provider === 'jamendo' ? ' · Jamendo (CC)' : ''}
          {provider === 'local' ? ' · حافظهٔ گوشی' : ''}
        </p>
      </div>

      {actions}
    </div>
  );
}

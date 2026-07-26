'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRequireAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { api, PlaylistDetail } from '@/lib/api';
import { C, IconButton, Button } from '@/components/ui';
import { TrashIcon, PlayIcon, ChevronRightIcon, MusicIcon } from '@/components/icons';
import TrackRow from '@/components/TrackRow';
import BottomNav from '@/components/BottomNav';
import PlayerBar from '@/components/PlayerBar';
import Link from 'next/link';

export default function PlaylistDetailPage() {
  const { user, ready } = useRequireAuth();
  const { play } = usePlayer();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !user) return;
    api.playlists.detail(params.id).then(setPlaylist).finally(() => setLoading(false));
  }, [ready, user, params.id]);

  if (!ready || !user) return null;

  const toPlayerTrack = (t: PlaylistDetail['tracks'][number]) => ({
    provider: t.provider, providerId: t.providerId, title: t.title, artist: t.artist,
    thumbnailUrl: t.thumbnailUrl, durationSec: t.durationSec, streamUrl: t.streamUrl,
  });

  function playAll() {
    if (!playlist || playlist.tracks.length === 0) return;
    const list = playlist.tracks.map(toPlayerTrack);
    play(list[0], list);
  }

  async function removeTrack(trackId: string) {
    if (!playlist) return;
    await api.playlists.removeTrack(playlist.id, trackId);
    setPlaylist({ ...playlist, tracks: playlist.tracks.filter(t => t.id !== trackId) });
  }

  async function deletePlaylist() {
    if (!playlist) return;
    if (!confirm(`دسته‌بندی «${playlist.name}» حذف بشه؟`)) return;
    await api.playlists.remove(playlist.id);
    router.replace('/playlists');
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 150 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px 12px' }}>
        <Link href="/playlists" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: C.muted, fontSize: 12.5, textDecoration: 'none', marginBottom: 14 }}>
          <ChevronRightIcon size={16} style={{ transform: 'rotate(180deg)' }} />
          دسته‌بندی‌ها
        </Link>

        {loading && <p style={{ color: C.muted, fontSize: 13 }}>در حال بارگذاری...</p>}

        {playlist && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, background: `${playlist.color}22`,
                border: `1px solid ${playlist.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: playlist.color, flexShrink: 0,
              }}><MusicIcon size={26} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: '0 0 3px' }}>{playlist.name}</h1>
                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{playlist.tracks.length} آهنگ</p>
              </div>
              <IconButton label="حذف دسته‌بندی" onClick={deletePlaylist}>
                <TrashIcon size={16} />
              </IconButton>
            </div>

            {playlist.tracks.length > 0 && (
              <Button icon={<PlayIcon size={14} />} onClick={playAll} style={{ marginBottom: 16 }}>
                پخش همه
              </Button>
            )}

            {playlist.tracks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: C.subtle }}>
                <MusicIcon size={40} />
                <p style={{ fontSize: 13, marginTop: 10 }}>هنوز آهنگی به این دسته‌بندی اضافه نشده. از کتابخانه اضافه کن.</p>
              </div>
            )}

            {playlist.tracks.length > 0 && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '4px 10px' }}>
                {playlist.tracks.map((t, i) => (
                  <TrackRow
                    key={t.id}
                    provider={t.provider}
                    providerId={t.providerId}
                    title={t.title}
                    subtitle={t.artist}
                    thumbnailUrl={t.thumbnailUrl}
                    durationSec={t.durationSec}
                    onPlay={() => {
                      const list = playlist.tracks.map(toPlayerTrack);
                      play(list[i], list);
                    }}
                    actions={
                      <IconButton label="حذف از دسته‌بندی" onClick={() => removeTrack(t.id)} size={32}>
                        <TrashIcon size={15} />
                      </IconButton>
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <PlayerBar />
      <BottomNav />
    </div>
  );
}

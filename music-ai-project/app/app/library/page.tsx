'use client';
import { useEffect, useRef, useState } from 'react';
import { useRequireAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { api, Track, Playlist } from '@/lib/api';
import { addLocalFiles, listLocalTracks, removeLocalTrack, LocalTrackRecord } from '@/lib/localLibrary';
import { C, IconButton, Button } from '@/components/ui';
import { TrashIcon, PlusIcon, LibraryIcon, PhoneIcon } from '@/components/icons';
import TrackRow from '@/components/TrackRow';
import BottomNav from '@/components/BottomNav';
import PlayerBar from '@/components/PlayerBar';

interface LocalUiTrack extends LocalTrackRecord {
  url: string;
  durationSec?: number;
}

export default function LibraryPage() {
  const { user, ready } = useRequireAuth();
  const { play } = usePlayer();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [pickerFor, setPickerFor] = useState<Track | null>(null);

  const [localTracks, setLocalTracks] = useState<LocalUiTrack[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ready || !user) return;
    api.library.list().then(setTracks).finally(() => setLoading(false));
    api.playlists.list().then(setPlaylists).catch(() => {});
  }, [ready, user]);

  useEffect(() => {
    if (!ready || !user) return;
    listLocalTracks().then(recs => {
      const withUrls = recs.map(toUiTrack);
      setLocalTracks(withUrls);
      withUrls.forEach(probeDuration);
      setLocalLoading(false);
    });
    // Object URLs are intentionally not revoked on unmount — a track from this list may still be
    // playing via the persistent player bar on another page. They're released when the tab closes,
    // or explicitly on removeLocal().
  }, [ready, user]);

  if (!ready || !user) return null;

  function toUiTrack(rec: LocalTrackRecord): LocalUiTrack {
    return { ...rec, url: URL.createObjectURL(rec.blob) };
  }

  function probeDuration(t: LocalUiTrack) {
    const el = new Audio(t.url);
    el.addEventListener('loadedmetadata', () => {
      setLocalTracks(prev => prev.map(x => (x.id === t.id ? { ...x, durationSec: el.duration } : x)));
    }, { once: true });
  }

  async function onFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const added = await addLocalFiles(files);
    e.target.value = '';
    const withUrls = added.map(toUiTrack);
    setLocalTracks(prev => [...withUrls, ...prev]);
    withUrls.forEach(probeDuration);
  }

  async function removeLocal(id: string) {
    await removeLocalTrack(id);
    setLocalTracks(prev => {
      const rec = prev.find(t => t.id === id);
      if (rec) URL.revokeObjectURL(rec.url);
      return prev.filter(t => t.id !== id);
    });
  }

  function playLocal(t: LocalUiTrack) {
    const toPlayerTrack = (x: LocalUiTrack) => ({
      provider: 'local' as const, providerId: x.id, title: x.name,
      streamUrl: x.url, durationSec: x.durationSec,
    });
    play(toPlayerTrack(t), localTracks.map(toPlayerTrack));
  }

  function playTrack(t: Track) {
    const toPlayerTrack = (x: Track) => ({
      provider: x.provider, providerId: x.providerId, title: x.title, artist: x.artist,
      thumbnailUrl: x.thumbnailUrl, durationSec: x.durationSec, streamUrl: x.streamUrl,
    });
    play(toPlayerTrack(t), tracks.map(toPlayerTrack));
  }

  async function remove(id: string) {
    await api.library.remove(id);
    setTracks(ts => ts.filter(t => t.id !== id));
  }

  async function addToPlaylist(playlistId: string) {
    if (!pickerFor) return;
    try {
      await api.playlists.addTrack(playlistId, pickerFor.id);
    } catch {}
    setPickerFor(null);
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 150 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 12px' }}>
        <h1 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: '0 0 4px' }}>کتابخانهٔ من</h1>
        <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 18px' }}>آهنگ‌هایی که ذخیره کردی</p>

        {loading && <p style={{ color: C.muted, fontSize: 13 }}>در حال بارگذاری...</p>}

        {!loading && tracks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: C.subtle }}>
            <LibraryIcon size={40} />
            <p style={{ fontSize: 13, marginTop: 10 }}>هنوز آهنگی ذخیره نکردی. از صفحهٔ خانه یه چیزی پیدا کن!</p>
          </div>
        )}

        {tracks.length > 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '4px 10px', marginBottom: 26 }}>
            {tracks.map(t => (
              <TrackRow
                key={t.id}
                provider={t.provider}
                providerId={t.providerId}
                title={t.title}
                subtitle={t.artist}
                thumbnailUrl={t.thumbnailUrl}
                durationSec={t.durationSec}
                onPlay={() => playTrack(t)}
                actions={
                  <div style={{ display: 'flex', gap: 6 }}>
                    <IconButton label="افزودن به دسته‌بندی" onClick={() => setPickerFor(t)} size={32}>
                      <PlusIcon size={15} />
                    </IconButton>
                    <IconButton label="حذف" onClick={() => remove(t.id)} size={32}>
                      <TrashIcon size={15} />
                    </IconButton>
                  </div>
                }
              />
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: 0 }}>آهنگ‌های این دستگاه</h2>
            <p style={{ fontSize: 11.5, color: C.muted, margin: '3px 0 0' }}>
              مستقیماً از حافظهٔ گوشی پخش می‌شه؛ فقط روی همین مرورگر/دستگاه ذخیره می‌مونه
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef} type="file" accept="audio/*" multiple hidden
          onChange={onFilesPicked}
        />
        <Button
          variant="secondary" size="sm" icon={<PhoneIcon size={15} />}
          onClick={() => fileInputRef.current?.click()}
          style={{ margin: '12px 0' }}
        >
          افزودن از حافظهٔ گوشی
        </Button>

        {localLoading && <p style={{ color: C.muted, fontSize: 13 }}>در حال بارگذاری...</p>}

        {!localLoading && localTracks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: C.subtle }}>
            <PhoneIcon size={36} />
            <p style={{ fontSize: 13, marginTop: 10 }}>هنوز آهنگی از گوشی اضافه نکردی.</p>
          </div>
        )}

        {localTracks.length > 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '4px 10px' }}>
            {localTracks.map(t => (
              <TrackRow
                key={t.id}
                provider="local"
                providerId={t.id}
                title={t.name}
                durationSec={t.durationSec}
                onPlay={() => playLocal(t)}
                actions={
                  <IconButton label="حذف" onClick={() => removeLocal(t.id)} size={32}>
                    <TrashIcon size={15} />
                  </IconButton>
                }
              />
            ))}
          </div>
        )}
      </div>

      {pickerFor && (
        <div
          onClick={() => setPickerFor(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 560, margin: '0 auto', background: C.surfaceSolid,
              borderRadius: '20px 20px 0 0', padding: '18px 16px', border: `1px solid ${C.borderStrong}`,
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: '0 0 12px' }}>افزودن «{pickerFor.title}» به کدام دسته‌بندی؟</p>
            {playlists.length === 0 && <p style={{ fontSize: 12.5, color: C.muted }}>هنوز دسته‌بندی‌ای نساختی.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {playlists.map(p => (
                <button
                  key={p.id} type="button" onClick={() => addToPlaylist(p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12,
                    background: C.surface2, border: `1px solid ${C.border}`, color: C.text,
                    fontFamily: 'Vazirmatn, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                  {p.name}
                  <span style={{ marginInlineStart: 'auto', color: C.subtle, fontSize: 11 }}>{p.trackCount} آهنگ</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <PlayerBar />
      <BottomNav />
    </div>
  );
}

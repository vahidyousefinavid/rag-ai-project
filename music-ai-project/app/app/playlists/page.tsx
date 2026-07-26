'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/contexts/AuthContext';
import { api, Playlist } from '@/lib/api';
import { C, Button, Input } from '@/components/ui';
import { GridIcon, PlusIcon, MusicIcon } from '@/components/icons';
import BottomNav from '@/components/BottomNav';
import PlayerBar from '@/components/PlayerBar';

const COLORS = ['#A855F7', '#EC4899', '#3B82F6', '#F59E0B', '#22C55E', '#EF4444'];

export default function PlaylistsPage() {
  const { user, ready } = useRequireAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (!ready || !user) return;
    api.playlists.list().then(setPlaylists).finally(() => setLoading(false));
  }, [ready, user]);

  if (!ready || !user) return null;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const p = await api.playlists.create(name.trim(), color);
    setPlaylists(ps => [p, ...ps]);
    setName('');
    setCreating(false);
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 150 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: '0 0 4px' }}>دسته‌بندی‌ها</h1>
            <p style={{ fontSize: 12.5, color: C.muted, margin: 0 }}>آهنگ‌هاتو دسته‌بندی کن</p>
          </div>
          <Button size="sm" icon={<PlusIcon size={15} />} onClick={() => setCreating(c => !c)}>
            دسته‌بندی جدید
          </Button>
        </div>

        {creating && (
          <form onSubmit={create} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="مثلاً: موزیک باشگاه" autoFocus />
            <div style={{ display: 'flex', gap: 8 }}>
              {COLORS.map(c => (
                <button
                  key={c} type="button" onClick={() => setColor(c)}
                  style={{
                    width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: color === c ? '2px solid white' : '2px solid transparent',
                    boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                  }}
                />
              ))}
            </div>
            <Button type="submit" size="sm">ساخت</Button>
          </form>
        )}

        {loading && <p style={{ color: C.muted, fontSize: 13 }}>در حال بارگذاری...</p>}

        {!loading && playlists.length === 0 && !creating && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: C.subtle }}>
            <GridIcon size={40} />
            <p style={{ fontSize: 13, marginTop: 10 }}>هنوز دسته‌بندی‌ای نساختی.</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {playlists.map(p => (
            <Link key={p.id} href={`/playlists/${p.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18,
                padding: 16, height: 120, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: -20, left: -20, width: 90, height: 90, borderRadius: '50%',
                  background: `radial-gradient(circle, ${p.color}33 0%, transparent 70%)`,
                }} />
                <div style={{
                  width: 34, height: 34, borderRadius: 11, background: `${p.color}22`,
                  border: `1px solid ${p.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: p.color, zIndex: 1,
                }}><MusicIcon size={16} /></div>
                <div style={{ zIndex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted }}>{p.trackCount} آهنگ</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <PlayerBar />
      <BottomNav />
    </div>
  );
}

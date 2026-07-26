'use client';
import { useState } from 'react';
import { useRequireAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { api, SearchResult } from '@/lib/api';
import { C, Button, Input, IconButton } from '@/components/ui';
import { SendIcon, SparklesIcon, PlusIcon } from '@/components/icons';
import TrackRow from '@/components/TrackRow';
import BottomNav from '@/components/BottomNav';
import PlayerBar from '@/components/PlayerBar';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  tracks?: SearchResult[];
}

const trackKey = (t: SearchResult) => `${t.provider}:${t.providerId}`;

export default function HomePage() {
  const { user, ready } = useRequireAuth();
  const { play } = usePlayer();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  if (!ready || !user) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(m => [...m, { id: crypto.randomUUID(), role: 'user', text }]);
    setLoading(true);
    try {
      const res = await api.ai.search(text);
      setMessages(m => [...m, { id: crypto.randomUUID(), role: 'ai', text: res.reply, tracks: res.tracks }]);
    } catch (err: any) {
      setMessages(m => [...m, { id: crypto.randomUUID(), role: 'ai', text: err.message || 'خطایی پیش اومد' }]);
    } finally {
      setLoading(false);
    }
  }

  async function addToLibrary(track: SearchResult) {
    try {
      await api.library.add(track);
    } catch {
      // already saved — still reflect it as saved below
    }
    setSavedIds(s => new Set(s).add(trackKey(track)));
  }

  function playTrack(track: SearchResult, list: SearchResult[]) {
    const toPlayerTrack = (t: SearchResult) => ({
      provider: t.provider, providerId: t.providerId, title: t.title, artist: t.artist,
      thumbnailUrl: t.thumbnail, durationSec: t.durationSec ?? undefined, streamUrl: t.streamUrl,
    });
    play(toPlayerTrack(track), list.map(toPlayerTrack));
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 150 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 13,
            background: `linear-gradient(135deg, ${C.purple}, ${C.pink})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0,
          }}><SparklesIcon size={20} /></div>
          <div>
            <p style={{ margin: 0, fontWeight: 900, fontSize: 15, color: C.text }}>چی گوش کنیم؟</p>
            <p style={{ margin: 0, fontSize: 11.5, color: C.muted }}>حست رو بگو، آهنگ مناسبشو پیدا می‌کنم</p>
          </div>
        </div>

        {messages.length === 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {['آهنگ شاد ایرانی برای رانندگی', 'موزیک آرام برای مطالعه', 'ریمیکس‌های پرانرژی برای باشگاه'].map(s => (
              <button
                key={s} type="button" onClick={() => setInput(s)}
                style={{
                  padding: '7px 13px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                  fontFamily: 'Vazirmatn, sans-serif', color: C.muted,
                  background: C.surface2, border: `1px solid ${C.border}`, cursor: 'pointer',
                }}
              >{s}</button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {messages.map(msg => (
            <div key={msg.id}>
              {msg.role === 'user' ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{
                    maxWidth: '80%', background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDark})`,
                    color: 'white', borderRadius: '16px 16px 4px 16px', padding: '10px 14px',
                    fontSize: 13, fontWeight: 600,
                  }}>{msg.text}</div>
                </div>
              ) : (
                <div>
                  <div style={{
                    maxWidth: '85%', background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: '16px 16px 16px 4px', padding: '10px 14px',
                    fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8,
                  }}>{msg.text}</div>

                  {msg.tracks && msg.tracks.length > 0 && (
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '4px 10px' }}>
                      {msg.tracks.map(t => (
                        <TrackRow
                          key={trackKey(t)}
                          provider={t.provider}
                          providerId={t.providerId}
                          title={t.title}
                          subtitle={t.artist}
                          thumbnailUrl={t.thumbnail}
                          durationSec={t.durationSec}
                          onPlay={() => playTrack(t, msg.tracks!)}
                          actions={
                            <IconButton
                              label="افزودن به کتابخانه"
                              active={savedIds.has(trackKey(t))}
                              onClick={() => addToLibrary(t)}
                              size={32}
                            >
                              <PlusIcon size={15} />
                            </IconButton>
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: C.muted, fontSize: 12.5 }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                border: `2px solid ${C.border}`, borderTopColor: C.purple,
                animation: 'spin 0.7s linear infinite',
              }} />
              در حال جستجو...
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={submit}
        style={{
          position: 'fixed', bottom: 128, left: 0, right: 0, zIndex: 38,
          maxWidth: 560, margin: '0 auto', padding: '0 16px',
          display: 'flex', gap: 8,
        }}
      >
        <Input
          value={input} onChange={e => setInput(e.target.value)}
          placeholder="مثلاً: آهنگ ملایم برای عصر بارونی"
          style={{ background: C.surfaceSolid, border: `1px solid ${C.borderStrong}`, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}
        />
        <Button type="submit" disabled={loading} style={{ borderRadius: 14, padding: '0 16px' }}>
          <SendIcon size={17} />
        </Button>
      </form>

      <PlayerBar />
      <BottomNav />
    </div>
  );
}

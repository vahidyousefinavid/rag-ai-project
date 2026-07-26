'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import Chat from '@/components/Chat';
import { api, Conversation, toJalali } from '@/lib/api';
import { C, Card, Button, EmptyState, Spinner } from '@/components/ui';
import { ChevronRightIcon, MessageIcon, StoreIcon, CarIcon } from '@/components/icons';

export default function MessagesPage() {
  const router = useRouter();
  const [role, setRole] = useState<'owner' | 'mechanic'>('owner');
  const [list, setList] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Conversation | null>(null);

  const load = useCallback(() => {
    api.messages.conversations().then(setList).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    try { setRole(JSON.parse(localStorage.getItem('vuser') || '{}').role || 'owner'); } catch {}
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [load]);

  function openChat(c: Conversation) {
    setActive(c);
    setList(prev => prev.map(it => (it.vehicleId === c.vehicleId && it.mechanicId === c.mechanicId ? { ...it, unreadCount: 0 } : it)));
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="گفتگوها" />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 14px calc(88px + env(safe-area-inset-bottom))' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, padding: '14px 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ChevronRightIcon size={16} /> بازگشت
        </button>

        {loading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<MessageIcon size={26} />}
            title="گفتگویی نداری"
            sub={role === 'owner' ? 'با تعمیرگاه‌های متصل به خودروهات می‌تونی گفتگو کنی' : 'با مالک خودروهایی که بهت دسترسی دادن می‌تونی گفتگو کنی'}
            onAdd={role === 'owner' ? () => router.push('/workshops') : undefined}
            btnLabel={role === 'owner' ? 'پیدا کردن تعمیرگاه' : undefined}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {list.map(c => (
              <Card key={`${c.vehicleId}:${c.mechanicId}`} padding="13px 15px" style={{ cursor: 'pointer' }}>
                <div onClick={() => openChat(c)} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 13, flexShrink: 0,
                    background: `${C.green}1F`, border: `1px solid ${C.green}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green,
                  }}>{role === 'owner' ? <StoreIcon size={19} /> : <CarIcon size={19} />}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 800, color: C.text, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.counterpartName}
                      </p>
                      {c.lastMessageAt && (
                        <span style={{ fontSize: 10, color: C.subtle, flexShrink: 0 }}>{toJalali(c.lastMessageAt.slice(0, 10))}</span>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: C.subtle, margin: '2px 0 0' }}>
                      {c.vehicle.make} {c.vehicle.model} {c.vehicle.plateNumber ? `· ${c.vehicle.plateNumber}` : ''}
                    </p>
                    <p style={{
                      fontSize: 12, color: c.unreadCount > 0 ? C.text : C.muted, fontWeight: c.unreadCount > 0 ? 700 : 500,
                      margin: '5px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {c.lastMessage || 'هنوز پیامی رد و بدل نشده'}
                    </p>
                  </div>

                  {c.unreadCount > 0 && (
                    <span style={{
                      minWidth: 20, height: 20, borderRadius: 10, background: C.green, color: 'white',
                      fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 5px', flexShrink: 0,
                    }}>{c.unreadCount > 9 ? '9+' : c.unreadCount}</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {active && (
        <Chat
          vehicleId={active.vehicleId}
          mechanicId={active.mechanicId}
          role={role}
          title={`${active.counterpartName} · ${active.vehicle.make} ${active.vehicle.model}`}
          onClose={() => { setActive(null); load(); }}
        />
      )}
      <BottomNav />
    </div>
  );
}

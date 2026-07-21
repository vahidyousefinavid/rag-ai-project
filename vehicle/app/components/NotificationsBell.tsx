'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, AppNotification, toJalali } from '@/lib/api';
import { C, Button, EmptyState, Spinner } from './ui';
import { BellIcon, CheckIcon, XIcon } from './icons';

export default function NotificationsBell() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const refreshCount = useCallback(() => {
    if (!localStorage.getItem('vtoken')) return;
    api.notifications.unreadCount().then(r => setCount(r.count)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem('vtoken'));
    refreshCount();
    const id = setInterval(refreshCount, 30_000);
    return () => clearInterval(id);
  }, [refreshCount]);

  function toggle() {
    if (!open) {
      setLoading(true);
      api.notifications.list().then(setItems).finally(() => setLoading(false));
    }
    setOpen(v => !v);
  }

  async function act(n: AppNotification, kind: 'confirm' | 'reject') {
    setActingId(n.id);
    try {
      const updated = kind === 'confirm' ? await api.notifications.confirm(n.id) : await api.notifications.reject(n.id);
      setItems(prev => prev.map(it => (it.id === n.id ? updated : it)));
      refreshCount();
    } finally {
      setActingId(null);
    }
  }

  if (!loggedIn) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={toggle}
        aria-label="اعلان‌ها"
        style={{
          position: 'relative', width: 36, height: 36, borderRadius: 11,
          background: C.surface2, border: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted,
        }}
      >
        <BellIcon size={17} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8,
            background: '#F87171', color: 'white', fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
            border: `2px solid ${C.bg}`,
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 55 }}
          />
          <div
            style={{
              position: 'absolute', top: 'calc(100% + 10px)', left: 0, zIndex: 56,
              width: 'min(360px, 88vw)', maxHeight: '70vh', overflowY: 'auto',
              background: C.surfaceSolid,
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: `1px solid ${C.borderStrong}`,
              borderRadius: 20,
              boxShadow: '0 20px 56px rgba(0,0,0,0.45)',
              animation: 'fadeInDown 0.22s cubic-bezier(.34,1.2,.64,1) both',
              padding: '14px 14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <BellIcon size={15} color={C.green} />
              <h2 style={{ fontWeight: 900, color: C.text, fontSize: 14, margin: 0 }}>اعلان‌ها</h2>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}><Spinner /></div>
            ) : items.length === 0 ? (
              <EmptyState icon={<BellIcon size={24} />} title="اعلانی نداری" sub="هر خبری بیاد اینجا نشونت می‌دیم" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map(n => (
                  <div key={n.id} style={{
                    background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
                    borderRadius: 16, padding: '13px 14px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 800, color: C.text, margin: 0 }}>{n.title}</p>
                      <span style={{ fontSize: 10, color: C.subtle, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {toJalali(n.createdAt.slice(0, 10))}
                      </span>
                    </div>
                    <p style={{ fontSize: 12.5, color: C.muted, margin: '6px 0 0', lineHeight: 1.7 }}>{n.body}</p>

                    {n.status === 'pending' && n.type === 'mechanic_link_request' ? (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <Button
                          size="sm" fullWidth icon={<CheckIcon size={13} />}
                          loading={actingId === n.id}
                          onClick={() => act(n, 'confirm')}
                        >
                          تایید می‌کنم
                        </Button>
                        <Button
                          size="sm" fullWidth variant="danger" icon={<XIcon size={13} />}
                          disabled={actingId === n.id}
                          onClick={() => act(n, 'reject')}
                        >
                          درست نیست
                        </Button>
                      </div>
                    ) : (
                      <p style={{ fontSize: 11, fontWeight: 700, margin: '10px 0 0', color: n.status === 'confirmed' ? C.green : n.status === 'rejected' ? '#F87171' : C.subtle }}>
                        {n.status === 'confirmed' ? 'تایید شد' : n.status === 'rejected' ? 'رد شد' : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

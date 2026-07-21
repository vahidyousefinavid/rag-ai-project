'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { C } from './ui';
import { MessageIcon } from './icons';

export default function MessagesBell() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!localStorage.getItem('vtoken')) return;
    api.messages.unreadCount().then(r => setCount(r.count)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem('vtoken'));
    refresh();
    const id = setInterval(refresh, 20_000);
    return () => clearInterval(id);
  }, [refresh]);

  if (!loggedIn) return null;

  return (
    <button
      onClick={() => router.push('/messages')}
      aria-label="گفتگوها"
      style={{
        position: 'relative', width: 36, height: 36, borderRadius: 11,
        background: C.surface2, border: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted,
      }}
    >
      <MessageIcon size={16} />
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
  );
}

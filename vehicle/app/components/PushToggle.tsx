'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { C, Button } from './ui';
import { BellIcon, CheckIcon } from './icons';

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setSupported(true);
    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    }).catch(() => {});
  }, []);

  async function enable() {
    setLoading(true);
    setError('');
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('اجازه نمایش اعلان داده نشد');
      const { key } = await api.push.vapidKey();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const json = sub.toJSON();
      await api.push.subscribe({ endpoint: json.endpoint!, keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth } });
      setSubscribed(true);
    } catch (err: any) {
      setError(err.message || 'فعال‌سازی اعلان‌ها ناموفق بود');
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.push.unsubscribe(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Button
        variant={subscribed ? 'secondary' : 'primary'}
        fullWidth
        loading={loading}
        onClick={subscribed ? disable : enable}
        icon={subscribed ? <CheckIcon size={15} /> : <BellIcon size={15} />}
      >
        {subscribed ? 'اعلان‌های فوری فعال است' : 'فعال‌سازی اعلان‌های فوری'}
      </Button>
      {error && <p style={{ fontSize: 11, color: '#F87171', margin: 0 }}>{error}</p>}
    </div>
  );
}

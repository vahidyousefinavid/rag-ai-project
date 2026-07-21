'use client';
import Link from 'next/link';
import { CarIcon } from './icons';
import { C } from './ui';
import NotificationsBell from './NotificationsBell';
import MessagesBell from './MessagesBell';

export default function Navbar({ title }: { title?: string }) {
  return (
    <header style={{
      background: 'rgba(10,17,32,0.88)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: `1px solid ${C.border}`,
      position: 'sticky', top: 0, zIndex: 40,
      boxShadow: '0 1px 0 rgba(0,0,0,0.30)',
    }}>
      <div style={{
        maxWidth: 560, margin: '0 auto',
        padding: '0 16px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/dashboard" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          textDecoration: 'none', color: C.text,
          fontWeight: 900, fontSize: 15,
          fontFamily: 'Vazirmatn, sans-serif',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 11,
            background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white',
            boxShadow: `0 4px 14px ${C.greenGlow}`,
          }}>
            <CarIcon size={18} />
          </div>
          {title ?? 'دستیار خودرو'}
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessagesBell />
          <NotificationsBell />
        </div>
      </div>
    </header>
  );
}

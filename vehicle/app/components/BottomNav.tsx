'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, CarIcon, PlusIcon, UserIcon } from './icons';
import { C } from './ui';
import type { Role } from '@/lib/api';

const tabStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
  color: active ? C.green : C.muted,
  textDecoration: 'none', width: 64, transition: 'color 0.15s',
});

export default function BottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role>('owner');

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('vuser') || '{}');
      if (u.role === 'mechanic') setRole('mechanic');
    } catch {}
  }, []);

  const onHome    = pathname === (role === 'mechanic' ? '/mechanic' : '/dashboard');
  const onVehicle = pathname.startsWith('/vehicles') && pathname !== '/vehicles/new';
  const onProfile = pathname === '/profile';

  return (
    <nav
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        height: 64,
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(10,17,32,0.90)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: `1px solid ${C.border}`,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.30)',
      }}
    >
      <Link href={role === 'mechanic' ? '/mechanic' : '/dashboard'} style={tabStyle(onHome)}>
        <HomeIcon size={22} strokeWidth={onHome ? 2 : 1.75} />
        <span style={{ fontSize: 10, fontWeight: onHome ? 800 : 600 }}>خانه</span>
      </Link>

      {role === 'owner' && (
        <>
          <Link href="/dashboard" style={tabStyle(onVehicle)}>
            <CarIcon size={22} strokeWidth={onVehicle ? 2 : 1.75} />
            <span style={{ fontSize: 10, fontWeight: onVehicle ? 800 : 600 }}>خودروها</span>
          </Link>

          <Link
            href="/vehicles/new"
            aria-label="افزودن خودرو"
            style={{
              width: 52, height: 52, borderRadius: '50%',
              background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', marginTop: -28,
              boxShadow: `0 8px 24px ${C.greenGlow}, 0 2px 0 ${C.bg}`,
              border: `4px solid ${C.bg}`,
              flexShrink: 0,
            }}
          >
            <PlusIcon size={24} strokeWidth={2.25} />
          </Link>
        </>
      )}

      <Link href="/profile" style={tabStyle(onProfile)}>
        <UserIcon size={22} strokeWidth={onProfile ? 2 : 1.75} />
        <span style={{ fontSize: 10, fontWeight: onProfile ? 800 : 600 }}>پروفایل</span>
      </Link>
    </nav>
  );
}

'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { C } from './ui';
import type { AdminUser } from '@/lib/api';

const NAV = [
  { href: '/dashboard', label: 'داشبورد' },
  { href: '/users', label: 'کاربران' },
  { href: '/vehicles', label: 'خودروها' },
  { href: '/products', label: 'محصولات' },
  { href: '/appointments', label: 'نوبت‌ها' },
  { href: '/payments', label: 'پرداخت‌ها' },
  { href: '/reviews', label: 'نظرات' },
  { href: '/organizations', label: 'سازمان‌ها' },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('crm_token')) { router.replace('/'); return; }
    try { setAdmin(JSON.parse(localStorage.getItem('crm_user') || 'null')); } catch {}
  }, [router]);

  function logout() {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    router.push('/');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 220, flexShrink: 0, background: C.surface, borderLeft: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', padding: '20px 14px', position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 22px' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 15,
          }}>C</div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: 0 }}>پنل مدیریت</p>
            <p style={{ fontSize: 10.5, color: C.subtle, margin: 0 }}>دستیار خودرو</p>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: '10px 12px', borderRadius: 10, fontSize: 13, fontWeight: active ? 800 : 600,
                  color: active ? 'white' : C.muted, background: active ? C.accent : 'transparent',
                  textDecoration: 'none', transition: 'background 0.15s',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: 0 }}>{admin?.name || '...'}</p>
          <p style={{ fontSize: 10.5, color: C.subtle, margin: '2px 0 10px', direction: 'ltr', textAlign: 'right' }}>{admin?.phone}</p>
          <button
            onClick={logout}
            style={{
              width: '100%', background: 'rgba(239,68,68,0.08)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 10, padding: '8px 0', fontSize: 12.5, fontWeight: 700, fontFamily: 'Vazirmatn, sans-serif', cursor: 'pointer',
            }}
          >
            خروج
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '26px 32px', maxWidth: 1200 }}>
        {children}
      </main>
    </div>
  );
}

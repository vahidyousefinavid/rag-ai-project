'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { UserIcon, LogOutIcon, ShieldIcon, CarIcon, ChevronLeftIcon, WrenchIcon } from '@/components/icons';
import { C, Card } from '@/components/ui';
import type { User } from '@/lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    try { setUser(JSON.parse(localStorage.getItem('vuser') || '{}')); } catch {}
  }, [router]);

  function logout() {
    localStorage.removeItem('vtoken');
    localStorage.removeItem('vuser');
    router.push('/');
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="پروفایل" />

      <main style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px calc(96px + env(safe-area-inset-bottom))' }}>

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          padding: '28px 20px', marginBottom: 20,
          textAlign: 'center',
        }}>
          <div style={{
            width: 76, height: 76, borderRadius: '50%',
            background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: `0 10px 30px ${C.greenGlow}`,
          }}>
            <UserIcon size={34} />
          </div>
          <div>
            <p style={{ color: C.text, fontSize: 18, fontWeight: 900, margin: 0 }}>
              {user?.role === 'mechanic' ? (user?.workshopName || 'تعمیرگاه') : (user?.name || 'کاربر مهمان')}
            </p>
            {user?.role === 'mechanic' && (
              <p style={{ color: C.subtle, fontSize: 12, fontWeight: 500, margin: '3px 0 0' }}>{user?.name}</p>
            )}
            <p style={{ color: C.muted, fontSize: 13, fontWeight: 500, margin: '4px 0 0', direction: 'ltr' }}>
              {user?.phone || ''}
            </p>
          </div>
        </div>

        {user?.role === 'mechanic' ? (
          <>
            <Card style={{ marginBottom: 12 }} padding="4px">
              <MenuRow icon={<WrenchIcon size={18} />} label="خودروهای متصل" onClick={() => router.push('/mechanic')} />
            </Card>
            {user?.workshopAddress && (
              <Card style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, color: C.muted, fontWeight: 600, margin: 0 }}>آدرس تعمیرگاه</p>
                <p style={{ fontSize: 13, color: C.text, fontWeight: 600, margin: '5px 0 0' }}>{user.workshopAddress}</p>
              </Card>
            )}
          </>
        ) : (
          <>
            <Card style={{ marginBottom: 12 }} padding="4px">
              <MenuRow icon={<CarIcon size={18} />} label="خودروهای من" onClick={() => router.push('/dashboard')} />
            </Card>
            <Card style={{ marginBottom: 20 }} padding="4px">
              <MenuRow icon={<ShieldIcon size={18} />} label="حریم خصوصی و امنیت" />
            </Card>
          </>
        )}

        <button
          onClick={logout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'rgba(239,68,68,0.10)', color: '#F87171',
            border: '1px solid rgba(239,68,68,0.22)',
            borderRadius: 16, padding: '13px', fontSize: 14, fontWeight: 700,
            fontFamily: 'Vazirmatn, sans-serif',
          }}
        >
          <LogOutIcon size={17} />
          خروج از حساب
        </button>

        <p style={{ textAlign: 'center', color: C.subtle, fontSize: 11, marginTop: 24 }}>
          دستیار خودرو · نسخه ۱٫۰٫۰
        </p>
      </main>

      <BottomNav />
    </div>
  );
}

function MenuRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 14px', background: 'transparent', border: 'none',
        color: C.text, fontSize: 13.5, fontWeight: 600,
        fontFamily: 'Vazirmatn, sans-serif',
        opacity: onClick ? 1 : 0.55,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span style={{ color: C.green, display: 'flex' }}>{icon}</span>
      <span style={{ flex: 1, textAlign: 'right' }}>{label}</span>
      <ChevronLeftIcon size={16} color={C.subtle} />
    </button>
  );
}

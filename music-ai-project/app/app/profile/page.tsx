'use client';
import { useRouter } from 'next/navigation';
import { useAuth, useRequireAuth } from '@/contexts/AuthContext';
import { C, Button } from '@/components/ui';
import { UserIcon } from '@/components/icons';
import BottomNav from '@/components/BottomNav';
import PlayerBar from '@/components/PlayerBar';

export default function ProfilePage() {
  const { user, ready } = useRequireAuth();
  const { logout } = useAuth();
  const router = useRouter();

  if (!ready || !user) return null;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 150 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 12px' }}>
        <h1 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: '0 0 18px' }}>پروفایل</h1>

        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18,
          padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0,
          }}><UserIcon size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.text }}>{user.name}</p>
            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: C.muted, direction: 'ltr', textAlign: 'right' }}>{user.phone}</p>
          </div>
        </div>

        <Button
          variant="danger" fullWidth
          onClick={() => { logout(); router.replace('/'); }}
        >
          خروج از حساب
        </Button>
      </div>

      <PlayerBar />
      <BottomNav />
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import NeshanMap from '@/components/NeshanMap';
import InteractiveMapPicker from '@/components/InteractiveMapPicker';
import PushToggle from '@/components/PushToggle';
import {
  UserIcon, LogOutIcon, ShieldIcon, CarIcon, ChevronLeftIcon, WrenchIcon,
  StoreIcon, CalendarIcon, BoxIcon, UsersIcon, CompassIcon, MessageIcon, SettingsIcon, PinIcon,
} from '@/components/icons';
import { C, Card, Button } from '@/components/ui';
import { api } from '@/lib/api';
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
              {(user?.role === 'mechanic' || user?.role === 'seller') ? (user?.workshopName || 'کاربر') : (user?.name || 'کاربر مهمان')}
            </p>
            {(user?.role === 'mechanic' || user?.role === 'seller') && (
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
              <MenuRow icon={<SettingsIcon size={18} />} label="خدمات من" onClick={() => router.push('/mechanic/services')} />
              <MenuRow icon={<MessageIcon size={18} />} label="گفتگوها" onClick={() => router.push('/messages')} />
              <MenuRow icon={<CalendarIcon size={18} />} label="نوبت‌ها" onClick={() => router.push('/appointments')} />
              <MenuRow icon={<BoxIcon size={18} />} label="کاتالوگ قطعات" onClick={() => router.push('/mechanic/parts')} />
              <MenuRow icon={<UsersIcon size={18} />} label="سازمان‌ها / ناوگان" onClick={() => router.push('/organizations')} />
            </Card>

            <div style={{ marginBottom: 12 }}>
              <WorkshopLocationCard user={user} onSaved={setUser} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <PushToggle />
            </div>
          </>
        ) : user?.role === 'seller' ? (
          <>
            <Card style={{ marginBottom: 12 }} padding="4px">
              <MenuRow icon={<BoxIcon size={18} />} label="محصولات من" onClick={() => router.push('/seller/products')} />
            </Card>

            <div style={{ marginBottom: 12 }}>
              <WorkshopLocationCard user={user} onSaved={setUser} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <PushToggle />
            </div>
          </>
        ) : (
          <>
            <Card style={{ marginBottom: 12 }} padding="4px">
              <MenuRow icon={<CarIcon size={18} />} label="خودروهای من" onClick={() => router.push('/dashboard')} />
              <MenuRow icon={<StoreIcon size={18} />} label="پیدا کردن تعمیرگاه" onClick={() => router.push('/workshops')} />
              <MenuRow icon={<MessageIcon size={18} />} label="گفتگوها" onClick={() => router.push('/messages')} />
              <MenuRow icon={<CalendarIcon size={18} />} label="نوبت‌های من" onClick={() => router.push('/appointments')} />
              <MenuRow icon={<UsersIcon size={18} />} label="سازمان‌ها / ناوگان" onClick={() => router.push('/organizations')} />
              <MenuRow icon={<ShieldIcon size={18} />} label="حریم خصوصی و امنیت" />
            </Card>

            <div style={{ marginBottom: 20 }}>
              <PushToggle />
            </div>
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

function WorkshopLocationCard({ user, onSaved }: { user: User; onSaved: (u: User) => void }) {
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    user.workshopLat != null && user.workshopLng != null ? { lat: user.workshopLat, lng: user.workshopLng } : null,
  );
  const [error, setError] = useState('');

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { setError('دریافت موقعیت مکانی ناموفق بود'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function save() {
    if (!coords) return;
    setSaving(true);
    setError('');
    try {
      const updated = await api.auth.updateProfile({ workshopLat: coords.lat, workshopLng: coords.lng });
      localStorage.setItem('vuser', JSON.stringify(updated));
      onSaved(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <p style={{ fontSize: 12.5, fontWeight: 800, color: C.text, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <StoreIcon size={15} /> موقعیت {user.role === 'seller' ? 'فروشگاه' : 'تعمیرگاه'} روی نقشه
      </p>
      <div style={{ marginBottom: 10 }}>
        <NeshanMap lat={coords?.lat} lng={coords?.lng} height={140} onOpenPicker={() => setShowPicker(true)} />
      </div>
      {error && <p style={{ fontSize: 11, color: '#F87171', margin: '0 0 8px' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <Button variant="secondary" fullWidth loading={locating} onClick={locate} icon={<CompassIcon size={14} />}>موقعیت فعلی من</Button>
        <Button variant="secondary" fullWidth onClick={() => setShowPicker(true)} icon={<PinIcon size={14} />}>انتخاب روی نقشه</Button>
      </div>
      <Button fullWidth disabled={!coords} loading={saving} onClick={save}>ذخیره موقعیت</Button>

      {showPicker && (
        <InteractiveMapPicker
          lat={coords?.lat}
          lng={coords?.lng}
          onConfirm={(lat, lng) => { setCoords({ lat, lng }); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </Card>
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

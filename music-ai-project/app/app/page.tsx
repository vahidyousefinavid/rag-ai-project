'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { C, Button, Input } from '@/components/ui';
import { MusicIcon, SparklesIcon, LockIcon, ShieldIcon } from '@/components/icons';

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready && user) router.replace('/home');
  }, [ready, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = mode === 'login'
        ? await api.auth.login(phone)
        : await api.auth.register({ phone, name });
      login(res.access_token, res.user);
      router.push('/home');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'fixed', top: -120, right: -120, width: 480, height: 480, borderRadius: '50%',
        background: `radial-gradient(circle, ${C.purple}22 0%, transparent 70%)`,
        filter: 'blur(50px)', zIndex: 0, animation: 'blobPulse 9s ease-in-out infinite',
      }} />
      <div style={{
        position: 'fixed', bottom: -100, left: -100, width: 400, height: 400, borderRadius: '50%',
        background: `radial-gradient(circle, ${C.pink}1a 0%, transparent 70%)`,
        filter: 'blur(45px)', zIndex: 0, animation: 'blobPulse 11s ease-in-out infinite reverse',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 440, margin: '0 auto', padding: '32px 20px 44px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 30 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 15,
            background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: `0 6px 18px ${C.purpleGlow}`, flexShrink: 0,
          }}><MusicIcon size={22} /></div>
          <div>
            <p style={{ color: C.text, fontWeight: 900, fontSize: 16, margin: 0 }}>موزیک‌یار</p>
            <p style={{ color: C.muted, fontSize: 11, fontWeight: 500, margin: 0 }}>جستجو با AI · پخش · دسته‌بندی</p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 22, animation: 'fadeInUp 0.5s ease both' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 14px',
            background: `linear-gradient(135deg, ${C.purple}, ${C.pink})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 10px 30px ${C.purpleGlow}`,
          }}><SparklesIcon size={28} color="white" /></div>
          <h1 style={{ color: C.text, fontSize: 20, fontWeight: 900, margin: '0 0 8px' }}>
            هر آهنگی که بخوای، پیدا می‌کنیم
          </h1>
          <p style={{ color: C.muted, fontSize: 13, fontWeight: 500, margin: 0, lineHeight: 1.75 }}>
            فقط بگو چه حسی می‌خوای، بقیه‌ش با هوش مصنوعیه
          </p>
        </div>

        <div style={{
          background: C.surface,
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: `1px solid ${C.borderStrong}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)',
          borderRadius: 24, padding: '22px 20px', marginBottom: 18,
          animation: 'fadeInUp 0.55s ease 0.1s both',
        }}>
          <div style={{
            display: 'flex', borderRadius: 14, overflow: 'hidden',
            border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)', marginBottom: 20,
          }}>
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 700,
                  fontFamily: 'Vazirmatn, sans-serif', border: 'none', transition: 'all 0.22s',
                  background: mode === m ? `linear-gradient(135deg, ${C.purple}, ${C.purpleDark})` : 'transparent',
                  color: mode === m ? 'white' : C.muted, borderRadius: 12,
                  boxShadow: mode === m ? `0 4px 16px ${C.purpleGlow}` : 'none',
                }}
              >
                {m === 'login' ? 'ورود' : 'ثبت‌نام'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'register' && (
              <div>
                <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 7 }}>
                  نام و نام خانوادگی
                </label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="علی احمدی" required />
              </div>
            )}
            <div>
              <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 7 }}>
                شماره موبایل
              </label>
              <Input
                value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="09123456789" type="tel" required dir="ltr" style={{ textAlign: 'left' }}
              />
            </div>

            {error && (
              <div style={{
                fontSize: 12, color: '#F87171', background: 'rgba(239,68,68,0.10)',
                border: '1px solid rgba(239,68,68,0.20)', borderRadius: 11, padding: '10px 14px',
              }}>{error}</div>
            )}

            <Button type="submit" loading={loading} fullWidth size="lg" style={{ marginTop: 2 }}>
              {mode === 'login' ? 'ورود به حساب' : 'ساخت حساب'}
            </Button>
          </form>
        </div>

        <div style={{
          display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap',
          animation: 'fadeInUp 0.55s ease 0.15s both',
        }}>
          {[{ icon: <LockIcon size={13} />, label: 'حریم خصوصی' }, { icon: <ShieldIcon size={13} />, label: 'بدون دانلود غیرقانونی' }].map((b, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 20, padding: '6px 13px', color: C.purple,
            }}>
              {b.icon}
              <span style={{ color: 'rgba(215,205,235,0.72)', fontSize: 11, fontWeight: 600 }}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

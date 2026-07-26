'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, Role } from '@/lib/api';
import { C } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import {
  CarIcon, ShieldIcon, LockIcon, CloudIcon, BellIcon, GaugeIcon, WrenchIcon, StoreIcon,
} from '@/components/icons';

function homeFor(role: Role): string {
  if (role === 'mechanic') return '/mechanic';
  if (role === 'seller') return '/seller/products';
  return '/dashboard';
}

/* ── Mock account card preview ──────────────────────────────────── */
function AccountCardPreview() {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.heroStart} 0%, ${C.heroMid} 52%, ${C.heroEnd} 100%)`,
      borderRadius: 22,
      padding: '20px 22px 18px',
      border: `1px solid ${C.borderStrong}`,
      boxShadow: `0 24px 64px rgba(0,0,0,0.55), 0 4px 16px ${C.greenGlow}`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -45, right: -45, width: 180, height: 180, borderRadius: '50%',
        background: `radial-gradient(circle, ${C.green}33 0%, transparent 70%)`,
        filter: 'blur(22px)',
      }} />
      <div style={{
        position: 'absolute', bottom: -35, left: -35, width: 140, height: 140, borderRadius: '50%',
        background: `radial-gradient(circle, ${C.blue}22 0%, transparent 70%)`,
        filter: 'blur(18px)',
      }} />

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{
            width: 34, height: 25, borderRadius: 6,
            background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
            boxShadow: `0 3px 10px ${C.greenGlow}`,
          }} />
          <div style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10, padding: '5px 11px',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, boxShadow: `0 0 7px ${C.green}` }} />
            <span style={{ color: 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: 600 }}>وضعیت عالی</span>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 17, letterSpacing: '7px', fontFamily: 'monospace', direction: 'ltr' }}>
            •• ••••• ••
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 9, fontWeight: 600, margin: '0 0 3px', letterSpacing: '0.5px' }}>مدیر ناوگان</p>
            <p style={{ color: 'rgba(255,255,255,0.90)', fontSize: 14, fontWeight: 800, margin: 0 }}>احمد رضایی</p>
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 9, fontWeight: 600, margin: '0 0 3px' }}>سلامت ناوگان</p>
            <p style={{ color: C.green, fontSize: 18, fontWeight: 900, margin: 0, textShadow: `0 0 12px ${C.greenGlow}` }}>94%</p>
          </div>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
          paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)',
        }}>
          {[
            { label: 'خودروها', value: '3', color: C.green },
            { label: 'سرویس‌ها', value: '12', color: C.blue },
            { label: 'هشدارها', value: '0', color: C.green },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 11, padding: '9px 6px', textAlign: 'center',
            }}>
              <p style={{ color: s.color, fontWeight: 900, fontSize: 17, margin: 0, lineHeight: 1 }}>{s.value}</p>
              <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 9, fontWeight: 600, margin: '3px 0 0' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Trust badges ───────────────────────────────────────────────── */
function TrustBadges() {
  const badges = [
    { icon: <LockIcon size={13} />, label: 'رمزنگاری SSL' },
    { icon: <ShieldIcon size={13} />, label: 'حریم خصوصی' },
    { icon: <GaugeIcon size={13} />, label: 'دقیق و سریع' },
  ];
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
      {badges.map((b, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 20, padding: '6px 13px',
          backdropFilter: 'blur(12px)',
          color: C.green,
        }}>
          {b.icon}
          <span style={{ color: 'rgba(200,215,235,0.72)', fontSize: 11, fontWeight: 600 }}>{b.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Security highlights strip ──────────────────────────────────── */
function SecurityStrip() {
  const items = [
    { icon: <LockIcon size={15} />, title: 'AES-256', desc: 'رمزنگاری' },
    { icon: <CloudIcon size={15} />, title: 'ابری', desc: 'پشتیبان‌گیری' },
    { icon: <BellIcon size={15} />, title: 'بلادرنگ', desc: 'اعلان هوشمند' },
  ];
  return (
    <div style={{
      background: 'rgba(34,197,94,0.06)',
      border: `1px solid ${C.green}28`,
      borderRadius: 18, padding: '14px 16px',
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
    }}>
      {items.map((s, i) => (
        <div key={i} style={{ textAlign: 'center' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 11,
            background: 'rgba(34,197,94,0.12)',
            border: `1px solid ${C.green}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.green,
            margin: '0 auto 6px',
          }}>{s.icon}</div>
          <p style={{ color: '#4ADE80', fontSize: 11, fontWeight: 800, margin: 0 }}>{s.title}</p>
          <p style={{ color: 'rgba(200,215,235,0.45)', fontSize: 10, fontWeight: 500, margin: '2px 0 0' }}>{s.desc}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Login page ─────────────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode]       = useState<'login' | 'register'>('login');
  const [phone, setPhone]     = useState('');
  const [code, setCode]       = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [cooldown, setCooldown]     = useState(0);
  const [name, setName]       = useState('');
  const [role, setRole]       = useState<Role>('owner');
  const [workshopName, setWorkshopName]       = useState('');
  const [workshopAddress, setWorkshopAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!localStorage.getItem('vtoken')) return;
    try {
      const u = JSON.parse(localStorage.getItem('vuser') || '{}');
      router.replace(homeFor(u.role));
    } catch {
      router.replace('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function editPhone() {
    setOtpSent(false);
    setCode('');
    setError('');
  }

  async function sendOtp() {
    setError('');
    setOtpLoading(true);
    try {
      await api.auth.requestOtp(phone);
      setOtpSent(true);
      setCooldown(60);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setOtpLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!otpSent) {
      return sendOtp();
    }
    setLoading(true);
    setError('');
    try {
      const res = mode === 'login'
        ? await api.auth.login(phone, code)
        : await api.auth.register({ phone, code, name, role, workshopName, workshopAddress });
      localStorage.setItem('vtoken', res.access_token);
      localStorage.setItem('vuser', JSON.stringify(res.user));
      router.push(homeFor(res.user.role));
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
        background: `radial-gradient(circle, ${C.green}1C 0%, transparent 70%)`,
        filter: 'blur(50px)', zIndex: 0, animation: 'blobPulse 9s ease-in-out infinite',
      }} />
      <div style={{
        position: 'fixed', bottom: -100, left: -100, width: 400, height: 400, borderRadius: '50%',
        background: `radial-gradient(circle, ${C.blue}17 0%, transparent 70%)`,
        filter: 'blur(45px)', zIndex: 0, animation: 'blobPulse 11s ease-in-out infinite reverse',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 440, margin: '0 auto', padding: '28px 20px 44px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 15,
            background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white',
            boxShadow: `0 6px 18px ${C.greenGlow}`,
            flexShrink: 0,
          }}><CarIcon size={22} /></div>
          <div>
            <p style={{ color: C.text, fontWeight: 900, fontSize: 16, margin: 0 }}>دستیار خودرو</p>
            <p style={{ color: C.muted, fontSize: 11, fontWeight: 500, margin: 0 }}>هوشمند · امن · دقیق</p>
          </div>
        </div>

        <div style={{ marginBottom: 22, animation: 'fadeInUp 0.5s cubic-bezier(.34,1.2,.64,1) both' }}>
          <AccountCardPreview />
        </div>

        <div style={{ textAlign: 'center', marginBottom: 18, animation: 'fadeInUp 0.5s cubic-bezier(.34,1.2,.64,1) 0.07s both' }}>
          <h1 style={{ color: C.text, fontSize: 21, fontWeight: 900, margin: '0 0 8px', lineHeight: 1.4 }}>
            مدیریت هوشمند خودروها
          </h1>
          <p style={{ color: C.muted, fontSize: 13, fontWeight: 500, margin: 0, lineHeight: 1.75 }}>
            سرویس، بیمه، سوخت و مدارک همه خودروهاتو<br />در یک جا مدیریت کن
          </p>
        </div>

        <div style={{ marginBottom: 22, animation: 'fadeInUp 0.5s cubic-bezier(.34,1.2,.64,1) 0.12s both' }}>
          <TrustBadges />
        </div>

        <div style={{
          background: C.surface,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: `1px solid ${C.borderStrong}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)',
          borderRadius: 24, padding: '22px 20px',
          marginBottom: 18,
          animation: 'fadeInUp 0.55s cubic-bezier(.34,1.2,.64,1) 0.16s both',
        }}>
          <div style={{
            display: 'flex', borderRadius: 14, overflow: 'hidden',
            border: `1px solid ${C.border}`,
            background: 'rgba(255,255,255,0.04)', marginBottom: 20,
          }}>
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); editPhone(); }}
                style={{
                  flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 700,
                  fontFamily: 'Vazirmatn, sans-serif',
                  border: 'none', transition: 'all 0.22s',
                  background: mode === m
                    ? `linear-gradient(135deg, ${C.green}, ${C.greenDark})`
                    : 'transparent',
                  color: mode === m ? 'white' : C.muted,
                  borderRadius: 12,
                  boxShadow: mode === m ? `0 4px 16px ${C.greenGlow}` : 'none',
                }}
              >
                {m === 'login' ? 'ورود' : 'ثبت‌نام'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'register' && (
              <>
                <div>
                  <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 7 }}>
                    نوع حساب
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {([
                      { v: 'owner' as const,    label: 'مالک خودرو', icon: <CarIcon size={16} /> },
                      { v: 'mechanic' as const, label: 'مکانیک',     icon: <WrenchIcon size={16} /> },
                      { v: 'seller' as const,   label: 'فروشنده',    icon: <StoreIcon size={16} /> },
                    ]).map(opt => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setRole(opt.v)}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                          padding: '11px 8px', borderRadius: 14,
                          border: `2px solid ${role === opt.v ? C.green : 'transparent'}`,
                          background: role === opt.v ? `${C.green}1F` : 'rgba(255,255,255,0.04)',
                          color: role === opt.v ? C.green : C.muted,
                          fontSize: 13, fontWeight: role === opt.v ? 800 : 500,
                          fontFamily: 'Vazirmatn, sans-serif',
                        }}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 7 }}>
                    نام و نام خانوادگی
                  </label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="علی احمدی" required />
                </div>

                {(role === 'mechanic' || role === 'seller') && (
                  <>
                    <div>
                      <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 7 }}>
                        {role === 'mechanic' ? 'نام تعمیرگاه' : 'نام فروشگاه'}
                      </label>
                      <Input
                        value={workshopName} onChange={e => setWorkshopName(e.target.value)}
                        placeholder={role === 'mechanic' ? 'تعمیرگاه امید' : 'فروشگاه لوازم یدکی امید'} required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 7 }}>
                        {role === 'mechanic' ? 'آدرس تعمیرگاه' : 'آدرس فروشگاه'}
                      </label>
                      <Input value={workshopAddress} onChange={e => setWorkshopAddress(e.target.value)} placeholder="اختیاری" />
                    </div>
                  </>
                )}
              </>
            )}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <label style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>
                  شماره موبایل
                </label>
                {otpSent && (
                  <button
                    type="button"
                    onClick={editPhone}
                    style={{ background: 'none', border: 'none', color: C.green, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Vazirmatn, sans-serif' }}
                  >
                    ویرایش شماره
                  </button>
                )}
              </div>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="09123456789"
                type="tel"
                required
                readOnly={otpSent}
                dir="ltr"
                style={{ textAlign: 'left', opacity: otpSent ? 0.6 : 1 }}
              />
            </div>

            {otpSent && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                  <label style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>
                    کد تایید پیامک‌شده
                  </label>
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={cooldown > 0 || otpLoading}
                    style={{
                      background: 'none', border: 'none', fontSize: 11, fontWeight: 700,
                      fontFamily: 'Vazirmatn, sans-serif',
                      color: cooldown > 0 ? C.muted : C.green,
                      cursor: cooldown > 0 ? 'default' : 'pointer',
                    }}
                  >
                    {cooldown > 0 ? `ارسال مجدد (${cooldown})` : 'ارسال مجدد کد'}
                  </button>
                </div>
                <Input
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="----"
                  inputMode="numeric"
                  autoFocus
                  required
                  dir="ltr"
                  style={{ textAlign: 'center', letterSpacing: 6, fontSize: 18 }}
                />
              </div>
            )}

            {error && (
              <div style={{
                fontSize: 12, color: '#F87171',
                background: 'rgba(239,68,68,0.10)',
                border: '1px solid rgba(239,68,68,0.20)',
                borderRadius: 11, padding: '10px 14px',
              }}>
                {error}
              </div>
            )}

            <Button type="submit" loading={otpSent ? loading : otpLoading} fullWidth size="lg" style={{ marginTop: 2 }}>
              {!otpSent ? 'دریافت کد تایید' : (mode === 'login' ? 'ورود به حساب' : 'ساخت حساب')}
            </Button>
          </form>
        </div>

        <div style={{ animation: 'fadeInUp 0.55s cubic-bezier(.34,1.2,.64,1) 0.22s both' }}>
          <SecurityStrip />
        </div>

      </div>
    </div>
  );
}

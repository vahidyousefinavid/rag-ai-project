'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { C, Card, Button, Input } from '@/components/ui';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (localStorage.getItem('crm_token')) router.replace('/dashboard');
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.auth.login(phone, password);
      localStorage.setItem('crm_token', res.access_token);
      localStorage.setItem('crm_user', JSON.stringify(res.user));
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <Card style={{ width: '100%', maxWidth: 380 }} padding="30px 26px">
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, margin: '0 auto 14px',
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 22,
          }}>C</div>
          <h1 style={{ fontSize: 17, fontWeight: 900, color: C.text, margin: 0 }}>ورود به پنل مدیریت</h1>
          <p style={{ fontSize: 12.5, color: C.muted, margin: '6px 0 0' }}>دستیار خودرو · مخصوص ادمین‌ها</p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 6 }}>شماره موبایل</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" required />
          </div>
          <div>
            <label style={{ fontSize: 11, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 6 }}>رمز عبور</label>
            <Input value={password} onChange={e => setPassword(e.target.value)} type="password" required />
          </div>
          {error && (
            <div style={{ fontSize: 12, color: '#F87171', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: 10, padding: '10px 13px' }}>{error}</div>
          )}
          <Button type="submit" loading={loading} fullWidth>ورود</Button>
        </form>
      </Card>
    </div>
  );
}

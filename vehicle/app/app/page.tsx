'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode]       = useState<'login' | 'register'>('login');
  const [phone, setPhone]     = useState('');
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (localStorage.getItem('vtoken')) router.replace('/dashboard');
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = mode === 'login'
        ? await api.auth.login(phone)
        : await api.auth.register(phone, name);
      localStorage.setItem('vtoken', res.access_token);
      localStorage.setItem('vuser', JSON.stringify(res.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/20 mb-4">
            <span className="text-3xl">🚗</span>
          </div>
          <h1 className="text-2xl font-bold text-white">دستیار خودرو</h1>
          <p className="text-muted mt-1 text-sm">مدیریت هوشمند سرویس‌های خودرو</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6">
          {/* Toggle */}
          <div className="flex rounded-xl overflow-hidden border border-border mb-6">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  mode === m ? 'bg-accent text-white' : 'text-muted hover:text-white'
                }`}
              >
                {m === 'login' ? 'ورود' : 'ثبت‌نام'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <div>
                <label className="text-xs text-muted mb-1.5 block">نام و نام خانوادگی</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="علی احمدی"
                  required
                  className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-muted/50"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-muted mb-1.5 block">شماره موبایل</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="09123456789"
                type="tel"
                required
                dir="ltr"
                className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-muted/50 text-left"
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 text-white rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-50 mt-1"
            >
              {loading ? 'در حال پردازش...' : mode === 'login' ? 'ورود' : 'ثبت‌نام'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

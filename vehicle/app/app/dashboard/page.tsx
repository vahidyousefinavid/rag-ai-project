'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { api, Vehicle, daysUntil, expiryStatus } from '@/lib/api';

// ── Progress ring (مثل تصویر - دایره درصد) ─────────────────────────────────
function ProgressRing({ pct }: { pct: number }) {
  const r = 28, circ = 2 * Math.PI * r;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="5" />
      <circle
        cx="36" cy="36" r={r}
        fill="none" stroke="white" strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * circ} ${circ}`}
        transform="rotate(-90 36 36)"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      <text x="36" y="40" textAnchor="middle" fill="white" fontSize="13" fontWeight="700">{pct}%</text>
    </svg>
  );
}

// ── هر ردیف خودرو در لیست activity ─────────────────────────────────────────
function VehicleRow({ v, isLast }: { v: Vehicle; isLast: boolean }) {
  const insDays = daysUntil(v.insuranceExpiry);
  const tecDays = daysUntil(v.technicalExpiry);
  const hasAlert = expiryStatus(insDays) !== 'ok' || expiryStatus(tecDays) !== 'ok';
  const dot = hasAlert ? '#FF6B6B' : '#1BC9A8';

  return (
    <Link href={`/vehicles/${v.id}`} style={{ display: 'flex', gap: 0, textDecoration: 'none' }}>
      {/* Timeline column */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 36, paddingTop: 6 }}>
        <div style={{
          width: 13, height: 13, borderRadius: '50%',
          background: dot, flexShrink: 0,
          boxShadow: `0 0 0 3px white, 0 0 0 5px ${dot}40`,
        }} />
        {!isLast && <div style={{ width: 2, flex: 1, background: '#E5ECF4', marginTop: 4, minHeight: 24 }} />}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingTop: 2, paddingBottom: isLast ? 12 : 20, paddingLeft: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#1A2A3A', fontSize: 14, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
              {v.make} {v.model}
            </p>
            <p style={{ color: '#8A9DBB', fontSize: 12, margin: '3px 0 0' }}>
              {v.year}{v.fuelType ? ` · ${v.fuelType}` : ''} · {v.currentMileage.toLocaleString()} km
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            {v.plateNumber && (
              <span style={{
                background: '#EEF2F7', color: '#5A7080', fontSize: 11,
                padding: '2px 7px', borderRadius: 6, fontFamily: 'monospace', direction: 'ltr',
              }}>
                {v.plateNumber}
              </span>
            )}
            <span style={{ color: dot, fontSize: 12, fontWeight: 500 }}>
              {hasAlert ? '⚠ هشدار' : '✓ سالم'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── داشبورد اصلی ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading]   = useState(true);
  const [user, setUser]         = useState<{ name: string } | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    try { setUser(JSON.parse(localStorage.getItem('vuser') || '{}')); } catch {}
    api.vehicles.list().then(setVehicles).finally(() => setLoading(false));
  }, [router]);

  const alerts = vehicles.filter(v =>
    expiryStatus(daysUntil(v.insuranceExpiry)) !== 'ok' ||
    expiryStatus(daysUntil(v.technicalExpiry)) !== 'ok'
  );

  const healthy = vehicles.length - alerts.length;
  const pct = vehicles.length ? Math.round((healthy / vehicles.length) * 100) : 100;

  const today = new Date().toLocaleDateString('fa-IR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#EEF2F7' }}>
      <Navbar />

      <main style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px 40px' }}>

        {/* ── سلام ───────────────────────────────────────────────────────── */}
        <div style={{ padding: '20px 0 16px' }}>
          <p style={{ color: '#8A9DBB', fontSize: 13, margin: 0 }}>{today}</p>
          <h1 style={{ color: '#1A2A3A', fontSize: 22, fontWeight: 700, margin: '4px 0 0' }}>
            {user?.name ? `سلام ${user.name} 👋` : 'خوش آمدی 👋'}
          </h1>
        </div>

        {/* ── کارت وضعیت ناوگان (سبز - مثل My Plan For Today) ─────────── */}
        {!loading && vehicles.length > 0 && (
          <div style={{
            background: '#1BC9A8', borderRadius: 20, padding: '20px 24px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 20, gap: 12,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600, margin: '0 0 6px' }}>
                وضعیت ناوگان
              </p>
              <p style={{ color: 'white', fontSize: 19, fontWeight: 700, margin: 0 }}>
                {healthy} از {vehicles.length} سالم
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: '8px 0 0' }}>
                {alerts.length
                  ? `${alerts.length} خودرو نیاز به توجه دارد`
                  : 'همه خودروها در وضعیت خوب هستند ✓'}
              </p>
            </div>
            <ProgressRing pct={pct} />
          </div>
        )}

        {/* ── هشدارها ────────────────────────────────────────────────────── */}
        {alerts.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ color: '#1A2A3A', fontSize: 15, fontWeight: 600, margin: '0 0 10px' }}>هشدارها</h2>
            <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 4px 20px rgba(26,42,58,0.08)', overflow: 'hidden' }}>
              {alerts.flatMap(v => {
                const rows: { v: Vehicle; type: string; icon: string; days: number | null }[] = [];
                const ins = daysUntil(v.insuranceExpiry);
                const tec = daysUntil(v.technicalExpiry);
                if (expiryStatus(ins) !== 'ok') rows.push({ v, type: 'بیمه شخص ثالث', icon: '🛡️', days: ins });
                if (expiryStatus(tec) !== 'ok') rows.push({ v, type: 'معاینه فنی', icon: '🔍', days: tec });
                return rows;
              }).map((a, i, arr) => (
                <Link key={i} href={`/vehicles/${a.v.id}?tab=documents`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px',
                    borderBottom: i < arr.length - 1 ? '1px solid #EEF2F7' : 'none',
                  }}>
                    <span style={{ fontSize: 20 }}>{a.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: '#1A2A3A', fontSize: 13, fontWeight: 600, margin: 0 }}>
                        {a.v.make} {a.v.model}
                      </p>
                      <p style={{ color: '#8A9DBB', fontSize: 12, margin: '2px 0 0' }}>{a.type}</p>
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: a.days !== null && a.days < 0 ? '#FF6B6B'
                           : a.days !== null && a.days < 14 ? '#FF9500'
                           : '#FFB950',
                    }}>
                      {a.days !== null && a.days < 0 ? 'منقضی شده' : `${a.days} روز مانده`}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── لیست خودروها (activity style) ─────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ color: '#1A2A3A', fontSize: 15, fontWeight: 600, margin: 0 }}>خودروهای من</h2>
            <Link href="/vehicles/new" style={{ color: '#1BC9A8', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              + افزودن
            </Link>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                border: '2.5px solid #E5ECF4', borderTopColor: '#1BC9A8',
                animation: 'spin 0.8s linear infinite',
              }} />
            </div>
          ) : vehicles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: 20, boxShadow: '0 4px 20px rgba(26,42,58,0.08)' }}>
              <p style={{ fontSize: 52, margin: '0 0 12px' }}>🚗</p>
              <p style={{ color: '#1A2A3A', fontSize: 16, fontWeight: 600, margin: 0 }}>هنوز خودرویی ثبت نکردی</p>
              <p style={{ color: '#8A9DBB', fontSize: 13, margin: '6px 0 20px' }}>اولین خودروت رو اضافه کن</p>
              <Link href="/vehicles/new" style={{
                display: 'inline-block', background: '#1BC9A8', color: 'white',
                padding: '11px 28px', borderRadius: 14, fontSize: 14, fontWeight: 600,
                textDecoration: 'none',
              }}>
                افزودن خودرو
              </Link>
            </div>
          ) : (
            <div style={{
              background: 'white', borderRadius: 20,
              boxShadow: '0 4px 20px rgba(26,42,58,0.08)',
              padding: '14px 16px 4px',
            }}>
              {vehicles.map((v, i) => (
                <VehicleRow key={v.id} v={v} isLast={i === vehicles.length - 1} />
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

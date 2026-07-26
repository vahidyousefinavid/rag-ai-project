'use client';
import { useState, useEffect } from 'react';
import Shell from '@/components/Shell';
import { C, Card, Spinner } from '@/components/ui';
import { api, DashboardStats, APPOINTMENT_STATUS_LABEL } from '@/lib/api';

function StatCard({ label, value, sub, color = C.accent }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, left: 0, height: 3, background: color }} />
      <p style={{ fontSize: 11.5, color: C.muted, fontWeight: 700, margin: 0 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 900, color: C.text, margin: '8px 0 0' }}>{value}</p>
      {sub && <p style={{ fontSize: 11.5, color: C.subtle, margin: '4px 0 0' }}>{sub}</p>}
    </Card>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard.stats().then(setStats).finally(() => setLoading(false));
  }, []);

  return (
    <Shell>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: '0 0 20px' }}>داشبورد</h1>

      {loading || !stats ? (
        <Spinner />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
            <StatCard label="مالکان" value={String(stats.owners)} sub={`${stats.activeOwners} فعال`} color={C.accent} />
            <StatCard label="مکانیک‌ها" value={String(stats.mechanics)} sub={`${stats.activeMechanics} فعال`} color="#22C55E" />
            <StatCard label="فروشندگان" value={String(stats.sellers)} sub={`${stats.activeSellers} فعال`} color="#818CF8" />
            <StatCard label="خودروهای ثبت‌شده" value={String(stats.vehicleCount)} color="#F59E0B" />
            <StatCard label="محصولات" value={String(stats.productCount)} color="#F472B6" />
            <StatCard label="سازمان‌ها" value={String(stats.organizationCount)} color="#EC4899" />
            <StatCard label="درآمد کل" value={`${stats.totalRevenue.toLocaleString()} ت`} color="#22C55E" />
            <StatCard label="میانگین امتیاز" value={stats.avgRating ? String(stats.avgRating) : '—'} sub={`${stats.reviewCount} نظر`} color="#FBBF24" />
          </div>

          <Card>
            <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: '0 0 14px' }}>نوبت‌ها بر اساس وضعیت</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {Object.entries(stats.appointmentsByStatus).length === 0 ? (
                <p style={{ fontSize: 12.5, color: C.muted }}>هنوز نوبتی ثبت نشده</p>
              ) : (
                Object.entries(stats.appointmentsByStatus).map(([status, count]) => (
                  <div key={status} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                    <p style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: 0 }}>{count}</p>
                    <p style={{ fontSize: 11.5, color: C.muted, margin: '4px 0 0' }}>{APPOINTMENT_STATUS_LABEL[status] || status}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      )}
    </Shell>
  );
}

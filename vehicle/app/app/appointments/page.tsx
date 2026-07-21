'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { api, Appointment, Role, toJalali } from '@/lib/api';
import { C, Card, Button, EmptyState, Spinner } from '@/components/ui';
import { ChevronRightIcon, CalendarIcon, CheckIcon, XIcon, CarIcon, WrenchIcon } from '@/components/icons';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: 'در انتظار تایید', color: '#FBBF24' },
  confirmed: { label: 'تایید شده',       color: '#34D399' },
  rejected:  { label: 'رد شده',          color: '#F87171' },
  completed: { label: 'انجام‌شده',        color: '#818CF8' },
  cancelled: { label: 'لغوشده',          color: '#94A3B8' },
};

export default function AppointmentsPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('owner');
  const [list, setList] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  function load() {
    api.appointments.mine().then(setList).finally(() => setLoading(false));
  }
  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    try { setRole(JSON.parse(localStorage.getItem('vuser') || '{}').role || 'owner'); } catch {}
    load();
  }, []);

  async function act(id: string, action: 'confirm' | 'reject' | 'complete' | 'cancel') {
    setActingId(id);
    try {
      if (action === 'confirm') await api.appointments.respond(id, 'confirmed');
      else if (action === 'reject') await api.appointments.respond(id, 'rejected');
      else if (action === 'complete') await api.appointments.complete(id);
      else await api.appointments.cancel(id);
      load();
    } finally {
      setActingId(null);
    }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="نوبت‌ها" />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 14px calc(88px + env(safe-area-inset-bottom))' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, padding: '14px 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ChevronRightIcon size={16} /> بازگشت
        </button>

        {loading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState icon={<CalendarIcon size={26} />} title="نوبتی نداری" sub={role === 'owner' ? 'از صفحه تعمیرگاه‌ها یک نوبت رزرو کن' : 'وقتی مشتری‌ها نوبت بگیرن، اینجا نشونت می‌دیم'} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map(a => {
              const st = STATUS_LABEL[a.status];
              const dt = new Date(a.requestedAt);
              return (
                <Card key={a.id} padding="14px 16px">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12, background: `${st.color}1F`, border: `1px solid ${st.color}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: st.color, flexShrink: 0,
                      }}>{role === 'owner' ? <WrenchIcon size={18} /> : <CarIcon size={18} />}</div>
                      <div>
                        <p style={{ fontSize: 13.5, fontWeight: 800, color: C.text, margin: 0 }}>
                          {role === 'owner' ? (a.mechanic?.workshopName || a.mechanic?.name) : `${a.vehicle?.make} ${a.vehicle?.model}`}
                        </p>
                        <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0' }}>
                          {isNaN(dt.getTime()) ? a.requestedAt : `${toJalali(a.requestedAt.slice(0, 10))} · ${dt.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                        {a.serviceType && <p style={{ fontSize: 11, color: C.subtle, margin: '3px 0 0' }}>{a.serviceType}</p>}
                        {role === 'mechanic' && a.owner && <p style={{ fontSize: 10.5, color: C.subtle, margin: '3px 0 0', direction: 'ltr', textAlign: 'right' }}>{a.owner.phone}</p>}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: st.color, background: `${st.color}1F`, padding: '3px 9px', borderRadius: 8, whiteSpace: 'nowrap' }}>{st.label}</span>
                  </div>

                  {a.notes && <p style={{ fontSize: 12, color: C.muted, margin: '10px 0 0', lineHeight: 1.7 }}>{a.notes}</p>}

                  {role === 'mechanic' && a.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <Button size="sm" fullWidth loading={actingId === a.id} onClick={() => act(a.id, 'confirm')} icon={<CheckIcon size={13} />}>تایید</Button>
                      <Button size="sm" fullWidth variant="danger" disabled={actingId === a.id} onClick={() => act(a.id, 'reject')} icon={<XIcon size={13} />}>رد</Button>
                    </div>
                  )}
                  {role === 'mechanic' && a.status === 'confirmed' && (
                    <Button size="sm" fullWidth loading={actingId === a.id} onClick={() => act(a.id, 'complete')} style={{ marginTop: 12 }} icon={<CheckIcon size={13} />}>ثبت به‌عنوان انجام‌شده</Button>
                  )}
                  {role === 'owner' && ['pending', 'confirmed'].includes(a.status) && (
                    <Button size="sm" fullWidth variant="danger" disabled={actingId === a.id} onClick={() => act(a.id, 'cancel')} style={{ marginTop: 12 }} icon={<XIcon size={13} />}>لغو نوبت</Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

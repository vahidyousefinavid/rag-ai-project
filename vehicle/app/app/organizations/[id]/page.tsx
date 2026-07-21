'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { api, OrgMember, Vehicle, Role } from '@/lib/api';
import { C, Card, SectionCard, Button, IconButton, FormField, Input, Sheet, EmptyState, Spinner } from '@/components/ui';
import { ChevronRightIcon, UsersIcon, PlusIcon, TrashIcon, CarIcon } from '@/components/icons';

export default function OrganizationDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [myVehicles, setMyVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAssignVehicle, setShowAssignVehicle] = useState(false);
  const [role, setRole] = useState<Role>('owner');
  const [meId, setMeId] = useState('');

  function load() {
    Promise.all([api.organizations.members(id), api.organizations.vehicles(id)])
      .then(([m, v]) => { setMembers(m); setVehicles(v); })
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    try {
      const u = JSON.parse(localStorage.getItem('vuser') || '{}');
      setRole(u.role); setMeId(u.id);
    } catch {}
    load();
  }, [id]);

  const myMembership = members.find(m => m.userId === meId);
  const isAdmin = myMembership?.role === 'admin';

  async function removeMember(userId: string) {
    if (!confirm('این عضو از سازمان حذف شود؟')) return;
    await api.organizations.removeMember(id, userId);
    load();
  }
  async function unassignVehicle(vehicleId: string) {
    if (!confirm('این خودرو از سازمان خارج شود؟')) return;
    await api.organizations.unassignVehicle(id, vehicleId);
    load();
  }

  function openAssign() {
    api.vehicles.list().then(setMyVehicles);
    setShowAssignVehicle(true);
  }

  if (loading) return <Spinner />;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 14px calc(88px + env(safe-area-inset-bottom))' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, padding: '14px 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ChevronRightIcon size={16} /> بازگشت
        </button>

        <SectionCard
          title="اعضای سازمان"
          icon={<UsersIcon size={15} />}
          action={isAdmin ? <Button size="sm" onClick={() => setShowAddMember(true)} icon={<PlusIcon size={13} />}>افزودن</Button> : undefined}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 13, border: `1px solid ${C.border}`, background: C.surface2 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{m.name}</p>
                  <p style={{ fontSize: 10.5, color: C.muted, margin: '3px 0 0', direction: 'ltr', textAlign: 'right' }}>{m.phone}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, color: m.role === 'admin' ? C.green : C.muted, background: m.role === 'admin' ? `${C.green}1F` : 'transparent', padding: '3px 9px', borderRadius: 8 }}>
                  {m.role === 'admin' ? 'مدیر' : 'راننده'}
                </span>
                {isAdmin && m.userId !== meId && (
                  <IconButton label="حذف عضو" onClick={() => removeMember(m.userId)} size={28}><TrashIcon size={13} /></IconButton>
                )}
              </div>
            ))}
          </div>
        </SectionCard>

        <div style={{ marginTop: 14 }}>
          <SectionCard
            title="خودروهای سازمان"
            icon={<CarIcon size={15} />}
            action={isAdmin ? <Button size="sm" onClick={openAssign} icon={<PlusIcon size={13} />}>افزودن خودرو</Button> : undefined}
          >
            {vehicles.length === 0 ? (
              <EmptyState icon={<CarIcon size={22} />} title="خودرویی در سازمان نیست" sub="مدیر سازمان می‌تواند خودروهای خودش را به ناوگان اضافه کند" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {vehicles.map(v => (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 13, border: `1px solid ${C.border}`, background: C.surface2 }}>
                    <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => router.push(`/vehicles/${v.id}`)}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{v.make} {v.model} <span style={{ color: C.muted, fontWeight: 500 }}>({v.year})</span></p>
                      {v.plateNumber && <p style={{ fontSize: 10.5, color: C.muted, margin: '3px 0 0', direction: 'ltr', textAlign: 'right' }}>{v.plateNumber}</p>}
                    </div>
                    {isAdmin && (
                      <IconButton label="خروج از سازمان" onClick={() => unassignVehicle(v.id)} size={28}><TrashIcon size={13} /></IconButton>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </main>

      {showAddMember && (
        <AddMemberSheet orgId={id} onClose={() => setShowAddMember(false)} onAdded={() => { setShowAddMember(false); load(); }} />
      )}
      {showAssignVehicle && (
        <AssignVehicleSheet
          orgId={id}
          candidates={myVehicles.filter(v => !vehicles.some(ov => ov.id === v.id))}
          onClose={() => setShowAssignVehicle(false)}
          onAssigned={() => { setShowAssignVehicle(false); load(); }}
        />
      )}
      <BottomNav />
    </div>
  );
}

function AddMemberSheet({ orgId, onClose, onAdded }: { orgId: string; onClose: () => void; onAdded: () => void }) {
  const [phone, setPhone] = useState('');
  const [memberRole, setMemberRole] = useState<'admin' | 'driver'>('driver');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.organizations.addMember(orgId, phone, memberRole);
      onAdded();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet title="افزودن عضو" icon={<UsersIcon size={16} />} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormField label="شماره موبایل عضو" required>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="09123456789" dir="ltr" style={{ textAlign: 'left' }} required />
        </FormField>
        <FormField label="نقش">
          <div style={{ display: 'flex', gap: 8 }}>
            {(['driver', 'admin'] as const).map(r => (
              <button
                key={r} type="button" onClick={() => setMemberRole(r)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
                  fontFamily: 'Vazirmatn, sans-serif',
                  border: `1.5px solid ${memberRole === r ? C.green : C.border}`,
                  background: memberRole === r ? `${C.green}1F` : 'transparent',
                  color: memberRole === r ? C.green : C.muted,
                }}
              >{r === 'driver' ? 'راننده' : 'مدیر'}</button>
            ))}
          </div>
        </FormField>
        <p style={{ fontSize: 11, color: C.subtle, margin: 0, lineHeight: 1.8 }}>
          عضو باید قبلاً در اپ ثبت‌نام کرده باشد.
        </p>
        {error && (
          <div style={{ fontSize: 12, color: '#F87171', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: 11, padding: '10px 14px' }}>{error}</div>
        )}
        <Button type="submit" loading={loading} fullWidth size="lg">افزودن عضو</Button>
      </form>
    </Sheet>
  );
}

function AssignVehicleSheet({ orgId, candidates, onClose, onAssigned }: { orgId: string; candidates: Vehicle[]; onClose: () => void; onAssigned: () => void }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function assign(vehicleId: string) {
    setLoadingId(vehicleId);
    try {
      await api.organizations.assignVehicle(orgId, vehicleId);
      onAssigned();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <Sheet title="افزودن خودرو به سازمان" icon={<CarIcon size={16} />} onClose={onClose}>
      {candidates.length === 0 ? (
        <EmptyState icon={<CarIcon size={22} />} title="خودرویی برای افزودن نداری" sub="فقط خودروهایی که خودت مالک آن‌ها هستی قابل افزودن به سازمان هستند" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {candidates.map(v => (
            <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderRadius: 14, border: `1px solid ${C.border}`, background: C.surface2 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{v.make} {v.model} ({v.year})</span>
              <Button size="sm" loading={loadingId === v.id} onClick={() => assign(v.id)}>افزودن</Button>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

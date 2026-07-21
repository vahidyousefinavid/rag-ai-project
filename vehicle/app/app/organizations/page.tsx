'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { api, OrganizationSummary } from '@/lib/api';
import { C, Card, Button, FormField, Input, Sheet, EmptyState, Spinner } from '@/components/ui';
import { ChevronRightIcon, UsersIcon, PlusIcon, ChevronLeftIcon } from '@/components/icons';

export default function OrganizationsPage() {
  const router = useRouter();
  const [list, setList] = useState<OrganizationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  function load() {
    api.organizations.mine().then(setList).finally(() => setLoading(false));
  }
  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    load();
  }, []);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="سازمان‌ها" />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 14px calc(88px + env(safe-area-inset-bottom))' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, padding: '14px 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ChevronRightIcon size={16} /> بازگشت
        </button>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <Button size="sm" onClick={() => setShowAdd(true)} icon={<PlusIcon size={14} />}>سازمان جدید</Button>
        </div>

        {loading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<UsersIcon size={26} />}
            title="سازمانی نداری"
            sub="برای مدیریت ناوگان خودروهای شرکتی با چند راننده، یک سازمان بساز"
            onAdd={() => setShowAdd(true)}
            btnLabel="ساخت سازمان"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {list.map(o => (
              <Card key={o.id} padding="14px 16px" style={{ cursor: 'pointer' }}>
                <div onClick={() => router.push(`/organizations/${o.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 13, background: `${C.green}1F`, border: `1px solid ${C.green}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green, flexShrink: 0,
                  }}><UsersIcon size={19} /></div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>{o.name}</p>
                    <p style={{ fontSize: 11, color: C.muted, margin: '3px 0 0' }}>{o.role === 'admin' ? 'مدیر سازمان' : 'راننده'}</p>
                  </div>
                  <ChevronLeftIcon size={16} color={C.subtle} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {showAdd && (
        <CreateOrgSheet onClose={() => setShowAdd(false)} onCreated={(o) => { setShowAdd(false); router.push(`/organizations/${o.id}`); }} />
      )}
      <BottomNav />
    </div>
  );
}

function CreateOrgSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (o: { id: string }) => void }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const org = await api.organizations.create(name);
      onCreated(org);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet title="ساخت سازمان" icon={<UsersIcon size={16} />} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormField label="نام سازمان" required>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="مثلاً شرکت حمل‌ونقل آریا" required />
        </FormField>
        {error && (
          <div style={{ fontSize: 12, color: '#F87171', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: 11, padding: '10px 14px' }}>{error}</div>
        )}
        <Button type="submit" loading={loading} fullWidth size="lg">ساخت سازمان</Button>
      </form>
    </Sheet>
  );
}

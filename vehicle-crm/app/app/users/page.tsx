'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { C, Card, Button, Input, Badge, Table, Td, Pagination, Spinner, EmptyState } from '@/components/ui';
import { api, UserSummary, toJalali } from '@/lib/api';

const ROLE_TABS = [
  { v: 'owner' as const, label: 'مالکان' },
  { v: 'mechanic' as const, label: 'مکانیک‌ها' },
  { v: 'seller' as const, label: 'فروشندگان' },
];

export default function UsersPage() {
  const [role, setRole] = useState<'owner' | 'mechanic' | 'seller'>('owner');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: UserSummary[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const hasBusinessName = role !== 'owner';

  const load = useCallback(() => {
    setLoading(true);
    api.users.list({ role, q: q || undefined, page, pageSize: 20 }).then(setData).finally(() => setLoading(false));
  }, [role, q, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [role, q]);

  async function toggleActive(u: UserSummary) {
    await api.users.setActive(u.id, !u.active);
    load();
  }

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: 0 }}>کاربران</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {ROLE_TABS.map((t) => (
            <Button key={t.v} size="sm" variant={role === t.v ? 'primary' : 'secondary'} onClick={() => setRole(t.v)}>{t.label}</Button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14, maxWidth: 320 }}>
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجوی نام..." />
      </div>

      <Card padding="0">
        {loading ? (
          <Spinner />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="کاربری پیدا نشد" />
        ) : (
          <Table head={hasBusinessName ? [role === 'mechanic' ? 'تعمیرگاه' : 'فروشگاه', 'نام مسئول', 'موبایل', 'وضعیت', 'تاریخ عضویت', ''] : ['نام', 'موبایل', 'وضعیت', 'تاریخ عضویت', '']}>
            {data.items.map((u) => (
              <tr key={u.id}>
                {hasBusinessName && <Td>{u.workshopName || '—'}</Td>}
                <Td>{u.name}</Td>
                <Td style={{ direction: 'ltr', textAlign: 'right' }}>{u.phone}</Td>
                <Td><Badge color={u.active ? C.green : C.red}>{u.active ? 'فعال' : 'مسدود'}</Badge></Td>
                <Td>{toJalali(u.createdAt)}</Td>
                <Td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Link href={`/users/${u.id}`}><Button size="sm" variant="secondary">مشاهده</Button></Link>
                    <Button size="sm" variant={u.active ? 'danger' : 'secondary'} onClick={() => toggleActive(u)}>
                      {u.active ? 'مسدودسازی' : 'رفع مسدودی'}
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {data && <Pagination page={page} total={data.total} pageSize={20} onChange={setPage} />}
    </Shell>
  );
}

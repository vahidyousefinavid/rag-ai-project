'use client';
import { useState, useEffect, useCallback } from 'react';
import Shell from '@/components/Shell';
import { C, Card, Input, Table, Td, Pagination, Spinner, EmptyState } from '@/components/ui';
import { api, VehicleSummary, toJalali } from '@/lib/api';

export default function VehiclesPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: VehicleSummary[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.vehicles.list({ q: q || undefined, page, pageSize: 20 }).then(setData).finally(() => setLoading(false));
  }, [q, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [q]);

  return (
    <Shell>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: '0 0 18px' }}>خودروها</h1>

      <div style={{ marginBottom: 14, maxWidth: 320 }}>
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجوی پلاک..." dir="ltr" />
      </div>

      <Card padding="0">
        {loading ? (
          <Spinner />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="خودرویی پیدا نشد" />
        ) : (
          <Table head={['خودرو', 'پلاک', 'کارکرد', 'مالک', 'موبایل مالک', 'تاریخ ثبت']}>
            {data.items.map((v) => (
              <tr key={v.id}>
                <Td>{v.make} {v.model} <span style={{ color: C.subtle }}>({v.year})</span></Td>
                <Td style={{ direction: 'ltr', textAlign: 'right' }}>{v.plateNumber || '—'}</Td>
                <Td>{v.currentMileage.toLocaleString()} km</Td>
                <Td>{v.ownerName || '—'}</Td>
                <Td style={{ direction: 'ltr', textAlign: 'right' }}>{v.ownerPhone || '—'}</Td>
                <Td>{toJalali(v.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {data && <Pagination page={page} total={data.total} pageSize={20} onChange={setPage} />}
    </Shell>
  );
}

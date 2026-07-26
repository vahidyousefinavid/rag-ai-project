'use client';
import { useState, useEffect, useCallback } from 'react';
import Shell from '@/components/Shell';
import { C, Card, Table, Td, Pagination, Spinner, EmptyState } from '@/components/ui';
import { api, OrganizationRow, toJalali } from '@/lib/api';

export default function OrganizationsPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: OrganizationRow[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.organizations.list({ page, pageSize: 20 }).then(setData).finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <Shell>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: '0 0 18px' }}>سازمان‌ها / ناوگان</h1>

      <Card padding="0">
        {loading ? (
          <Spinner />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="سازمانی ثبت نشده" />
        ) : (
          <Table head={['نام سازمان', 'مدیر', 'تعداد اعضا', 'تعداد خودرو', 'تاریخ ثبت']}>
            {data.items.map((o) => (
              <tr key={o.id}>
                <Td>{o.name}</Td>
                <Td>{o.ownerName || '—'}</Td>
                <Td>{o.memberCount}</Td>
                <Td>{o.vehicleCount}</Td>
                <Td>{toJalali(o.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {data && <Pagination page={page} total={data.total} pageSize={20} onChange={setPage} />}
    </Shell>
  );
}

'use client';
import { useState, useEffect, useCallback } from 'react';
import Shell from '@/components/Shell';
import { C, Card, Button, Table, Td, Pagination, Spinner, EmptyState } from '@/components/ui';
import { api, ReviewRow, toJalali } from '@/lib/api';

export default function ReviewsPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: ReviewRow[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.reviews.list({ page, pageSize: 20 }).then(setData).finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function remove(id: string) {
    if (!confirm('این نظر حذف شود؟')) return;
    await api.reviews.remove(id);
    load();
  }

  return (
    <Shell>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: '0 0 18px' }}>نظرات</h1>

      <Card padding="0">
        {loading ? (
          <Spinner />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="نظری ثبت نشده" />
        ) : (
          <Table head={['تعمیرگاه', 'مالک', 'امتیاز', 'متن نظر', 'تاریخ', '']}>
            {data.items.map((r) => (
              <tr key={r.id}>
                <Td>{r.mechanicName || '—'}</Td>
                <Td>{r.ownerName || '—'}</Td>
                <Td>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Td>
                <Td style={{ maxWidth: 280 }}>{r.comment || '—'}</Td>
                <Td>{toJalali(r.createdAt)}</Td>
                <Td><Button size="sm" variant="danger" onClick={() => remove(r.id)}>حذف</Button></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {data && <Pagination page={page} total={data.total} pageSize={20} onChange={setPage} />}
    </Shell>
  );
}

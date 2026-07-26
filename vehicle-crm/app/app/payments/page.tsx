'use client';
import { useState, useEffect, useCallback } from 'react';
import Shell from '@/components/Shell';
import { C, Card, Button, Badge, Table, Td, Pagination, Spinner, EmptyState } from '@/components/ui';
import { api, PaymentRow, PaymentSummary, PAYMENT_STATUS_LABEL, toJalali } from '@/lib/api';

const STATUS_COLOR: Record<string, string> = { pending: '#F59E0B', success: '#22C55E', failed: '#EF4444' };
const STATUSES = ['pending', 'success', 'failed'];

export default function PaymentsPage() {
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: PaymentRow[]; total: number } | null>(null);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.payments.list({ status, page, pageSize: 20 }).then(setData).finally(() => setLoading(false));
  }, [status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status]);
  useEffect(() => { api.payments.summary().then(setSummary); }, []);

  return (
    <Shell>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: '0 0 18px' }}>پرداخت‌ها</h1>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 18 }}>
          <Card>
            <p style={{ fontSize: 11.5, color: C.muted, fontWeight: 700, margin: 0 }}>درآمد کل (موفق)</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: '8px 0 0' }}>{summary.totalRevenue.toLocaleString()} ت</p>
          </Card>
          {summary.byStatus.map((s) => (
            <Card key={s.status}>
              <p style={{ fontSize: 11.5, color: C.muted, fontWeight: 700, margin: 0 }}>{PAYMENT_STATUS_LABEL[s.status] || s.status}</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: '8px 0 0' }}>{s.count}</p>
              <p style={{ fontSize: 11, color: C.subtle, margin: '4px 0 0' }}>{s.total.toLocaleString()} ت</p>
            </Card>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 7, marginBottom: 16, flexWrap: 'wrap' }}>
        <Button size="sm" variant={!status ? 'primary' : 'secondary'} onClick={() => setStatus(undefined)}>همه</Button>
        {STATUSES.map((s) => (
          <Button key={s} size="sm" variant={status === s ? 'primary' : 'secondary'} onClick={() => setStatus(s)}>
            {PAYMENT_STATUS_LABEL[s]}
          </Button>
        ))}
      </div>

      <Card padding="0">
        {loading ? (
          <Spinner />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="پرداختی پیدا نشد" />
        ) : (
          <Table head={['مبلغ', 'وضعیت', 'کد پیگیری', 'تاریخ']}>
            {data.items.map((p) => (
              <tr key={p.id}>
                <Td>{p.amount.toLocaleString()} ت</Td>
                <Td><Badge color={STATUS_COLOR[p.status] || C.muted}>{PAYMENT_STATUS_LABEL[p.status] || p.status}</Badge></Td>
                <Td style={{ direction: 'ltr', textAlign: 'right' }}>{p.refId || '—'}</Td>
                <Td>{toJalali(p.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {data && <Pagination page={page} total={data.total} pageSize={20} onChange={setPage} />}
    </Shell>
  );
}

'use client';
import { useState, useEffect, useCallback } from 'react';
import Shell from '@/components/Shell';
import { C, Card, Button, Badge, Table, Td, Pagination, Spinner, EmptyState } from '@/components/ui';
import { api, AppointmentSummary, APPOINTMENT_STATUS_LABEL, toJalali } from '@/lib/api';

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B', confirmed: '#22C55E', rejected: '#EF4444', completed: '#6366F1', cancelled: '#5B6580',
};

const STATUSES = ['pending', 'confirmed', 'rejected', 'completed', 'cancelled'];

export default function AppointmentsPage() {
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: AppointmentSummary[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.appointments.list({ status, page, pageSize: 20 }).then(setData).finally(() => setLoading(false));
  }, [status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status]);

  return (
    <Shell>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: '0 0 18px' }}>نوبت‌ها</h1>

      <div style={{ display: 'flex', gap: 7, marginBottom: 16, flexWrap: 'wrap' }}>
        <Button size="sm" variant={!status ? 'primary' : 'secondary'} onClick={() => setStatus(undefined)}>همه</Button>
        {STATUSES.map((s) => (
          <Button key={s} size="sm" variant={status === s ? 'primary' : 'secondary'} onClick={() => setStatus(s)}>
            {APPOINTMENT_STATUS_LABEL[s]}
          </Button>
        ))}
      </div>

      <Card padding="0">
        {loading ? (
          <Spinner />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="نوبتی پیدا نشد" />
        ) : (
          <Table head={['خودرو', 'مالک', 'تعمیرگاه', 'خدمت', 'نحوه ارائه', 'زمان درخواستی', 'وضعیت']}>
            {data.items.map((a) => (
              <tr key={a.id}>
                <Td>{a.vehicle ? `${a.vehicle.make} ${a.vehicle.model}` : '—'}</Td>
                <Td>{a.ownerName || '—'}</Td>
                <Td>{a.mechanicName || '—'}</Td>
                <Td>{a.serviceType || '—'}</Td>
                <Td>{a.mode === 'on_site' ? 'در محل' : 'حضوری'}</Td>
                <Td>{toJalali(a.requestedAt)}</Td>
                <Td><Badge color={STATUS_COLOR[a.status] || C.muted}>{APPOINTMENT_STATUS_LABEL[a.status] || a.status}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {data && <Pagination page={page} total={data.total} pageSize={20} onChange={setPage} />}
    </Shell>
  );
}

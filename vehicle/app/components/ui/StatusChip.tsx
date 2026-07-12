'use client';
import { STATUS_THEME, Status, statusLabel } from './tokens';

export function StatusChip({ status, days }: { status: Status; days: number | null }) {
  const t = STATUS_THEME[status];
  const label = statusLabel(status, days);
  if (!label) return null;
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 11, fontWeight: 800, color: t.color,
      background: `${t.color}22`,
      padding: '2px 10px', borderRadius: 8,
    }}>
      {label}
    </span>
  );
}

export function StatusRow({
  icon, label, dateLabel, status, days,
}: {
  icon: React.ReactNode;
  label: string;
  dateLabel: string;
  status: Status;
  days: number | null;
}) {
  const t = STATUS_THEME[status];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 14px', borderRadius: 14,
      border: `1.5px solid ${t.border}`,
      background: t.bg,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ color: t.color, display: 'flex' }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
      </div>
      <div style={{ textAlign: 'left' }}>
        <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0, fontWeight: 500 }}>{dateLabel}</p>
        <div style={{ marginTop: 3 }}>
          <StatusChip status={status} days={days} />
        </div>
      </div>
    </div>
  );
}

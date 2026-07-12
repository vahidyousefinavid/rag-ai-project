'use client';
import { C } from './tokens';

export interface Stat {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  color?: string;
}

export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 10 }}>
      {stats.map(s => (
        <div key={s.label} style={{
          background: C.surface, borderRadius: 18,
          padding: '15px 8px', textAlign: 'center',
          border: `1px solid ${C.border}`,
          position: 'relative', overflow: 'hidden',
        }}>
          {s.color && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, ${s.color}, ${s.color}55)`,
            }} />
          )}
          {s.icon && (
            <div style={{
              width: 34, height: 34, borderRadius: 11,
              background: `${s.color ?? C.green}1F`,
              color: s.color ?? C.green,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 8px',
            }}>{s.icon}</div>
          )}
          <p style={{ fontSize: 19, fontWeight: 900, color: s.color ?? C.text, margin: 0, lineHeight: 1 }}>
            {s.value}
          </p>
          {s.sub && <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, margin: '3px 0 0' }}>{s.sub}</p>}
          <p style={{ fontSize: 10, color: C.muted, margin: '2px 0 0' }}>{s.label}</p>
        </div>
      ))}
    </div>
  );
}

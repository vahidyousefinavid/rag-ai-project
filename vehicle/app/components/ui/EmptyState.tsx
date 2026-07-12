'use client';
import { C } from './tokens';
import { Button } from './Button';

export function EmptyState({
  icon, title, sub, onAdd, btnLabel,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  onAdd?: () => void;
  btnLabel?: string;
}) {
  return (
    <div style={{
      textAlign: 'center', padding: '38px 20px',
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 22,
    }}>
      <div style={{
        width: 62, height: 62, borderRadius: '50%',
        background: 'rgba(34,197,94,0.10)',
        border: `1px solid ${C.green}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: C.green,
        margin: '0 auto 16px',
        animation: 'float 3s ease-in-out infinite',
      }}>{icon}</div>
      <p style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</p>
      <p style={{ color: C.muted, fontSize: 13, margin: '6px 0 20px' }}>{sub}</p>
      {onAdd && btnLabel && (
        <Button onClick={onAdd}>{btnLabel}</Button>
      )}
    </div>
  );
}

export function Spinner({ size = 30 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '52px 0' }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        border: `2.5px solid ${C.green}26`, borderTopColor: C.green,
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%', radius = 8, style }: { height?: number; width?: string | number; radius?: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      height, width, borderRadius: radius,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.10) 37%, rgba(255,255,255,0.05) 63%)',
      backgroundSize: '400% 100%',
      animation: 'shimmer 1.6s ease infinite',
      ...style,
    }} />
  );
}

export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
      <Skeleton width={46} height={46} radius={15} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton width="55%" height={13} />
        <Skeleton width="35%" height={11} />
      </div>
      <Skeleton width={54} height={20} radius={7} />
    </div>
  );
}

export function SkeletonHero() {
  return (
    <div style={{
      background: C.surface, borderRadius: 24, padding: '22px',
      border: `1px solid ${C.border}`, marginBottom: 20,
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton width={100} height={14} radius={7} />
        <Skeleton width={70} height={22} radius={10} />
      </div>
      <Skeleton width="60%" height={20} radius={8} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        <Skeleton height={54} radius={14} />
        <Skeleton height={54} radius={14} />
        <Skeleton height={54} radius={14} />
      </div>
    </div>
  );
}

'use client';
import { C } from './tokens';

export function Card({
  children, style, accentColor, padding = '16px 18px', className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  accentColor?: string;
  padding?: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {accentColor && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${accentColor}, ${accentColor}40)`,
        }} />
      )}
      <div style={{ padding }}>{children}</div>
    </div>
  );
}

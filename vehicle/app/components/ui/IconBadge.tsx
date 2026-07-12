'use client';
import { C } from './tokens';

export function IconBadge({
  children, color = C.green, size = 44, radius = 14,
}: {
  children: React.ReactNode;
  color?: string;
  size?: number;
  radius?: number;
}) {
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: `${color}1F`,
      border: `1px solid ${color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color,
      boxShadow: `0 4px 12px ${color}22`,
    }}>
      {children}
    </div>
  );
}

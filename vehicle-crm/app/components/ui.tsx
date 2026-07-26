'use client';

export const C = {
  bg: '#0B0F1A', surface: '#131A2A', surface2: '#1A2338', border: '#242E45',
  text: '#F1F5F9', muted: '#8B95AB', subtle: '#5B6580',
  accent: '#6366F1', accentDark: '#4F46E5',
  green: '#22C55E', red: '#EF4444', amber: '#F59E0B',
};

export function Card({ children, style, padding = '18px 20px' }: { children: React.ReactNode; style?: React.CSSProperties; padding?: string }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding, ...style }}>
      {children}
    </div>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({
  children, variant = 'primary', onClick, type = 'button', loading, disabled, icon, style, fullWidth, size = 'md',
}: {
  children: React.ReactNode; variant?: Variant; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit'; loading?: boolean; disabled?: boolean; icon?: React.ReactNode;
  style?: React.CSSProperties; fullWidth?: boolean; size?: 'sm' | 'md';
}) {
  const isDisabled = disabled || loading;
  const variants: Record<Variant, React.CSSProperties> = {
    primary: { background: isDisabled ? `${C.accent}55` : C.accent, color: 'white', border: 'none' },
    secondary: { background: C.surface2, color: C.text, border: `1px solid ${C.border}` },
    ghost: { background: 'transparent', color: C.muted, border: 'none' },
    danger: { background: 'rgba(239,68,68,0.10)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' },
  };
  return (
    <button
      type={type} onClick={onClick} disabled={isDisabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        padding: size === 'sm' ? '7px 13px' : '10px 18px',
        borderRadius: 10, fontSize: size === 'sm' ? 12.5 : 13.5, fontWeight: 700,
        fontFamily: 'Vazirmatn, sans-serif', cursor: isDisabled ? 'not-allowed' : 'pointer',
        width: fullWidth ? '100%' : undefined, opacity: isDisabled && variant !== 'primary' ? 0.6 : 1,
        transition: 'opacity 0.15s', ...variants[variant], ...style,
      }}
    >
      {icon}{loading ? 'در حال بارگذاری...' : children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10,
        padding: '9px 13px', fontSize: 13, color: C.text, fontFamily: 'Vazirmatn, sans-serif', outline: 'none',
        ...props.style,
      }}
    />
  );
}

export function Badge({ children, color = C.muted }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 700, color,
      background: `${color}1F`, border: `1px solid ${color}40`, borderRadius: 7, padding: '2px 9px',
    }}>
      {children}
    </span>
  );
}

export function Spinner({ size = 26 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        border: `2.5px solid ${C.accent}30`, borderTopColor: C.accent,
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}

export function EmptyState({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: C.muted }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{title}</p>
      {sub && <p style={{ fontSize: 12.5, margin: '6px 0 0' }}>{sub}</p>}
    </div>
  );
}

export function Table({ head, children }: { head: React.ReactNode[]; children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} style={{
                textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase',
                letterSpacing: '0.4px', padding: '10px 14px', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: '12px 14px', fontSize: 13, color: C.text, borderBottom: `1px solid ${C.border}`, ...style }}>
      {children}
    </td>
  );
}

export function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px 0' }}>
      <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>قبلی</Button>
      <span style={{ fontSize: 12.5, color: C.muted }}>صفحه {page} از {pages}</span>
      <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>بعدی</Button>
    </div>
  );
}

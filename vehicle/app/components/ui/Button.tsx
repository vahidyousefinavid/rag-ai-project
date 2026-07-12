'use client';
import { C } from './tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const PAD: Record<Size, string> = { sm: '7px 14px', md: '11px 20px', lg: '14px 24px' };
const FONT: Record<Size, number> = { sm: 12, md: 13.5, lg: 14.5 };

export function Button({
  children, variant = 'primary', size = 'md', loading, disabled, onClick, type = 'button',
  style, fullWidth, icon,
}: {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}) {
  const isDisabled = disabled || loading;

  const variants: Record<Variant, React.CSSProperties> = {
    primary: {
      background: isDisabled ? 'rgba(34,197,94,0.35)' : `linear-gradient(135deg, ${C.green}, ${C.greenDark})`,
      color: 'white',
      border: 'none',
      boxShadow: isDisabled ? 'none' : `0 6px 20px ${C.greenGlow}`,
    },
    secondary: {
      background: C.surface2,
      color: C.text,
      border: `1px solid ${C.border}`,
    },
    ghost: {
      background: 'transparent',
      color: C.muted,
      border: 'none',
    },
    danger: {
      background: 'rgba(239,68,68,0.10)',
      color: '#F87171',
      border: '1px solid rgba(239,68,68,0.22)',
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        padding: PAD[size],
        borderRadius: 14,
        fontSize: FONT[size],
        fontWeight: 700,
        fontFamily: 'Vazirmatn, sans-serif',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.18s ease',
        width: fullWidth ? '100%' : undefined,
        opacity: isDisabled && variant !== 'primary' ? 0.55 : 1,
        ...variants[variant],
        ...style,
      }}
    >
      {icon}
      {loading ? 'در حال پردازش...' : children}
    </button>
  );
}

export function IconButton({
  children, onClick, label, active, style, size = 34,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  label: string;
  active?: boolean;
  style?: React.CSSProperties;
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: size, height: size, borderRadius: 11,
        background: active ? 'rgba(34,197,94,0.14)' : C.surface2,
        border: `1px solid ${active ? C.green + '40' : C.border}`,
        color: active ? C.green : C.muted,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

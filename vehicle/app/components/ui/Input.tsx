'use client';
import { useState } from 'react';
import { C } from './tokens';

export function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label style={{
        fontSize: 11, color: C.muted, fontWeight: 700,
        display: 'block', marginBottom: 6,
        textTransform: 'uppercase', letterSpacing: '0.4px',
      }}>
        {label}{required && <span style={{ color: C.green }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const baseInputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  borderRadius: 14, padding: '11px 14px', fontSize: 13,
  fontWeight: 500, outline: 'none',
  color: C.text, fontFamily: 'Vazirmatn, sans-serif',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      style={{
        ...baseInputStyle,
        border: `1px solid ${focused ? C.green : C.border}`,
        boxShadow: focused ? `0 0 0 3px ${C.green}1a` : 'none',
        ...props.style,
      }}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      style={{
        ...baseInputStyle,
        border: `1px solid ${focused ? C.green : C.border}`,
        boxShadow: focused ? `0 0 0 3px ${C.green}1a` : 'none',
        resize: 'none',
        ...props.style,
      }}
    />
  );
}

export function ChipGroup<T extends string>({
  options, value, onChange, labels,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(opt => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              padding: '7px 14px', borderRadius: 11,
              fontSize: 12.5, fontWeight: selected ? 700 : 500,
              fontFamily: 'Vazirmatn, sans-serif',
              background: selected ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${selected ? C.green + '55' : C.border}`,
              color: selected ? C.green : C.muted,
              transition: 'all 0.15s',
            }}
          >
            {labels?.[opt] ?? opt}
          </button>
        );
      })}
    </div>
  );
}

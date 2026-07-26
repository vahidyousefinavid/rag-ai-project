'use client';
import { useState } from 'react';
import { C } from './tokens';

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
        border: `1px solid ${focused ? C.purple : C.border}`,
        boxShadow: focused ? `0 0 0 3px ${C.purple}1a` : 'none',
        ...props.style,
      }}
    />
  );
}

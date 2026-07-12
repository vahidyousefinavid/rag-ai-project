'use client';
import { C } from './tokens';
import { IconButton } from './Button';
import { XIcon } from '../icons';

export function Sheet({
  title, icon, onClose, children,
}: {
  title: string;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'rgba(6,10,20,0.60)',
        backdropFilter: 'blur(10px)',
        padding: 16,
        animation: 'fadeIn 0.2s ease both',
      }}
    >
      <div style={{
        background: C.surfaceSolid,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: '26px 26px 22px 22px',
        width: '100%', maxWidth: 480,
        maxHeight: '92vh', overflowY: 'auto',
        border: `1px solid ${C.borderStrong}`,
        boxShadow: '0 -16px 56px rgba(0,0,0,0.55)',
        animation: 'fadeInUp 0.28s cubic-bezier(.34,1.2,.64,1) both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)' }} />
        </div>

        <div style={{
          padding: '8px 20px 16px',
          borderBottom: `1px solid ${C.border}`,
          marginBottom: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {icon && (
              <div style={{
                width: 36, height: 36, borderRadius: 11,
                background: `${C.green}1F`,
                border: `1px solid ${C.green}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.green,
              }}>{icon}</div>
            )}
            <h2 style={{ fontWeight: 900, color: C.text, fontSize: 17, margin: 0 }}>{title}</h2>
          </div>
          <IconButton label="بستن" onClick={onClose}>
            <XIcon size={16} />
          </IconButton>
        </div>

        <div style={{ padding: '12px 20px 28px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

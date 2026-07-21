'use client';
import { useState, useEffect } from 'react';
import { api, Part } from '@/lib/api';
import { C, Button, Input, Sheet, EmptyState, Spinner } from './ui';
import { BoxIcon, PlusIcon } from './icons';

export default function PartsCatalogPicker({ onPick, onClose }: { onPick: (part: Part) => void; onClose: () => void }) {
  const [parts, setParts] = useState<Part[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => {
      setLoading(true);
      api.parts.list(q).then(setParts).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <Sheet title="انتخاب از کاتالوگ قطعات" icon={<BoxIcon size={16} />} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجوی قطعه..." />
        {loading ? (
          <Spinner />
        ) : parts.length === 0 ? (
          <EmptyState icon={<BoxIcon size={22} />} title="قطعه‌ای پیدا نشد" sub="از صفحه «کاتالوگ قطعات» در پروفایل، قطعات پرکاربردت رو اضافه کن" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
            {parts.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick(p)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  padding: '11px 14px', borderRadius: 14, border: `1px solid ${C.border}`,
                  background: C.surface2, textAlign: 'right', width: '100%',
                }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{p.name}</p>
                  {p.category && <p style={{ fontSize: 11, color: C.muted, margin: '3px 0 0' }}>{p.category}</p>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.green }}>{p.unitPrice.toLocaleString()} ت</span>
                  <PlusIcon size={15} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}

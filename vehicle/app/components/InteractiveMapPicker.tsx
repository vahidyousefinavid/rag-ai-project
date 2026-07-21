'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { C, Button, Sheet, Spinner } from './ui';
import { PinIcon, CheckIcon } from './icons';

const LeafletMapInner = dynamic(() => import('./LeafletMapInner'), {
  ssr: false,
  loading: () => <Spinner />,
});

export default function InteractiveMapPicker({
  lat, lng, onConfirm, onClose,
}: {
  lat?: number | null;
  lng?: number | null;
  onConfirm: (lat: number, lng: number) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(
    lat != null && lng != null ? { lat, lng } : null,
  );

  return (
    <Sheet title="انتخاب موقعیت روی نقشه" icon={<PinIcon size={16} />} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          <LeafletMapInner
            lat={picked?.lat ?? null}
            lng={picked?.lng ?? null}
            onPick={(la, ln) => setPicked({ lat: la, lng: ln })}
            height={320}
          />
        </div>
        <p style={{ fontSize: 11, color: C.subtle, textAlign: 'center', margin: 0 }}>
          روی نقشه بزن یا پین رو جابه‌جا کن تا موقعیت دقیق رو انتخاب کنی
        </p>
        <Button
          fullWidth size="lg"
          disabled={!picked}
          onClick={() => picked && onConfirm(picked.lat, picked.lng)}
          icon={<CheckIcon size={15} />}
        >
          تایید این موقعیت
        </Button>
      </div>
    </Sheet>
  );
}

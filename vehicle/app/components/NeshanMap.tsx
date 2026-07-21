'use client';
import { useState } from 'react';
import { C } from './ui';
import { PinIcon, NavigationIcon } from './icons';

export default function NeshanMap({
  lat, lng, height = 160, zoom = 15, onOpenPicker,
}: {
  lat?: number | null;
  lng?: number | null;
  height?: number;
  zoom?: number;
  /** When provided, clicking the map opens an in-app picker instead of linking out to neshan.org */
  onOpenPicker?: () => void;
}) {
  const hasCoords = lat != null && lng != null;
  const [imgError, setImgError] = useState(false);

  if (!hasCoords) {
    return (
      <div
        onClick={onOpenPicker}
        style={{
          height, borderRadius: 16, background: C.surface2, border: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6,
          cursor: onOpenPicker ? 'pointer' : undefined,
        }}
      >
        <PinIcon size={22} color={C.muted} />
        <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 500 }}>
          {onOpenPicker ? 'انتخاب موقعیت روی نقشه' : 'موقعیتی ثبت نشده'}
        </span>
      </div>
    );
  }

  if (imgError) {
    if (onOpenPicker) {
      return (
        <div
          onClick={onOpenPicker}
          style={{
            height, borderRadius: 16, background: C.surface2, border: `1px dashed ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6,
            cursor: 'pointer',
          }}
        >
          <NavigationIcon size={20} color={C.green} />
          <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>تغییر موقعیت</span>
        </div>
      );
    }
    return (
      <a
        href={`https://neshan.org/maps/@${lat},${lng},${zoom}z`}
        target="_blank" rel="noreferrer"
        style={{
          height, borderRadius: 16, background: C.surface2, border: `1px dashed ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6,
          textDecoration: 'none',
        }}
      >
        <NavigationIcon size={20} color={C.green} />
        <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>باز کردن روی نقشه نشان</span>
      </a>
    );
  }

  const src = `/api/map/static?lat=${lat}&lng=${lng}&zoom=${zoom}&width=640&height=${height * 2}`;

  return (
    <div onClick={onOpenPicker} style={{ position: 'relative', cursor: onOpenPicker ? 'pointer' : undefined }}>
      <img
        src={src}
        onError={() => setImgError(true)}
        alt="موقعیت روی نقشه"
        style={{ width: '100%', height, objectFit: 'cover', borderRadius: 16, border: `1px solid ${C.border}`, display: 'block' }}
      />
      {onOpenPicker && (
        <span style={{
          position: 'absolute', bottom: 8, insetInlineEnd: 8,
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'rgba(10,17,32,0.75)', backdropFilter: 'blur(6px)',
          color: 'white', fontSize: 10.5, fontWeight: 700,
          padding: '4px 10px', borderRadius: 20,
        }}>
          <PinIcon size={11} /> تغییر موقعیت
        </span>
      )}
    </div>
  );
}

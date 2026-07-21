'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import NeshanMap from './NeshanMap';
import InteractiveMapPicker from './InteractiveMapPicker';
import { C, Button, TextArea } from './ui';
import { NavigationIcon, PinIcon } from './icons';

export interface Coords { lat: number; lng: number }

export default function AddressLocationField({
  address, onAddressChange, coords, onCoordsChange, required,
}: {
  address: string;
  onAddressChange: (v: string) => void;
  coords: Coords | null;
  onCoordsChange: (c: Coords | null) => void;
  required?: boolean;
}) {
  const [locating, setLocating] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  async function syncFromCoords(c: Coords) {
    onCoordsChange(c);
    try {
      const { address: found } = await api.geocode.reverse(c.lat, c.lng);
      if (found) onAddressChange(found);
    } catch {
      // reverse geocoding is a convenience only — silently keep manual address
    }
  }

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await syncFromCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function confirmFromPicker(lat: number, lng: number) {
    setShowPicker(false);
    await syncFromCoords({ lat, lng });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <NeshanMap lat={coords?.lat} lng={coords?.lng} height={140} onOpenPicker={() => setShowPicker(true)} />
      <TextArea
        value={address}
        onChange={e => onAddressChange(e.target.value)}
        rows={2}
        placeholder="آدرس دقیق محل..."
        required={required}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <Button type="button" variant="secondary" size="sm" fullWidth loading={locating} onClick={locate} icon={<NavigationIcon size={13} />}>
          موقعیت فعلی من
        </Button>
        <Button type="button" variant="secondary" size="sm" fullWidth onClick={() => setShowPicker(true)} icon={<PinIcon size={13} />}>
          انتخاب روی نقشه
        </Button>
      </div>
      {coords && (
        <p style={{ fontSize: 10.5, color: C.subtle, margin: 0, lineHeight: 1.7 }}>
          آدرس بالا از روی موقعیت انتخاب‌شده پر شد؛ در صورت نیاز می‌تونی ویرایشش کنی.
        </p>
      )}

      {showPicker && (
        <InteractiveMapPicker
          lat={coords?.lat}
          lng={coords?.lng}
          onConfirm={confirmFromPicker}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

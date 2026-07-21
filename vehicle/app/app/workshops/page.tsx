'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { api, Workshop, SERVICE_TYPES } from '@/lib/api';
import { C, Card, Button, Input, EmptyState, Spinner } from '@/components/ui';
import { CompassIcon, StoreIcon, StarIcon, PinIcon } from '@/components/icons';

const FILTERABLE_SERVICES = SERVICE_TYPES.filter(t => t !== 'سایر');

export default function WorkshopsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <WorkshopsPageInner />
    </Suspense>
  );
}

function WorkshopsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [list, setList] = useState<Workshop[]>([]);
  const [q, setQ] = useState('');
  const [serviceType, setServiceType] = useState<string | null>(searchParams.get('service'));
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(true);

  function load(c?: { lat: number; lng: number } | null, svc?: string | null) {
    setLoading(true);
    api.workshops.search({ lat: c?.lat, lng: c?.lng, q: q || undefined, serviceType: svc || undefined }).then(setList).finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    load(coords, serviceType);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => load(coords, serviceType), 300);
    return () => clearTimeout(id);
  }, [q, serviceType]);

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        setLocating(false);
        load(c, serviceType);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function toggleService(t: string) {
    setServiceType(prev => (prev === t ? null : t));
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="پیدا کردن تعمیرگاه" />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '14px 14px calc(88px + env(safe-area-inset-bottom))' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجوی نام تعمیرگاه..." />
          </div>
          <Button variant={coords ? 'primary' : 'secondary'} onClick={locate} loading={locating} icon={<CompassIcon size={15} />}>
            نزدیک من
          </Button>
        </div>

        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
          {FILTERABLE_SERVICES.map(t => {
            const active = serviceType === t;
            return (
              <button
                key={t}
                onClick={() => toggleService(t)}
                style={{
                  flexShrink: 0, padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  fontFamily: 'Vazirmatn, sans-serif', whiteSpace: 'nowrap',
                  border: `1.5px solid ${active ? C.green : C.border}`,
                  background: active ? `${C.green}1F` : 'transparent',
                  color: active ? C.green : C.muted,
                }}
              >{t}</button>
            );
          })}
        </div>

        {loading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState icon={<StoreIcon size={26} />} title="تعمیرگاهی پیدا نشد" sub={serviceType ? `هنوز تعمیرگاهی خدمت «${serviceType}» رو ثبت نکرده` : 'هنوز تعمیرگاهی با این مشخصات ثبت نشده'} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {list.map(w => (
              <Card key={w.id} padding="14px 16px" style={{ cursor: 'pointer' }}>
                <div onClick={() => router.push(`/workshops/${w.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 14, background: `${C.green}1F`, border: `1px solid ${C.green}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green, flexShrink: 0,
                  }}><StoreIcon size={21} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>{w.workshopName || 'تعمیرگاه'}</p>
                    <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {w.reviewCount > 0 ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#FBBF24', fontWeight: 700 }}>
                          <StarIcon size={12} /> {w.rating} <span style={{ color: C.subtle, fontWeight: 500 }}>({w.reviewCount})</span>
                        </span>
                      ) : (
                        <span style={{ color: C.subtle }}>هنوز نظری ثبت نشده</span>
                      )}
                      {w.distanceKm != null && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><PinIcon size={12} /> {w.distanceKm} km</span>
                      )}
                    </p>
                    {w.workshopAddress && (
                      <p style={{ fontSize: 11, color: C.subtle, margin: '4px 0 0' }}>{w.workshopAddress}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { svcMeta } from './serviceMeta';
import AddressLocationField, { type Coords } from './AddressLocationField';
import { api, Vehicle, Workshop, ServiceMode } from '@/lib/api';
import { C, Button, IconBadge, FormField, Input, TextArea, Sheet, EmptyState, Spinner } from './ui';
import { WrenchIcon, StoreIcon, StarIcon, PinIcon, NavigationIcon, CalendarIcon, CheckIcon } from './icons';

type Step = 'setup' | 'results' | 'confirm' | 'done';

export default function RequestServiceModal({ serviceType, onClose }: { serviceType: string; onClose: () => void }) {
  const router = useRouter();
  const meta = svcMeta(serviceType);

  const [step, setStep] = useState<Step>('setup');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [svcMode, setSvcMode] = useState<ServiceMode>('in_shop');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  const [results, setResults] = useState<Workshop[]>([]);
  const [searching, setSearching] = useState(false);
  const [mechanicId, setMechanicId] = useState('');
  const [mechanicName, setMechanicName] = useState('');

  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.vehicles.list().then(list => {
      setVehicles(list);
      if (list.length === 1) setVehicleId(list[0].id);
    }).finally(() => setLoadingVehicles(false));
  }, []);

  async function search() {
    setSearching(true);
    setStep('results');
    try {
      const list = await api.workshops.search({
        serviceType, mode: svcMode,
        lat: coords?.lat, lng: coords?.lng,
      });
      setResults(list);
    } finally {
      setSearching(false);
    }
  }

  function pickMechanic(w: Workshop) {
    setMechanicId(w.id);
    setMechanicName(w.workshopName || 'تعمیرگاه');
    setStep('confirm');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.appointments.create({
        vehicleId, mechanicId,
        requestedAt: `${date}T${time}`,
        serviceType,
        notes: notes || undefined,
        mode: svcMode,
        address: svcMode === 'on_site' ? address : undefined,
        lat: svcMode === 'on_site' ? coords?.lat : undefined,
        lng: svcMode === 'on_site' ? coords?.lng : undefined,
      });
      setStep('done');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const Icon = meta.icon;
  const title = `درخواست ${serviceType}`;

  if (step === 'done') {
    return (
      <Sheet title="ثبت شد" icon={<CheckIcon size={16} />} onClose={onClose}>
        <EmptyState icon={<CheckIcon size={26} />} title="درخواست نوبت ارسال شد" sub={`${mechanicName} به‌محض تایید بهت اطلاع می‌ده`} />
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Button fullWidth variant="secondary" onClick={() => router.push('/appointments')}>مشاهده نوبت‌ها</Button>
          <Button fullWidth onClick={onClose}>باشه</Button>
        </div>
      </Sheet>
    );
  }

  if (step === 'confirm') {
    return (
      <Sheet title={`تعیین زمان · ${mechanicName}`} icon={<CalendarIcon size={16} />} onClose={onClose}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="تاریخ" required><Input value={date} onChange={e => setDate(e.target.value)} type="date" required /></FormField>
            <FormField label="ساعت" required><Input value={time} onChange={e => setTime(e.target.value)} type="time" required /></FormField>
          </div>
          <FormField label="توضیحات (اختیاری)"><TextArea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="توضیح بیشتر درباره مشکل یا درخواستت..." /></FormField>
          {error && (
            <div style={{ fontSize: 12, color: '#F87171', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: 11, padding: '10px 14px' }}>{error}</div>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => setStep('results')}>بازگشت به لیست</Button>
          <Button type="submit" loading={submitting} fullWidth size="lg">ثبت نهایی درخواست</Button>
        </form>
      </Sheet>
    );
  }

  if (step === 'results') {
    return (
      <Sheet title={title} icon={<Icon size={16} />} onClose={onClose}>
        {searching ? (
          <Spinner />
        ) : results.length === 0 ? (
          <>
            <EmptyState
              icon={<StoreIcon size={24} />}
              title="سرویس‌دهنده‌ای پیدا نشد"
              sub={svcMode === 'on_site' ? 'شاید حالت حضوری گزینه‌های بیشتری داشته باشه' : 'می‌تونی از جستجوی کامل تعمیرگاه‌ها استفاده کنی'}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <Button fullWidth variant="secondary" onClick={() => setStep('setup')}>تغییر جستجو</Button>
              <Button fullWidth onClick={() => router.push('/workshops')}>جستجوی همه تعمیرگاه‌ها</Button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {results.map(w => (
              <button
                key={w.id}
                onClick={() => pickMechanic(w)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', width: '100%',
                  borderRadius: 16, border: `1px solid ${C.border}`, background: C.surface2, textAlign: 'right',
                }}
              >
                <IconBadge color={meta.color} size={42}><StoreIcon size={19} /></IconBadge>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 800, color: C.text, margin: 0 }}>{w.workshopName || 'تعمیرگاه'}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {w.reviewCount > 0 ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#FBBF24', fontWeight: 700 }}><StarIcon size={11} /> {w.rating}</span>
                    ) : <span style={{ color: C.subtle }}>بدون نظر</span>}
                    {w.distanceKm != null && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><PinIcon size={11} /> {w.distanceKm} km</span>}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Sheet>
    );
  }

  return (
    <Sheet title={title} icon={<Icon size={16} />} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormField label="خودرو" required>
          {loadingVehicles ? (
            <Spinner size={22} />
          ) : vehicles.length === 0 ? (
            <EmptyState icon={<WrenchIcon size={20} />} title="ابتدا یک خودرو ثبت کن" sub="برای ثبت درخواست به یک خودرو نیاز داری" onAdd={() => router.push('/vehicles/new')} btnLabel="افزودن خودرو" />
          ) : (
            <select
              value={vehicleId}
              onChange={e => setVehicleId(e.target.value)}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 14,
                padding: '11px 14px', fontSize: 13, color: C.text, fontFamily: 'Vazirmatn, sans-serif',
              }}
            >
              <option value="" disabled>انتخاب کن...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.make} {v.model} ({v.year}){v.plateNumber ? ` · ${v.plateNumber}` : ''}</option>
              ))}
            </select>
          )}
        </FormField>

        <FormField label="نحوه ارائه">
          <div style={{ display: 'flex', gap: 8 }}>
            {(['in_shop', 'on_site'] as ServiceMode[]).map(m => (
              <button key={m} type="button" onClick={() => setSvcMode(m)} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '12px 0', borderRadius: 14, fontFamily: 'Vazirmatn, sans-serif',
                border: `1.5px solid ${svcMode === m ? C.green : C.border}`,
                background: svcMode === m ? `${C.green}1F` : 'transparent',
                color: svcMode === m ? C.green : C.muted,
              }}>
                {m === 'in_shop' ? <StoreIcon size={18} /> : <NavigationIcon size={18} />}
                <span style={{ fontSize: 12, fontWeight: 700 }}>{m === 'in_shop' ? 'حضوری' : 'در محل من'}</span>
              </button>
            ))}
          </div>
        </FormField>

        {svcMode === 'on_site' && (
          <FormField label="آدرس محل سرویس" required>
            <AddressLocationField address={address} onAddressChange={setAddress} coords={coords} onCoordsChange={setCoords} required />
          </FormField>
        )}

        <Button
          fullWidth size="lg"
          disabled={!vehicleId || (svcMode === 'on_site' && !address.trim() && !coords)}
          onClick={search}
        >
          جستجوی سرویس‌دهنده‌ها
        </Button>
      </div>
    </Sheet>
  );
}

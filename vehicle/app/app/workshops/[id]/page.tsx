'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import NeshanMap from '@/components/NeshanMap';
import Chat from '@/components/Chat';
import AddressLocationField, { type Coords } from '@/components/AddressLocationField';
import { svcMeta } from '@/components/serviceMeta';
import { api, WorkshopDetail, MechanicReview, MechanicServiceOffering, Vehicle, ServiceMode, toJalali } from '@/lib/api';
import {
  C, Card, SectionCard, Button, FormField, Input, TextArea, Sheet, EmptyState, Spinner,
} from '@/components/ui';
import {
  ChevronRightIcon, StoreIcon, StarIcon, PinIcon, CalendarIcon, MessageIcon, WrenchIcon,
} from '@/components/icons';

export default function WorkshopDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [workshop, setWorkshop] = useState<WorkshopDetail | null>(null);
  const [reviews, setReviews] = useState<MechanicReview[]>([]);
  const [myReview, setMyReview] = useState<MechanicReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [flow, setFlow] = useState<'book' | 'chat' | null>(null);
  const [showRate, setShowRate] = useState(false);

  function load() {
    Promise.all([api.workshops.detail(id), api.reviews.list(id)])
      .then(([w, r]) => { setWorkshop(w); setReviews(r); })
      .finally(() => setLoading(false));
    api.reviews.mine(id).then(setMyReview).catch(() => {});
  }
  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    load();
  }, [id]);

  if (loading) return <Spinner />;
  if (!workshop) return null;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 14px calc(88px + env(safe-area-inset-bottom))' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, padding: '14px 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ChevronRightIcon size={16} /> بازگشت
        </button>

        <Card padding="18px" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 17, background: `${C.green}1F`, border: `1px solid ${C.green}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green, flexShrink: 0,
            }}><StoreIcon size={26} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: 0 }}>{workshop.workshopName || 'تعمیرگاه'}</h1>
              <p style={{ fontSize: 12, color: C.muted, margin: '5px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                {workshop.reviewCount > 0 ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#FBBF24', fontWeight: 700 }}>
                    <StarIcon size={13} /> {workshop.rating} <span style={{ color: C.subtle, fontWeight: 500 }}>({workshop.reviewCount} نظر)</span>
                  </span>
                ) : <span style={{ color: C.subtle }}>هنوز نظری ثبت نشده</span>}
              </p>
              {workshop.workshopAddress && (
                <p style={{ fontSize: 12, color: C.muted, margin: '5px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <PinIcon size={12} /> {workshop.workshopAddress}
                </p>
              )}
            </div>
          </div>

          <NeshanMap lat={workshop.workshopLat} lng={workshop.workshopLng} />

          {workshop.services.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {workshop.services.map(s => {
                const meta = svcMeta(s.serviceType);
                const Icon = meta.icon;
                return (
                  <span key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 11, fontWeight: 700, color: meta.color,
                    background: `${meta.color}1A`, border: `1px solid ${meta.color}35`,
                    borderRadius: 20, padding: '4px 10px',
                  }}>
                    <Icon size={12} />
                    {s.serviceType === 'سایر' && s.customName ? s.customName : s.serviceType}
                  </span>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Button fullWidth onClick={() => setFlow('book')} icon={<CalendarIcon size={15} />}>رزرو نوبت</Button>
            <Button fullWidth variant="secondary" onClick={() => setFlow('chat')} icon={<MessageIcon size={15} />}>پیام</Button>
          </div>
        </Card>

        <SectionCard title="نظر شما" icon={<StarIcon size={15} />}>
          {myReview ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <StarRow rating={myReview.rating} />
                {myReview.comment && <p style={{ fontSize: 12, color: C.muted, margin: '6px 0 0' }}>{myReview.comment}</p>}
              </div>
              <Button size="sm" variant="secondary" onClick={() => setShowRate(true)}>ویرایش</Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setShowRate(true)} icon={<StarIcon size={13} />}>ثبت امتیاز</Button>
          )}
        </SectionCard>

        <div style={{ marginTop: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: '0 0 10px' }}>
            نظرات کاربران {reviews.length > 0 && <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>({reviews.length})</span>}
          </h2>
          {reviews.length === 0 ? (
            <EmptyState icon={<StarIcon size={22} />} title="هنوز نظری ثبت نشده" sub="اولین نفری باش که تجربه‌ات رو ثبت می‌کنه" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {reviews.map(r => (
                <Card key={r.id} padding="13px 15px">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{r.ownerName || 'کاربر'}</p>
                      <StarRow rating={r.rating} />
                    </div>
                    <span style={{ fontSize: 10, color: C.subtle }}>{toJalali(r.createdAt.slice(0, 10))}</span>
                  </div>
                  {r.comment && <p style={{ fontSize: 12, color: C.muted, margin: '8px 0 0', lineHeight: 1.8 }}>{r.comment}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {flow && <VehiclePickerFlow mechanicId={id} mode={flow} services={workshop.services} onClose={() => setFlow(null)} />}
      {showRate && (
        <RateSheet
          mechanicId={id}
          existing={myReview}
          onClose={() => setShowRate(false)}
          onSaved={() => { setShowRate(false); load(); }}
        />
      )}
      <BottomNav />
    </div>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, marginTop: 3 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <StarIcon key={n} size={13} color={n <= rating ? '#FBBF24' : C.border} />
      ))}
    </div>
  );
}

function RateSheet({ mechanicId, existing, onClose, onSaved }: { mechanicId: string; existing: MechanicReview | null; onClose: () => void; onSaved: () => void }) {
  const [rating, setRating] = useState(existing?.rating || 5);
  const [comment, setComment] = useState(existing?.comment || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setLoading(true);
    setError('');
    try {
      await api.reviews.upsert(mechanicId, { rating, comment: comment || undefined });
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet title="ثبت امتیاز و نظر" icon={<StarIcon size={16} />} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" onClick={() => setRating(n)} style={{ background: 'none', border: 'none', padding: 0 }}>
              <StarIcon size={30} color={n <= rating ? '#FBBF24' : C.border} />
            </button>
          ))}
        </div>
        <FormField label="نظر شما (اختیاری)">
          <TextArea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="تجربه‌ات رو با دیگران به اشتراک بذار..." />
        </FormField>
        {error && (
          <div style={{ fontSize: 12, color: '#F87171', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: 11, padding: '10px 14px' }}>{error}</div>
        )}
        <Button onClick={submit} loading={loading} fullWidth size="lg">ثبت نظر</Button>
      </div>
    </Sheet>
  );
}

function VehiclePickerFlow({ mechanicId, mode: flowType, services, onClose }: {
  mechanicId: string; mode: 'book' | 'chat'; services: MechanicServiceOffering[]; onClose: () => void;
}) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Vehicle | null>(null);

  useEffect(() => { api.vehicles.list().then(setVehicles).finally(() => setLoading(false)); }, []);

  if (selected && flowType === 'chat') {
    return <Chat vehicleId={selected.id} mechanicId={mechanicId} role="owner" title={`گفتگو · ${selected.make} ${selected.model}`} onClose={onClose} />;
  }
  if (selected && flowType === 'book') {
    return <BookAppointmentSheet vehicle={selected} mechanicId={mechanicId} services={services} onClose={onClose} />;
  }

  return (
    <Sheet title="انتخاب خودرو" icon={<WrenchIcon size={16} />} onClose={onClose}>
      {loading ? (
        <Spinner />
      ) : vehicles.length === 0 ? (
        <EmptyState icon={<WrenchIcon size={22} />} title="ابتدا یک خودرو ثبت کن" sub="برای رزرو نوبت یا ارسال پیام باید حداقل یک خودرو داشته باشی" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {vehicles.map(v => (
            <button
              key={v.id}
              onClick={() => setSelected(v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px',
                borderRadius: 14, border: `1px solid ${C.border}`, background: C.surface2, textAlign: 'right', width: '100%',
              }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{v.make} {v.model} <span style={{ color: C.muted, fontWeight: 500 }}>({v.year})</span></span>
              {v.plateNumber && <span style={{ fontSize: 11, color: C.subtle, direction: 'ltr' }}>{v.plateNumber}</span>}
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

function BookAppointmentSheet({ vehicle, mechanicId, services, onClose }: {
  vehicle: Vehicle; mechanicId: string; services: MechanicServiceOffering[]; onClose: () => void;
}) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [serviceType, setServiceType] = useState(services[0]?.serviceType || '');
  const [customType, setCustomType] = useState('');
  const [svcMode, setSvcMode] = useState<ServiceMode>('in_shop');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const selectedOffering = services.find(s => s.serviceType === serviceType);
  const allowInShop = !selectedOffering || selectedOffering.supportsInShop;
  const allowOnSite = !selectedOffering || selectedOffering.supportsOnSite;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.appointments.create({
        vehicleId: vehicle.id,
        mechanicId,
        requestedAt: `${date}T${time}`,
        serviceType: (serviceType === 'سایر' ? customType : serviceType) || undefined,
        notes: notes || undefined,
        mode: svcMode,
        address: svcMode === 'on_site' ? address : undefined,
        lat: svcMode === 'on_site' ? coords?.lat : undefined,
        lng: svcMode === 'on_site' ? coords?.lng : undefined,
      });
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Sheet title="نوبت ثبت شد" icon={<CalendarIcon size={16} />} onClose={onClose}>
        <EmptyState icon={<CalendarIcon size={26} />} title="درخواست نوبت ارسال شد" sub="به محض تایید تعمیرگاه، بهت اطلاع می‌دیم" />
        <Button fullWidth onClick={onClose} style={{ marginTop: 14 }}>باشه</Button>
      </Sheet>
    );
  }

  return (
    <Sheet title={`رزرو نوبت · ${vehicle.make} ${vehicle.model}`} icon={<CalendarIcon size={16} />} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {services.length > 0 ? (
          <FormField label="نوع سرویس">
            <select
              value={serviceType}
              onChange={e => { setServiceType(e.target.value); setSvcMode('in_shop'); }}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 14,
                padding: '11px 14px', fontSize: 13, color: C.text, fontFamily: 'Vazirmatn, sans-serif',
              }}
            >
              {services.map(s => (
                <option key={s.id} value={s.serviceType}>{s.serviceType === 'سایر' && s.customName ? s.customName : s.serviceType}</option>
              ))}
            </select>
          </FormField>
        ) : (
          <FormField label="نوع سرویس"><Input value={customType} onChange={e => setCustomType(e.target.value)} placeholder="مثلاً تعویض روغن" /></FormField>
        )}

        {allowInShop && allowOnSite && (
          <FormField label="نحوه ارائه">
            <div style={{ display: 'flex', gap: 8 }}>
              {(['in_shop', 'on_site'] as ServiceMode[]).map(m => (
                <button key={m} type="button" onClick={() => setSvcMode(m)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 12.5, fontWeight: 700,
                  fontFamily: 'Vazirmatn, sans-serif',
                  border: `1.5px solid ${svcMode === m ? C.green : C.border}`,
                  background: svcMode === m ? `${C.green}1F` : 'transparent',
                  color: svcMode === m ? C.green : C.muted,
                }}>{m === 'in_shop' ? 'حضوری' : 'در محل'}</button>
              ))}
            </div>
          </FormField>
        )}

        {svcMode === 'on_site' && (
          <FormField label="آدرس محل سرویس" required>
            <AddressLocationField address={address} onAddressChange={setAddress} coords={coords} onCoordsChange={setCoords} required />
          </FormField>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="تاریخ" required><Input value={date} onChange={e => setDate(e.target.value)} type="date" required /></FormField>
          <FormField label="ساعت" required><Input value={time} onChange={e => setTime(e.target.value)} type="time" required /></FormField>
        </div>
        <FormField label="توضیحات"><TextArea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></FormField>
        {error && (
          <div style={{ fontSize: 12, color: '#F87171', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: 11, padding: '10px 14px' }}>{error}</div>
        )}
        <Button type="submit" loading={loading} fullWidth size="lg">ارسال درخواست نوبت</Button>
      </form>
    </Sheet>
  );
}

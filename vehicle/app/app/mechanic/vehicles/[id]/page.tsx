'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import PersianDatePicker from '@/components/PersianDatePicker';
import {
  api, MechanicVehicleDetail, SERVICE_TYPES, InvoiceItem, toJalali,
} from '@/lib/api';
import {
  C, Card, IconBadge, Button, IconButton, FormField, Input, ChipGroup, Sheet,
  EmptyState, Spinner,
} from '@/components/ui';
import {
  ChevronRightIcon, CarIcon, WrenchIcon, CalendarIcon, RoadIcon, WalletIcon,
  PlusIcon, XIcon, CheckIcon,
} from '@/components/icons';

function today() { return new Date().toISOString().slice(0, 10); }

export default function MechanicVehiclePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<MechanicVehicleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  function load() {
    api.mechanic.getVehicle(id).then(setVehicle).finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    try {
      const u = JSON.parse(localStorage.getItem('vuser') || '{}');
      if (u.role !== 'mechanic') { router.replace('/dashboard'); return; }
    } catch {}
    load();
  }, [id, router]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner />
    </div>
  );
  if (!vehicle) return null;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 14px calc(88px + env(safe-area-inset-bottom))' }}>

        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, padding: '14px 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <ChevronRightIcon size={16} /> بازگشت
        </button>

        <div style={{
          background: `linear-gradient(145deg, ${C.heroStart} 0%, ${C.heroMid} 45%, ${C.heroEnd} 100%)`,
          borderRadius: 26, padding: '22px 20px', marginBottom: 16,
          boxShadow: '0 16px 48px rgba(0,0,0,0.30)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{
              width: 54, height: 54, borderRadius: 17, background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'white', flexShrink: 0,
            }}><CarIcon size={26} /></div>
            <div>
              <h1 style={{ color: 'white', fontSize: 19, fontWeight: 900, margin: 0 }}>{vehicle.make} {vehicle.model}</h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 500, margin: '5px 0 0' }}>
                {vehicle.year}{vehicle.color ? ` · ${vehicle.color}` : ''}{vehicle.plateNumber ? ` · ${vehicle.plateNumber}` : ''}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 500, margin: '4px 0 0' }}>
                مالک: {vehicle.ownerName || '—'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            {[
              { label: 'کارکرد', value: vehicle.currentMileage.toLocaleString(), sub: 'km' },
              { label: 'سرویس‌ها', value: String(vehicle.serviceRecords.length), sub: 'مورد' },
              ...(vehicle.fuelType ? [{ label: 'سوخت', value: vehicle.fuelType, sub: '' }] : []),
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.11)',
                borderRadius: 14, padding: '10px 6px', textAlign: 'center',
              }}>
                <p style={{ color: 'white', fontWeight: 900, fontSize: 14, margin: 0 }}>
                  {s.value}{s.sub && <span style={{ fontSize: 9, opacity: 0.6, marginRight: 2 }}>{s.sub}</span>}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600, margin: '4px 0 0' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>تاریخچه سرویس</h2>
          <Button size="sm" onClick={() => setShowAdd(true)} icon={<PlusIcon size={15} />}>ثبت سرویس</Button>
        </div>

        {vehicle.serviceRecords.length === 0 ? (
          <EmptyState icon={<WrenchIcon size={26} />} title="هنوز سرویسی ثبت نشده" sub="اولین سرویس این خودرو رو ثبت کن" onAdd={() => setShowAdd(true)} btnLabel="ثبت سرویس" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {vehicle.serviceRecords.map(r => (
              <Card key={r.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <IconBadge color={C.green}><WrenchIcon size={19} /></IconBadge>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>{r.serviceType}</p>
                    <p style={{ fontSize: 11, color: C.muted, fontWeight: 500, margin: '5px 0 0', display: 'flex', gap: 10 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><CalendarIcon size={12} /> {toJalali(r.serviceDate)}</span>
                      {r.mileage && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><RoadIcon size={12} /> {r.mileage.toLocaleString()} km</span>}
                    </p>
                    {r.createdByName && (
                      <p style={{ fontSize: 10, color: C.subtle, margin: '4px 0 0' }}>ثبت‌شده توسط {r.createdByName}</p>
                    )}
                  </div>
                  {r.invoice && (
                    <span style={{
                      fontSize: 11, fontWeight: 800,
                      color: r.invoice.paymentStatus === 'paid' ? '#4ADE80' : r.invoice.paymentStatus === 'partial' ? '#FBBF24' : '#F87171',
                      background: r.invoice.paymentStatus === 'paid' ? 'rgba(34,197,94,0.14)' : r.invoice.paymentStatus === 'partial' ? 'rgba(245,158,11,0.14)' : 'rgba(239,68,68,0.14)',
                      padding: '3px 10px', borderRadius: 9, flexShrink: 0, whiteSpace: 'nowrap',
                    }}>
                      {(r.invoice.total / 1000).toFixed(0)}K ت
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {showAdd && (
        <AddServiceWithInvoiceSheet
          vehicleId={id}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(); }}
        />
      )}
      <BottomNav />
    </div>
  );
}

function AddServiceWithInvoiceSheet({ vehicleId, onClose, onSaved }: { vehicleId: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ serviceType: SERVICE_TYPES[0], serviceDate: today(), mileage: '', description: '' });
  const [withInvoice, setWithInvoice] = useState(true);
  const [items, setItems] = useState<InvoiceItem[]>([{ type: 'part', name: '', quantity: 1, unitPrice: 0 }]);
  const [discount, setDiscount] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  function updateItem(i: number, patch: Partial<InvoiceItem>) {
    setItems(prev => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() { setItems(prev => [...prev, { type: 'part', name: '', quantity: 1, unitPrice: 0 }]); }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)); }

  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const record = await api.records.create(vehicleId, {
        serviceType: f.serviceType,
        serviceDate: f.serviceDate,
        mileage: f.mileage ? Number(f.mileage) : undefined,
        description: f.description || undefined,
      });
      if (withInvoice) {
        const validItems = items.filter(i => i.name.trim() && i.quantity > 0);
        if (validItems.length > 0) {
          await api.invoices.upsert(vehicleId, record.id, {
            discount: Number(discount) || 0,
            paidAmount: Number(paidAmount) || 0,
            items: validItems,
          });
        }
      }
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet title="ثبت سرویس جدید" icon={<WrenchIcon size={17} />} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormField label="نوع سرویس">
          <ChipGroup options={SERVICE_TYPES} value={f.serviceType} onChange={v => set('serviceType', v)} />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="تاریخ سرویس">
            <PersianDatePicker value={f.serviceDate} onChange={v => set('serviceDate', v)} />
          </FormField>
          <FormField label="کارکرد (km)">
            <Input value={f.mileage} onChange={e => set('mileage', e.target.value)} type="number" />
          </FormField>
        </div>
        <FormField label="توضیحات">
          <Input value={f.description} onChange={e => set('description', e.target.value)} placeholder="جزئیات سرویس..." />
        </FormField>

        <label style={{
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '12px 14px',
          background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: `1px solid ${C.border}`,
        }}>
          <input type="checkbox" checked={withInvoice} onChange={e => setWithInvoice(e.target.checked)} style={{ width: 17, height: 17, accentColor: C.green }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
            <WalletIcon size={15} /> افزودن فاکتور و هزینه‌ها
          </span>
        </label>

        {withInvoice && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select
                  value={item.type}
                  onChange={e => updateItem(i, { type: e.target.value as 'part' | 'labor' })}
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 10,
                    padding: '9px 6px', fontSize: 11, color: C.text, fontFamily: 'Vazirmatn, sans-serif', flexShrink: 0, width: 68,
                  }}
                >
                  <option value="part">قطعه</option>
                  <option value="labor">دستمزد</option>
                </select>
                <Input value={item.name} onChange={e => updateItem(i, { name: e.target.value })} placeholder="نام" style={{ flex: 2 }} />
                <Input value={String(item.quantity)} onChange={e => updateItem(i, { quantity: Number(e.target.value) })} type="number" placeholder="تعداد" style={{ flex: 1, textAlign: 'center' }} />
                <Input value={String(item.unitPrice)} onChange={e => updateItem(i, { unitPrice: Number(e.target.value) })} type="number" placeholder="قیمت" style={{ flex: 1.3, textAlign: 'center' }} />
                <IconButton label="حذف قلم" onClick={() => removeItem(i)} size={30}><XIcon size={13} /></IconButton>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={addItem} icon={<PlusIcon size={13} />}>افزودن قلم</Button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="تخفیف (تومان)">
                <Input value={discount} onChange={e => setDiscount(e.target.value)} type="number" />
              </FormField>
              <FormField label="مبلغ پرداخت‌شده">
                <Input value={paidAmount} onChange={e => setPaidAmount(e.target.value)} type="number" />
              </FormField>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: `${C.green}15`, border: `1px solid ${C.green}30`, borderRadius: 14, padding: '12px 16px',
            }}>
              <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>مبلغ نهایی</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: C.green }}>{total.toLocaleString()} ت</span>
            </div>
          </div>
        )}

        {error && (
          <div style={{ fontSize: 12, color: '#F87171', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: 11, padding: '10px 14px' }}>
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} fullWidth size="lg" icon={<CheckIcon size={16} />}>ثبت سرویس</Button>
      </form>
    </Sheet>
  );
}

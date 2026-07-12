'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { api, COLORS, FUEL_TYPES } from '@/lib/api';
import PersianDatePicker from '@/components/PersianDatePicker';
import PlateInput from '@/components/PlateInput';
import { C, SectionCard, FormField, Input, TextArea, ChipGroup, Button } from '@/components/ui';
import {
  ChevronRightIcon, CarIcon, SettingsIcon, CalendarIcon, FileTextIcon,
} from '@/components/icons';

export default function NewVehiclePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    make: '', model: '', year: new Date().getFullYear(),
    plateNumber: '', color: 'سفید', currentMileage: 0,
    fuelType: 'بنزین', engineCapacity: '', transmission: 'دستی',
    vin: '', notes: '',
    insuranceExpiry: '', technicalExpiry: '', registrationExpiry: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  function set(key: string, val: string | number) { setForm(f => ({ ...f, [key]: val })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
      const v = await api.vehicles.create(payload as any);
      router.push(`/vehicles/${v.id}`);
    } catch (err: any) { setError(err.message); setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="افزودن خودرو" />
      <main style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px calc(88px + env(safe-area-inset-bottom))' }}>

        <button
          onClick={() => router.back()}
          style={{
            background: 'none', border: 'none',
            color: C.muted, fontSize: 13, fontWeight: 600,
            padding: '16px 0 6px',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <ChevronRightIcon size={16} /> بازگشت
        </button>

        <h1 style={{ color: C.text, fontSize: 21, fontWeight: 900, margin: '4px 0 20px' }}>افزودن خودرو جدید</h1>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <SectionCard title="اطلاعات پایه" icon={<CarIcon size={16} />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="سازنده" required>
                  <Input placeholder="Toyota / ایران‌خودرو" value={form.make} onChange={e => set('make', e.target.value)} required />
                </FormField>
                <FormField label="مدل" required>
                  <Input placeholder="Camry / پژو 206" value={form.model} onChange={e => set('model', e.target.value)} required />
                </FormField>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="سال ساخت" required>
                  <Input type="number" value={String(form.year)} onChange={e => set('year', Number(e.target.value))} required />
                </FormField>
                <FormField label="کارکرد فعلی (km)">
                  <Input type="number" value={String(form.currentMileage)} onChange={e => set('currentMileage', Number(e.target.value))} />
                </FormField>
              </div>
              <FormField label="شماره پلاک">
                <PlateInput value={form.plateNumber} onChange={v => set('plateNumber', v)} />
              </FormField>
            </div>
          </SectionCard>

          <SectionCard title="مشخصات فنی" icon={<SettingsIcon size={16} />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <FormField label="نوع سوخت">
                <ChipGroup options={FUEL_TYPES} value={form.fuelType} onChange={v => set('fuelType', v)} />
              </FormField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="حجم موتور">
                  <Input placeholder="1600cc" value={form.engineCapacity} onChange={e => set('engineCapacity', e.target.value)} />
                </FormField>
                <FormField label="گیربکس">
                  <ChipGroup options={['دستی', 'اتوماتیک']} value={form.transmission} onChange={v => set('transmission', v)} />
                </FormField>
              </div>
              <FormField label="رنگ">
                <ChipGroup options={COLORS} value={form.color} onChange={v => set('color', v)} />
              </FormField>
            </div>
          </SectionCard>

          <SectionCard title="تاریخ انقضای مدارک" icon={<CalendarIcon size={16} />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <FormField label="انقضای بیمه شخص ثالث">
                <PersianDatePicker value={form.insuranceExpiry} onChange={v => set('insuranceExpiry', v)} />
              </FormField>
              <FormField label="انقضای معاینه فنی">
                <PersianDatePicker value={form.technicalExpiry} onChange={v => set('technicalExpiry', v)} />
              </FormField>
              <FormField label="انقضای کارت خودرو">
                <PersianDatePicker value={form.registrationExpiry} onChange={v => set('registrationExpiry', v)} />
              </FormField>
            </div>
          </SectionCard>

          <SectionCard title="سایر" icon={<FileTextIcon size={16} />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <FormField label="VIN / شماره شاسی">
                <Input value={form.vin} dir="ltr" onChange={e => set('vin', e.target.value)} />
              </FormField>
              <FormField label="یادداشت">
                <TextArea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="هر اطلاعات دیگری..." />
              </FormField>
            </div>
          </SectionCard>

          {error && (
            <div style={{
              fontSize: 12, color: '#F87171',
              background: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.20)',
              borderRadius: 11, padding: '10px 14px',
            }}>
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} fullWidth size="lg">ذخیره خودرو</Button>
        </form>
      </main>
      <BottomNav />
    </div>
  );
}

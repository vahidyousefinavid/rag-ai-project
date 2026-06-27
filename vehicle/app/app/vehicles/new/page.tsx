'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { api, COLORS, FUEL_TYPES } from '@/lib/api';

const inputCls = "w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-muted/50";

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
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="text-muted hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors">← بازگشت</button>
        <h1 className="text-2xl font-bold text-white mb-6">افزودن خودرو جدید</h1>

        <form onSubmit={submit} className="flex flex-col gap-4">

          {/* اطلاعات پایه */}
          <Section title="اطلاعات پایه">
            <div className="grid grid-cols-2 gap-4">
              <Field label="سازنده *" placeholder="Toyota / ایران‌خودرو" value={form.make} onChange={v => set('make', v)} required />
              <Field label="مدل *"    placeholder="Camry / پژو 206"      value={form.model} onChange={v => set('model', v)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="سال ساخت *" type="number" value={String(form.year)} onChange={v => set('year', Number(v))} required />
              <Field label="کارکرد فعلی (km)" type="number" value={String(form.currentMileage)} onChange={v => set('currentMileage', Number(v))} />
            </div>
            <Field label="شماره پلاک" placeholder="۱۲۳ الف ۴۵ - ۶۷" value={form.plateNumber} onChange={v => set('plateNumber', v)} />
          </Section>

          {/* مشخصات فنی */}
          <Section title="مشخصات فنی">
            <div>
              <label className="text-xs text-muted mb-2 block">نوع سوخت</label>
              <div className="flex flex-wrap gap-2">
                {FUEL_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => set('fuelType', t)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${form.fuelType === t ? 'border-accent bg-accent/20 text-white' : 'border-border text-muted hover:text-white'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="حجم موتور" placeholder="1600cc" value={form.engineCapacity} onChange={v => set('engineCapacity', v)} />
              <div>
                <label className="text-xs text-muted mb-2 block">گیربکس</label>
                <div className="flex gap-2">
                  {['دستی', 'اتوماتیک'].map(t => (
                    <button key={t} type="button" onClick={() => set('transmission', t)}
                      className={`flex-1 py-2.5 rounded-xl text-xs border transition-colors ${form.transmission === t ? 'border-accent bg-accent/20 text-white' : 'border-border text-muted hover:text-white'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted mb-2 block">رنگ</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => set('color', c)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${form.color === c ? 'border-accent bg-accent/20 text-white' : 'border-border text-muted hover:text-white'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* مدارک */}
          <Section title="تاریخ انقضای مدارک">
            <div className="grid grid-cols-1 gap-3">
              <Field label="🛡️ انقضای بیمه شخص ثالث" type="date" value={form.insuranceExpiry}   onChange={v => set('insuranceExpiry', v)} />
              <Field label="🔍 انقضای معاینه فنی"     type="date" value={form.technicalExpiry}   onChange={v => set('technicalExpiry', v)} />
              <Field label="📄 انقضای کارت خودرو"    type="date" value={form.registrationExpiry} onChange={v => set('registrationExpiry', v)} />
            </div>
          </Section>

          {/* سایر */}
          <Section title="سایر">
            <Field label="VIN / شماره شاسی" value={form.vin} dir="ltr" onChange={v => set('vin', v)} />
            <div>
              <label className="text-xs text-muted mb-1.5 block">یادداشت</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
                placeholder="هر اطلاعات دیگری..."
                className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors resize-none placeholder:text-muted/50"
              />
            </div>
          </Section>

          {error && <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>}

          <button type="submit" disabled={loading}
            className="bg-accent hover:bg-accent/90 text-white rounded-xl py-3 font-semibold text-sm transition-colors disabled:opacity-50">
            {loading ? 'در حال ذخیره...' : 'ذخیره خودرو'}
          </button>
        </form>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4">
      <h2 className="font-semibold text-white text-sm border-b border-border pb-2">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, required, type = 'text', placeholder, dir }: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; type?: string; placeholder?: string; dir?: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted mb-1.5 block">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} required={required}
        type={type} placeholder={placeholder} dir={dir}
        className={inputCls}
      />
    </div>
  );
}

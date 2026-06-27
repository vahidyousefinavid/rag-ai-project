'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  api, Vehicle, ServiceRecord, FuelLog, FuelStats, VehicleDoc, Reminder,
  SERVICE_TYPES, DOC_TYPES, FUEL_TYPES, COLORS_HEX, daysUntil, expiryStatus,
} from '@/lib/api';

type Tab = 'overview' | 'records' | 'fuel' | 'documents' | 'reminders' | 'ai';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview',   label: 'خلاصه',         icon: '📊' },
  { id: 'records',    label: 'سرویس‌ها',       icon: '🔧' },
  { id: 'fuel',       label: 'سوخت',          icon: '⛽' },
  { id: 'documents',  label: 'مدارک',          icon: '📄' },
  { id: 'reminders',  label: 'یادآورها',       icon: '🔔' },
  { id: 'ai',         label: 'دستیار AI',      icon: '🤖' },
];

export default function VehiclePage() {
  const router       = useRouter();
  const { id }       = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<Tab>((searchParams.get('tab') as Tab) || 'overview');

  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    api.vehicles.get(id).then(v => { setVehicle(v); setLoading(false); });
  }, [id, router]);

  function refresh() { api.vehicles.get(id).then(setVehicle); }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-border border-t-accent animate-spin" />
    </div>
  );
  if (!vehicle) return null;

  const dotColor    = COLORS_HEX[vehicle.color || ''] || '#7c3aed';
  const insDays     = daysUntil(vehicle.insuranceExpiry);
  const tecDays     = daysUntil(vehicle.technicalExpiry);
  const regDays     = daysUntil(vehicle.registrationExpiry);
  const alertCount  = [insDays, tecDays, regDays].filter(d => expiryStatus(d) !== 'ok').length;

  return (
    <div style={{ minHeight: '100vh', background: '#EEF2F7' }}>
      <Navbar />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 40px' }}>

        {/* بازگشت */}
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A9DBB', fontSize: 13, padding: '16px 0 12px', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          ← بازگشت
        </button>

        {/* Hero Card — سبز مثل تصویر */}
        <div style={{
          background: '#1BC9A8', borderRadius: 20, padding: '20px 20px 16px',
          marginBottom: 16, position: 'relative', overflow: 'hidden',
        }}>
          {/* گرادیان خفیف پس‌زمینه */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.15,
            background: `radial-gradient(circle at top left, ${dotColor}, transparent 60%)`,
          }} />

          <div style={{ position: 'relative' }}>
            {/* سطر اول: آیکون + نام + پلاک */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: 'rgba(255,255,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                }}>🚗</div>
                <div>
                  <h1 style={{ color: 'white', fontSize: 18, fontWeight: 700, margin: 0 }}>
                    {vehicle.make} {vehicle.model}
                  </h1>
                  <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, margin: '3px 0 0' }}>
                    {vehicle.year}{vehicle.color ? ` · ${vehicle.color}` : ''}{vehicle.fuelType ? ` · ${vehicle.fuelType}` : ''}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                {alertCount > 0 && (
                  <span style={{
                    background: 'rgba(255,107,107,0.25)', border: '1px solid rgba(255,107,107,0.4)',
                    color: 'white', fontSize: 11, padding: '3px 10px', borderRadius: 20,
                  }}>
                    {alertCount} هشدار
                  </span>
                )}
                {vehicle.plateNumber && (
                  <span style={{
                    background: 'rgba(255,255,255,0.2)', color: 'white',
                    fontSize: 11, padding: '3px 10px', borderRadius: 8, fontFamily: 'monospace', direction: 'ltr',
                  }}>
                    {vehicle.plateNumber}
                  </span>
                )}
              </div>
            </div>

            {/* آمار — مثل stat boxes تصویر */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'کارکرد', value: vehicle.currentMileage.toLocaleString(), sub: 'km' },
                { label: 'سرویس‌ها', value: String(vehicle.serviceRecords?.length || 0), sub: '' },
                ...(vehicle.engineCapacity ? [{ label: 'موتور', value: vehicle.engineCapacity, sub: '' }] : []),
                ...(vehicle.transmission   ? [{ label: 'گیربکس',  value: vehicle.transmission, sub: '' }] : []),
              ].map(s => (
                <div key={s.label} style={{
                  flex: 1, background: 'rgba(255,255,255,0.2)',
                  borderRadius: 12, padding: '8px 10px', textAlign: 'center',
                }}>
                  <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0 }}>
                    {s.value}<span style={{ fontSize: 10, opacity: 0.8, marginRight: 2 }}>{s.sub}</span>
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, margin: '2px 0 0' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* تب‌ها — pill style مثل تصویر */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '8px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer', border: 'none',
                background: tab === t.id ? '#1BC9A8' : 'white',
                color: tab === t.id ? 'white' : '#8A9DBB',
                boxShadow: tab === t.id
                  ? '0 4px 12px rgba(27,201,168,0.35)'
                  : '0 2px 8px rgba(26,42,58,0.07)',
                transition: 'all 0.15s',
              }}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview'   && <OverviewTab  vehicle={vehicle} onRefresh={refresh} />}
        {tab === 'records'    && <RecordsTab   vehicle={vehicle} onRefresh={refresh} />}
        {tab === 'fuel'       && <FuelTab      vehicleId={id} />}
        {tab === 'documents'  && <DocumentsTab vehicleId={id} vehicle={vehicle} onRefresh={refresh} />}
        {tab === 'reminders'  && <RemindersTab vehicleId={id} currentMileage={vehicle.currentMileage} />}
        {tab === 'ai'         && <AiTab        vehicleId={id} />}
      </main>
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: '#EEF2F7', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
      <p style={{ color: '#1A2A3A', fontWeight: 700, fontSize: 14, margin: 0 }}>
        {value}<span style={{ color: '#8A9DBB', fontSize: 11, marginRight: 2 }}>{sub}</span>
      </p>
      <p style={{ color: '#8A9DBB', fontSize: 11, margin: '2px 0 0' }}>{label}</p>
    </div>
  );
}

// ─── Overview ──────────────────────────────────────────────────────────────────
function OverviewTab({ vehicle, onRefresh }: { vehicle: Vehicle; onRefresh: () => void }) {
  const docs = [
    { label: 'بیمه شخص ثالث', icon: '🛡️', expiry: vehicle.insuranceExpiry, days: daysUntil(vehicle.insuranceExpiry) },
    { label: 'معاینه فنی',    icon: '🔍', expiry: vehicle.technicalExpiry,  days: daysUntil(vehicle.technicalExpiry) },
    { label: 'کارت خودرو',   icon: '📄', expiry: vehicle.registrationExpiry,days: daysUntil(vehicle.registrationExpiry) },
  ].filter(d => d.expiry);

  const lastService = vehicle.serviceRecords?.[0];

  const statusStyle = (days: number | null) => {
    const s = expiryStatus(days);
    return {
      ok:      'bg-green-400/10  border-green-400/20  text-emerald-600',
      warn:    'bg-yellow-400/10 border-yellow-400/20 text-amber-700',
      danger:  'bg-orange-400/10 border-orange-400/20 text-orange-600',
      expired: 'bg-red-400/10    border-red-400/20    text-red-600',
    }[s];
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Doc status */}
      {docs.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-white mb-3">وضعیت مدارک</h2>
          <div className="flex flex-col gap-2">
            {docs.map(d => (
              <div key={d.label} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${statusStyle(d.days)}`}>
                <div className="flex items-center gap-2">
                  <span>{d.icon}</span>
                  <span className="text-sm font-medium">{d.label}</span>
                </div>
                <div className="text-left">
                  <p className="text-xs">{d.expiry}</p>
                  <p className="text-xs opacity-75">
                    {d.days === null ? '' : d.days < 0 ? 'منقضی شده' : d.days === 0 ? 'امروز منقضی می‌شود' : `${d.days} روز مانده`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last service */}
      <div className="glass rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-white mb-3">آخرین سرویس</h2>
        {lastService ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium text-sm">{lastService.serviceType}</p>
              <p className="text-muted text-xs mt-0.5">{lastService.serviceDate} · {lastService.mileage?.toLocaleString()} km</p>
            </div>
            {lastService.nextServiceMileage && (
              <div className="text-left">
                <p className="text-xs text-muted">سرویس بعدی</p>
                <p className="text-accent-light text-sm font-semibold">{lastService.nextServiceMileage.toLocaleString()} km</p>
                {vehicle.currentMileage < lastService.nextServiceMileage && (
                  <p className="text-xs text-muted">{(lastService.nextServiceMileage - vehicle.currentMileage).toLocaleString()} km مانده</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted text-sm">هنوز سرویسی ثبت نشده</p>
        )}
      </div>

      {/* Info */}
      <div className="glass rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-white mb-3">مشخصات فنی</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'نوع سوخت',   value: vehicle.fuelType },
            { label: 'حجم موتور',  value: vehicle.engineCapacity },
            { label: 'گیربکس',     value: vehicle.transmission },
            { label: 'رنگ',        value: vehicle.color },
            { label: 'VIN',        value: vehicle.vin },
          ].filter(r => r.value).map(r => (
            <div key={r.label} className="bg-surface/60 rounded-xl p-3">
              <p className="text-xs text-muted">{r.label}</p>
              <p className="text-sm text-white font-medium mt-0.5">{r.value}</p>
            </div>
          ))}
        </div>
        {vehicle.notes && <p className="text-muted text-sm mt-3 p-3 bg-surface/60 rounded-xl">{vehicle.notes}</p>}
      </div>
    </div>
  );
}

// ─── Records ───────────────────────────────────────────────────────────────────
function RecordsTab({ vehicle, onRefresh }: { vehicle: Vehicle; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const records = vehicle.serviceRecords || [];

  async function del(id: string) {
    if (!confirm('این سرویس حذف شود؟')) return;
    await api.records.remove(vehicle.id, id);
    onRefresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">تاریخچه سرویس ({records.length})</h2>
        <button onClick={() => setShowAdd(true)} className="bg-accent hover:bg-accent/90 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors">
          + ثبت سرویس
        </button>
      </div>

      {records.length === 0 ? (
        <Empty icon="🔧" text="هنوز سرویسی ثبت نشده" />
      ) : (
        <div className="flex flex-col gap-3">
          {records.map((r, i) => (
            <div key={r.id} className="glass rounded-xl p-4 flex gap-3">
              <div className="flex flex-col items-center gap-1 pt-1.5 flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                {i < records.length - 1 && <div className="w-0.5 flex-1 bg-border min-h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white text-sm">{r.serviceType}</p>
                    <p className="text-xs text-muted mt-0.5">{r.serviceDate} · {r.mileage?.toLocaleString()} km</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {r.cost && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{r.cost.toLocaleString()} ت</span>}
                    <button onClick={() => del(r.id)} className="text-muted hover:text-red-400 transition-colors text-xs p-1">✕</button>
                  </div>
                </div>
                {r.description && <p className="text-xs text-muted mt-1.5 leading-relaxed">{r.description}</p>}
                {r.workshop     && <p className="text-xs text-muted mt-1">🔧 {r.workshop}</p>}
                {r.nextServiceMileage && (
                  <p className="text-xs text-accent-light mt-2">⏭ سرویس بعدی: {r.nextServiceMileage.toLocaleString()} km{r.nextServiceDate ? ` · ${r.nextServiceDate}` : ''}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddServiceModal vehicleId={vehicle.id} onClose={() => setShowAdd(false)} onSaved={onRefresh} />}
    </div>
  );
}

// ─── Fuel ──────────────────────────────────────────────────────────────────────
function FuelTab({ vehicleId }: { vehicleId: string }) {
  const [logs, setLogs]       = useState<FuelLog[]>([]);
  const [stats, setStats]     = useState<FuelStats | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    Promise.all([api.fuel.list(vehicleId), api.fuel.stats(vehicleId)])
      .then(([l, s]) => { setLogs(l); setStats(s); })
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [vehicleId]);

  async function del(id: string) {
    await api.fuel.remove(vehicleId, id);
    load();
  }

  if (loading) return <Spinner />;

  return (
    <div>
      {stats && (stats.totalLiters > 0) && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard label="مصرف متوسط" value={stats.avgConsumption ? `${stats.avgConsumption} L` : '—'} sub="در ۱۰۰ km" />
          <StatCard label="کل سوخت"   value={`${stats.totalLiters.toLocaleString()}`}    sub="لیتر" />
          <StatCard label="کل هزینه"  value={stats.totalCost ? stats.totalCost.toLocaleString() : '—'} sub="تومان" />
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">تاریخچه سوخت ({logs.length})</h2>
        <button onClick={() => setShowAdd(true)} className="bg-accent hover:bg-accent/90 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors">
          + ثبت سوخت
        </button>
      </div>

      {logs.length === 0 ? <Empty icon="⛽" text="هنوز سوختی ثبت نشده" /> : (
        <div className="flex flex-col gap-2">
          {logs.map(l => (
            <div key={l.id} className="glass rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center text-lg flex-shrink-0">⛽</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm">{l.liters} لیتر</span>
                  {l.isFullTank && <span className="text-xs bg-blue-400/10 text-blue-400 px-1.5 py-0.5 rounded">باک پر</span>}
                </div>
                <p className="text-xs text-muted mt-0.5">{l.date} · {l.mileage?.toLocaleString()} km{l.station ? ` · ${l.station}` : ''}</p>
              </div>
              <div className="text-left flex-shrink-0 flex items-center gap-2">
                {l.cost && <span className="text-xs text-emerald-600">{l.cost.toLocaleString()} ت</span>}
                <button onClick={() => del(l.id)} className="text-muted hover:text-red-400 transition-colors text-xs p-1">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddFuelModal vehicleId={vehicleId} onClose={() => setShowAdd(false)} onSaved={load} />}
    </div>
  );
}

// ─── Documents ─────────────────────────────────────────────────────────────────
function DocumentsTab({ vehicleId, vehicle, onRefresh }: { vehicleId: string; vehicle: Vehicle; onRefresh: () => void }) {
  const [docs, setDocs]       = useState<VehicleDoc[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() { api.documents.list(vehicleId).then(setDocs).finally(() => setLoading(false)); }
  useEffect(() => { load(); }, [vehicleId]);

  async function del(id: string) {
    await api.documents.remove(vehicleId, id);
    load();
  }

  const docStatus = (d: VehicleDoc) => {
    const days = daysUntil(d.expiryDate);
    return expiryStatus(days);
  };

  const statusColors = {
    ok:      'border-green-400/20 bg-green-400/5',
    warn:    'border-yellow-400/20 bg-yellow-400/5',
    danger:  'border-orange-400/20 bg-orange-400/5',
    expired: 'border-red-400/20 bg-red-400/5',
  };

  // Quick update from vehicle entity
  const quickDocs = [
    { label: 'بیمه شخص ثالث', icon: '🛡️', expiry: vehicle.insuranceExpiry,   field: 'insuranceExpiry' },
    { label: 'معاینه فنی',    icon: '🔍', expiry: vehicle.technicalExpiry,    field: 'technicalExpiry' },
    { label: 'کارت خودرو',   icon: '📄', expiry: vehicle.registrationExpiry, field: 'registrationExpiry' },
  ];

  if (loading) return <Spinner />;

  return (
    <div>
      {/* Quick vehicle doc dates */}
      <div className="glass rounded-2xl p-4 mb-5">
        <h2 className="text-sm font-semibold text-white mb-3">تاریخ انقضای مدارک خودرو</h2>
        <div className="flex flex-col gap-2">
          {quickDocs.map(d => {
            const days = daysUntil(d.expiry);
            const s    = expiryStatus(days);
            return (
              <div key={d.field} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${statusColors[s]}`}>
                <span className="text-sm text-white flex items-center gap-2"><span>{d.icon}</span>{d.label}</span>
                <div className="text-left">
                  {d.expiry
                    ? <><p className="text-xs text-white">{d.expiry}</p><p className={`text-xs ${s === 'ok' ? 'text-emerald-600' : s === 'expired' ? 'text-red-600' : 'text-orange-600'}`}>{days !== null && days < 0 ? 'منقضی' : days !== null ? `${days} روز` : ''}</p></>
                    : <p className="text-xs text-muted">ثبت نشده</p>
                  }
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted mt-3">برای بروزرسانی این تاریخ‌ها، اطلاعات خودرو را ویرایش کنید.</p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">مدارک ذخیره شده ({docs.length})</h2>
        <button onClick={() => setShowAdd(true)} className="bg-accent hover:bg-accent/90 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors">+ افزودن مدرک</button>
      </div>

      {docs.length === 0 ? <Empty icon="📄" text="هنوز مدرکی ثبت نشده" /> : (
        <div className="flex flex-col gap-2">
          {docs.map(d => {
            const days = daysUntil(d.expiryDate);
            const s    = docStatus(d);
            const typeInfo = DOC_TYPES.find(t => t.value === d.type);
            return (
              <div key={d.id} className={`glass rounded-xl p-4 border ${statusColors[s]}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{typeInfo?.icon || '📎'}</span>
                    <div>
                      <p className="text-white font-semibold text-sm">{d.title}</p>
                      <p className="text-xs text-muted">{typeInfo?.label}</p>
                    </div>
                  </div>
                  <button onClick={() => del(d.id)} className="text-muted hover:text-red-400 text-xs p-1 transition-colors">✕</button>
                </div>
                {(d.issueDate || d.expiryDate) && (
                  <div className="flex gap-4 mt-3">
                    {d.issueDate  && <div><p className="text-xs text-muted">صدور</p><p className="text-xs text-white">{d.issueDate}</p></div>}
                    {d.expiryDate && (
                      <div>
                        <p className="text-xs text-muted">انقضا</p>
                        <p className={`text-xs font-medium ${s === 'expired' ? 'text-red-600' : s !== 'ok' ? 'text-orange-600' : 'text-emerald-600'}`}>
                          {d.expiryDate}{days !== null ? ` (${days < 0 ? 'منقضی' : `${days} روز`})` : ''}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {d.notes && <p className="text-xs text-muted mt-2">{d.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddDocModal vehicleId={vehicleId} onClose={() => setShowAdd(false)} onSaved={load} />}
    </div>
  );
}

// ─── Reminders ─────────────────────────────────────────────────────────────────
function RemindersTab({ vehicleId, currentMileage }: { vehicleId: string; currentMileage: number }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showAdd, setShowAdd]     = useState(false);
  const [loading, setLoading]     = useState(true);

  function load() { api.reminders.list(vehicleId).then(setReminders).finally(() => setLoading(false)); }
  useEffect(() => { load(); }, [vehicleId]);

  async function toggle(id: string) { await api.reminders.toggle(vehicleId, id); load(); }
  async function del(id: string) { await api.reminders.remove(vehicleId, id); load(); }

  const active    = reminders.filter(r => !r.isCompleted);
  const completed = reminders.filter(r =>  r.isCompleted);

  const isOverdue = (r: Reminder) => {
    if (r.isCompleted) return false;
    if (r.dueMileage && currentMileage >= r.dueMileage) return true;
    if (r.dueDate && new Date(r.dueDate) < new Date()) return true;
    return false;
  };

  const priorityColors = { high: 'text-red-500', medium: 'text-amber-600', low: 'text-blue-600' };

  if (loading) return <Spinner />;

  const ReminderRow = ({ r }: { r: Reminder }) => (
    <div className={`glass rounded-xl p-4 flex items-start gap-3 ${r.isCompleted ? 'opacity-50' : ''} ${isOverdue(r) ? 'border-red-400/30' : ''}`}>
      <button onClick={() => toggle(r.id)}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors ${r.isCompleted ? 'bg-green-400 border-green-400' : 'border-border hover:border-accent'}`}>
        {r.isCompleted && <span className="flex items-center justify-center text-xs text-white">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium ${r.isCompleted ? 'line-through text-muted' : 'text-white'}`}>{r.title}</p>
          <span className={`text-xs ${priorityColors[r.priority as keyof typeof priorityColors] || 'text-muted'}`}>●</span>
          {isOverdue(r) && <span className="text-xs text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">سررسید گذشته</span>}
        </div>
        {r.description && <p className="text-xs text-muted mt-0.5">{r.description}</p>}
        <div className="flex gap-3 mt-1.5">
          {r.dueMileage && <span className="text-xs text-muted">📍 {r.dueMileage.toLocaleString()} km</span>}
          {r.dueDate    && <span className="text-xs text-muted">📅 {r.dueDate}</span>}
        </div>
      </div>
      <button onClick={() => del(r.id)} className="text-muted hover:text-red-400 text-xs p-1 transition-colors flex-shrink-0">✕</button>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">یادآورها ({active.length} فعال)</h2>
        <button onClick={() => setShowAdd(true)} className="bg-accent hover:bg-accent/90 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors">+ یادآور جدید</button>
      </div>

      {active.length === 0 && completed.length === 0
        ? <Empty icon="🔔" text="هنوز یادآوری ثبت نشده" />
        : (
          <div className="flex flex-col gap-2">
            {active.map(r => <ReminderRow key={r.id} r={r} />)}
            {completed.length > 0 && (
              <>
                <p className="text-xs text-muted mt-3 mb-1">انجام شده</p>
                {completed.map(r => <ReminderRow key={r.id} r={r} />)}
              </>
            )}
          </div>
        )
      }

      {showAdd && <AddReminderModal vehicleId={vehicleId} onClose={() => setShowAdd(false)} onSaved={load} />}
    </div>
  );
}

// ─── AI ────────────────────────────────────────────────────────────────────────
function AiTab({ vehicleId }: { vehicleId: string }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    setMessages(m => [...m, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);
    try {
      const { answer } = await api.ai.ask(vehicleId, q);
      setMessages(m => [...m, { role: 'ai', text: answer }]);
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'خطا در ارتباط با دستیار' }]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = ['کِی باید روغن موتور عوض کنم؟', 'وضعیت کلی ماشینم چطوره؟', 'آخرین سرویس چه بود؟', 'هزینه تعمیرات من چقدره؟'];

  return (
    <div className="flex flex-col" style={{ height: 480 }}>
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="text-5xl">🤖</div>
            <p className="text-white font-semibold">دستیار هوشمند خودرو</p>
            <p className="text-muted text-sm text-center">هر سوالی درباره ماشینت داری بپرس</p>
            <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
              {suggestions.map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-xs text-right text-muted hover:text-white border border-border hover:border-accent/50 rounded-xl px-3 py-2 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user' ? 'bg-accent/20 border border-accent/30 text-white' : 'bg-card border border-border text-white'
              }`}>{m.text}</div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-end">
            <div className="glass rounded-2xl px-4 py-3 flex gap-1.5 items-center">
              {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-3 border-t border-border">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="سوالت رو بنویس..."
          className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-muted/50"
        />
        <button onClick={send} disabled={loading || !input.trim()}
          className="bg-accent hover:bg-accent/90 text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
          ارسال
        </button>
      </div>
    </div>
  );
}

// ─── Modals ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-white">{title}</h2>
            <button onClick={onClose} className="text-muted hover:text-white transition-colors w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center">✕</button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs text-muted mb-1.5 block">{label}</label>{children}</div>;
}

const inputCls = "w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-muted/50";

function AddServiceModal({ vehicleId, onClose, onSaved }: { vehicleId: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ serviceType: SERVICE_TYPES[0], serviceDate: today(), mileage: '', description: '', cost: '', workshop: '', nextServiceMileage: '', nextServiceDate: '' });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    await api.records.create(vehicleId, { serviceType: f.serviceType, serviceDate: f.serviceDate, mileage: n(f.mileage), cost: n(f.cost), nextServiceMileage: n(f.nextServiceMileage), description: f.description || undefined, workshop: f.workshop || undefined, nextServiceDate: f.nextServiceDate || undefined });
    onSaved(); onClose();
  }
  return (
    <Modal title="ثبت سرویس" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <F label="نوع سرویس"><select value={f.serviceType} onChange={e => set('serviceType', e.target.value)} className={inputCls}>{SERVICE_TYPES.map(t => <option key={t}>{t}</option>)}</select></F>
        <div className="grid grid-cols-2 gap-3">
          <F label="تاریخ"><input value={f.serviceDate} onChange={e => set('serviceDate', e.target.value)} type="date" className={inputCls} required /></F>
          <F label="کارکرد (km)"><input value={f.mileage} onChange={e => set('mileage', e.target.value)} type="number" className={inputCls} /></F>
        </div>
        <F label="توضیحات"><input value={f.description} onChange={e => set('description', e.target.value)} placeholder="جزئیات..." className={inputCls} /></F>
        <div className="grid grid-cols-2 gap-3">
          <F label="هزینه (تومان)"><input value={f.cost} onChange={e => set('cost', e.target.value)} type="number" className={inputCls} /></F>
          <F label="تعمیرگاه"><input value={f.workshop} onChange={e => set('workshop', e.target.value)} className={inputCls} /></F>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label="سرویس بعدی (km)"><input value={f.nextServiceMileage} onChange={e => set('nextServiceMileage', e.target.value)} type="number" className={inputCls} /></F>
          <F label="تاریخ سرویس بعدی"><input value={f.nextServiceDate} onChange={e => set('nextServiceDate', e.target.value)} type="date" className={inputCls} /></F>
        </div>
        <button type="submit" disabled={loading} className="bg-accent hover:bg-accent/90 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 mt-1 transition-colors">
          {loading ? 'در حال ذخیره...' : 'ثبت سرویس'}
        </button>
      </form>
    </Modal>
  );
}

function AddFuelModal({ vehicleId, onClose, onSaved }: { vehicleId: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ date: today(), liters: '', cost: '', mileage: '', isFullTank: true, station: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string | boolean) => setF(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    await api.fuel.create(vehicleId, { date: f.date, liters: Number(f.liters), cost: n(f.cost), mileage: n(f.mileage) || 0, isFullTank: f.isFullTank, station: f.station || undefined, notes: f.notes || undefined });
    onSaved(); onClose();
  }
  return (
    <Modal title="ثبت سوخت" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <F label="تاریخ"><input value={f.date} onChange={e => set('date', e.target.value)} type="date" className={inputCls} required /></F>
          <F label="لیتر"><input value={f.liters} onChange={e => set('liters', e.target.value)} type="number" step="0.1" className={inputCls} required /></F>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label="هزینه (تومان)"><input value={f.cost} onChange={e => set('cost', e.target.value)} type="number" className={inputCls} /></F>
          <F label="کارکرد (km)"><input value={f.mileage} onChange={e => set('mileage', e.target.value)} type="number" className={inputCls} /></F>
        </div>
        <F label="جایگاه سوخت"><input value={f.station} onChange={e => set('station', e.target.value)} className={inputCls} /></F>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={f.isFullTank} onChange={e => set('isFullTank', e.target.checked)} className="w-4 h-4 rounded accent-accent" />
          <span className="text-sm text-white">باک کامل پر شد</span>
        </label>
        <button type="submit" disabled={loading} className="bg-accent hover:bg-accent/90 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 mt-1 transition-colors">
          {loading ? 'در حال ذخیره...' : 'ثبت سوخت'}
        </button>
      </form>
    </Modal>
  );
}

function AddDocModal({ vehicleId, onClose, onSaved }: { vehicleId: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ type: 'insurance', title: '', issueDate: '', expiryDate: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    await api.documents.create(vehicleId, { type: f.type as any, title: f.title, issueDate: f.issueDate || undefined, expiryDate: f.expiryDate || undefined, notes: f.notes || undefined });
    onSaved(); onClose();
  }
  return (
    <Modal title="افزودن مدرک" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <F label="نوع مدرک">
          <div className="grid grid-cols-2 gap-2">
            {DOC_TYPES.map(t => (
              <button key={t.value} type="button" onClick={() => set('type', t.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-colors ${f.type === t.value ? 'border-accent bg-accent/20 text-white' : 'border-border text-muted hover:text-white'}`}>
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </F>
        <F label="عنوان"><input value={f.title} onChange={e => set('title', e.target.value)} placeholder="مثلاً: بیمه ایران" className={inputCls} required /></F>
        <div className="grid grid-cols-2 gap-3">
          <F label="تاریخ صدور"><input value={f.issueDate} onChange={e => set('issueDate', e.target.value)} type="date" className={inputCls} /></F>
          <F label="تاریخ انقضا"><input value={f.expiryDate} onChange={e => set('expiryDate', e.target.value)} type="date" className={inputCls} /></F>
        </div>
        <F label="یادداشت"><input value={f.notes} onChange={e => set('notes', e.target.value)} className={inputCls} /></F>
        <button type="submit" disabled={loading} className="bg-accent hover:bg-accent/90 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 mt-1 transition-colors">
          {loading ? 'در حال ذخیره...' : 'ثبت مدرک'}
        </button>
      </form>
    </Modal>
  );
}

function AddReminderModal({ vehicleId, onClose, onSaved }: { vehicleId: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ title: '', description: '', dueMileage: '', dueDate: '', priority: 'medium' });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    await api.reminders.create(vehicleId, { title: f.title, description: f.description || undefined, dueMileage: n(f.dueMileage), dueDate: f.dueDate || undefined, priority: f.priority });
    onSaved(); onClose();
  }
  return (
    <Modal title="یادآور جدید" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <F label="عنوان"><input value={f.title} onChange={e => set('title', e.target.value)} placeholder="مثلاً: تعویض روغن" className={inputCls} required /></F>
        <F label="توضیحات"><input value={f.description} onChange={e => set('description', e.target.value)} className={inputCls} /></F>
        <div className="grid grid-cols-2 gap-3">
          <F label="کارکرد موعد (km)"><input value={f.dueMileage} onChange={e => set('dueMileage', e.target.value)} type="number" className={inputCls} /></F>
          <F label="تاریخ موعد"><input value={f.dueDate} onChange={e => set('dueDate', e.target.value)} type="date" className={inputCls} /></F>
        </div>
        <F label="اولویت">
          <div className="flex gap-2">
            {[{ v: 'low', l: 'کم', c: 'text-blue-400' }, { v: 'medium', l: 'متوسط', c: 'text-yellow-400' }, { v: 'high', l: 'زیاد', c: 'text-red-400' }].map(p => (
              <button key={p.v} type="button" onClick={() => set('priority', p.v)}
                className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-colors ${f.priority === p.v ? 'border-accent bg-accent/20 text-white' : `border-border ${p.c} opacity-60 hover:opacity-100`}`}>
                {p.l}
              </button>
            ))}
          </div>
        </F>
        <button type="submit" disabled={loading} className="bg-accent hover:bg-accent/90 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 mt-1 transition-colors">
          {loading ? 'در حال ذخیره...' : 'ثبت یادآور'}
        </button>
      </form>
    </Modal>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function Empty({ icon, text }: { icon: string; text: string }) {
  return <div className="text-center py-16 glass rounded-2xl"><p className="text-4xl mb-3">{icon}</p><p className="text-muted text-sm">{text}</p></div>;
}
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div className="glass rounded-xl p-4 text-center"><p className="text-lg font-bold text-white">{value}<span className="text-xs text-muted ml-1">{sub}</span></p><p className="text-xs text-muted mt-0.5">{label}</p></div>;
}
function Spinner() {
  return <div className="flex justify-center py-16"><div className="w-6 h-6 rounded-full border-2 border-border border-t-accent animate-spin" /></div>;
}
function today() { return new Date().toISOString().slice(0, 10); }
function n(v: string): number | undefined { return v ? Number(v) : undefined; }

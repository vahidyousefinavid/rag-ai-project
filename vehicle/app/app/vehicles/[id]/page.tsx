'use client';
import { useState, useEffect, useRef, type ComponentType } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import {
  api, downloadPdf, Vehicle, ServiceRecord, FuelLog, FuelStats, VehicleDoc, Reminder,
  SERVICE_TYPES, DOC_TYPES, FUEL_TYPES, COLORS_HEX, daysUntil, expiryStatus, toJalali,
} from '@/lib/api';
import PersianDatePicker from '@/components/PersianDatePicker';
import Chat from '@/components/Chat';
import { svcMeta } from '@/components/serviceMeta';
import {
  C, STATUS_THEME,
  Card, SectionCard, Button, IconButton, FormField, Input,
  IconBadge, StatGrid, StatusRow, EmptyState, Spinner, Sheet,
} from '@/components/ui';
import {
  ChevronRightIcon, ChevronDownIcon, ChevronUpIcon, PlusIcon, XIcon, TrashIcon,
  CarIcon, ShieldIcon, SearchIcon, FileTextIcon, WrenchIcon, FuelIcon, BellIcon,
  SparklesIcon, WalletIcon, CalendarIcon, RoadIcon, PinIcon, CircleIcon,
  AlertTriangleIcon, CheckIcon, IranFlag, CopyIcon, UserPlusIcon,
  MessageIcon, DownloadIcon, CreditCardIcon, SettingsIcon, GaugeIcon, PaperclipIcon,
} from '@/components/icons';
import type { VehicleAccessEntry } from '@/lib/api';

type Tab = 'overview' | 'records' | 'fuel' | 'documents' | 'reminders' | 'ai';
type IconComp = ComponentType<{ size?: number }>;

const TABS: { id: Tab; label: string; icon: IconComp }[] = [
  { id: 'overview',   label: 'خلاصه',    icon: CircleIcon },
  { id: 'records',    label: 'سرویس‌ها', icon: WrenchIcon },
  { id: 'fuel',       label: 'سوخت',     icon: FuelIcon },
  { id: 'documents',  label: 'مدارک',    icon: FileTextIcon },
  { id: 'reminders',  label: 'یادآورها', icon: BellIcon },
  { id: 'ai',         label: 'دستیار',   icon: SparklesIcon },
];

/* ─── Page ──────────────────────────────────────────────────────── */
export default function VehiclePage() {
  const router       = useRouter();
  const { id }       = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'overview');

  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    api.vehicles.get(id).then(v => { setVehicle(v); setLoading(false); });
  }, [id, router]);

  function refresh() { api.vehicles.get(id).then(setVehicle); }

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        border: `3px solid ${C.green}26`,
        borderTopColor: C.green,
        animation: 'spin 0.75s linear infinite',
      }} />
      <span style={{ color: C.muted, fontSize: 13, fontWeight: 500 }}>در حال بارگذاری...</span>
    </div>
  );
  if (!vehicle) return null;

  const dotColor   = COLORS_HEX[vehicle.color || ''] || C.green;
  const insDays    = daysUntil(vehicle.insuranceExpiry);
  const tecDays    = daysUntil(vehicle.technicalExpiry);
  const regDays    = daysUntil(vehicle.registrationExpiry);
  const alertCount = [insDays, tecDays, regDays].filter(d => expiryStatus(d) !== 'ok').length;

  const lastRec   = vehicle.serviceRecords?.[0];
  const nextSvcKm = lastRec?.nextServiceMileage;
  const kmDone    = nextSvcKm && lastRec?.mileage ? vehicle.currentMileage - lastRec.mileage : null;
  const kmRange   = nextSvcKm && lastRec?.mileage ? nextSvcKm - lastRec.mileage : null;
  const healthPct = kmDone !== null && kmRange !== null && kmRange > 0
    ? Math.max(0, Math.min(100, 100 - (kmDone / kmRange) * 100))
    : 80;
  const healthColor = healthPct > 60 ? C.green : healthPct > 30 ? '#F59E0B' : '#EF4444';
  const ringCirc    = 2 * Math.PI * 22;

  const vehicleStats = [
    { label: 'کارکرد', value: vehicle.currentMileage.toLocaleString(), sub: 'km' },
    { label: 'سرویس',  value: String(vehicle.serviceRecords?.length || 0), sub: 'مورد' },
    ...(vehicle.engineCapacity ? [{ label: 'موتور',  value: vehicle.engineCapacity, sub: '' }] : []),
    ...(vehicle.transmission   ? [{ label: 'گیربکس', value: vehicle.transmission,   sub: '' }] : []),
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 14px calc(88px + env(safe-area-inset-bottom))' }}>

        <button
          onClick={() => router.back()}
          style={{
            background: 'none', border: 'none',
            color: C.muted, fontSize: 13, fontWeight: 600,
            padding: '14px 0 10px',
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'color 0.15s',
          }}
        >
          <ChevronRightIcon size={16} /> بازگشت
        </button>

        {/* ── Hero Card ─────────────────────────────────────── */}
        <div style={{
          background: `linear-gradient(145deg, ${C.heroStart} 0%, ${C.heroMid} 45%, ${C.heroEnd} 100%)`,
          borderRadius: 28,
          padding: '24px 20px 22px',
          marginBottom: 14,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.30)',
          animation: 'fadeInUp 0.45s cubic-bezier(.34,1.2,.64,1) both',
        }}>
          <div style={{
            position: 'absolute', top: -50, right: -50,
            width: 220, height: 220, borderRadius: '50%',
            background: `radial-gradient(circle, ${dotColor}35 0%, transparent 65%)`,
            filter: 'blur(28px)',
            animation: 'blobPulse 6s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', bottom: -40, left: -30,
            width: 180, height: 180, borderRadius: '50%',
            background: `radial-gradient(circle, ${C.blue}22 0%, transparent 65%)`,
            filter: 'blur(24px)',
            animation: 'blobPulse 8s ease-in-out infinite reverse',
          }} />

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 58, height: 58, borderRadius: 18,
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                  flexShrink: 0,
                }}><CarIcon size={28} /></div>

                <div>
                  <h1 style={{
                    color: 'white',
                    fontSize: 21, fontWeight: 900, margin: 0,
                    letterSpacing: '-0.4px',
                    textShadow: '0 2px 12px rgba(0,0,0,0.25)',
                  }}>
                    {vehicle.make} {vehicle.model}
                  </h1>
                  <p style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 12, fontWeight: 500,
                    margin: '5px 0 0',
                  }}>
                    {vehicle.year}
                    {vehicle.color ? ` · ${vehicle.color}` : ''}
                    {vehicle.fuelType ? ` · ${vehicle.fuelType}` : ''}
                  </p>
                  {vehicle.plateNumber && (() => {
                    const dash = vehicle.plateNumber!.lastIndexOf('-');
                    const main = dash > 0 ? vehicle.plateNumber!.slice(0, dash).trim() : vehicle.plateNumber!;
                    const prov = dash > 0 ? vehicle.plateNumber!.slice(dash + 1).trim() : '';
                    return (
                      <div style={{
                        display: 'inline-flex', alignItems: 'stretch',
                        borderRadius: 9, overflow: 'hidden',
                        border: '2px solid rgba(0,0,0,0.35)',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
                        height: 34, marginTop: 10,
                      }}>
                        <div style={{
                          width: 26, flexShrink: 0,
                          background: 'linear-gradient(160deg,#0d3c7a,#1a5296)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRight: '1.5px solid rgba(0,0,0,0.25)',
                        }}><IranFlag width={16} height={11} /></div>
                        <div style={{
                          background: 'linear-gradient(180deg,#f8f8f4,#efefea)',
                          display: 'flex', alignItems: 'center',
                          padding: '0 10px',
                          fontFamily: "'Courier New', monospace",
                          fontWeight: 900, color: '#111', fontSize: 13,
                          letterSpacing: 1.5, direction: 'rtl',
                          borderRight: '1.5px solid rgba(0,0,0,0.15)',
                          gap: 4,
                        }}>
                          {main}
                        </div>
                        {prov && (
                          <div style={{
                            width: 36, flexShrink: 0,
                            background: 'linear-gradient(160deg,#0d3c7a,#1a5296)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: "'Courier New', monospace",
                            fontWeight: 900, color: 'white', fontSize: 13, letterSpacing: 2,
                          }}>
                            {prov}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <svg width={64} height={64} viewBox="0 0 56 56" style={{ overflow: 'visible' }}>
                  <defs>
                    <filter id="ringGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                  </defs>
                  <circle cx={28} cy={28} r={22} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={5} />
                  <circle
                    cx={28} cy={28} r={22} fill="none"
                    stroke={healthColor} strokeWidth={5}
                    strokeLinecap="round"
                    strokeDasharray={ringCirc}
                    strokeDashoffset={ringCirc * (1 - healthPct / 100)}
                    transform="rotate(-90 28 28)"
                    filter="url(#ringGlow)"
                    style={{
                      transition: 'stroke-dashoffset 1.2s cubic-bezier(.34,1.56,.64,1), stroke 0.5s',
                    }}
                  />
                  <text x={28} y={25} textAnchor="middle" fill="white" fontSize={12} fontWeight="900">{Math.round(healthPct)}%</text>
                  <text x={28} y={37} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={7} fontWeight="600">سلامت</text>
                </svg>
                {alertCount > 0 && (
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    background: 'rgba(239,68,68,0.25)',
                    border: '1px solid rgba(239,68,68,0.4)',
                    color: '#FF8585', fontSize: 10, fontWeight: 700,
                    padding: '3px 10px', borderRadius: 20,
                    backdropFilter: 'blur(8px)',
                  }}>
                    <AlertTriangleIcon size={11} /> {alertCount} هشدار
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 7 }}>
              {vehicleStats.map(s => (
                <div key={s.label} style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.11)',
                  borderRadius: 14,
                  padding: '10px 6px',
                  textAlign: 'center',
                }}>
                  <p style={{
                    color: 'white', fontWeight: 900, fontSize: 14, margin: 0, lineHeight: 1,
                  }}>
                    {s.value}
                    {s.sub && <span style={{ fontSize: 9, opacity: 0.6, marginRight: 2, fontWeight: 500 }}>{s.sub}</span>}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600, margin: '4px 0 0' }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tab Bar ───────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 5,
          overflowX: 'auto', paddingBottom: 4,
          marginBottom: 18,
          scrollbarWidth: 'none',
        }}>
          {TABS.map(t => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: active ? '9px 18px' : '9px 13px',
                  borderRadius: 26, fontSize: 12.5,
                  fontWeight: active ? 800 : 500,
                  fontFamily: 'Vazirmatn, sans-serif',
                  whiteSpace: 'nowrap', flexShrink: 0,
                  border: 'none',
                  background: active
                    ? `linear-gradient(135deg, ${C.green} 0%, ${C.greenDark} 100%)`
                    : 'rgba(255,255,255,0.06)',
                  color: active ? 'white' : C.muted,
                  boxShadow: active ? `0 4px 20px ${C.greenGlow}` : 'none',
                  transform: active ? 'translateY(-2px)' : 'translateY(0)',
                  transition: 'all 0.22s cubic-bezier(.34,1.4,.64,1)',
                }}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'overview'   && <OverviewTab  vehicle={vehicle} />}
        {tab === 'records'    && <RecordsTab   vehicle={vehicle} onRefresh={refresh} />}
        {tab === 'fuel'       && <FuelTab      vehicleId={id} />}
        {tab === 'documents'  && <DocumentsTab vehicleId={id} vehicle={vehicle} />}
        {tab === 'reminders'  && <RemindersTab vehicleId={id} currentMileage={vehicle.currentMileage} />}
        {tab === 'ai'         && <AiTab        vehicleId={id} />}
      </main>
      <BottomNav />
    </div>
  );
}

/* ─── Overview ─────────────────────────────────────────────────── */
function OverviewTab({ vehicle }: { vehicle: Vehicle }) {
  const docs = [
    { label: 'بیمه شخص ثالث', icon: <ShieldIcon size={18} />, expiry: vehicle.insuranceExpiry, days: daysUntil(vehicle.insuranceExpiry) },
    { label: 'معاینه فنی',    icon: <SearchIcon size={18} />, expiry: vehicle.technicalExpiry,  days: daysUntil(vehicle.technicalExpiry) },
    { label: 'کارت خودرو',   icon: <FileTextIcon size={18} />, expiry: vehicle.registrationExpiry, days: daysUntil(vehicle.registrationExpiry) },
  ].filter(d => d.expiry);

  const lastService = vehicle.serviceRecords?.[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeInUp 0.35s ease both' }}>
      <ConnectedMechanics vehicleId={vehicle.id} />

      {docs.length > 0 && (
        <SectionCard title="وضعیت مدارک" icon={<FileTextIcon size={16} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {docs.map(d => (
              <StatusRow
                key={d.label}
                icon={d.icon}
                label={d.label}
                dateLabel={toJalali(d.expiry)}
                status={expiryStatus(d.days)}
                days={d.days}
              />
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="آخرین سرویس" icon={<WrenchIcon size={16} />}>
        {lastService ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <IconBadge color={svcMeta(lastService.serviceType).color}>
                {(() => { const I = svcMeta(lastService.serviceType).icon; return <I size={20} />; })()}
              </IconBadge>
              <div>
                <p style={{ fontWeight: 800, color: C.text, fontSize: 14, margin: 0 }}>{lastService.serviceType}</p>
                <p style={{ color: C.muted, fontSize: 11, fontWeight: 500, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><CalendarIcon size={12} /> {toJalali(lastService.serviceDate)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><RoadIcon size={12} /> {lastService.mileage?.toLocaleString()} km</span>
                </p>
              </div>
            </div>
            {lastService.nextServiceMileage && (
              <div style={{
                textAlign: 'left', flexShrink: 0,
                background: `${C.green}15`,
                border: `1px solid ${C.green}30`,
                borderRadius: 12, padding: '8px 12px',
              }}>
                <p style={{ fontSize: 10, color: C.muted, margin: 0, fontWeight: 600 }}>سرویس بعدی</p>
                <p style={{ fontSize: 14, fontWeight: 900, color: C.green, margin: '3px 0 0' }}>
                  {lastService.nextServiceMileage.toLocaleString()} km
                </p>
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: C.muted, fontSize: 13, fontWeight: 500 }}>هنوز سرویسی ثبت نشده</p>
        )}
      </SectionCard>

      <SectionCard title="مشخصات فنی" icon={<GaugeIcon size={16} />}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'نوع سوخت',  value: vehicle.fuelType },
            { label: 'حجم موتور', value: vehicle.engineCapacity },
            { label: 'گیربکس',    value: vehicle.transmission },
            { label: 'رنگ',       value: vehicle.color },
            { label: 'VIN',       value: vehicle.vin },
          ].filter(r => r.value).map(r => (
            <div key={r.label} style={{
              background: C.surface2,
              border: `1px solid ${C.border}`,
              borderRadius: 14, padding: '12px 14px',
            }}>
              <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {r.label}
              </p>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '4px 0 0' }}>{r.value}</p>
            </div>
          ))}
        </div>
        {vehicle.notes && (
          <p style={{
            color: C.muted, fontSize: 12, fontWeight: 500,
            marginTop: 10, padding: '12px 14px',
            background: C.surface2, borderRadius: 14,
            lineHeight: 1.8,
            border: `1px solid ${C.border}`,
          }}>
            {vehicle.notes}
          </p>
        )}
      </SectionCard>
    </div>
  );
}

/* ─── Connected mechanics ──────────────────────────────────────── */
function ConnectedMechanics({ vehicleId }: { vehicleId: string }) {
  const [list, setList] = useState<VehicleAccessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [chatWith, setChatWith] = useState<VehicleAccessEntry | null>(null);

  function load() {
    api.access.list(vehicleId).then(setList).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [vehicleId]);

  async function revoke(id: string) {
    if (!confirm('دسترسی این تعمیرگاه لغو شود؟')) return;
    await api.access.revoke(vehicleId, id);
    load();
  }

  if (loading) return null;

  return (
    <SectionCard
      title="تعمیرگاه‌های متصل"
      icon={<UserPlusIcon size={16} />}
      action={<Button size="sm" onClick={() => setShowInvite(true)} icon={<PlusIcon size={14} />}>افزودن مکانیک</Button>}
    >
      {list.length === 0 ? (
        <p style={{ color: C.muted, fontSize: 13, fontWeight: 500 }}>
          هنوز مکانیکی به این خودرو متصل نیست. با «افزودن مکانیک» یک کد دعوت بساز و به تعمیرگاه بده.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map(m => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
              borderRadius: 14, border: `1px solid ${C.border}`, background: C.surface2,
            }}>
              <IconBadge color={C.green} size={38}><WrenchIcon size={17} /></IconBadge>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{m.workshopName || 'تعمیرگاه'}</p>
                <p style={{ fontSize: 11, color: C.muted, fontWeight: 500, margin: '3px 0 0', direction: 'ltr', textAlign: 'right' }}>
                  {m.mechanicPhone}
                </p>
              </div>
              <IconButton label="پیام" onClick={() => setChatWith(m)} size={30}><MessageIcon size={14} /></IconButton>
              <IconButton label="لغو دسترسی" onClick={() => revoke(m.id)} size={30}><TrashIcon size={14} /></IconButton>
            </div>
          ))}
        </div>
      )}
      {showInvite && <InviteMechanicSheet vehicleId={vehicleId} onClose={() => setShowInvite(false)} onGranted={load} />}
      {chatWith && (
        <Chat
          vehicleId={vehicleId}
          mechanicId={chatWith.mechanicId}
          role="owner"
          title={`گفتگو · ${chatWith.workshopName || 'تعمیرگاه'}`}
          onClose={() => setChatWith(null)}
        />
      )}
    </SectionCard>
  );
}

function InviteMechanicSheet({ vehicleId, onClose, onGranted }: { vehicleId: string; onClose: () => void; onGranted: () => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.invites.create(vehicleId)
      .then(inv => setCode(inv.code))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [vehicleId]);

  function copy() {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Sheet title="افزودن مکانیک" icon={<UserPlusIcon size={17} />} onClose={() => { onGranted(); onClose(); }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center' }}>
        {loading ? (
          <Spinner />
        ) : error ? (
          <div style={{ fontSize: 13, color: '#F87171' }}>{error}</div>
        ) : (
          <>
            <p style={{ color: C.muted, fontSize: 13, fontWeight: 500, lineHeight: 1.8, margin: 0 }}>
              این کد رو به مکانیک بده تا با ثبت‌نام یا ورود به‌عنوان مکانیک، وارد این خودرو کنه.
              کد تا ۷ روز معتبره و فقط یک‌بار قابل استفاده‌ست.
            </p>
            <div style={{
              background: `${C.green}15`, border: `1.5px dashed ${C.green}50`, borderRadius: 18,
              padding: '18px 24px', width: '100%',
            }}>
              <p style={{
                fontFamily: "'Courier New', monospace", fontSize: 28, fontWeight: 900,
                letterSpacing: 6, color: C.green, margin: 0, direction: 'ltr',
              }}>{code}</p>
            </div>
            <Button onClick={copy} variant="secondary" fullWidth icon={<CopyIcon size={15} />}>
              {copied ? 'کپی شد' : 'کپی کد'}
            </Button>
          </>
        )}
      </div>
    </Sheet>
  );
}

/* ─── Records ──────────────────────────────────────────────────── */
function RecordsTab({ vehicle, onRefresh }: { vehicle: Vehicle; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<ServiceRecord | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [records, setRecords] = useState<ServiceRecord[]>(vehicle.serviceRecords || []);

  function load() {
    api.records.list(vehicle.id).then(setRecords);
  }
  useEffect(() => { load(); }, [vehicle.id]);

  function refreshAll() {
    load();
    onRefresh();
  }

  async function del(recordId: string) {
    if (!confirm('این سرویس حذف شود؟')) return;
    await api.records.remove(vehicle.id, recordId);
    refreshAll();
  }

  const totalCost = records.reduce((s, r) => s + (r.invoice?.total ?? r.cost ?? 0), 0);
  const lastRec   = records[0];
  const nextKm    = lastRec?.nextServiceMileage;
  const kmLeft    = nextKm ? nextKm - vehicle.currentMileage : null;
  const pct       = nextKm && lastRec?.mileage && nextKm > lastRec.mileage
    ? Math.max(0, Math.min(100, ((vehicle.currentMileage - lastRec.mileage) / (nextKm - lastRec.mileage)) * 100))
    : null;
  const barColor  = pct === null ? C.green : pct > 90 ? '#EF4444' : pct > 70 ? '#F59E0B' : C.green;

  const statItems = [
    { label: 'کل سرویس',  value: String(records.length), sub: 'مورد', icon: <WrenchIcon size={17} />, color: '#818CF8' },
    {
      label: 'هزینه کل',
      value: totalCost > 0 ? `${(totalCost / 1_000_000).toFixed(1)}M` : '—',
      sub: totalCost > 0 ? 'تومان' : '',
      icon: <WalletIcon size={17} />, color: '#34D399',
    },
    {
      label: 'تا سرویس',
      value: kmLeft !== null ? (kmLeft <= 0 ? 'سررسید' : `${Math.round(Math.abs(kmLeft) / 1000)}k`) : '—',
      sub: kmLeft !== null && kmLeft > 0 ? 'km' : '',
      icon: kmLeft !== null && kmLeft <= 0 ? <AlertTriangleIcon size={17} /> : <PinIcon size={17} />,
      color: kmLeft !== null && kmLeft <= 0 ? '#F87171' : '#FBBF24',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeInUp 0.35s ease both' }}>

      {records.length > 0 && <StatGrid stats={statItems} />}

      {pct !== null && nextKm && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PinIcon size={16} color={C.text} />
              <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>پیشرفت تا سرویس بعدی</span>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 800, color: barColor,
              background: `${barColor}18`, padding: '4px 12px', borderRadius: 20,
              border: `1px solid ${barColor}30`,
            }}>
              {kmLeft !== null && kmLeft <= 0 ? 'وقت سرویس!' : `${(kmLeft! / 1000).toFixed(1)}k km مانده`}
            </span>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pct}%`, borderRadius: 8,
              background: `linear-gradient(90deg, ${C.green}, ${barColor})`,
              transition: 'width 1s cubic-bezier(.4,0,.2,1)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>
              فعلی: {vehicle.currentMileage.toLocaleString()} km
            </span>
            <span style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>
              هدف: {nextKm.toLocaleString()} km · {Math.round(pct)}%
            </span>
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>
          تاریخچه سرویس
          {records.length > 0 && (
            <span style={{ fontSize: 12, color: C.muted, fontWeight: 500, marginRight: 6 }}>
              ({records.length})
            </span>
          )}
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {records.length > 0 && (
            <IconButton
              label="دانلود سابقه به‌صورت PDF"
              size={34}
              onClick={() => downloadPdf(`/vehicles/${vehicle.id}/records/pdf`, `history-${vehicle.id}.pdf`)}
            ><DownloadIcon size={15} /></IconButton>
          )}
          <Button size="sm" onClick={() => setShowAdd(true)} icon={<PlusIcon size={15} />}>ثبت سرویس</Button>
        </div>
      </div>

      {records.length === 0 ? (
        <EmptyState icon={<WrenchIcon size={26} />} title="هنوز سرویسی ثبت نشده"
          sub="اولین سرویس ماشینت رو ثبت کن و تاریخچه کامل داشته باش"
          onAdd={() => setShowAdd(true)} btnLabel="ثبت اولین سرویس" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
          {records.length > 1 && (
            <div style={{
              position: 'absolute', right: 35, top: 56, bottom: 56, width: 2, zIndex: 0,
              background: `linear-gradient(to bottom, ${C.green}60, transparent)`,
              borderRadius: 2,
            }} />
          )}

          {records.map(r => {
            const meta       = svcMeta(r.serviceType);
            const Icon       = meta.icon;
            const isExpanded = expanded === r.id;
            return (
              <div key={r.id} style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  background: C.surface, borderRadius: 20, overflow: 'hidden',
                  boxShadow: isExpanded ? `0 8px 32px rgba(0,0,0,0.20), 0 0 0 2px ${meta.color}35` : 'none',
                  border: `1px solid ${isExpanded ? meta.color + '25' : C.border}`,
                  transition: 'box-shadow 0.22s ease, border-color 0.22s ease',
                }}>
                  <div style={{ height: 3, background: `linear-gradient(90deg, ${meta.color}, ${meta.color}40)` }} />

                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <IconBadge color={meta.color}><Icon size={20} /></IconBadge>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>
                          {r.serviceType}
                        </p>
                        <p style={{ fontSize: 11, color: C.muted, fontWeight: 500, margin: '5px 0 0', display: 'flex', gap: 10 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><CalendarIcon size={12} /> {toJalali(r.serviceDate)}</span>
                          {r.mileage && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><RoadIcon size={12} /> {r.mileage.toLocaleString()} km</span>}
                        </p>
                        {r.createdByRole === 'mechanic' && r.createdByName && (
                          <p style={{ fontSize: 10, color: C.subtle, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <WrenchIcon size={11} /> ثبت‌شده توسط {r.createdByName}
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                        {r.invoice ? (
                          <span style={{
                            background: r.invoice.paymentStatus === 'paid' ? 'rgba(52,211,153,0.14)' : r.invoice.paymentStatus === 'partial' ? 'rgba(245,158,11,0.14)' : 'rgba(239,68,68,0.14)',
                            color: r.invoice.paymentStatus === 'paid' ? '#34D399' : r.invoice.paymentStatus === 'partial' ? '#FBBF24' : '#F87171',
                            fontSize: 11, fontWeight: 800,
                            padding: '3px 10px', borderRadius: 9,
                            border: `1px solid ${r.invoice.paymentStatus === 'paid' ? 'rgba(52,211,153,0.25)' : r.invoice.paymentStatus === 'partial' ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)'}`,
                          }}>
                            {(r.invoice.total / 1000).toFixed(0)}K ت
                          </span>
                        ) : r.cost ? (
                          <span style={{
                            background: 'rgba(52,211,153,0.12)', color: '#34D399',
                            fontSize: 11, fontWeight: 800,
                            padding: '3px 10px', borderRadius: 9,
                            border: '1px solid rgba(52,211,153,0.25)',
                          }}>
                            {r.cost >= 1_000_000
                              ? `${(r.cost / 1_000_000).toFixed(1)}M`
                              : `${(r.cost / 1000).toFixed(0)}K`} ت
                          </span>
                        ) : null}
                        <IconButton
                          label={isExpanded ? 'بستن جزئیات' : 'نمایش جزئیات'}
                          active={isExpanded}
                          size={28}
                          onClick={() => setExpanded(isExpanded ? null : r.id)}
                        >
                          {isExpanded ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
                        </IconButton>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{
                        marginTop: 14, paddingTop: 14,
                        borderTop: `1px dashed ${meta.color}35`,
                        display: 'flex', flexDirection: 'column', gap: 10,
                        animation: 'fadeInUp 0.2s ease both',
                      }}>
                        {r.workshop && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.text, fontWeight: 500 }}>
                            تعمیرگاه: <strong style={{ fontWeight: 800 }}>{r.workshop}</strong>
                          </div>
                        )}
                        {r.description && (
                          <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.8, fontWeight: 500 }}>
                            {r.description}
                          </span>
                        )}
                        {r.nextServiceMileage && (
                          <div style={{
                            background: `${meta.color}1F`, borderRadius: 12,
                            padding: '11px 14px',
                            border: `1px solid ${meta.color}25`,
                            display: 'flex', alignItems: 'center', gap: 10,
                          }}>
                            <PinIcon size={16} color={meta.color} />
                            <div>
                              <p style={{ fontSize: 12, color: meta.color, fontWeight: 800, margin: 0 }}>
                                سرویس بعدی: {r.nextServiceMileage.toLocaleString()} km
                              </p>
                              {r.nextServiceDate && (
                                <p style={{ fontSize: 11, color: C.muted, fontWeight: 500, margin: '3px 0 0' }}>
                                  {toJalali(r.nextServiceDate)}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        {r.invoice && <InvoiceDetails vehicleId={vehicle.id} recordId={r.id} />}
                        <div style={{ display: 'flex', gap: 8 }}>
                          {r.createdByRole !== 'mechanic' && (
                            <Button variant="secondary" size="sm" onClick={() => setEditing(r)} icon={<SettingsIcon size={14} />}>
                              ویرایش
                            </Button>
                          )}
                          <Button variant="danger" size="sm" onClick={() => del(r.id)} icon={<TrashIcon size={14} />}>
                            حذف سرویس
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddServiceModal vehicleId={vehicle.id} onClose={() => setShowAdd(false)} onSaved={refreshAll} />}
      {editing && (
        <AddServiceModal
          vehicleId={vehicle.id}
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={refreshAll}
        />
      )}
    </div>
  );
}

function InvoiceDetails({ vehicleId, recordId }: { vehicleId: string; recordId: string }) {
  const [invoice, setInvoice] = useState<import('@/lib/api').Invoice | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  useEffect(() => {
    api.invoices.get(vehicleId, recordId).then(setInvoice).catch(() => {});
  }, [vehicleId, recordId]);

  async function download() {
    setDownloading(true);
    try {
      await downloadPdf(`/vehicles/${vehicleId}/records/${recordId}/invoice/pdf`, `invoice-${recordId}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  async function pay() {
    setPaying(true);
    setPayError('');
    try {
      const { paymentUrl } = await api.payments.pay(vehicleId, recordId);
      window.location.href = paymentUrl;
    } catch (err: any) {
      setPayError(err.message);
      setPaying(false);
    }
  }

  if (!invoice) return null;

  const statusColor = invoice.paymentStatus === 'paid' ? '#34D399' : invoice.paymentStatus === 'partial' ? '#FBBF24' : '#F87171';
  const statusLabel = invoice.paymentStatus === 'paid' ? 'پرداخت‌شده' : invoice.paymentStatus === 'partial' ? 'پرداخت جزئی' : 'پرداخت‌نشده';

  return (
    <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
          <WalletIcon size={14} /> فاکتور
        </span>
        <span style={{ fontSize: 10, fontWeight: 800, color: statusColor, background: `${statusColor}22`, padding: '2px 9px', borderRadius: 7 }}>
          {statusLabel}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {invoice.items.map((it, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: C.muted }}>
            <span>{it.name} <span style={{ color: C.subtle }}>× {it.quantity}</span></span>
            <span style={{ color: C.text, fontWeight: 600 }}>{(it.quantity * it.unitPrice).toLocaleString()} ت</span>
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px dashed ${C.border}`, marginTop: 9, paddingTop: 9, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {invoice.discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: C.muted }}>
            <span>تخفیف</span><span>-{invoice.discount.toLocaleString()} ت</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, color: C.text }}>
          <span>مبلغ نهایی</span><span>{invoice.total.toLocaleString()} ت</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: C.muted }}>
          <span>پرداخت‌شده</span><span>{invoice.paidAmount.toLocaleString()} ت</span>
        </div>
      </div>

      {payError && (
        <div style={{ fontSize: 11, color: '#F87171', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: 9, padding: '8px 12px', marginTop: 9 }}>
          {payError}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <Button size="sm" variant="secondary" fullWidth loading={downloading} onClick={download} icon={<DownloadIcon size={13} />}>
          دانلود PDF
        </Button>
        {invoice.paymentStatus !== 'paid' && (
          <Button size="sm" fullWidth loading={paying} onClick={pay} icon={<CreditCardIcon size={13} />}>
            پرداخت آنلاین
          </Button>
        )}
      </div>
    </div>
  );
}

/* ─── Fuel ─────────────────────────────────────────────────────── */
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
  async function del(id: string) { await api.fuel.remove(vehicleId, id); load(); }

  if (loading) return <Spinner />;

  const fuelStats = stats && stats.totalLiters > 0 ? [
    { label: 'مصرف / ۱۰۰km', value: stats.avgConsumption ? `${stats.avgConsumption}` : '—', sub: stats.avgConsumption ? 'L' : '', icon: <GaugeIcon size={17} />, color: '#818CF8' },
    { label: 'کل سوخت',       value: `${stats.totalLiters}`, sub: 'L', icon: <FuelIcon size={17} />, color: '#FB923C' },
    { label: 'کل هزینه',      value: stats.totalCost ? `${(stats.totalCost / 1_000_000).toFixed(1)}M` : '—', sub: 'تومان', icon: <WalletIcon size={17} />, color: '#34D399' },
  ] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeInUp 0.35s ease both' }}>
      {fuelStats && <StatGrid stats={fuelStats} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 2px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>تاریخچه سوخت</h2>
        <Button size="sm" onClick={() => setShowAdd(true)} icon={<PlusIcon size={15} />}>ثبت سوخت</Button>
      </div>

      {logs.length === 0 ? (
        <EmptyState icon={<FuelIcon size={26} />} title="هنوز سوختی ثبت نشده"
          sub="هر بار که باک می‌زنی ثبتش کن تا مصرف ماشینت رو دنبال کنی"
          onAdd={() => setShowAdd(true)} btnLabel="ثبت اولین سوخت" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {logs.map(l => (
            <div key={l.id} style={{
              background: C.surface, borderRadius: 18, padding: '14px 16px',
              border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <IconBadge color="#FB923C" size={44}><FuelIcon size={20} /></IconBadge>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 800, color: C.text, fontSize: 14 }}>{l.liters} لیتر</span>
                  {l.isFullTank && (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: 'rgba(59,130,246,0.12)', color: '#60A5FA',
                      padding: '2px 9px', borderRadius: 7,
                      border: '1px solid rgba(96,165,250,0.25)',
                    }}>باک پر</span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: C.muted, fontWeight: 500, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><CalendarIcon size={12} /> {toJalali(l.date)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><RoadIcon size={12} /> {l.mileage?.toLocaleString()} km</span>
                  {l.station && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><PinIcon size={12} /> {l.station}</span>}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {l.cost && (
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#34D399' }}>
                    {(l.cost / 1000).toFixed(0)}K ت
                  </span>
                )}
                <IconButton label="حذف" onClick={() => del(l.id)} size={28}><XIcon size={13} /></IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddFuelModal vehicleId={vehicleId} onClose={() => setShowAdd(false)} onSaved={load} />}
    </div>
  );
}

/* ─── Documents ────────────────────────────────────────────────── */
const DOC_ICONS: Record<string, IconComp> = {
  insurance: ShieldIcon, technical: SearchIcon, registration: FileTextIcon,
  warranty: CheckIcon, other: PaperclipIcon,
};

function DocumentsTab({ vehicleId, vehicle }: { vehicleId: string; vehicle: Vehicle }) {
  const [docs, setDocs]       = useState<VehicleDoc[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() { api.documents.list(vehicleId).then(setDocs).finally(() => setLoading(false)); }
  useEffect(() => { load(); }, [vehicleId]);
  async function del(id: string) { await api.documents.remove(vehicleId, id); load(); }

  const quickDocs = [
    { label: 'بیمه شخص ثالث', icon: <ShieldIcon size={18} />, expiry: vehicle.insuranceExpiry },
    { label: 'معاینه فنی',    icon: <SearchIcon size={18} />, expiry: vehicle.technicalExpiry },
    { label: 'کارت خودرو',   icon: <FileTextIcon size={18} />, expiry: vehicle.registrationExpiry },
  ];

  if (loading) return <Spinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeInUp 0.35s ease both' }}>
      <SectionCard title="انقضای مدارک خودرو" icon={<CalendarIcon size={16} />}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {quickDocs.map(d => {
            const days = daysUntil(d.expiry);
            return d.expiry ? (
              <StatusRow key={d.label} icon={d.icon} label={d.label} dateLabel={toJalali(d.expiry)} status={expiryStatus(days)} days={days} />
            ) : (
              <div key={d.label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: 14,
                border: `1.5px solid ${C.border}`, background: C.surface2,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {d.icon}{d.label}
                </span>
                <p style={{ fontSize: 11, color: C.muted, fontWeight: 500, margin: 0 }}>ثبت نشده</p>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 11, color: C.muted, fontWeight: 500, marginTop: 10 }}>
          برای بروزرسانی، اطلاعات خودرو را ویرایش کنید.
        </p>
      </SectionCard>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 2px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>مدارک ذخیره شده</h2>
        <Button size="sm" onClick={() => setShowAdd(true)} icon={<PlusIcon size={15} />}>افزودن مدرک</Button>
      </div>

      {docs.length === 0 ? (
        <EmptyState icon={<FileTextIcon size={26} />} title="هنوز مدرکی ثبت نشده"
          sub="بیمه، معاینه فنی و مدارک خودرو رو اینجا نگه دار تا همیشه دم دستت باشه"
          onAdd={() => setShowAdd(true)} btnLabel="افزودن مدرک" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {docs.map(d => {
            const days = daysUntil(d.expiryDate);
            const s    = expiryStatus(days);
            const t    = STATUS_THEME[s];
            const typeInfo = DOC_TYPES.find(tp => tp.value === d.type);
            const DocIcon = DOC_ICONS[d.type] ?? PaperclipIcon;
            return (
              <div key={d.id} style={{
                background: t.bg, borderRadius: 18, padding: '14px 16px',
                border: `1.5px solid ${t.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 13, background: 'rgba(255,255,255,0.07)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: C.text,
                    }}>
                      <DocIcon size={19} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, color: C.text, fontSize: 13, margin: 0 }}>{d.title}</p>
                      <p style={{ fontSize: 11, color: C.muted, fontWeight: 500, margin: '3px 0 0' }}>{typeInfo?.label}</p>
                    </div>
                  </div>
                  <IconButton label="حذف مدرک" onClick={() => del(d.id)} size={28}><XIcon size={13} /></IconButton>
                </div>
                {(d.issueDate || d.expiryDate) && (
                  <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                    {d.issueDate && (
                      <div>
                        <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, margin: 0 }}>تاریخ صدور</p>
                        <p style={{ fontSize: 12, fontWeight: 600, color: C.text, margin: '3px 0 0' }}>{toJalali(d.issueDate)}</p>
                      </div>
                    )}
                    {d.expiryDate && (
                      <div>
                        <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, margin: 0 }}>تاریخ انقضا</p>
                        <p style={{ fontSize: 12, fontWeight: 800, color: t.color, margin: '3px 0 0' }}>
                          {toJalali(d.expiryDate)}
                          {days !== null && (
                            <span style={{ fontSize: 10, fontWeight: 600, marginRight: 5 }}>
                              ({days < 0 ? 'منقضی' : `${days} روز`})
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {d.notes && (
                  <p style={{ fontSize: 11, color: C.muted, fontWeight: 500, marginTop: 8, lineHeight: 1.7 }}>
                    {d.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddDocModal vehicleId={vehicleId} onClose={() => setShowAdd(false)} onSaved={load} />}
    </div>
  );
}

/* ─── Reminders ────────────────────────────────────────────────── */
function RemindersTab({ vehicleId, currentMileage }: { vehicleId: string; currentMileage: number }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showAdd, setShowAdd]     = useState(false);
  const [loading, setLoading]     = useState(true);

  function load() { api.reminders.list(vehicleId).then(setReminders).finally(() => setLoading(false)); }
  useEffect(() => { load(); }, [vehicleId]);
  async function toggle(id: string) { await api.reminders.toggle(vehicleId, id); load(); }
  async function del(id: string)    { await api.reminders.remove(vehicleId, id); load(); }

  const active    = reminders.filter(r => !r.isCompleted);
  const completed = reminders.filter(r =>  r.isCompleted);

  const isOverdue = (r: Reminder) => {
    if (r.isCompleted) return false;
    if (r.dueMileage && currentMileage >= r.dueMileage) return true;
    if (r.dueDate && new Date(r.dueDate) < new Date()) return true;
    return false;
  };

  const priorityMap = {
    high:   { label: 'زیاد',  color: '#F87171', bg: 'rgba(239,68,68,0.10)' },
    medium: { label: 'متوسط', color: '#FBBF24', bg: 'rgba(245,158,11,0.10)' },
    low:    { label: 'کم',    color: '#60A5FA', bg: 'rgba(59,130,246,0.10)' },
  };

  if (loading) return <Spinner />;

  const ReminderRow = ({ r }: { r: Reminder }) => {
    const overdue = isOverdue(r);
    const p = priorityMap[r.priority as keyof typeof priorityMap] || priorityMap.medium;
    return (
      <div style={{
        background: C.surface, borderRadius: 18,
        padding: '14px 16px',
        opacity: r.isCompleted ? 0.55 : 1,
        border: overdue ? '1.5px solid rgba(239,68,68,0.25)' : `1px solid ${C.border}`,
        display: 'flex', alignItems: 'flex-start', gap: 12,
        transition: 'opacity 0.2s',
      }}>
        <button
          onClick={() => toggle(r.id)}
          aria-label={r.isCompleted ? 'علامت‌گذاری به‌عنوان انجام‌نشده' : 'علامت‌گذاری به‌عنوان انجام‌شده'}
          style={{
            width: 26, height: 26, borderRadius: '50%',
            border: `2px solid ${r.isCompleted ? C.green : '#7C8BA3'}`,
            background: r.isCompleted ? `linear-gradient(135deg, ${C.green}, ${C.greenDark})` : 'transparent',
            flexShrink: 0, marginTop: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white',
            transition: 'all 0.2s',
            boxShadow: r.isCompleted ? `0 2px 8px ${C.greenGlow}` : 'none',
          }}
        >
          {r.isCompleted && <CheckIcon size={13} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <p style={{
              fontSize: 13, fontWeight: 800, margin: 0, color: C.text,
              textDecoration: r.isCompleted ? 'line-through' : 'none',
            }}>
              {r.title}
            </p>
            <span style={{ fontSize: 10, fontWeight: 700, color: p.color, background: p.bg, padding: '1px 8px', borderRadius: 7 }}>
              {p.label}
            </span>
            {overdue && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 10, fontWeight: 700, color: '#F87171',
                background: 'rgba(239,68,68,0.10)', padding: '1px 8px', borderRadius: 7,
                border: '1px solid rgba(239,68,68,0.22)',
              }}><AlertTriangleIcon size={10} /> سررسید</span>
            )}
          </div>
          {r.description && (
            <p style={{ fontSize: 11, color: C.muted, fontWeight: 500, margin: '4px 0 0', lineHeight: 1.7 }}>
              {r.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: 14, marginTop: 7 }}>
            {r.dueMileage && (
              <span style={{ fontSize: 11, color: C.muted, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
                <PinIcon size={12} /> {r.dueMileage.toLocaleString()} km
              </span>
            )}
            {r.dueDate && (
              <span style={{ fontSize: 11, color: C.muted, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
                <CalendarIcon size={12} /> {toJalali(r.dueDate)}
              </span>
            )}
          </div>
        </div>
        <IconButton label="حذف یادآور" onClick={() => del(r.id)} size={28}><XIcon size={13} /></IconButton>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeInUp 0.35s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 2px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>
          یادآورها
          {active.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 800, color: C.green,
              background: `${C.green}15`, border: `1px solid ${C.green}30`,
              padding: '2px 9px', borderRadius: 10, marginRight: 7,
            }}>
              {active.length} فعال
            </span>
          )}
        </h2>
        <Button size="sm" onClick={() => setShowAdd(true)} icon={<PlusIcon size={15} />}>یادآور جدید</Button>
      </div>

      {active.length === 0 && completed.length === 0 ? (
        <EmptyState icon={<BellIcon size={26} />} title="هنوز یادآوری ثبت نشده"
          sub="تعویض روغن، بیمه و سرویس‌های بعدی رو یادآور کن"
          onAdd={() => setShowAdd(true)} btnLabel="ثبت یادآور" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {active.map(r => <ReminderRow key={r.id} r={r} />)}
          {completed.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0 2px', padding: '0 4px' }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  انجام شده ({completed.length})
                </span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>
              {completed.map(r => <ReminderRow key={r.id} r={r} />)}
            </>
          )}
        </div>
      )}

      {showAdd && <AddReminderModal vehicleId={vehicleId} onClose={() => setShowAdd(false)} onSaved={load} />}
    </div>
  );
}

/* ─── AI ───────────────────────────────────────────────────────── */
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

  const suggestions = [
    'کِی باید روغن موتور عوض کنم؟',
    'وضعیت کلی ماشینم چطوره؟',
    'آخرین سرویس چه بود؟',
    'هزینه تعمیرات من چقدره؟',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 500, animation: 'fadeInUp 0.35s ease both' }}>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 12 }}>
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 18 }}>
            <div style={{
              width: 74, height: 74, borderRadius: '50%',
              background: `linear-gradient(135deg, ${C.green} 0%, ${C.blue} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white',
              boxShadow: `0 12px 36px ${C.greenGlow}`,
              animation: 'float 3s ease-in-out infinite',
            }}><SparklesIcon size={32} /></div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 900, color: C.text, fontSize: 17, margin: '0 0 6px' }}>
                دستیار هوشمند خودرو
              </p>
              <p style={{ color: C.muted, fontSize: 13, fontWeight: 500 }}>
                هر سوالی درباره ماشینت داری بپرس
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 340 }}>
              {suggestions.map(s => (
                <button key={s} onClick={() => setInput(s)} style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  padding: '11px 16px',
                  textAlign: 'right',
                  fontSize: 12.5, fontWeight: 500,
                  color: C.muted,
                  fontFamily: 'Vazirmatn, sans-serif',
                }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-start' : 'flex-end' }}>
              <div style={{
                maxWidth: '86%',
                borderRadius: m.role === 'user' ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                padding: '12px 16px', fontSize: 13, fontWeight: 500, lineHeight: 1.8,
                background: m.role === 'user' ? `${C.green}18` : C.surface,
                border: `1px solid ${m.role === 'user' ? C.green + '25' : C.border}`,
                color: C.text,
                animation: 'fadeInUp 0.2s ease both',
              }}>
                {m.text}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: '18px 18px 4px 18px',
              padding: '14px 18px',
              display: 'flex', gap: 5, alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: C.green,
                  display: 'inline-block',
                  animation: 'bounce 1s infinite',
                  animationDelay: `${i * 0.18}s`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="سوالت رو بنویس..."
          style={{ borderRadius: 16 }}
        />
        <Button onClick={send} disabled={!input.trim()} loading={loading} style={{ flexShrink: 0 }}>
          ارسال
        </Button>
      </div>
    </div>
  );
}

/* ─── Modals ───────────────────────────────────────────────────── */
function AddServiceModal({ vehicleId, record, onClose, onSaved }: { vehicleId: string; record?: ServiceRecord | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!record;
  const [f, setF] = useState({
    serviceType: record?.serviceType || SERVICE_TYPES[0],
    serviceDate: record?.serviceDate || today(),
    mileage: record?.mileage ? String(record.mileage) : '',
    description: record?.description || '',
    cost: record?.cost ? String(record.cost) : '',
    workshop: record?.workshop || '',
    nextServiceMileage: record?.nextServiceMileage ? String(record.nextServiceMileage) : '',
    nextServiceDate: record?.nextServiceDate || '',
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const payload = {
      serviceType: f.serviceType, serviceDate: f.serviceDate, mileage: n(f.mileage),
      cost: n(f.cost), nextServiceMileage: n(f.nextServiceMileage),
      description: f.description || undefined, workshop: f.workshop || undefined,
      nextServiceDate: f.nextServiceDate || undefined,
    };
    if (isEdit) {
      await api.records.update(vehicleId, record!.id, payload);
    } else {
      await api.records.create(vehicleId, payload);
    }
    onSaved(); onClose();
  }

  return (
    <Sheet title={isEdit ? 'ویرایش سرویس' : 'ثبت سرویس جدید'} icon={<WrenchIcon size={17} />} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormField label="نوع سرویس">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {SERVICE_TYPES.map(type => {
              const meta     = svcMeta(type);
              const Icon     = meta.icon;
              const selected = f.serviceType === type;
              return (
                <button
                  key={type} type="button" onClick={() => set('serviceType', type)}
                  style={{
                    background: selected ? `${meta.color}1F` : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${selected ? meta.color : 'transparent'}`,
                    borderRadius: 14, padding: '10px 6px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    color: selected ? meta.color : C.muted,
                  }}
                >
                  <Icon size={20} />
                  <span style={{
                    fontSize: 10, textAlign: 'center', lineHeight: 1.4,
                    fontWeight: selected ? 800 : 500,
                    color: selected ? meta.color : C.muted,
                    fontFamily: 'Vazirmatn, sans-serif',
                  }}>{type}</span>
                </button>
              );
            })}
          </div>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="هزینه (تومان)">
            <Input value={f.cost} onChange={e => set('cost', e.target.value)} type="number" />
          </FormField>
          <FormField label="تعمیرگاه">
            <Input value={f.workshop} onChange={e => set('workshop', e.target.value)} />
          </FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="سرویس بعدی (km)">
            <Input value={f.nextServiceMileage} onChange={e => set('nextServiceMileage', e.target.value)} type="number" />
          </FormField>
          <FormField label="تاریخ سرویس بعدی">
            <PersianDatePicker value={f.nextServiceDate} onChange={v => set('nextServiceDate', v)} />
          </FormField>
        </div>
        <Button type="submit" loading={loading} fullWidth size="lg" icon={<CheckIcon size={16} />}>
          {isEdit ? 'ذخیره تغییرات' : 'ثبت سرویس'}
        </Button>
      </form>
    </Sheet>
  );
}

function AddFuelModal({ vehicleId, onClose, onSaved }: { vehicleId: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ date: today(), liters: '', cost: '', mileage: '', isFullTank: true, station: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string | boolean) => setF(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    await api.fuel.create(vehicleId, {
      date: f.date, liters: Number(f.liters), cost: n(f.cost),
      mileage: n(f.mileage) || 0, isFullTank: f.isFullTank,
      station: f.station || undefined, notes: f.notes || undefined,
    });
    onSaved(); onClose();
  }

  return (
    <Sheet title="ثبت سوخت" icon={<FuelIcon size={17} />} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="تاریخ">
            <PersianDatePicker value={f.date} onChange={v => set('date', v)} />
          </FormField>
          <FormField label="لیتر">
            <Input value={f.liters} onChange={e => set('liters', e.target.value)} type="number" step="0.1" required />
          </FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="هزینه (تومان)">
            <Input value={f.cost} onChange={e => set('cost', e.target.value)} type="number" />
          </FormField>
          <FormField label="کارکرد (km)">
            <Input value={f.mileage} onChange={e => set('mileage', e.target.value)} type="number" />
          </FormField>
        </div>
        <FormField label="جایگاه سوخت">
          <Input value={f.station} onChange={e => set('station', e.target.value)} placeholder="اختیاری" />
        </FormField>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer', padding: '12px 14px',
          background: 'rgba(255,255,255,0.04)', borderRadius: 14,
          border: `1px solid ${C.border}`,
        }}>
          <input
            type="checkbox" checked={f.isFullTank}
            onChange={e => set('isFullTank', e.target.checked)}
            style={{ width: 17, height: 17, accentColor: C.green }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>باک کامل پر شد</span>
        </label>
        <Button type="submit" loading={loading} fullWidth size="lg" icon={<CheckIcon size={16} />}>ثبت سوخت</Button>
      </form>
    </Sheet>
  );
}

function AddDocModal({ vehicleId, onClose, onSaved }: { vehicleId: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ type: 'insurance', title: '', issueDate: '', expiryDate: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    await api.documents.create(vehicleId, {
      type: f.type as any, title: f.title,
      issueDate: f.issueDate || undefined, expiryDate: f.expiryDate || undefined,
      notes: f.notes || undefined,
    });
    onSaved(); onClose();
  }

  return (
    <Sheet title="افزودن مدرک" icon={<FileTextIcon size={17} />} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormField label="نوع مدرک">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 9 }}>
            {DOC_TYPES.map(t => {
              const DocIcon = DOC_ICONS[t.value] ?? PaperclipIcon;
              const selected = f.type === t.value;
              return (
                <button key={t.value} type="button" onClick={() => set('type', t.value)} style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px',
                  borderRadius: 14,
                  border: `2px solid ${selected ? C.green : 'transparent'}`,
                  background: selected ? `${C.green}1F` : 'rgba(255,255,255,0.04)',
                  color: selected ? C.text : C.muted,
                  fontSize: 12.5, fontWeight: selected ? 700 : 500,
                  fontFamily: 'Vazirmatn, sans-serif',
                }}>
                  <DocIcon size={17} /> {t.label}
                </button>
              );
            })}
          </div>
        </FormField>
        <FormField label="عنوان">
          <Input value={f.title} onChange={e => set('title', e.target.value)} placeholder="مثلاً: بیمه ایران" required />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="تاریخ صدور">
            <PersianDatePicker value={f.issueDate} onChange={v => set('issueDate', v)} />
          </FormField>
          <FormField label="تاریخ انقضا">
            <PersianDatePicker value={f.expiryDate} onChange={v => set('expiryDate', v)} />
          </FormField>
        </div>
        <FormField label="یادداشت">
          <Input value={f.notes} onChange={e => set('notes', e.target.value)} />
        </FormField>
        <Button type="submit" loading={loading} fullWidth size="lg" icon={<CheckIcon size={16} />}>ثبت مدرک</Button>
      </form>
    </Sheet>
  );
}

function AddReminderModal({ vehicleId, onClose, onSaved }: { vehicleId: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ title: '', description: '', dueMileage: '', dueDate: '', priority: 'medium' });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    await api.reminders.create(vehicleId, {
      title: f.title, description: f.description || undefined,
      dueMileage: n(f.dueMileage), dueDate: f.dueDate || undefined, priority: f.priority,
    });
    onSaved(); onClose();
  }

  const priorities = [
    { v: 'low',    l: 'کم',    color: '#60A5FA' },
    { v: 'medium', l: 'متوسط', color: '#FBBF24' },
    { v: 'high',   l: 'زیاد',  color: '#F87171' },
  ];

  return (
    <Sheet title="یادآور جدید" icon={<BellIcon size={17} />} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormField label="عنوان">
          <Input value={f.title} onChange={e => set('title', e.target.value)} placeholder="مثلاً: تعویض روغن" required />
        </FormField>
        <FormField label="توضیحات">
          <Input value={f.description} onChange={e => set('description', e.target.value)} />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="کارکرد موعد (km)">
            <Input value={f.dueMileage} onChange={e => set('dueMileage', e.target.value)} type="number" />
          </FormField>
          <FormField label="تاریخ موعد">
            <PersianDatePicker value={f.dueDate} onChange={v => set('dueDate', v)} />
          </FormField>
        </div>
        <FormField label="اولویت">
          <div style={{ display: 'flex', gap: 8 }}>
            {priorities.map(p => (
              <button key={p.v} type="button" onClick={() => set('priority', p.v)} style={{
                flex: 1, padding: '11px 8px', borderRadius: 14,
                border: `2px solid ${f.priority === p.v ? p.color : 'transparent'}`,
                background: f.priority === p.v ? `${p.color}1F` : C.surface2,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              }}>
                <CircleIcon size={16} color={p.color} />
                <span style={{
                  fontSize: 11, fontWeight: f.priority === p.v ? 800 : 500,
                  color: f.priority === p.v ? p.color : C.muted,
                  fontFamily: 'Vazirmatn, sans-serif',
                }}>{p.l}</span>
              </button>
            ))}
          </div>
        </FormField>
        <Button type="submit" loading={loading} fullWidth size="lg" icon={<CheckIcon size={16} />}>ثبت یادآور</Button>
      </form>
    </Sheet>
  );
}

function today() { return new Date().toISOString().slice(0, 10); }
function n(v: string): number | undefined { return v ? Number(v) : undefined; }

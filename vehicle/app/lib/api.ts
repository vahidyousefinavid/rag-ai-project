const BASE = '/api';

function token() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('vtoken') || '';
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    register: (d: RegisterInput) => req<AuthRes>('POST', '/auth/register', d),
    login:    (phone: string)    => req<AuthRes>('POST', '/auth/login', { phone }),
  },
  vehicles: {
    list:   ()                               => req<Vehicle[]>('GET', '/vehicles'),
    get:    (id: string)                     => req<Vehicle>('GET', `/vehicles/${id}`),
    create: (d: Partial<Vehicle>)            => req<Vehicle>('POST', '/vehicles', d),
    update: (id: string, d: Partial<Vehicle>) => req<Vehicle>('PATCH', `/vehicles/${id}`, d),
    remove: (id: string)                     => req<void>('DELETE', `/vehicles/${id}`),
  },
  records: {
    list:   (vid: string)                            => req<ServiceRecord[]>('GET', `/vehicles/${vid}/records`),
    create: (vid: string, d: Partial<ServiceRecord>) => req<ServiceRecord>('POST', `/vehicles/${vid}/records`, d),
    remove: (vid: string, id: string)                => req<void>('DELETE', `/vehicles/${vid}/records/${id}`),
  },
  fuel: {
    list:   (vid: string)                         => req<FuelLog[]>('GET', `/vehicles/${vid}/fuel`),
    stats:  (vid: string)                         => req<FuelStats>('GET', `/vehicles/${vid}/fuel/stats`),
    create: (vid: string, d: Partial<FuelLog>)    => req<FuelLog>('POST', `/vehicles/${vid}/fuel`, d),
    remove: (vid: string, id: string)             => req<void>('DELETE', `/vehicles/${vid}/fuel/${id}`),
  },
  documents: {
    list:   (vid: string)                                    => req<VehicleDoc[]>('GET', `/vehicles/${vid}/documents`),
    create: (vid: string, d: Partial<VehicleDoc>)            => req<VehicleDoc>('POST', `/vehicles/${vid}/documents`, d),
    update: (vid: string, id: string, d: Partial<VehicleDoc>) => req<VehicleDoc>('PATCH', `/vehicles/${vid}/documents/${id}`, d),
    remove: (vid: string, id: string)                        => req<void>('DELETE', `/vehicles/${vid}/documents/${id}`),
  },
  reminders: {
    list:   (vid: string)                       => req<Reminder[]>('GET', `/vehicles/${vid}/reminders`),
    create: (vid: string, d: Partial<Reminder>) => req<Reminder>('POST', `/vehicles/${vid}/reminders`, d),
    toggle: (vid: string, id: string)           => req<Reminder>('PATCH', `/vehicles/${vid}/reminders/${id}/toggle`, {}),
    remove: (vid: string, id: string)           => req<void>('DELETE', `/vehicles/${vid}/reminders/${id}`),
  },
  ai: {
    ask: (vid: string, question: string) => req<{ answer: string }>('POST', `/vehicles/${vid}/ask`, { question }),
  },
  access: {
    list:   (vid: string)             => req<VehicleAccessEntry[]>('GET', `/vehicles/${vid}/access`),
    revoke: (vid: string, id: string) => req<void>('DELETE', `/vehicles/${vid}/access/${id}`),
  },
  invites: {
    create: (vid: string)     => req<Invite>('POST', `/vehicles/${vid}/invites`),
    redeem: (code: string)    => req<{ vehicleId: string; make: string; model: string }>('POST', '/invites/redeem', { code }),
  },
  invoices: {
    upsert: (vid: string, recordId: string, d: UpsertInvoiceInput) =>
      req<Invoice>('POST', `/vehicles/${vid}/records/${recordId}/invoice`, d),
    get:    (vid: string, recordId: string) => req<Invoice>('GET', `/vehicles/${vid}/records/${recordId}/invoice`),
    remove: (vid: string, recordId: string) => req<void>('DELETE', `/vehicles/${vid}/records/${recordId}/invoice`),
  },
  mechanic: {
    listVehicles: ()               => req<MechanicVehicle[]>('GET', '/mechanic/vehicles'),
    getVehicle:   (id: string)     => req<MechanicVehicleDetail>('GET', `/mechanic/vehicles/${id}`),
  },
};

export type Role = 'owner' | 'mechanic';

export interface RegisterInput {
  phone: string; name: string; role?: Role; workshopName?: string; workshopAddress?: string;
}

export interface AuthRes { access_token: string; user: User }
export interface User {
  id: string; phone: string; name: string; role: Role;
  workshopName?: string | null; workshopAddress?: string | null;
}

export interface Vehicle {
  id: string; make: string; model: string; year: number;
  plateNumber?: string; vin?: string; color?: string; currentMileage: number; notes?: string;
  fuelType?: string; engineCapacity?: string; transmission?: string;
  insuranceExpiry?: string; technicalExpiry?: string; registrationExpiry?: string;
  createdAt: string; serviceRecords?: ServiceRecord[];
}

export interface InvoiceSummary {
  subtotal: number; total: number; paidAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid'; itemCount: number;
}

export interface ServiceRecord {
  id: string; vehicleId: string; serviceType: string; serviceDate: string;
  mileage: number; description?: string; cost?: number; workshop?: string;
  nextServiceMileage?: number; nextServiceDate?: string; createdAt: string;
  createdByUserId?: string | null; createdByRole?: Role | null; createdByName?: string;
  invoice?: InvoiceSummary;
}

export interface InvoiceItem { id?: string; type: 'part' | 'labor'; name: string; quantity: number; unitPrice: number }
export interface UpsertInvoiceInput { discount?: number; paidAmount?: number; notes?: string; items: InvoiceItem[] }
export interface Invoice {
  id: string; serviceRecordId: string; createdByUserId?: string; discount: number; paidAmount: number;
  notes?: string; createdAt: string; items: InvoiceItem[]; subtotal: number; total: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
}

export interface Invite { id: string; code: string; expiresAt: string; vehicleId: string }
export interface VehicleAccessEntry {
  id: string; workshopName?: string; workshopAddress?: string; mechanicPhone?: string; grantedAt: string;
}

export interface MechanicVehicle {
  accessId: string; vehicleId: string; make: string; model: string; year: number;
  plateNumber?: string; currentMileage: number; ownerName?: string; grantedAt: string;
}
export interface MechanicVehicleDetail {
  id: string; make: string; model: string; year: number; plateNumber?: string; color?: string;
  currentMileage: number; fuelType?: string; engineCapacity?: string; transmission?: string;
  ownerName?: string; serviceRecords: ServiceRecord[];
}

export interface FuelLog {
  id: string; vehicleId: string; date: string; liters: number;
  cost?: number; mileage: number; isFullTank: boolean; station?: string; notes?: string; createdAt: string;
}
export interface FuelStats { avgConsumption: number | null; totalCost: number; totalLiters: number }

export interface VehicleDoc {
  id: string; vehicleId: string; type: string; title: string;
  issueDate?: string; expiryDate?: string; notes?: string; createdAt: string;
}

export interface Reminder {
  id: string; vehicleId: string; title: string; description?: string;
  dueMileage?: number; dueDate?: string; isCompleted: boolean; priority: string; createdAt: string;
}

export const SERVICE_TYPES = [
  'تعویض روغن موتور', 'تعویض لاستیک', 'تعمیر ترمز', 'تعویض فیلتر هوا',
  'تعویض شمع', 'سرویس گیربکس', 'تعویض تایمینگ', 'تعویض باتری',
  'تنظیم موتور', 'سرویس کولر', 'صافکاری و رنگ', 'سرویس جلوبندی', 'سایر',
];

export const DOC_TYPES = [
  { value: 'insurance',    label: 'بیمه شخص ثالث', icon: '🛡️' },
  { value: 'technical',    label: 'معاینه فنی',    icon: '🔍' },
  { value: 'registration', label: 'کارت خودرو',    icon: '📄' },
  { value: 'warranty',     label: 'ضمانت‌نامه',    icon: '✅' },
  { value: 'other',        label: 'سایر',           icon: '📎' },
];

export const FUEL_TYPES = ['بنزین', 'گازوئیل', 'گاز (CNG)', 'دوگانه‌سوز', 'هیبرید', 'برقی'];
export const COLORS     = ['سفید', 'مشکی', 'نقره‌ای', 'خاکستری', 'قرمز', 'آبی', 'سبز', 'زرد', 'سرمه‌ای'];
export const COLORS_HEX: Record<string, string> = {
  سفید: '#f4f4f5', مشکی: '#27272a', 'نقره‌ای': '#a1a1aa', خاکستری: '#6b7280',
  قرمز: '#ef4444', آبی: '#3b82f6', سبز: '#22c55e', زرد: '#eab308', 'سرمه‌ای': '#1e3a5f',
};

export function toJalali(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T12:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export function expiryStatus(days: number | null): 'ok' | 'warn' | 'danger' | 'expired' {
  if (days === null) return 'ok';
  if (days < 0)  return 'expired';
  if (days < 14) return 'danger';
  if (days < 30) return 'warn';
  return 'ok';
}

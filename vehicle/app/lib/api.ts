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

async function reqForm<T>(method: string, path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function productForm(d: Partial<UpsertProductInput>) {
  const form = new FormData();
  if (d.name !== undefined) form.set('name', d.name);
  if (d.category !== undefined) form.set('category', d.category);
  if (d.description !== undefined) form.set('description', d.description);
  if (d.price !== undefined) form.set('price', String(d.price));
  if (d.stock !== undefined) form.set('stock', String(d.stock));
  if (d.unit !== undefined) form.set('unit', d.unit);
  if (d.image) form.set('image', d.image);
  return form;
}

export const api = {
  auth: {
    requestOtp: (phone: string)              => req<{ sent: boolean }>('POST', '/auth/otp/request', { phone }),
    register:   (d: RegisterInput)           => req<AuthRes>('POST', '/auth/register', d),
    login:      (phone: string, code: string) => req<AuthRes>('POST', '/auth/login', { phone, code }),
    updateProfile: (d: { workshopName?: string; workshopAddress?: string; workshopLat?: number; workshopLng?: number }) =>
      req<User>('PATCH', '/auth/me', d),
  },
  vehicles: {
    list:   ()                               => req<Vehicle[]>('GET', '/vehicles'),
    get:    (id: string)                     => req<Vehicle>('GET', `/vehicles/${id}`),
    create: (d: Partial<Vehicle>)            => req<Vehicle>('POST', '/vehicles', d),
    update: (id: string, d: Partial<Vehicle>) => req<Vehicle>('PATCH', `/vehicles/${id}`, d),
    remove: (id: string)                     => req<void>('DELETE', `/vehicles/${id}`),
  },
  records: {
    list:   (vid: string)                                => req<ServiceRecord[]>('GET', `/vehicles/${vid}/records`),
    create: (vid: string, d: Partial<ServiceRecord>)     => req<ServiceRecord>('POST', `/vehicles/${vid}/records`, d),
    update: (vid: string, id: string, d: Partial<ServiceRecord>) => req<ServiceRecord>('PATCH', `/vehicles/${vid}/records/${id}`, d),
    remove: (vid: string, id: string)                    => req<void>('DELETE', `/vehicles/${vid}/records/${id}`),
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
    listVehicles: ()                              => req<MechanicVehicle[]>('GET', '/mechanic/vehicles'),
    getVehicle:   (id: string)                    => req<MechanicVehicleDetail>('GET', `/mechanic/vehicles/${id}`),
    createVehicle: (d: CreateMechanicVehicleInput) => req<MechanicVehicleDetail>('POST', '/mechanic/vehicles', d),
  },
  notifications: {
    list:         ()                 => req<AppNotification[]>('GET', '/notifications'),
    unreadCount:  ()                 => req<{ count: number }>('GET', '/notifications/unread-count'),
    markRead:     (id: string)       => req<AppNotification>('POST', `/notifications/${id}/read`, {}),
    confirm:      (id: string)       => req<AppNotification>('POST', `/notifications/${id}/confirm`, {}),
    reject:       (id: string)       => req<AppNotification>('POST', `/notifications/${id}/reject`, {}),
  },
  reviews: {
    list:    (mechanicId: string)                        => req<MechanicReview[]>('GET', `/mechanics/${mechanicId}/reviews`),
    summary: (mechanicId: string)                        => req<RatingSummary>('GET', `/mechanics/${mechanicId}/reviews/summary`),
    mine:    (mechanicId: string)                         => req<MechanicReview | null>('GET', `/mechanics/${mechanicId}/reviews/mine`),
    upsert:  (mechanicId: string, d: { rating: number; comment?: string }) => req<MechanicReview>('POST', `/mechanics/${mechanicId}/reviews`, d),
  },
  workshops: {
    search: (params: { lat?: number; lng?: number; q?: string; serviceType?: string; mode?: ServiceMode }) => {
      const qs = new URLSearchParams();
      if (params.lat !== undefined) qs.set('lat', String(params.lat));
      if (params.lng !== undefined) qs.set('lng', String(params.lng));
      if (params.q) qs.set('q', params.q);
      if (params.serviceType) qs.set('serviceType', params.serviceType);
      if (params.mode) qs.set('mode', params.mode);
      const query = qs.toString();
      return req<Workshop[]>('GET', `/workshops${query ? `?${query}` : ''}`);
    },
    detail: (id: string) => req<WorkshopDetail>('GET', `/workshops/${id}`),
  },
  mechanicServices: {
    list:   ()                              => req<MechanicServiceOffering[]>('GET', '/mechanic/services'),
    create: (d: UpsertMechanicServiceInput) => req<MechanicServiceOffering>('POST', '/mechanic/services', d),
    update: (id: string, d: Partial<UpsertMechanicServiceInput>) => req<MechanicServiceOffering>('PATCH', `/mechanic/services/${id}`, d),
    remove: (id: string)                    => req<void>('DELETE', `/mechanic/services/${id}`),
  },
  appointments: {
    mine:    ()                                  => req<Appointment[]>('GET', '/appointments/mine'),
    create:  (d: CreateAppointmentInput)         => req<Appointment>('POST', '/appointments', d),
    respond: (id: string, status: 'confirmed' | 'rejected') => req<Appointment>('POST', `/appointments/${id}/respond`, { status }),
    complete:(id: string)                        => req<Appointment>('POST', `/appointments/${id}/complete`, {}),
    cancel:  (id: string)                        => req<Appointment>('POST', `/appointments/${id}/cancel`, {}),
  },
  messages: {
    listAsOwner:    (vid: string, mechanicId: string) => req<ChatMessage[]>('GET', `/vehicles/${vid}/messages?mechanicId=${mechanicId}`),
    sendAsOwner:    (vid: string, mechanicId: string, body: string) => req<ChatMessage>('POST', `/vehicles/${vid}/messages`, { mechanicId, body }),
    listAsMechanic: (vid: string) => req<ChatMessage[]>('GET', `/mechanic/vehicles/${vid}/messages`),
    sendAsMechanic: (vid: string, body: string) => req<ChatMessage>('POST', `/mechanic/vehicles/${vid}/messages`, { body }),
    unreadCount:    () => req<{ count: number }>('GET', '/messages/unread-count'),
    conversations:  () => req<Conversation[]>('GET', '/messages/conversations'),
  },
  push: {
    vapidKey:   () => req<{ key: string }>('GET', '/push/vapid-public-key'),
    subscribe:  (sub: PushSubscriptionJSON) => req<{ ok: boolean }>('POST', '/push/subscribe', sub),
    unsubscribe:(endpoint: string) => req<{ ok: boolean }>('DELETE', '/push/subscribe', { endpoint }),
  },
  parts: {
    list:   (q?: string) => req<Part[]>('GET', `/mechanic/parts${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    create: (d: Partial<Part>) => req<Part>('POST', '/mechanic/parts', d),
    update: (id: string, d: Partial<Part>) => req<Part>('PATCH', `/mechanic/parts/${id}`, d),
    remove: (id: string) => req<void>('DELETE', `/mechanic/parts/${id}`),
  },
  organizations: {
    mine:           ()                            => req<OrganizationSummary[]>('GET', '/organizations/mine'),
    create:         (name: string)                => req<OrganizationSummary>('POST', '/organizations', { name }),
    members:        (id: string)                  => req<OrgMember[]>('GET', `/organizations/${id}/members`),
    addMember:      (id: string, phone: string, role?: 'admin' | 'driver') => req<OrgMember>('POST', `/organizations/${id}/members`, { phone, role }),
    removeMember:   (id: string, userId: string)  => req<void>('DELETE', `/organizations/${id}/members/${userId}`),
    vehicles:       (id: string)                  => req<Vehicle[]>('GET', `/organizations/${id}/vehicles`),
    assignVehicle:  (id: string, vehicleId: string)   => req<Vehicle>('POST', `/organizations/${id}/vehicles/${vehicleId}`),
    unassignVehicle:(id: string, vehicleId: string)   => req<void>('DELETE', `/organizations/${id}/vehicles/${vehicleId}`),
  },
  payments: {
    pay: (vid: string, recordId: string) => req<{ paymentUrl: string }>('POST', `/vehicles/${vid}/records/${recordId}/invoice/pay`, {}),
  },
  geocode: {
    reverse: (lat: number, lng: number) => req<{ address: string | null }>('GET', `/geocode/reverse?lat=${lat}&lng=${lng}`),
  },
  products: {
    list:      (q?: string) => req<Product[]>('GET', `/seller/products${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    create:    (d: UpsertProductInput) => reqForm<Product>('POST', '/seller/products', productForm(d)),
    update:    (id: string, d: Partial<UpsertProductInput>) => reqForm<Product>('PATCH', `/seller/products/${id}`, productForm(d)),
    setActive: (id: string, active: boolean) => req<Product>('PATCH', `/seller/products/${id}/active`, { active }),
    remove:    (id: string) => req<void>('DELETE', `/seller/products/${id}`),
  },
};

export function productImageUrl(path?: string | null): string | undefined {
  return path ? `${BASE}${path}` : undefined;
}

export async function downloadPdf(path: string, filename: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token()}` } });
  if (!res.ok) throw new Error('دانلود فایل با خطا مواجه شد');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export type Role = 'owner' | 'mechanic' | 'seller';

export interface RegisterInput {
  phone: string; code: string; name: string; role?: Role; workshopName?: string; workshopAddress?: string;
}

export interface Product {
  id: string; name: string; category?: string; description?: string;
  price: number; stock: number; unit: string; imageUrl?: string; active: boolean; createdAt: string;
}
export interface UpsertProductInput {
  name: string; category?: string; description?: string; price: number; stock?: number; unit?: string; image?: File;
}

export interface AuthRes { access_token: string; user: User }
export interface User {
  id: string; phone: string; name: string; role: Role;
  workshopName?: string | null; workshopAddress?: string | null;
  workshopLat?: number | null; workshopLng?: number | null;
}

export interface MechanicReview { id: string; rating: number; comment?: string; createdAt: string; ownerName?: string }
export interface RatingSummary { avg: number; count: number }

export interface Workshop {
  id: string; workshopName?: string; workshopAddress?: string;
  workshopLat?: number | null; workshopLng?: number | null;
  rating: number; reviewCount: number; distanceKm?: number | null;
}
export interface WorkshopDetail extends Workshop {
  services: MechanicServiceOffering[];
}

export type ServiceMode = 'in_shop' | 'on_site';
export interface MechanicServiceOffering {
  id: string; serviceType: string; customName?: string; price?: number;
  supportsInShop: boolean; supportsOnSite: boolean; createdAt: string;
}
export interface UpsertMechanicServiceInput {
  serviceType: string; customName?: string; price?: number;
  supportsInShop?: boolean; supportsOnSite?: boolean;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';
export interface Appointment {
  id: string; vehicleId: string; ownerId: string; mechanicId: string;
  requestedAt: string; serviceType?: string; notes?: string; status: AppointmentStatus; createdAt: string;
  mode: ServiceMode; address?: string; lat?: number; lng?: number;
  vehicle?: { make: string; model: string; year: number; plateNumber?: string };
  mechanic?: { name: string; workshopName?: string; phone: string };
  owner?: { name: string; phone: string };
}
export interface CreateAppointmentInput {
  vehicleId: string; mechanicId: string; requestedAt: string; serviceType?: string; notes?: string;
  mode?: ServiceMode; address?: string; lat?: number; lng?: number;
}

export interface ChatMessage {
  id: string; vehicleId: string; mechanicId: string; senderId: string;
  senderRole: 'owner' | 'mechanic'; body: string; read: boolean; createdAt: string;
}

export interface Conversation {
  vehicleId: string; mechanicId: string;
  vehicle: { make: string; model: string; year: number; plateNumber?: string };
  counterpartName: string;
  lastMessage?: string; lastMessageAt?: string;
  unreadCount: number;
}

export interface PushSubscriptionJSON { endpoint: string; keys: { p256dh: string; auth: string } }

export interface Part { id: string; name: string; category?: string; sku?: string; unit: string; unitPrice: number; quantity: number; inStock: boolean; createdAt: string }

export interface OrganizationSummary { id: string; name: string; role: 'admin' | 'driver'; createdAt: string }
export interface OrgMember { id: string; userId: string; name: string; phone: string; role: 'admin' | 'driver' }

export type LinkStatus = 'none' | 'pending' | 'rejected';

export interface Vehicle {
  id: string; make: string; model: string; year: number;
  plateNumber?: string; vin?: string; color?: string; currentMileage: number; notes?: string;
  fuelType?: string; engineCapacity?: string; transmission?: string;
  insuranceExpiry?: string; technicalExpiry?: string; registrationExpiry?: string;
  createdAt: string; serviceRecords?: ServiceRecord[];
  linkStatus?: LinkStatus; customerName?: string;
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
  id: string; mechanicId: string; workshopName?: string; workshopAddress?: string; mechanicPhone?: string; grantedAt: string;
}

export interface MechanicVehicle {
  accessId: string; vehicleId: string; make: string; model: string; year: number;
  plateNumber?: string; currentMileage: number; ownerName?: string; grantedAt: string;
  linkStatus?: LinkStatus; customerName?: string;
}
export interface MechanicVehicleDetail {
  id: string; make: string; model: string; year: number; plateNumber?: string; color?: string;
  currentMileage: number; fuelType?: string; engineCapacity?: string; transmission?: string;
  ownerName?: string; serviceRecords: ServiceRecord[];
  linkStatus?: LinkStatus; customerName?: string;
}
export interface CreateMechanicVehicleInput {
  make: string; model: string; year: number;
  plateNumber?: string; customerName?: string; color?: string; currentMileage?: number; notes?: string;
}

export interface AppNotification {
  id: string; type: string; status: 'pending' | 'confirmed' | 'rejected';
  title: string; body: string; read: boolean; createdAt: string;
  data?: { mechanicVehicleId: string; realVehicleId: string; mechanicId: string; workshopName?: string; plateNumber?: string } | null;
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

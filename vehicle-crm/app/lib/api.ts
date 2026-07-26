const BASE = '/api';

function token() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('crm_token') || '';
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

export interface AdminUser { id: string; phone: string; name: string; role: 'admin' }
export interface AuthRes { access_token: string; user: AdminUser }

export interface Paginated<T> { total: number; page: number; pageSize: number; items: T[] }

export interface UserSummary {
  id: string; phone: string; name: string; role: 'owner' | 'mechanic' | 'admin' | 'seller'; active: boolean;
  workshopName?: string; workshopAddress?: string; createdAt: string;
}
export interface UserDetail extends UserSummary {
  vehicles?: { id: string; make: string; model: string; year: number; plateNumber?: string; currentMileage: number }[];
  connectedVehicles?: number;
  reviewCount?: number;
  avgRating?: number;
  productCount?: number;
  activeProductCount?: number;
}

export interface ProductRow {
  id: string; name: string; category?: string; price: number; stock: number; unit: string;
  imageUrl?: string; active: boolean; createdAt: string; sellerName?: string; sellerPhone?: string;
}

export interface VehicleSummary {
  id: string; make: string; model: string; year: number; plateNumber?: string;
  currentMileage: number; createdAt: string; ownerName?: string; ownerPhone?: string;
}

export interface AppointmentSummary {
  id: string; requestedAt: string; serviceType?: string; status: string; mode: string; address?: string;
  createdAt: string; vehicle: { make: string; model: string; plateNumber?: string } | null;
  ownerName?: string; ownerPhone?: string; mechanicName?: string;
}

export interface PaymentRow { id: string; amount: number; status: string; refId?: string; createdAt: string }
export interface PaymentSummary { totalRevenue: number; successCount: number; byStatus: { status: string; count: number; total: number }[] }

export interface ReviewRow { id: string; rating: number; comment?: string; createdAt: string; mechanicName?: string; ownerName?: string }

export interface OrganizationRow { id: string; name: string; createdAt: string; ownerName?: string; memberCount: number; vehicleCount: number }

export interface DashboardStats {
  owners: number; mechanics: number; activeOwners: number; activeMechanics: number;
  sellers: number; activeSellers: number;
  vehicleCount: number; organizationCount: number; productCount: number;
  appointmentsByStatus: Record<string, number>;
  totalRevenue: number; reviewCount: number; avgRating: number;
}

function qs(params: Record<string, string | number | undefined>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') s.set(k, String(v));
  }
  const str = s.toString();
  return str ? `?${str}` : '';
}

export const api = {
  auth: {
    login: (phone: string, password: string) => req<AuthRes>('POST', '/auth/login', { phone, password }),
    me: () => req<AdminUser>('GET', '/auth/me'),
  },
  dashboard: {
    stats: () => req<DashboardStats>('GET', '/dashboard/stats'),
  },
  users: {
    list: (params: { role?: 'owner' | 'mechanic' | 'seller'; q?: string; page?: number; pageSize?: number }) =>
      req<Paginated<UserSummary>>('GET', `/users${qs(params)}`),
    detail: (id: string) => req<UserDetail>('GET', `/users/${id}`),
    update: (id: string, dto: { name?: string; workshopName?: string; workshopAddress?: string }) =>
      req<UserSummary>('PATCH', `/users/${id}`, dto),
    setActive: (id: string, active: boolean) => req<UserSummary>('PATCH', `/users/${id}/active`, { active }),
  },
  vehicles: {
    list: (params: { q?: string; ownerId?: string; page?: number; pageSize?: number }) =>
      req<Paginated<VehicleSummary>>('GET', `/vehicles${qs(params)}`),
    detail: (id: string) => req<any>('GET', `/vehicles/${id}`),
  },
  appointments: {
    list: (params: { status?: string; page?: number; pageSize?: number }) =>
      req<Paginated<AppointmentSummary>>('GET', `/appointments${qs(params)}`),
  },
  payments: {
    list: (params: { status?: string; page?: number; pageSize?: number }) =>
      req<Paginated<PaymentRow>>('GET', `/payments${qs(params)}`),
    summary: () => req<PaymentSummary>('GET', '/payments/summary'),
  },
  reviews: {
    list: (params: { page?: number; pageSize?: number }) => req<Paginated<ReviewRow>>('GET', `/reviews${qs(params)}`),
    remove: (id: string) => req<void>('DELETE', `/reviews/${id}`),
  },
  organizations: {
    list: (params: { page?: number; pageSize?: number }) => req<Paginated<OrganizationRow>>('GET', `/organizations${qs(params)}`),
  },
  products: {
    list: (params: { q?: string; sellerId?: string; page?: number; pageSize?: number }) =>
      req<Paginated<ProductRow>>('GET', `/products${qs(params)}`),
    setActive: (id: string, active: boolean) => req<ProductRow>('PATCH', `/products/${id}/active`, { active }),
  },
};

// Product images are uploaded to and served by vehicle/service directly (not proxied through this CRM backend).
const VEHICLE_SERVICE_ORIGIN = 'http://localhost:3002';
export function productImageUrl(path?: string | null): string | undefined {
  return path ? `${VEHICLE_SERVICE_ORIGIN}${path}` : undefined;
}

export function toJalali(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const APPOINTMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'در انتظار', confirmed: 'تاییدشده', rejected: 'ردشده', completed: 'انجام‌شده', cancelled: 'لغوشده',
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'در انتظار', success: 'موفق', failed: 'ناموفق',
};

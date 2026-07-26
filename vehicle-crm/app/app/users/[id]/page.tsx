'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { C, Card, Button, Badge, Table, Td, Spinner } from '@/components/ui';
import { api, UserDetail, toJalali } from '@/lib/api';

const hasBusinessName = (role: string) => role === 'mechanic' || role === 'seller';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    api.users.detail(id).then(setUser).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [id]);

  async function toggleActive() {
    if (!user) return;
    await api.users.setActive(user.id, !user.active);
    load();
  }

  return (
    <Shell>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12.5, fontWeight: 600, marginBottom: 14, cursor: 'pointer' }}>
        ← بازگشت
      </button>

      {loading || !user ? (
        <Spinner />
      ) : (
        <>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 900, color: C.text, margin: 0 }}>
                  {hasBusinessName(user.role) ? (user.workshopName || user.name) : user.name}
                </h1>
                {hasBusinessName(user.role) && <p style={{ fontSize: 12.5, color: C.muted, margin: '4px 0 0' }}>{user.name}</p>}
                <p style={{ fontSize: 12.5, color: C.muted, margin: '4px 0 0', direction: 'ltr', textAlign: 'right' }}>{user.phone}</p>
                <p style={{ fontSize: 11.5, color: C.subtle, margin: '4px 0 0' }}>عضویت: {toJalali(user.createdAt)}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Badge color={user.active ? C.green : C.red}>{user.active ? 'فعال' : 'مسدود'}</Badge>
                <Button size="sm" variant={user.active ? 'danger' : 'secondary'} onClick={toggleActive}>
                  {user.active ? 'مسدودسازی حساب' : 'رفع مسدودی'}
                </Button>
              </div>
            </div>

            {user.role === 'mechanic' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 18, paddingTop: 18, borderTop: `1px solid ${C.border}` }}>
                <div style={{ background: C.surface2, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: 0 }}>{user.connectedVehicles ?? 0}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0' }}>خودروی متصل</p>
                </div>
                <div style={{ background: C.surface2, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: 0 }}>{user.avgRating || '—'}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0' }}>میانگین امتیاز ({user.reviewCount ?? 0} نظر)</p>
                </div>
                {user.workshopAddress && (
                  <div style={{ background: C.surface2, borderRadius: 12, padding: '12px 14px', gridColumn: 'span 2' }}>
                    <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>آدرس تعمیرگاه</p>
                    <p style={{ fontSize: 12.5, color: C.text, margin: '5px 0 0' }}>{user.workshopAddress}</p>
                  </div>
                )}
              </div>
            )}

            {user.role === 'seller' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 18, paddingTop: 18, borderTop: `1px solid ${C.border}` }}>
                <div style={{ background: C.surface2, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: 0 }}>{user.productCount ?? 0}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0' }}>کل محصولات</p>
                </div>
                <div style={{ background: C.surface2, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: 0 }}>{user.activeProductCount ?? 0}</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0' }}>محصول فعال</p>
                </div>
                {user.workshopAddress && (
                  <div style={{ background: C.surface2, borderRadius: 12, padding: '12px 14px', gridColumn: 'span 2' }}>
                    <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>آدرس فروشگاه</p>
                    <p style={{ fontSize: 12.5, color: C.text, margin: '5px 0 0' }}>{user.workshopAddress}</p>
                  </div>
                )}
                <div style={{ gridColumn: 'span 2' }}>
                  <Link href={`/products?sellerId=${user.id}`}>
                    <Button variant="secondary" fullWidth>مشاهده محصولات این فروشنده</Button>
                  </Link>
                </div>
              </div>
            )}
          </Card>

          {user.role === 'owner' && (
            <Card padding="0">
              <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: 0, padding: '16px 18px 0' }}>خودروها</p>
              {!user.vehicles || user.vehicles.length === 0 ? (
                <p style={{ fontSize: 12.5, color: C.muted, padding: '14px 18px 18px' }}>خودرویی ثبت نشده</p>
              ) : (
                <Table head={['خودرو', 'سال', 'پلاک', 'کارکرد']}>
                  {user.vehicles.map((v) => (
                    <tr key={v.id}>
                      <Td>{v.make} {v.model}</Td>
                      <Td>{v.year}</Td>
                      <Td style={{ direction: 'ltr', textAlign: 'right' }}>{v.plateNumber || '—'}</Td>
                      <Td>{v.currentMileage.toLocaleString()} km</Td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>
          )}
        </>
      )}
    </Shell>
  );
}

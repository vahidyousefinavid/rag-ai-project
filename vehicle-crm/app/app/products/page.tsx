'use client';
import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Shell from '@/components/Shell';
import { C, Card, Button, Input, Badge, Table, Td, Pagination, Spinner, EmptyState } from '@/components/ui';
import { api, ProductRow, productImageUrl, toJalali } from '@/lib/api';

export default function ProductsPage() {
  return (
    <Suspense fallback={<Shell><Spinner /></Shell>}>
      <ProductsPageInner />
    </Suspense>
  );
}

function ProductsPageInner() {
  const searchParams = useSearchParams();
  const sellerId = searchParams.get('sellerId') || undefined;
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: ProductRow[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.products.list({ q: q || undefined, sellerId, page, pageSize: 20 }).then(setData).finally(() => setLoading(false));
  }, [q, sellerId, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [q, sellerId]);

  async function toggleActive(p: ProductRow) {
    await api.products.setActive(p.id, !p.active);
    load();
  }

  return (
    <Shell>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: '0 0 18px' }}>
        محصولات {sellerId && <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>· فیلترشده بر اساس فروشنده</span>}
      </h1>

      <div style={{ marginBottom: 14, maxWidth: 320 }}>
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجوی محصول..." />
      </div>

      <Card padding="0">
        {loading ? (
          <Spinner />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="محصولی پیدا نشد" />
        ) : (
          <Table head={['', 'محصول', 'دسته‌بندی', 'قیمت', 'موجودی', 'فروشنده', 'وضعیت', 'تاریخ ثبت', '']}>
            {data.items.map((p) => (
              <tr key={p.id}>
                <Td>
                  <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', background: C.surface2, border: `1px solid ${C.border}` }}>
                    {p.imageUrl && (
                      <img src={productImageUrl(p.imageUrl)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                </Td>
                <Td>{p.name}</Td>
                <Td>{p.category || '—'}</Td>
                <Td>{p.price.toLocaleString()} ت</Td>
                <Td>{p.stock} {p.unit}</Td>
                <Td>{p.sellerName || '—'}</Td>
                <Td><Badge color={p.active ? C.green : C.muted}>{p.active ? 'فعال' : 'غیرفعال'}</Badge></Td>
                <Td>{toJalali(p.createdAt)}</Td>
                <Td>
                  <Button size="sm" variant={p.active ? 'danger' : 'secondary'} onClick={() => toggleActive(p)}>
                    {p.active ? 'غیرفعال کردن' : 'فعال کردن'}
                  </Button>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {data && <Pagination page={page} total={data.total} pageSize={20} onChange={setPage} />}
    </Shell>
  );
}

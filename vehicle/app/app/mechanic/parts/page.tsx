'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import VoiceAgentWidget from '@/components/VoiceAgentWidget';
import { api, Part } from '@/lib/api';
import { C, Card, Button, IconButton, FormField, Input, Sheet, EmptyState, Spinner } from '@/components/ui';
import { ChevronRightIcon, BoxIcon, PlusIcon, TrashIcon } from '@/components/icons';

export default function PartsCatalogPage() {
  const router = useRouter();
  const [parts, setParts] = useState<Part[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Part | null>(null);

  function load() {
    setLoading(true);
    api.parts.list(q).then(setParts).finally(() => setLoading(false));
  }
  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [q]);

  async function del(id: string) {
    if (!confirm('این قطعه از کاتالوگ حذف شود؟')) return;
    await api.parts.remove(id);
    load();
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="کاتالوگ قطعات" />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 14px calc(88px + env(safe-area-inset-bottom))' }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, padding: '14px 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <ChevronRightIcon size={16} /> بازگشت
        </button>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجوی قطعه..." />
          </div>
          <Button onClick={() => setShowAdd(true)} icon={<PlusIcon size={15} />}>افزودن</Button>
        </div>

        {loading ? (
          <Spinner />
        ) : parts.length === 0 ? (
          <EmptyState icon={<BoxIcon size={26} />} title="کاتالوگی نداری" sub="قطعات پرکاربردت رو با قیمت ثبت کن تا موقع صدور فاکتور سریع انتخابشون کنی" onAdd={() => setShowAdd(true)} btnLabel="افزودن اولین قطعه" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {parts.map(p => (
              <Card key={p.id} padding="13px 15px">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => setEditing(p)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 800, color: C.text, margin: 0 }}>{p.name}</p>
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 7,
                        color: p.inStock ? C.green : C.red,
                        background: p.inStock ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      }}>
                        {p.inStock ? `موجود · ${p.quantity}` : 'ناموجود'}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0' }}>
                      {p.category ? `${p.category} · ` : ''}{p.unit}{p.sku ? ` · کد ${p.sku}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: C.green }}>{p.unitPrice.toLocaleString()} ت</span>
                    <IconButton label="حذف" onClick={() => del(p.id)} size={28}><TrashIcon size={13} /></IconButton>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {(showAdd || editing) && (
        <PartEditSheet
          part={editing}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSaved={() => { setShowAdd(false); setEditing(null); load(); }}
        />
      )}
      <VoiceAgentWidget tenantId="vehicle-parts" onExecuted={load} />
      <BottomNav />
    </div>
  );
}

function PartEditSheet({ part, onClose, onSaved }: { part: Part | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(part?.name || '');
  const [category, setCategory] = useState(part?.category || '');
  const [sku, setSku] = useState(part?.sku || '');
  const [unit, setUnit] = useState(part?.unit || 'عدد');
  const [unitPrice, setUnitPrice] = useState(part ? String(part.unitPrice) : '');
  const [quantity, setQuantity] = useState(part ? String(part.quantity) : '0');
  const [inStock, setInStock] = useState(part ? part.inStock : true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const dto = { name, category: category || undefined, sku: sku || undefined, unit, unitPrice: Number(unitPrice) || 0, quantity: Number(quantity) || 0, inStock };
      if (part) await api.parts.update(part.id, dto);
      else await api.parts.create(dto);
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet title={part ? 'ویرایش قطعه' : 'افزودن قطعه'} icon={<BoxIcon size={16} />} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FormField label="نام قطعه" required><Input value={name} onChange={e => setName(e.target.value)} required /></FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="دسته‌بندی"><Input value={category} onChange={e => setCategory(e.target.value)} placeholder="مثلاً روغن و فیلتر" /></FormField>
          <FormField label="کد فنی"><Input value={sku} onChange={e => setSku(e.target.value)} dir="ltr" /></FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="واحد"><Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="عدد / لیتر / متر" /></FormField>
          <FormField label="قیمت (تومان)" required><Input value={unitPrice} onChange={e => setUnitPrice(e.target.value)} type="number" required /></FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="تعداد موجودی"><Input value={quantity} onChange={e => setQuantity(e.target.value)} type="number" /></FormField>
          <FormField label="وضعیت">
            <Button variant={inStock ? 'primary' : 'danger'} fullWidth onClick={() => setInStock(v => !v)}>
              {inStock ? 'موجود' : 'ناموجود'}
            </Button>
          </FormField>
        </div>
        {error && (
          <div style={{ fontSize: 12, color: '#F87171', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: 11, padding: '10px 14px' }}>{error}</div>
        )}
        <Button type="submit" loading={loading} fullWidth size="lg">{part ? 'ذخیره تغییرات' : 'افزودن به کاتالوگ'}</Button>
      </form>
    </Sheet>
  );
}

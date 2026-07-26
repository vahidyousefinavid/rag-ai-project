'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { api, Product, productImageUrl } from '@/lib/api';
import { C, Card, Button, IconButton, FormField, Input, TextArea, Sheet, EmptyState, Spinner } from '@/components/ui';
import { ChevronRightIcon, BoxIcon, PlusIcon, TrashIcon, ImageIcon } from '@/components/icons';

export default function SellerProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  function load() {
    setLoading(true);
    api.products.list(q).then(setProducts).finally(() => setLoading(false));
  }
  useEffect(() => {
    if (!localStorage.getItem('vtoken')) { router.replace('/'); return; }
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [q]);

  async function del(id: string) {
    if (!confirm('این محصول حذف شود؟')) return;
    await api.products.remove(id);
    load();
  }

  async function toggleActive(p: Product) {
    await api.products.setActive(p.id, !p.active);
    load();
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar title="محصولات من" />
      <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 14px calc(88px + env(safe-area-inset-bottom))' }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, padding: '14px 0 10px', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <ChevronRightIcon size={16} /> بازگشت
        </button>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجوی محصول..." />
          </div>
          <Button onClick={() => setShowAdd(true)} icon={<PlusIcon size={15} />}>افزودن</Button>
        </div>

        {loading ? (
          <Spinner />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<BoxIcon size={26} />}
            title="هنوز محصولی ثبت نکردی"
            sub="محصولاتت رو با عکس، قیمت و موجودی ثبت کن تا فروشگاهت کامل بشه"
            onAdd={() => setShowAdd(true)}
            btnLabel="افزودن اولین محصول"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {products.map(p => (
              <Card key={p.id} padding="12px">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    onClick={() => setEditing(p)}
                    style={{
                      width: 56, height: 56, borderRadius: 12, flexShrink: 0, cursor: 'pointer',
                      background: C.surface2, border: `1px solid ${C.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    }}
                  >
                    {p.imageUrl ? (
                      <img src={productImageUrl(p.imageUrl)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ImageIcon size={20} color={C.subtle} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setEditing(p)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 13.5, fontWeight: 800, color: C.text, margin: 0 }}>{p.name}</p>
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 7,
                        color: p.stock > 0 ? C.green : C.red,
                        background: p.stock > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      }}>
                        {p.stock > 0 ? `موجود · ${p.stock} ${p.unit}` : 'ناموجود'}
                      </span>
                      {!p.active && (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 7, color: C.muted, background: C.surface2 }}>
                          غیرفعال
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0' }}>{p.category || 'بدون دسته‌بندی'}</p>
                    <p style={{ fontSize: 13, fontWeight: 800, color: C.green, margin: '4px 0 0' }}>{p.price.toLocaleString()} ت</p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <IconButton label={p.active ? 'غیرفعال کردن' : 'فعال کردن'} onClick={() => toggleActive(p)} size={28}>
                      <span style={{ fontSize: 14 }}>{p.active ? '👁' : '🚫'}</span>
                    </IconButton>
                    <IconButton label="حذف" onClick={() => del(p.id)} size={28}><TrashIcon size={13} /></IconButton>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {(showAdd || editing) && (
        <ProductEditSheet
          product={editing}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSaved={() => { setShowAdd(false); setEditing(null); load(); }}
        />
      )}
      <BottomNav />
    </div>
  );
}

function ProductEditSheet({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(product?.name || '');
  const [category, setCategory] = useState(product?.category || '');
  const [description, setDescription] = useState(product?.description || '');
  const [unit, setUnit] = useState(product?.unit || 'عدد');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [stock, setStock] = useState(product ? String(product.stock) : '0');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | undefined>(productImageUrl(product?.imageUrl));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const dto = {
        name, category: category || undefined, description: description || undefined,
        price: Number(price) || 0, stock: Number(stock) || 0, unit,
        image: imageFile || undefined,
      };
      if (product) await api.products.update(product.id, dto);
      else await api.products.create(dto);
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet title={product ? 'ویرایش محصول' : 'افزودن محصول'} icon={<BoxIcon size={16} />} onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            height: 140, borderRadius: 16, cursor: 'pointer', overflow: 'hidden',
            background: C.surface2, border: `1.5px dashed ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6,
          }}
        >
          {preview ? (
            <img src={preview} alt="پیش‌نمایش" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <>
              <ImageIcon size={24} color={C.subtle} />
              <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>افزودن عکس محصول</span>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} style={{ display: 'none' }} />

        <FormField label="نام محصول" required><Input value={name} onChange={e => setName(e.target.value)} required /></FormField>
        <FormField label="توضیحات"><TextArea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="ویژگی‌ها، مشخصات..." /></FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="دسته‌بندی"><Input value={category} onChange={e => setCategory(e.target.value)} placeholder="مثلاً روغن و فیلتر" /></FormField>
          <FormField label="واحد"><Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="عدد / لیتر / متر" /></FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label="قیمت (تومان)" required><Input value={price} onChange={e => setPrice(e.target.value)} type="number" required /></FormField>
          <FormField label="موجودی"><Input value={stock} onChange={e => setStock(e.target.value)} type="number" /></FormField>
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#F87171', background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: 11, padding: '10px 14px' }}>{error}</div>
        )}
        <Button type="submit" loading={loading} fullWidth size="lg">{product ? 'ذخیره تغییرات' : 'افزودن محصول'}</Button>
      </form>
    </Sheet>
  );
}

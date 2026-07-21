import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { AgentTool, TenantManifest, ToolBuildContext } from '../tenant.types';

const VEHICLE_SERVICE_URL = process.env.VEHICLE_SERVICE_URL || 'http://127.0.0.1:3002';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PartDto {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  inStock: boolean;
}

async function listParts(authHeader: string, query?: string): Promise<PartDto[]> {
  const url = `${VEHICLE_SERVICE_URL}/mechanic/parts${query ? `?q=${encodeURIComponent(query)}` : ''}`;
  const res = await fetch(url, { headers: { Authorization: authHeader } });
  if (!res.ok) throw new Error(`vehicle-service list parts failed: ${res.status}`);
  return res.json();
}

/** Resolves a spoken part reference (exact id or a fuzzy name) to a concrete part id. */
async function resolvePartId(authHeader: string, idOrName: string): Promise<string | null> {
  if (UUID_RE.test(idOrName)) return idOrName;
  const matches = await listParts(authHeader, idOrName);
  return matches[0]?.id ?? null;
}

function describePart(p: PartDto): string {
  return `${p.name} | شناسه: ${p.id} | قیمت واحد: ${p.unitPrice.toLocaleString()} تومان | تعداد: ${p.quantity} | ${p.inStock ? 'موجود' : 'ناموجود'}`;
}

/** The local model reliably emits explicit `null` for fields it left unset rather than omitting them — drop those before sending a patch. */
function omitNullish<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined)) as Partial<T>;
}

function buildVehiclePartsTools(ctx: ToolBuildContext): AgentTool[] {
  const findPartsTool = tool(
    async ({ query }: { query?: string | null }) => {
      const parts = await listParts(ctx.authHeader, query ?? undefined);
      if (parts.length === 0) return 'هیچ قطعه‌ای یافت نشد.';
      return parts.map((p) => `- ${describePart(p)}`).join('\n');
    },
    {
      name: 'find_parts',
      description: 'جستجوی قطعات موجود در انبار تعمیرگاه بر اساس بخشی از نام؛ برای دیدن لیست کامل، query را خالی بگذار.',
      schema: z.object({ query: z.string().nullish().describe('بخشی از نام قطعه، مثلاً "فیلتر روغن"') }),
    },
  );

  const updatePartTool = tool(
    async (args: { idOrName: string; name?: string | null; unitPrice?: number | null; quantity?: number | null; inStock?: boolean | null }) => {
      const id = await resolvePartId(ctx.authHeader, args.idOrName);
      if (!id) return `قطعه‌ای مطابق با "${args.idOrName}" در انبار پیدا نشد.`;

      const { idOrName, ...rest } = args;
      const patch = omitNullish(rest);
      if (Object.keys(patch).length === 0) return 'هیچ تغییری مشخص نشده — بگو چه چیزی از این قطعه باید تغییر کند.';

      const res = await fetch(`${VEHICLE_SERVICE_URL}/mechanic/parts/${id}`, {
        method: 'PATCH',
        headers: { Authorization: ctx.authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.status === 403) return 'اجازه‌ی تغییر این قطعه را نداری — این قطعه متعلق به تو نیست.';
      if (res.status === 404) return 'این قطعه دیگر در انبار وجود ندارد.';
      if (!res.ok) return `بروزرسانی قطعه ناموفق بود (کد ${res.status}).`;

      const updated: PartDto = await res.json();
      return `قطعه بروزرسانی شد → ${describePart(updated)}`;
    },
    {
      name: 'update_part',
      description: 'تغییر نام، قیمت واحد، تعداد موجودی یا وضعیت موجود/ناموجود بودن یک قطعه‌ی مشخص در انبار. عملیات تغییردهنده است و نیاز به تایید کاربر دارد.',
      schema: z.object({
        idOrName: z.string().describe('شناسه‌ی دقیق (UUID) یا بخشی از نام قطعه‌ای که باید تغییر کند'),
        name: z.string().nullish().describe('نام جدید قطعه'),
        unitPrice: z.number().nullish().describe('قیمت واحد جدید به تومان'),
        quantity: z.number().nullish().describe('تعداد موجودی جدید'),
        inStock: z.boolean().nullish().describe('true یعنی موجود است، false یعنی ناموجود است'),
      }),
    },
  );

  const createPartTool = tool(
    async (args: { name: string; unitPrice: number; category?: string | null; sku?: string | null; unit?: string | null; quantity?: number | null; inStock?: boolean | null }) => {
      const body = { name: args.name, unitPrice: args.unitPrice, ...omitNullish({ category: args.category, sku: args.sku, unit: args.unit, quantity: args.quantity, inStock: args.inStock }) };
      const res = await fetch(`${VEHICLE_SERVICE_URL}/mechanic/parts`, {
        method: 'POST',
        headers: { Authorization: ctx.authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return `ثبت قطعه‌ی جدید ناموفق بود (کد ${res.status}).`;
      const created: PartDto = await res.json();
      return `قطعه‌ی جدید ثبت شد → ${describePart(created)}`;
    },
    {
      name: 'create_part',
      description: 'ثبت یک قطعه‌ی کاملاً جدید در انبار تعمیرگاه. عملیات تغییردهنده است و نیاز به تایید کاربر دارد.',
      schema: z.object({
        name: z.string().describe('نام قطعه'),
        unitPrice: z.number().describe('قیمت واحد به تومان'),
        category: z.string().nullish().describe('دسته‌بندی قطعه'),
        sku: z.string().nullish().describe('کد قطعه'),
        unit: z.string().nullish().describe('واحد شمارش، پیش‌فرض "عدد"'),
        quantity: z.number().nullish().describe('تعداد موجودی اولیه'),
        inStock: z.boolean().nullish().describe('وضعیت موجود بودن، پیش‌فرض true'),
      }),
    },
  );

  return [
    { tool: findPartsTool, requiresConfirmation: false },
    { tool: updatePartTool, requiresConfirmation: true },
    { tool: createPartTool, requiresConfirmation: true },
  ];
}

export const vehiclePartsManifest: TenantManifest = {
  id: 'vehicle-parts',
  domainPrompt:
    'تو دستیار صوتی انبار قطعات یک تعمیرگاه خودرو هستی. کاربر یک مکانیک است که با صحبت کردن می‌خواهد قطعات انبارش را جستجو کند، قطعه‌ی جدید ثبت کند یا نام/قیمت/تعداد/وضعیت موجود بودن یک قطعه را تغییر بدهد.',
  buildTools: buildVehiclePartsTools,
};

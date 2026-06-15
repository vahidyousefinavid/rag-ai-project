import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { Document } from '@langchain/core/documents';
import { VectorService } from '../vector/vector.service';
import { RedisService } from '../cache/redis.service';

const CHECKPOINT_KEY = 'crm_ingest';

@Injectable()
export class CrmIngestService {
  private readonly logger = new Logger(CrmIngestService.name);
  private pool: Pool;

  constructor(
    private config: ConfigService,
    private vector: VectorService,
    private redis: RedisService,
  ) {
    this.pool = new Pool({
      host: this.config.get<string>('postgres.host') ?? 'localhost',
      port: this.config.get<number>('postgres.port') ?? 5432,
      user: this.config.get<string>('postgres.username') ?? 'rag_user',
      password: this.config.get<string>('postgres.password') ?? 'rag_password',
      database: this.config.get<string>('postgres.database') ?? 'rag_db',
      max: 5,
    });
  }

  async ingestAll(force = false): Promise<{ chunks: number; tables: Record<string, number>; resumed?: number }> {
    const checkpoint = force ? 0 : await this.redis.getCheckpoint(CHECKPOINT_KEY);
    const resume = checkpoint > 0;

    if (force) {
      this.logger.log('Force mode — recreating collection...');
      await this.vector.recreateCollection();
      await this.redis.clearCheckpoint(CHECKPOINT_KEY);
    } else if (!resume) {
      this.logger.log('Starting fresh CRM ingestion...');
      await this.vector.recreateCollection();
    } else {
      this.logger.log(`Resuming CRM ingestion from chunk ${checkpoint}...`);
    }

    const docs: Document[] = [];
    const tableStats: Record<string, number> = {};

    const customerDocs = await this.buildCustomerDocs();
    docs.push(...customerDocs);
    tableStats['customers'] = customerDocs.length;

    const contactDocs = await this.buildContactDocs();
    docs.push(...contactDocs);
    tableStats['contacts'] = contactDocs.length;

    const leadDocs = await this.buildLeadDocs();
    docs.push(...leadDocs);
    tableStats['leads'] = leadDocs.length;

    const dealDocs = await this.buildDealDocs();
    docs.push(...dealDocs);
    tableStats['deals'] = dealDocs.length;

    const orderDocs = await this.buildOrderDocs();
    docs.push(...orderDocs);
    tableStats['orders'] = orderDocs.length;

    const ticketDocs = await this.buildTicketDocs();
    docs.push(...ticketDocs);
    tableStats['tickets'] = ticketDocs.length;

    const activityDocs = await this.buildActivityDocs();
    docs.push(...activityDocs);
    tableStats['activities'] = activityDocs.length;

    const productDocs = await this.buildProductDocs();
    docs.push(...productDocs);
    tableStats['products'] = productDocs.length;

    const campaignDocs = await this.buildCampaignDocs();
    docs.push(...campaignDocs);
    tableStats['campaigns'] = campaignDocs.length;

    this.logger.log(`Total documents built: ${docs.length}. Starting upsert from ${checkpoint}...`);

    // Save checkpoint after each batch via a wrapper
    await this.upsertWithCheckpoint(docs, checkpoint);

    await this.redis.clearCheckpoint(CHECKPOINT_KEY);
    this.logger.log(`✅ CRM ingestion complete: ${docs.length} documents indexed`);
    return { chunks: docs.length, tables: tableStats, resumed: resume ? checkpoint : undefined };
  }

  private async upsertWithCheckpoint(docs: Document[], startFrom: number): Promise<void> {
    const BATCH = 32;
    for (let i = startFrom; i < docs.length; i += BATCH) {
      const batch = docs.slice(i, i + BATCH);
      await this.vector.upsertDocuments(batch); // embeds + upserts this batch
      const progress = i + batch.length;
      await this.redis.setCheckpoint(CHECKPOINT_KEY, progress);
      this.logger.log(`CRM progress: ${progress}/${docs.length}`);
    }
  }

  // ─── customers ─────────────────────────────────────────────────────────────
  private async buildCustomerDocs(): Promise<Document[]> {
    const { rows } = await this.pool.query(`
      SELECT c.*, e.name AS manager_name,
        (SELECT COUNT(*) FROM crm_deals d WHERE d.customer_id = c.id AND d.stage = 'بسته شده - موفق') AS won_deals,
        (SELECT COUNT(*) FROM crm_deals d WHERE d.customer_id = c.id AND d.stage NOT LIKE 'بسته شده%') AS open_deals,
        (SELECT COALESCE(SUM(d.value),0) FROM crm_deals d WHERE d.customer_id = c.id AND d.stage = 'بسته شده - موفق') AS total_won_value,
        (SELECT COUNT(*) FROM crm_orders o WHERE o.customer_id = c.id) AS total_orders,
        (SELECT COALESCE(SUM(o.final_amount),0) FROM crm_orders o WHERE o.customer_id = c.id) AS total_revenue,
        (SELECT COUNT(*) FROM crm_support_tickets t WHERE t.customer_id = c.id AND t.status IN ('باز','در حال بررسی')) AS open_tickets
      FROM crm_customers c
      LEFT JOIN crm_employees e ON e.id = c.account_manager_id
    `);

    return rows.map((r) => {
      const revenue = Number(r.total_revenue);
      const wonValue = Number(r.total_won_value);
      const text = [
        `مشتری: ${r.company_name}`,
        `صنعت: ${r.industry}`,
        `شهر: ${r.city}، استان: ${r.province}`,
        `وضعیت: ${r.status === 'active' ? 'فعال' : r.status === 'inactive' ? 'غیرفعال' : 'احتمالی'}`,
        `تعداد کارمندان: ${r.employee_count}`,
        `درآمد سالانه تخمینی: ${this.fmtCurrency(r.annual_revenue)} تومان`,
        `مدیر حساب: ${r.manager_name ?? 'نامشخص'}`,
        `تلفن: ${r.phone}`,
        `ایمیل: ${r.email}`,
        `مشتری از: ${r.customer_since ?? 'نامشخص'}`,
        `تعداد معاملات موفق: ${r.won_deals}`,
        `معاملات فعال در جریان: ${r.open_deals}`,
        `ارزش کل معاملات موفق: ${this.fmtCurrency(wonValue)} تومان`,
        `تعداد سفارشات: ${r.total_orders}`,
        `درآمد کل از این مشتری: ${this.fmtCurrency(revenue)} تومان`,
        `تیکت‌های پشتیبانی باز: ${r.open_tickets}`,
        r.notes ? `یادداشت: ${r.notes}` : '',
      ].filter(Boolean).join('\n');

      return new Document({ pageContent: text, metadata: { source: 'crm_customers', id: r.id, company: r.company_name } });
    });
  }

  // ─── contacts ──────────────────────────────────────────────────────────────
  private async buildContactDocs(): Promise<Document[]> {
    const { rows } = await this.pool.query(`
      SELECT ct.*, c.company_name, c.city, c.industry
      FROM crm_contacts ct
      JOIN crm_customers c ON c.id = ct.customer_id
    `);

    return rows.map((r) => {
      const text = [
        `مخاطب: ${r.first_name} ${r.last_name}`,
        `شرکت: ${r.company_name}`,
        `سمت: ${r.position}`,
        `دپارتمان: ${r.department}`,
        `ایمیل: ${r.email}`,
        `تلفن: ${r.phone}`,
        `موبایل: ${r.mobile}`,
        `مخاطب اصلی: ${r.is_primary ? 'بله' : 'خیر'}`,
        `صنعت شرکت: ${r.industry}`,
        `شهر: ${r.city}`,
      ].filter(Boolean).join('\n');

      return new Document({ pageContent: text, metadata: { source: 'crm_contacts', id: r.id } });
    });
  }

  // ─── leads ─────────────────────────────────────────────────────────────────
  private async buildLeadDocs(): Promise<Document[]> {
    const { rows } = await this.pool.query(`
      SELECT l.*, e.name AS assigned_name
      FROM crm_leads l
      LEFT JOIN crm_employees e ON e.id = l.assigned_to
    `);

    return rows.map((r) => {
      const text = [
        `لید فروش: ${r.company_name}`,
        `مخاطب: ${r.contact_name}`,
        `صنعت: ${r.industry}`,
        `شهر: ${r.city}`,
        `منبع: ${r.source}`,
        `وضعیت لید: ${r.status}`,
        `ارزش تخمینی: ${this.fmtCurrency(r.estimated_value)} تومان`,
        `کارشناس مسئول: ${r.assigned_name ?? 'نامشخص'}`,
        `تلفن: ${r.phone}`,
        `ایمیل: ${r.email}`,
        r.notes ? `یادداشت: ${r.notes}` : '',
      ].filter(Boolean).join('\n');

      return new Document({ pageContent: text, metadata: { source: 'crm_leads', id: r.id } });
    });
  }

  // ─── deals ─────────────────────────────────────────────────────────────────
  private async buildDealDocs(): Promise<Document[]> {
    const { rows } = await this.pool.query(`
      SELECT d.*, c.company_name, c.city, c.industry,
             e.name AS rep_name
      FROM crm_deals d
      JOIN crm_customers c ON c.id = d.customer_id
      LEFT JOIN crm_employees e ON e.id = d.assigned_to
    `);

    return rows.map((r) => {
      const text = [
        `معامله: ${r.title}`,
        `مشتری: ${r.company_name}`,
        `صنعت: ${r.industry}`,
        `شهر: ${r.city}`,
        `مرحله: ${r.stage}`,
        `ارزش معامله: ${this.fmtCurrency(r.value)} تومان`,
        `احتمال بستن: ${r.probability}%`,
        `تاریخ بستن پیش‌بینی: ${r.expected_close_date ?? 'نامشخص'}`,
        r.closed_date ? `تاریخ بستن واقعی: ${r.closed_date}` : '',
        `کارشناس فروش: ${r.rep_name ?? 'نامشخص'}`,
        r.notes ? `یادداشت: ${r.notes}` : '',
      ].filter(Boolean).join('\n');

      return new Document({ pageContent: text, metadata: { source: 'crm_deals', id: r.id, stage: r.stage } });
    });
  }

  // ─── orders ────────────────────────────────────────────────────────────────
  private async buildOrderDocs(): Promise<Document[]> {
    const { rows } = await this.pool.query(`
      SELECT o.*, c.company_name, c.city,
             e.name AS rep_name,
             (
               SELECT STRING_AGG(p.name || ' (x' || oi.quantity || ')', ', ')
               FROM crm_order_items oi
               JOIN crm_products p ON p.id = oi.product_id
               WHERE oi.order_id = o.id
             ) AS items_list
      FROM crm_orders o
      JOIN crm_customers c ON c.id = o.customer_id
      LEFT JOIN crm_employees e ON e.id = o.assigned_to
    `);

    return rows.map((r) => {
      const text = [
        `سفارش: ${r.order_number}`,
        `مشتری: ${r.company_name}`,
        `شهر: ${r.city}`,
        `وضعیت: ${r.status}`,
        `وضعیت پرداخت: ${r.payment_status}`,
        `مبلغ کل: ${this.fmtCurrency(r.total_amount)} تومان`,
        r.discount_percent > 0 ? `تخفیف: ${r.discount_percent}%` : '',
        `مبلغ نهایی: ${this.fmtCurrency(r.final_amount)} تومان`,
        `تاریخ سفارش: ${r.order_date?.toISOString().split('T')[0] ?? ''}`,
        r.delivery_date ? `تاریخ تحویل: ${r.delivery_date.toISOString().split('T')[0]}` : '',
        `کارشناس: ${r.rep_name ?? 'نامشخص'}`,
        r.items_list ? `اقلام: ${r.items_list}` : '',
      ].filter(Boolean).join('\n');

      return new Document({ pageContent: text, metadata: { source: 'crm_orders', id: r.id, orderNum: r.order_number } });
    });
  }

  // ─── tickets ───────────────────────────────────────────────────────────────
  private async buildTicketDocs(): Promise<Document[]> {
    const { rows } = await this.pool.query(`
      SELECT t.*, c.company_name, c.city,
             e.name AS agent_name
      FROM crm_support_tickets t
      JOIN crm_customers c ON c.id = t.customer_id
      LEFT JOIN crm_employees e ON e.id = t.assigned_to
    `);

    return rows.map((r) => {
      const text = [
        `تیکت پشتیبانی: ${r.ticket_number}`,
        `مشتری: ${r.company_name}`,
        `شهر: ${r.city}`,
        `موضوع: ${r.subject}`,
        `توضیحات: ${r.description}`,
        `دسته‌بندی: ${r.category}`,
        `اولویت: ${r.priority}`,
        `وضعیت: ${r.status}`,
        `کارشناس پشتیبانی: ${r.agent_name ?? 'نامشخص'}`,
        `تاریخ ثبت: ${r.created_at?.toISOString().split('T')[0] ?? ''}`,
        r.resolved_at ? `تاریخ حل: ${r.resolved_at.toISOString().split('T')[0]}` : '',
        r.resolution ? `راه‌حل: ${r.resolution}` : '',
      ].filter(Boolean).join('\n');

      return new Document({ pageContent: text, metadata: { source: 'crm_tickets', id: r.id, ticketNum: r.ticket_number } });
    });
  }

  // ─── activities ────────────────────────────────────────────────────────────
  private async buildActivityDocs(): Promise<Document[]> {
    const { rows } = await this.pool.query(`
      SELECT a.*, c.company_name, e.name AS emp_name
      FROM crm_activities a
      JOIN crm_customers c ON c.id = a.customer_id
      LEFT JOIN crm_employees e ON e.id = a.employee_id
    `);

    return rows.map((r) => {
      const text = [
        `فعالیت: ${r.type}`,
        `موضوع: ${r.subject}`,
        `مشتری: ${r.company_name}`,
        `کارشناس: ${r.emp_name ?? 'نامشخص'}`,
        `تاریخ: ${r.activity_date?.toISOString().split('T')[0] ?? ''}`,
        r.duration_minutes ? `مدت: ${r.duration_minutes} دقیقه` : '',
        `نتیجه: ${r.outcome}`,
        r.notes ? `یادداشت: ${r.notes}` : '',
      ].filter(Boolean).join('\n');

      return new Document({ pageContent: text, metadata: { source: 'crm_activities', id: r.id } });
    });
  }

  // ─── products ──────────────────────────────────────────────────────────────
  private async buildProductDocs(): Promise<Document[]> {
    const { rows } = await this.pool.query(`
      SELECT p.*,
        (SELECT COUNT(*) FROM crm_order_items oi WHERE oi.product_id = p.id) AS times_sold,
        (SELECT COALESCE(SUM(oi.quantity),0) FROM crm_order_items oi WHERE oi.product_id = p.id) AS total_qty_sold
      FROM crm_products p
    `);

    return rows.map((r) => {
      const text = [
        `محصول: ${r.name}`,
        `دسته‌بندی: ${r.category}`,
        `کد محصول: ${r.sku}`,
        `توضیحات: ${r.description}`,
        `قیمت واحد: ${this.fmtCurrency(r.unit_price)} تومان`,
        `واحد: ${r.unit}`,
        `موجودی انبار: ${r.stock}`,
        `وضعیت: ${r.is_active ? 'فعال' : 'غیرفعال'}`,
        `تعداد دفعات فروش: ${r.times_sold}`,
        `کل تعداد فروخته شده: ${r.total_qty_sold}`,
      ].filter(Boolean).join('\n');

      return new Document({ pageContent: text, metadata: { source: 'crm_products', id: r.id, sku: r.sku } });
    });
  }

  // ─── campaigns ─────────────────────────────────────────────────────────────
  private async buildCampaignDocs(): Promise<Document[]> {
    const { rows } = await this.pool.query('SELECT * FROM crm_campaigns');

    return rows.map((r) => {
      const convRate = r.leads_generated > 0
        ? ((r.conversions / r.leads_generated) * 100).toFixed(1)
        : '0';
      const text = [
        `کمپین بازاریابی: ${r.name}`,
        `نوع: ${r.type}`,
        `وضعیت: ${r.status}`,
        `تاریخ شروع: ${r.start_date}`,
        `تاریخ پایان: ${r.end_date}`,
        `بودجه: ${this.fmtCurrency(r.budget)} تومان`,
        `مخاطبان هدف: ${r.target_audience}`,
        `توضیحات: ${r.description}`,
        `لیدهای جذب شده: ${r.leads_generated}`,
        `تبدیل‌ها: ${r.conversions}`,
        `نرخ تبدیل: ${convRate}%`,
      ].filter(Boolean).join('\n');

      return new Document({ pageContent: text, metadata: { source: 'crm_campaigns', id: r.id } });
    });
  }

  private fmtCurrency(n: number | string): string {
    const num = typeof n === 'string' ? parseInt(n, 10) : n;
    if (!num) return '۰';
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)} میلیارد`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(0)} میلیون`;
    return num.toLocaleString('fa-IR');
  }
}

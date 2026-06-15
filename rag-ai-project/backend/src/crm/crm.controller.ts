import { Controller, Post, Get, HttpCode } from '@nestjs/common';
import { CrmIngestService } from './crm-ingest.service';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

@Controller('crm')
export class CrmController {
  private pool: Pool;

  constructor(
    private ingest: CrmIngestService,
    private config: ConfigService,
  ) {
    this.pool = new Pool({
      host: this.config.get<string>('postgres.host') ?? 'localhost',
      port: this.config.get<number>('postgres.port') ?? 5432,
      user: this.config.get<string>('postgres.username') ?? 'rag_user',
      password: this.config.get<string>('postgres.password') ?? 'rag_password',
      database: this.config.get<string>('postgres.database') ?? 'rag_db',
      max: 3,
    });
  }

  /** Trigger full re-ingestion of CRM data into Qdrant */
  @Post('ingest')
  @HttpCode(202)
  async triggerIngest() {
    const result = await this.ingest.ingestAll();
    return { message: 'CRM data ingested successfully', ...result };
  }

  /** Quick stats about the CRM database */
  @Get('stats')
  async stats() {
    const { rows } = await this.pool.query(`
      SELECT
        (SELECT COUNT(*) FROM crm_customers) AS customers,
        (SELECT COUNT(*) FROM crm_customers WHERE status = 'active') AS active_customers,
        (SELECT COUNT(*) FROM crm_contacts) AS contacts,
        (SELECT COUNT(*) FROM crm_leads) AS leads,
        (SELECT COUNT(*) FROM crm_products) AS products,
        (SELECT COUNT(*) FROM crm_deals) AS deals,
        (SELECT COUNT(*) FROM crm_deals WHERE stage = 'بسته شده - موفق') AS won_deals,
        (SELECT COALESCE(SUM(value),0) FROM crm_deals WHERE stage = 'بسته شده - موفق') AS total_won_value,
        (SELECT COALESCE(SUM(value),0) FROM crm_deals WHERE stage NOT LIKE 'بسته شده%') AS pipeline_value,
        (SELECT COUNT(*) FROM crm_orders) AS orders,
        (SELECT COALESCE(SUM(final_amount),0) FROM crm_orders) AS total_revenue,
        (SELECT COUNT(*) FROM crm_support_tickets WHERE status IN ('باز','در حال بررسی')) AS open_tickets,
        (SELECT COUNT(*) FROM crm_activities) AS activities
    `);
    return rows[0];
  }
}

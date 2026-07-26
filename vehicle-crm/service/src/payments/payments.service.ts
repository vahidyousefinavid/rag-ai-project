import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './payment.entity';

@Injectable()
export class PaymentsService {
  constructor(@InjectRepository(Payment) private repo: Repository<Payment>) {}

  async list(params: { status?: PaymentStatus; page: number; pageSize: number }) {
    const where: any = {};
    if (params.status) where.status = params.status;

    const [rows, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    });

    return { total, page: params.page, pageSize: params.pageSize, items: rows };
  }

  async summary() {
    const totalRow = await this.repo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('p.status = :status', { status: 'success' })
      .getRawOne<{ total: string; count: string }>();

    const byStatus = await this.repo
      .createQueryBuilder('p')
      .select('p.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(p.amount), 0)', 'total')
      .groupBy('p.status')
      .getRawMany<{ status: string; count: string; total: string }>();

    return {
      totalRevenue: +(totalRow?.total ?? 0),
      successCount: +(totalRow?.count ?? 0),
      byStatus: byStatus.map((r) => ({ status: r.status, count: +r.count, total: +r.total })),
    };
  }
}

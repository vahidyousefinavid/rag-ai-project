import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Payment } from '../payments/payment.entity';
import { Review } from '../reviews/review.entity';
import { Organization } from '../organizations/organization.entity';
import { Product } from '../products/product.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
    @InjectRepository(Appointment) private appointments: Repository<Appointment>,
    @InjectRepository(Payment) private payments: Repository<Payment>,
    @InjectRepository(Review) private reviews: Repository<Review>,
    @InjectRepository(Organization) private organizations: Repository<Organization>,
    @InjectRepository(Product) private products: Repository<Product>,
  ) {}

  async stats() {
    const [owners, mechanics, activeOwners, activeMechanics, sellers, activeSellers, vehicleCount, orgCount, productCount] = await Promise.all([
      this.users.count({ where: { role: 'owner' } }),
      this.users.count({ where: { role: 'mechanic' } }),
      this.users.count({ where: { role: 'owner', active: true } }),
      this.users.count({ where: { role: 'mechanic', active: true } }),
      this.users.count({ where: { role: 'seller' } }),
      this.users.count({ where: { role: 'seller', active: true } }),
      this.vehicles.count(),
      this.organizations.count(),
      this.products.count(),
    ]);

    const appointmentRows = await this.appointments
      .createQueryBuilder('a')
      .select('a.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('a.status')
      .getRawMany<{ status: string; count: string }>();
    const appointmentsByStatus = Object.fromEntries(appointmentRows.map((r) => [r.status, +r.count]));

    const revenueRow = await this.payments
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .where('p.status = :status', { status: 'success' })
      .getRawOne<{ total: string }>();

    const reviewRow = await this.reviews
      .createQueryBuilder('r')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(AVG(r.rating), 0)', 'avg')
      .getRawOne<{ count: string; avg: string }>();

    return {
      owners, mechanics, activeOwners, activeMechanics, sellers, activeSellers,
      vehicleCount, organizationCount: orgCount, productCount,
      appointmentsByStatus,
      totalRevenue: +(revenueRow?.total ?? 0),
      reviewCount: +(reviewRow?.count ?? 0),
      avgRating: reviewRow?.count && +reviewRow.count > 0 ? +(+reviewRow.avg).toFixed(2) : 0,
    };
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { User } from './user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehicleAccess } from '../vehicle-access/vehicle-access.entity';
import { Review } from '../reviews/review.entity';
import { Product } from '../products/product.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
    @InjectRepository(VehicleAccess) private access: Repository<VehicleAccess>,
    @InjectRepository(Review) private reviews: Repository<Review>,
    @InjectRepository(Product) private products: Repository<Product>,
  ) {}

  async list(params: { role?: 'owner' | 'mechanic' | 'seller'; q?: string; page: number; pageSize: number }) {
    const where: any = {};
    if (params.role) where.role = params.role;
    if (params.q) where.name = ILike(`%${params.q}%`);

    const [rows, total] = await this.users.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    });

    return {
      total,
      page: params.page,
      pageSize: params.pageSize,
      items: rows.map((u) => this.toSummary(u)),
    };
  }

  async detail(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException();

    if (user.role === 'owner') {
      const vehicles = await this.vehicles.find({ where: { userId: id }, order: { createdAt: 'DESC' } });
      return { ...this.toSummary(user), vehicles };
    }

    if (user.role === 'mechanic') {
      const connections = await this.access.count({ where: { mechanicId: id, revoked: false } });
      const reviewRow = await this.reviews
        .createQueryBuilder('r')
        .select('COUNT(*)', 'count')
        .addSelect('COALESCE(AVG(r.rating), 0)', 'avg')
        .where('r.mechanicId = :id', { id })
        .getRawOne<{ count: string; avg: string }>();
      return {
        ...this.toSummary(user),
        connectedVehicles: connections,
        reviewCount: +(reviewRow?.count ?? 0),
        avgRating: reviewRow?.count && +reviewRow.count > 0 ? +(+reviewRow.avg).toFixed(2) : 0,
      };
    }

    if (user.role === 'seller') {
      const productCount = await this.products.count({ where: { sellerId: id } });
      const activeProductCount = await this.products.count({ where: { sellerId: id, active: true } });
      return { ...this.toSummary(user), productCount, activeProductCount };
    }

    return this.toSummary(user);
  }

  async setActive(id: string, active: boolean) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException();
    if (user.role === 'admin') throw new BadRequestException('امکان مسدودسازی حساب ادمین نیست');
    user.active = active;
    await this.users.save(user);
    return this.toSummary(user);
  }

  async update(id: string, dto: { name?: string; workshopName?: string; workshopAddress?: string }) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException();
    Object.assign(user, dto);
    await this.users.save(user);
    return this.toSummary(user);
  }

  private toSummary(u: User) {
    return {
      id: u.id, phone: u.phone, name: u.name, role: u.role, active: u.active,
      workshopName: u.workshopName, workshopAddress: u.workshopAddress, createdAt: u.createdAt,
    };
  }
}

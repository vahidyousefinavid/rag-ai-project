import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, IsNull, ILike, In, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Review } from '../reviews/review.entity';
import { MechanicService } from '../mechanic-services/mechanic-service.entity';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class WorkshopsService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Review) private reviews: Repository<Review>,
    @InjectRepository(MechanicService) private services: Repository<MechanicService>,
  ) {}

  async search(params: { lat?: number; lng?: number; q?: string; serviceType?: string; mode?: 'in_shop' | 'on_site' }) {
    const where: any = { role: 'mechanic', workshopName: Not(IsNull()) };
    if (params.q) where.workshopName = ILike(`%${params.q}%`);

    let mechanicIdFilter: string[] | null = null;
    if (params.serviceType) {
      const modeWhere: any = { serviceType: params.serviceType };
      if (params.mode === 'on_site') modeWhere.supportsOnSite = true;
      if (params.mode === 'in_shop') modeWhere.supportsInShop = true;
      const rows = await this.services.find({ where: modeWhere, select: ['mechanicId'] });
      mechanicIdFilter = rows.map((r) => r.mechanicId);
      if (mechanicIdFilter.length === 0) return [];
      where.id = In(mechanicIdFilter);
    }

    const mechanics = await this.users.find({ where });
    const ratings = await this.reviews
      .createQueryBuilder('r')
      .select('r.mechanicId', 'mechanicId')
      .addSelect('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.mechanicId')
      .getRawMany<{ mechanicId: string; avg: string; count: string }>();
    const ratingMap = new Map(ratings.map((r) => [r.mechanicId, { avg: +(+r.avg).toFixed(1), count: +r.count }]));

    const hasOrigin = params.lat !== undefined && params.lng !== undefined;

    const list = mechanics.map((m) => {
      const distanceKm =
        hasOrigin && m.workshopLat != null && m.workshopLng != null
          ? +haversineKm(params.lat!, params.lng!, m.workshopLat, m.workshopLng).toFixed(1)
          : null;
      const rating = ratingMap.get(m.id) ?? { avg: 0, count: 0 };
      return {
        id: m.id,
        workshopName: m.workshopName,
        workshopAddress: m.workshopAddress,
        workshopLat: m.workshopLat,
        workshopLng: m.workshopLng,
        rating: rating.avg,
        reviewCount: rating.count,
        distanceKm,
      };
    });

    list.sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;
      return b.rating - a.rating;
    });

    return list;
  }

  async detail(id: string) {
    const m = await this.users.findOne({ where: { id, role: 'mechanic' } });
    if (!m) throw new NotFoundException('تعمیرگاه یافت نشد');
    const ratingRow = await this.reviews
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('r.mechanicId = :id', { id })
      .getRawOne<{ avg: string; count: string }>();
    const services = await this.services.find({ where: { mechanicId: id }, order: { createdAt: 'ASC' } });
    return {
      id: m.id,
      workshopName: m.workshopName,
      workshopAddress: m.workshopAddress,
      workshopLat: m.workshopLat,
      workshopLng: m.workshopLng,
      rating: ratingRow?.avg ? +(+ratingRow.avg).toFixed(1) : 0,
      reviewCount: ratingRow?.count ? +ratingRow.count : 0,
      services,
    };
  }
}

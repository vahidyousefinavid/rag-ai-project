import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehicleAccess } from '../vehicle-access/vehicle-access.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private reviews: Repository<Review>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
    @InjectRepository(VehicleAccess) private access: Repository<VehicleAccess>,
  ) {}

  private async assertHadRelationship(ownerId: string, mechanicId: string) {
    const ownerVehicleIds = (await this.vehicles.find({ where: { userId: ownerId }, select: ['id'] })).map((v) => v.id);
    if (ownerVehicleIds.length === 0) throw new ForbiddenException('فقط مالکانی که با این تعمیرگاه کار کرده‌اند می‌توانند نظر ثبت کنند');
    const grant = await this.access
      .createQueryBuilder('a')
      .where('a.mechanicId = :mechanicId', { mechanicId })
      .andWhere('a.vehicleId IN (:...ids)', { ids: ownerVehicleIds })
      .getOne();
    if (!grant) throw new ForbiddenException('فقط مالکانی که با این تعمیرگاه کار کرده‌اند می‌توانند نظر ثبت کنند');
  }

  async upsert(mechanicId: string, ownerId: string, dto: { rating: number; comment?: string }) {
    const mechanic = await this.users.findOne({ where: { id: mechanicId, role: 'mechanic' } });
    if (!mechanic) throw new NotFoundException('تعمیرگاه یافت نشد');
    if (dto.rating < 1 || dto.rating > 5) throw new BadRequestException('امتیاز باید بین ۱ تا ۵ باشد');
    await this.assertHadRelationship(ownerId, mechanicId);

    let review = await this.reviews.findOne({ where: { mechanicId, ownerId } });
    if (!review) review = this.reviews.create({ mechanicId, ownerId });
    review.rating = dto.rating;
    review.comment = dto.comment;
    return this.reviews.save(review);
  }

  async listForMechanic(mechanicId: string) {
    const rows = await this.reviews.find({ where: { mechanicId }, relations: ['owner'], order: { createdAt: 'DESC' } });
    return rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      ownerName: r.owner?.name,
    }));
  }

  async summary(mechanicId: string) {
    const rows = await this.reviews.find({ where: { mechanicId } });
    const count = rows.length;
    const avg = count > 0 ? rows.reduce((s, r) => s + r.rating, 0) / count : 0;
    return { avg: +avg.toFixed(2), count };
  }

  async myReview(mechanicId: string, ownerId: string) {
    return this.reviews.findOne({ where: { mechanicId, ownerId } });
  }
}

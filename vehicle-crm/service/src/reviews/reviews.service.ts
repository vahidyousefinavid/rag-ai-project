import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';

@Injectable()
export class ReviewsService {
  constructor(@InjectRepository(Review) private repo: Repository<Review>) {}

  async list(params: { page: number; pageSize: number }) {
    const [rows, total] = await this.repo.findAndCount({
      relations: ['mechanic', 'owner'],
      order: { createdAt: 'DESC' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    });

    return {
      total, page: params.page, pageSize: params.pageSize,
      items: rows.map((r) => ({
        id: r.id, rating: r.rating, comment: r.comment, createdAt: r.createdAt,
        mechanicName: r.mechanic?.workshopName || r.mechanic?.name,
        ownerName: r.owner?.name,
      })),
    };
  }

  async remove(id: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException();
    await this.repo.remove(row);
  }
}

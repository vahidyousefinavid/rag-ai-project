import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Product } from './product.entity';

@Injectable()
export class ProductsService {
  constructor(@InjectRepository(Product) private repo: Repository<Product>) {}

  async list(params: { q?: string; sellerId?: string; page: number; pageSize: number }) {
    const where: any = {};
    if (params.sellerId) where.sellerId = params.sellerId;
    if (params.q) where.name = ILike(`%${params.q}%`);

    const [rows, total] = await this.repo.findAndCount({
      where,
      relations: ['seller'],
      order: { createdAt: 'DESC' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    });

    return {
      total, page: params.page, pageSize: params.pageSize,
      items: rows.map((p) => ({
        id: p.id, name: p.name, category: p.category, price: p.price, stock: p.stock,
        unit: p.unit, imageUrl: p.imageUrl, active: p.active, createdAt: p.createdAt,
        sellerName: p.seller?.workshopName || p.seller?.name, sellerPhone: p.seller?.phone,
      })),
    };
  }

  async setActive(id: string, active: boolean) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException();
    row.active = active;
    return this.repo.save(row);
  }
}

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Product } from './product.entity';

export interface UpsertProductInput {
  name: string;
  category?: string;
  description?: string;
  price: number;
  stock?: number;
  unit?: string;
}

@Injectable()
export class ProductsService {
  constructor(@InjectRepository(Product) private repo: Repository<Product>) {}

  list(sellerId: string, q?: string) {
    return this.repo.find({
      where: q ? { sellerId, name: ILike(`%${q}%`) } : { sellerId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(sellerId: string, dto: UpsertProductInput, imageUrl?: string) {
    return this.repo.save(this.repo.create({ ...dto, sellerId, imageUrl }));
  }

  async update(id: string, sellerId: string, dto: Partial<UpsertProductInput>, imageUrl?: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException();
    if (row.sellerId !== sellerId) throw new ForbiddenException();
    Object.assign(row, dto);
    if (imageUrl) row.imageUrl = imageUrl;
    return this.repo.save(row);
  }

  async setActive(id: string, sellerId: string, active: boolean) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException();
    if (row.sellerId !== sellerId) throw new ForbiddenException();
    row.active = active;
    return this.repo.save(row);
  }

  async remove(id: string, sellerId: string) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException();
    if (row.sellerId !== sellerId) throw new ForbiddenException();
    await this.repo.remove(row);
  }
}

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Part } from './part.entity';

@Injectable()
export class PartsService {
  constructor(@InjectRepository(Part) private repo: Repository<Part>) {}

  list(mechanicId: string, q?: string) {
    return this.repo.find({
      where: q ? { mechanicId, name: ILike(`%${q}%`) } : { mechanicId },
      order: { name: 'ASC' },
    });
  }

  create(mechanicId: string, data: Partial<Part>) {
    return this.repo.save(this.repo.create({ ...data, mechanicId }));
  }

  async update(id: string, mechanicId: string, data: Partial<Part>) {
    const part = await this.repo.findOne({ where: { id } });
    if (!part) throw new NotFoundException();
    if (part.mechanicId !== mechanicId) throw new ForbiddenException();
    Object.assign(part, data);
    return this.repo.save(part);
  }

  async remove(id: string, mechanicId: string) {
    const part = await this.repo.findOne({ where: { id } });
    if (!part) throw new NotFoundException();
    if (part.mechanicId !== mechanicId) throw new ForbiddenException();
    await this.repo.remove(part);
  }
}

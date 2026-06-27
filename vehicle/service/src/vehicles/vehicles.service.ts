import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './vehicle.entity';

@Injectable()
export class VehiclesService {
  constructor(@InjectRepository(Vehicle) private repo: Repository<Vehicle>) {}

  findAll(userId: string) {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, userId: string) {
    const v = await this.repo.findOne({ where: { id }, relations: ['serviceRecords'] });
    if (!v) throw new NotFoundException();
    if (v.userId !== userId) throw new ForbiddenException();
    v.serviceRecords?.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
    return v;
  }

  create(userId: string, data: Partial<Vehicle>) {
    const vehicle = this.repo.create({ ...data, userId });
    return this.repo.save(vehicle);
  }

  async update(id: string, userId: string, data: Partial<Vehicle>) {
    const v = await this.repo.findOne({ where: { id } });
    if (!v) throw new NotFoundException();
    if (v.userId !== userId) throw new ForbiddenException();
    Object.assign(v, data);
    return this.repo.save(v);
  }

  async remove(id: string, userId: string) {
    const v = await this.repo.findOne({ where: { id } });
    if (!v) throw new NotFoundException();
    if (v.userId !== userId) throw new ForbiddenException();
    await this.repo.remove(v);
  }
}

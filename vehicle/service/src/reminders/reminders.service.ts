import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reminder } from './reminder.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

@Injectable()
export class RemindersService {
  constructor(
    @InjectRepository(Reminder) private repo: Repository<Reminder>,
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
  ) {}

  private async check(vehicleId: string, userId: string) {
    const v = await this.vehicles.findOne({ where: { id: vehicleId } });
    if (!v) throw new NotFoundException();
    if (v.userId !== userId) throw new ForbiddenException();
  }

  async list(vehicleId: string, userId: string) {
    await this.check(vehicleId, userId);
    return this.repo.find({ where: { vehicleId }, order: { isCompleted: 'ASC', dueDate: 'ASC' } });
  }

  async create(vehicleId: string, userId: string, data: Partial<Reminder>) {
    await this.check(vehicleId, userId);
    return this.repo.save(this.repo.create({ ...data, vehicleId }));
  }

  async toggle(id: string, userId: string) {
    const r = await this.repo.findOne({ where: { id }, relations: ['vehicle'] });
    if (!r) throw new NotFoundException();
    if (r.vehicle.userId !== userId) throw new ForbiddenException();
    r.isCompleted = !r.isCompleted;
    return this.repo.save(r);
  }

  async remove(id: string, userId: string) {
    const r = await this.repo.findOne({ where: { id }, relations: ['vehicle'] });
    if (!r) throw new NotFoundException();
    if (r.vehicle.userId !== userId) throw new ForbiddenException();
    await this.repo.remove(r);
  }
}

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleDocument } from './document.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(VehicleDocument) private repo: Repository<VehicleDocument>,
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
  ) {}

  private async check(vehicleId: string, userId: string) {
    const v = await this.vehicles.findOne({ where: { id: vehicleId } });
    if (!v) throw new NotFoundException();
    if (v.userId !== userId) throw new ForbiddenException();
  }

  async list(vehicleId: string, userId: string) {
    await this.check(vehicleId, userId);
    return this.repo.find({ where: { vehicleId }, order: { expiryDate: 'ASC' } });
  }

  async create(vehicleId: string, userId: string, data: Partial<VehicleDocument>) {
    await this.check(vehicleId, userId);
    const doc = this.repo.create({ ...data, vehicleId });
    return this.repo.save(doc);
  }

  async update(id: string, userId: string, data: Partial<VehicleDocument>) {
    const doc = await this.repo.findOne({ where: { id }, relations: ['vehicle'] });
    if (!doc) throw new NotFoundException();
    if (doc.vehicle.userId !== userId) throw new ForbiddenException();
    Object.assign(doc, data);
    return this.repo.save(doc);
  }

  async remove(id: string, userId: string) {
    const doc = await this.repo.findOne({ where: { id }, relations: ['vehicle'] });
    if (!doc) throw new NotFoundException();
    if (doc.vehicle.userId !== userId) throw new ForbiddenException();
    await this.repo.remove(doc);
  }
}

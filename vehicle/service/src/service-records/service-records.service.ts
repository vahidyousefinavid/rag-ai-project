import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceRecord } from './service-record.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

@Injectable()
export class ServiceRecordsService {
  constructor(
    @InjectRepository(ServiceRecord) private repo: Repository<ServiceRecord>,
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
  ) {}

  async create(vehicleId: string, userId: string, data: Partial<ServiceRecord>) {
    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('ماشین یافت نشد');
    if (vehicle.userId !== userId) throw new ForbiddenException();

    if (data.mileage && data.mileage > vehicle.currentMileage) {
      vehicle.currentMileage = data.mileage;
      await this.vehicles.save(vehicle);
    }

    const record = this.repo.create({ ...data, vehicleId });
    return this.repo.save(record);
  }

  async findByVehicle(vehicleId: string, userId: string) {
    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException();
    if (vehicle.userId !== userId) throw new ForbiddenException();
    return this.repo.find({
      where: { vehicleId },
      order: { serviceDate: 'DESC' },
    });
  }

  async remove(id: string, userId: string) {
    const record = await this.repo.findOne({ where: { id }, relations: ['vehicle'] });
    if (!record) throw new NotFoundException();
    if (record.vehicle.userId !== userId) throw new ForbiddenException();
    await this.repo.remove(record);
  }
}

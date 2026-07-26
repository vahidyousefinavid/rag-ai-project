import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { ServiceRecord } from '../service-records/service-record.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
    @InjectRepository(ServiceRecord) private records: Repository<ServiceRecord>,
  ) {}

  async list(params: { q?: string; ownerId?: string; page: number; pageSize: number }) {
    const where: any = {};
    if (params.ownerId) where.userId = params.ownerId;
    if (params.q) where.plateNumber = ILike(`%${params.q}%`);

    const [rows, total] = await this.vehicles.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    });

    return {
      total, page: params.page, pageSize: params.pageSize,
      items: rows.map((v) => ({
        id: v.id, make: v.make, model: v.model, year: v.year, plateNumber: v.plateNumber,
        currentMileage: v.currentMileage, createdAt: v.createdAt,
        ownerName: v.user?.name, ownerPhone: v.user?.phone,
      })),
    };
  }

  async detail(id: string) {
    const vehicle = await this.vehicles.findOne({ where: { id }, relations: ['user'] });
    if (!vehicle) throw new NotFoundException();
    const records = await this.records.find({ where: { vehicleId: id }, order: { serviceDate: 'DESC' } });
    return { ...vehicle, serviceRecords: records };
  }
}

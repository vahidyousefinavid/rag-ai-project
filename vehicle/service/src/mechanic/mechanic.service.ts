import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehicleAccessService } from '../vehicle-access/vehicle-access.service';
import { ServiceRecordsService } from '../service-records/service-records.service';

@Injectable()
export class MechanicService {
  constructor(
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
    private access: VehicleAccessService,
    private serviceRecords: ServiceRecordsService,
  ) {}

  async getVehicleDetail(vehicleId: string, mechanicId: string) {
    await this.access.assertAccess(vehicleId, mechanicId, ['mechanic']);
    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId }, relations: ['user'] });
    if (!vehicle) throw new NotFoundException('ماشین یافت نشد');

    const records = await this.serviceRecords.findByVehicle(vehicleId, mechanicId);

    return {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      plateNumber: vehicle.plateNumber,
      color: vehicle.color,
      currentMileage: vehicle.currentMileage,
      fuelType: vehicle.fuelType,
      engineCapacity: vehicle.engineCapacity,
      transmission: vehicle.transmission,
      ownerName: vehicle.user?.name,
      serviceRecords: records,
    };
  }
}

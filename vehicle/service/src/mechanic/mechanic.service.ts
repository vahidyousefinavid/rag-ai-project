import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, IsNull, Repository } from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';
import { User } from '../users/user.entity';
import { VehicleAccessService } from '../vehicle-access/vehicle-access.service';
import { ServiceRecordsService } from '../service-records/service-records.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MechanicService {
  constructor(
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
    @InjectRepository(User) private users: Repository<User>,
    private access: VehicleAccessService,
    private serviceRecords: ServiceRecordsService,
    private notifications: NotificationsService,
  ) {}

  async createVehicle(mechanicId: string, dto: Partial<Vehicle>) {
    const plateNumber = dto.plateNumber?.trim() || undefined;

    let shadow = plateNumber
      ? await this.vehicles.findOne({ where: { plateNumber, userId: IsNull(), addedByMechanicId: mechanicId } })
      : null;

    const isNew = !shadow;
    if (shadow) {
      Object.assign(shadow, dto, { plateNumber });
      await this.vehicles.save(shadow);
    } else {
      shadow = this.vehicles.create({ ...dto, plateNumber, userId: null, addedByMechanicId: mechanicId });
      await this.vehicles.save(shadow);
      await this.access.grantDirect(shadow.id, mechanicId);
    }

    if (isNew && plateNumber) {
      const real = await this.vehicles.findOne({ where: { plateNumber, userId: Not(IsNull()) } });
      if (real) {
        shadow.linkStatus = 'pending';
        shadow.linkedOwnerId = real.userId;
        await this.vehicles.save(shadow);

        const mechanic = await this.users.findOne({ where: { id: mechanicId } });
        if (mechanic) {
          await this.notifications.createMechanicLinkRequest(real.userId, mechanic, shadow, real);
        }
      }
    }

    return shadow;
  }

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
      ownerName: vehicle.user?.name || vehicle.customerName,
      linkStatus: vehicle.linkStatus,
      customerName: vehicle.customerName,
      serviceRecords: records,
    };
  }
}

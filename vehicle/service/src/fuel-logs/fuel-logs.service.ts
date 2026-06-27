import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FuelLog } from './fuel-log.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

@Injectable()
export class FuelLogsService {
  constructor(
    @InjectRepository(FuelLog) private repo: Repository<FuelLog>,
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
  ) {}

  private async checkOwnership(vehicleId: string, userId: string) {
    const v = await this.vehicles.findOne({ where: { id: vehicleId } });
    if (!v) throw new NotFoundException();
    if (v.userId !== userId) throw new ForbiddenException();
    return v;
  }

  async list(vehicleId: string, userId: string) {
    await this.checkOwnership(vehicleId, userId);
    return this.repo.find({ where: { vehicleId }, order: { date: 'DESC' } });
  }

  async create(vehicleId: string, userId: string, data: Partial<FuelLog>) {
    const v = await this.checkOwnership(vehicleId, userId);
    if (data.mileage && data.mileage > v.currentMileage) {
      v.currentMileage = data.mileage;
      await this.vehicles.save(v);
    }
    const log = this.repo.create({ ...data, vehicleId });
    return this.repo.save(log);
  }

  async remove(id: string, userId: string) {
    const log = await this.repo.findOne({ where: { id }, relations: ['vehicle'] });
    if (!log) throw new NotFoundException();
    if (log.vehicle.userId !== userId) throw new ForbiddenException();
    await this.repo.remove(log);
  }

  async stats(vehicleId: string, userId: string) {
    await this.checkOwnership(vehicleId, userId);
    const logs = await this.repo.find({ where: { vehicleId }, order: { mileage: 'ASC' } });
    if (logs.length < 2) return { avgConsumption: null, totalCost: 0, totalLiters: 0 };

    const fullTanks = logs.filter(l => l.isFullTank);
    let totalLiters = 0, totalCost = 0;
    for (const l of logs) { totalLiters += l.liters; totalCost += l.cost || 0; }

    let avgConsumption: number | null = null;
    if (fullTanks.length >= 2) {
      const first = fullTanks[0], last = fullTanks[fullTanks.length - 1];
      const km = last.mileage - first.mileage;
      const liters = fullTanks.slice(1).reduce((s, l) => s + l.liters, 0);
      if (km > 0) avgConsumption = (liters / km) * 100;
    }
    return { avgConsumption: avgConsumption ? +avgConsumption.toFixed(1) : null, totalCost, totalLiters: +totalLiters.toFixed(1) };
  }
}

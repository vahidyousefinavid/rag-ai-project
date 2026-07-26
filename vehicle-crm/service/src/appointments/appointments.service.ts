import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from './appointment.entity';

@Injectable()
export class AppointmentsService {
  constructor(@InjectRepository(Appointment) private repo: Repository<Appointment>) {}

  async list(params: { status?: AppointmentStatus; page: number; pageSize: number }) {
    const where: any = {};
    if (params.status) where.status = params.status;

    const [rows, total] = await this.repo.findAndCount({
      where,
      relations: ['vehicle', 'owner', 'mechanic'],
      order: { createdAt: 'DESC' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    });

    return {
      total, page: params.page, pageSize: params.pageSize,
      items: rows.map((a) => ({
        id: a.id, requestedAt: a.requestedAt, serviceType: a.serviceType, status: a.status,
        mode: a.mode, address: a.address, createdAt: a.createdAt,
        vehicle: a.vehicle ? { make: a.vehicle.make, model: a.vehicle.model, plateNumber: a.vehicle.plateNumber } : null,
        ownerName: a.owner?.name, ownerPhone: a.owner?.phone,
        mechanicName: a.mechanic?.workshopName || a.mechanic?.name,
      })),
    };
  }
}

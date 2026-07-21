import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment, AppointmentMode } from './appointment.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment) private repo: Repository<Appointment>,
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
    @InjectRepository(User) private users: Repository<User>,
    private notifications: NotificationsService,
  ) {}

  async create(
    ownerId: string,
    dto: {
      vehicleId: string; mechanicId: string; requestedAt: string; serviceType?: string; notes?: string;
      mode?: AppointmentMode; address?: string; lat?: number; lng?: number;
    },
  ) {
    const vehicle = await this.vehicles.findOne({ where: { id: dto.vehicleId } });
    if (!vehicle || vehicle.userId !== ownerId) throw new ForbiddenException();
    const mechanic = await this.users.findOne({ where: { id: dto.mechanicId, role: 'mechanic' } });
    if (!mechanic) throw new NotFoundException('تعمیرگاه یافت نشد');

    const mode = dto.mode ?? 'in_shop';
    if (mode === 'on_site' && !dto.address) {
      throw new BadRequestException('برای سرویس در محل، آدرس الزامی است');
    }

    const appointment = await this.repo.save(
      this.repo.create({
        vehicleId: dto.vehicleId,
        ownerId,
        mechanicId: dto.mechanicId,
        requestedAt: dto.requestedAt,
        serviceType: dto.serviceType,
        notes: dto.notes,
        status: 'pending',
        mode,
        address: mode === 'on_site' ? dto.address : undefined,
        lat: mode === 'on_site' ? dto.lat : undefined,
        lng: mode === 'on_site' ? dto.lng : undefined,
      }),
    );

    const owner = await this.users.findOne({ where: { id: ownerId } });
    const modeLabel = mode === 'on_site' ? 'در محل' : 'حضوری';
    await this.notifications.create(dto.mechanicId, {
      type: 'appointment_request',
      status: 'confirmed',
      title: 'درخواست نوبت جدید',
      body: `${owner?.name || 'یک کاربر'} برای ${vehicle.make} ${vehicle.model} درخواست نوبت ${modeLabel} داده${dto.serviceType ? ` (${dto.serviceType})` : ''}`,
      data: { appointmentId: appointment.id, vehicleId: vehicle.id },
    });

    return appointment;
  }

  async respond(appointmentId: string, mechanicId: string, status: 'confirmed' | 'rejected') {
    const appointment = await this.repo.findOne({ where: { id: appointmentId }, relations: ['vehicle'] });
    if (!appointment) throw new NotFoundException();
    if (appointment.mechanicId !== mechanicId) throw new ForbiddenException();
    if (appointment.status !== 'pending') throw new BadRequestException('این نوبت قبلاً پاسخ داده شده');

    appointment.status = status;
    await this.repo.save(appointment);

    const mechanic = await this.users.findOne({ where: { id: mechanicId } });
    await this.notifications.create(appointment.ownerId, {
      type: 'appointment_status',
      status: 'confirmed',
      title: status === 'confirmed' ? 'نوبت تایید شد' : 'نوبت رد شد',
      body: `${mechanic?.workshopName || mechanic?.name || 'تعمیرگاه'} نوبت ${appointment.vehicle.make} ${appointment.vehicle.model} را ${status === 'confirmed' ? 'تایید کرد' : 'رد کرد'}`,
      data: { appointmentId: appointment.id, vehicleId: appointment.vehicleId },
    });

    return appointment;
  }

  async complete(appointmentId: string, mechanicId: string) {
    const appointment = await this.repo.findOne({ where: { id: appointmentId } });
    if (!appointment) throw new NotFoundException();
    if (appointment.mechanicId !== mechanicId) throw new ForbiddenException();
    if (appointment.status !== 'confirmed') throw new BadRequestException('فقط نوبت تاییدشده قابل تکمیل است');
    appointment.status = 'completed';
    return this.repo.save(appointment);
  }

  async cancel(appointmentId: string, ownerId: string) {
    const appointment = await this.repo.findOne({ where: { id: appointmentId } });
    if (!appointment) throw new NotFoundException();
    if (appointment.ownerId !== ownerId) throw new ForbiddenException();
    if (!['pending', 'confirmed'].includes(appointment.status)) throw new BadRequestException('این نوبت قابل لغو نیست');
    appointment.status = 'cancelled';
    return this.repo.save(appointment);
  }

  listForOwner(ownerId: string) {
    return this.repo.find({ where: { ownerId }, relations: ['vehicle', 'mechanic'], order: { requestedAt: 'DESC' } });
  }

  listForMechanic(mechanicId: string) {
    return this.repo.find({ where: { mechanicId }, relations: ['vehicle', 'owner'], order: { requestedAt: 'DESC' } });
  }
}

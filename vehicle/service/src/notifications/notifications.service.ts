import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, MechanicLinkRequestData, NotificationData } from './notification.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { ServiceRecord } from '../service-records/service-record.entity';
import { User } from '../users/user.entity';
import { VehicleAccessService } from '../vehicle-access/vehicle-access.service';
import { PushService } from '../push/push.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private repo: Repository<Notification>,
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
    @InjectRepository(ServiceRecord) private records: Repository<ServiceRecord>,
    private access: VehicleAccessService,
    @Optional() private push?: PushService,
  ) {}

  async createMechanicLinkRequest(ownerId: string, mechanic: User, shadowVehicle: Vehicle, realVehicle: Vehicle) {
    const plate = realVehicle.plateNumber || shadowVehicle.plateNumber || '';
    const workshop = mechanic.workshopName || mechanic.name;
    return this.create(ownerId, {
      type: 'mechanic_link_request',
      status: 'pending',
      title: 'درخواست اتصال تعمیرگاه',
      body: `تعمیرگاه «${workshop}» خودرویی با پلاک ${plate} را به نام تو ثبت کرده. تایید می‌کنی؟`,
      data: {
        mechanicVehicleId: shadowVehicle.id,
        realVehicleId: realVehicle.id,
        mechanicId: mechanic.id,
        workshopName: workshop,
        plateNumber: plate,
      },
    });
  }

  async create(userId: string, dto: { type: string; status?: 'pending' | 'confirmed' | 'rejected'; title: string; body: string; data?: NotificationData | null }) {
    const notification = this.repo.create({
      userId,
      type: dto.type,
      status: dto.status ?? 'confirmed',
      title: dto.title,
      body: dto.body,
      data: dto.data ?? null,
    });
    const saved = await this.repo.save(notification);
    this.push?.notifyUser(userId, { title: dto.title, body: dto.body }).catch(() => {});
    return saved;
  }

  listForUser(userId: string) {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 50 });
  }

  unreadCount(userId: string) {
    return this.repo.count({ where: { userId, read: false } });
  }

  async markRead(id: string, userId: string) {
    const notification = await this.repo.findOne({ where: { id } });
    if (!notification) throw new NotFoundException();
    if (notification.userId !== userId) throw new ForbiddenException();
    notification.read = true;
    return this.repo.save(notification);
  }

  async confirm(id: string, userId: string) {
    const notification = await this.load(id, userId);
    if (notification.status !== 'pending') return notification;
    if (notification.type !== 'mechanic_link_request' || !notification.data) {
      throw new BadRequestException('نوع نوتیف نامعتبر است');
    }

    const { mechanicVehicleId, realVehicleId, mechanicId } = notification.data as MechanicLinkRequestData;
    const real = await this.vehicles.findOne({ where: { id: realVehicleId } });
    if (!real) throw new NotFoundException('خودرو یافت نشد');

    const shadow = await this.vehicles.findOne({ where: { id: mechanicVehicleId } });
    if (shadow) {
      await this.records.update({ vehicleId: shadow.id }, { vehicleId: real.id });
      if (shadow.currentMileage > real.currentMileage) {
        real.currentMileage = shadow.currentMileage;
        await this.vehicles.save(real);
      }
    }

    await this.access.grantDirect(real.id, mechanicId);

    if (shadow) await this.vehicles.remove(shadow);

    notification.status = 'confirmed';
    notification.read = true;
    return this.repo.save(notification);
  }

  async reject(id: string, userId: string) {
    const notification = await this.load(id, userId);
    if (notification.status !== 'pending') return notification;

    const linkData = notification.data as MechanicLinkRequestData | null;
    if (linkData?.mechanicVehicleId) {
      await this.vehicles.update({ id: linkData.mechanicVehicleId }, { linkStatus: 'rejected' });
    }

    notification.status = 'rejected';
    notification.read = true;
    return this.repo.save(notification);
  }

  private async load(id: string, userId: string) {
    const notification = await this.repo.findOne({ where: { id } });
    if (!notification) throw new NotFoundException();
    if (notification.userId !== userId) throw new ForbiddenException();
    return notification;
  }
}

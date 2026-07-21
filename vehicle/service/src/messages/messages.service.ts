import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehicleAccess } from '../vehicle-access/vehicle-access.entity';
import { User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message) private repo: Repository<Message>,
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
    @InjectRepository(VehicleAccess) private access: Repository<VehicleAccess>,
    @InjectRepository(User) private users: Repository<User>,
    private notifications: NotificationsService,
  ) {}

  private async assertConversation(vehicleId: string, mechanicId: string, userId: string, role: 'owner' | 'mechanic') {
    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('ماشین یافت نشد');

    if (role === 'owner') {
      if (vehicle.userId !== userId) throw new ForbiddenException();
    } else {
      if (mechanicId !== userId) throw new ForbiddenException();
    }

    const grant = await this.access.findOne({ where: { vehicleId, mechanicId, revoked: false } });
    if (!grant) throw new ForbiddenException('این تعمیرگاه به این خودرو دسترسی ندارد');
    return vehicle;
  }

  async list(vehicleId: string, mechanicId: string, userId: string, role: 'owner' | 'mechanic') {
    await this.assertConversation(vehicleId, mechanicId, userId, role);
    const rows = await this.repo.find({ where: { vehicleId, mechanicId }, order: { createdAt: 'ASC' }, take: 200 });
    await this.repo
      .createQueryBuilder()
      .update(Message)
      .set({ read: true })
      .where('vehicleId = :vehicleId', { vehicleId })
      .andWhere('mechanicId = :mechanicId', { mechanicId })
      .andWhere('senderId != :userId', { userId })
      .andWhere('read = false')
      .execute();
    return rows;
  }

  async send(vehicleId: string, mechanicId: string, userId: string, role: 'owner' | 'mechanic', body: string) {
    const vehicle = await this.assertConversation(vehicleId, mechanicId, userId, role);
    const message = await this.repo.save(this.repo.create({ vehicleId, mechanicId, senderId: userId, senderRole: role, body }));

    const recipientId = role === 'owner' ? mechanicId : vehicle.userId;
    if (recipientId) {
      const sender = await this.users.findOne({ where: { id: userId } });
      await this.notifications.create(recipientId, {
        type: 'new_message',
        status: 'confirmed',
        title: `پیام جدید از ${sender?.name || (role === 'owner' ? 'مالک' : 'تعمیرگاه')}`,
        body: body.length > 80 ? body.slice(0, 80) + '…' : body,
        data: { vehicleId, mechanicId },
      });
    }

    return message;
  }

  async unreadCount(userId: string, role: 'owner' | 'mechanic') {
    const qb = this.repo.createQueryBuilder('m').where('m.read = false').andWhere('m.senderId != :userId', { userId });
    if (role === 'mechanic') {
      qb.andWhere('m.mechanicId = :userId', { userId });
    } else {
      qb.innerJoin(Vehicle, 'v', 'v.id = m.vehicleId').andWhere('v.userId = :userId', { userId });
    }
    return qb.getCount();
  }

  async conversations(userId: string, role: 'owner' | 'mechanic') {
    const qb = this.access
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.vehicle', 'v')
      .innerJoinAndSelect('a.mechanic', 'mech')
      .leftJoinAndSelect('v.user', 'owner')
      .where('a.revoked = false');
    if (role === 'owner') qb.andWhere('v.userId = :userId', { userId });
    else qb.andWhere('a.mechanicId = :userId', { userId });
    const grants = await qb.getMany();

    if (grants.length === 0) return [];

    const pairs = grants.map((g) => ({ vehicleId: g.vehicleId, mechanicId: g.mechanicId }));
    const messages = await this.repo
      .createQueryBuilder('m')
      .where(
        pairs
          .map((_, i) => `(m.vehicleId = :vid${i} AND m.mechanicId = :mid${i})`)
          .join(' OR '),
        Object.fromEntries(pairs.flatMap((p, i) => [[`vid${i}`, p.vehicleId], [`mid${i}`, p.mechanicId]])),
      )
      .orderBy('m.createdAt', 'ASC')
      .getMany();

    const byPair = new Map<string, { last?: Message; unread: number }>();
    for (const m of messages) {
      const key = `${m.vehicleId}:${m.mechanicId}`;
      const entry = byPair.get(key) ?? { unread: 0 };
      entry.last = m;
      if (!m.read && m.senderId !== userId) entry.unread++;
      byPair.set(key, entry);
    }

    return grants
      .map((g) => {
        const entry = byPair.get(`${g.vehicleId}:${g.mechanicId}`);
        return {
          vehicleId: g.vehicleId,
          mechanicId: g.mechanicId,
          vehicle: { make: g.vehicle.make, model: g.vehicle.model, year: g.vehicle.year, plateNumber: g.vehicle.plateNumber },
          counterpartName: role === 'owner' ? (g.mechanic.workshopName || g.mechanic.name) : (g.vehicle.user?.name || g.vehicle.customerName || 'مالک'),
          lastMessage: entry?.last?.body,
          lastMessageAt: entry?.last?.createdAt,
          unreadCount: entry?.unread ?? 0,
        };
      })
      .sort((a, b) => {
        const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bt - at;
      });
  }
}

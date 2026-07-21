import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './organization.entity';
import { OrganizationMember } from './organization-member.entity';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization) private orgs: Repository<Organization>,
    @InjectRepository(OrganizationMember) private members: Repository<OrganizationMember>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
  ) {}

  async create(ownerId: string, name: string) {
    const org = await this.orgs.save(this.orgs.create({ name, ownerId }));
    await this.members.save(this.members.create({ organizationId: org.id, userId: ownerId, role: 'admin' }));
    return org;
  }

  async listMine(userId: string) {
    const rows = await this.members.find({ where: { userId }, relations: ['organization'] });
    return rows.map((m) => ({ id: m.organization.id, name: m.organization.name, role: m.role, createdAt: m.organization.createdAt }));
  }

  private async assertAdmin(organizationId: string, userId: string) {
    const membership = await this.members.findOne({ where: { organizationId, userId } });
    if (!membership || membership.role !== 'admin') throw new ForbiddenException('فقط مدیر سازمان می‌تواند این کار را انجام دهد');
    return membership;
  }

  private async assertMember(organizationId: string, userId: string) {
    const membership = await this.members.findOne({ where: { organizationId, userId } });
    if (!membership) throw new ForbiddenException();
    return membership;
  }

  async listMembers(organizationId: string, userId: string) {
    await this.assertMember(organizationId, userId);
    const rows = await this.members.find({ where: { organizationId }, relations: ['user'] });
    return rows.map((m) => ({ id: m.id, userId: m.userId, name: m.user.name, phone: m.user.phone, role: m.role }));
  }

  async addMember(organizationId: string, adminId: string, phone: string, role: 'admin' | 'driver') {
    await this.assertAdmin(organizationId, adminId);
    const user = await this.users.findOne({ where: { phone } });
    if (!user) throw new NotFoundException('کاربری با این شماره پیدا نشد؛ باید قبلاً در اپ ثبت‌نام کرده باشد');
    const existing = await this.members.findOne({ where: { organizationId, userId: user.id } });
    if (existing) throw new BadRequestException('این کاربر قبلاً عضو سازمان است');
    return this.members.save(this.members.create({ organizationId, userId: user.id, role }));
  }

  async removeMember(organizationId: string, adminId: string, memberUserId: string) {
    const org = await this.orgs.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException();
    if (org.ownerId === memberUserId) throw new BadRequestException('مالک سازمان قابل حذف نیست');
    await this.assertAdmin(organizationId, adminId);
    await this.members.delete({ organizationId, userId: memberUserId });
  }

  async assignVehicle(organizationId: string, adminId: string, vehicleId: string) {
    await this.assertAdmin(organizationId, adminId);
    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('ماشین یافت نشد');
    if (vehicle.userId !== adminId) throw new ForbiddenException('فقط مالک خودرو می‌تواند آن را به سازمان اضافه کند');
    vehicle.organizationId = organizationId;
    return this.vehicles.save(vehicle);
  }

  async unassignVehicle(organizationId: string, adminId: string, vehicleId: string) {
    await this.assertAdmin(organizationId, adminId);
    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId, organizationId } });
    if (!vehicle) throw new NotFoundException();
    vehicle.organizationId = null as any;
    return this.vehicles.save(vehicle);
  }

  async listVehicles(organizationId: string, userId: string) {
    await this.assertMember(organizationId, userId);
    return this.vehicles.find({ where: { organizationId }, relations: ['user'] });
  }
}

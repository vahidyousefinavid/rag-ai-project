import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehicleInvite } from './vehicle-invite.entity';
import { VehicleAccess } from './vehicle-access.entity';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // excludes 0/O/1/I/L for readability
const CODE_LENGTH = 8;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const POSTGRES_UNIQUE_VIOLATION = '23505';

export interface VehicleAccessResolution {
  isOwner: boolean;
  isMechanic: boolean;
}

@Injectable()
export class VehicleAccessService {
  constructor(
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
    @InjectRepository(VehicleInvite) private invites: Repository<VehicleInvite>,
    @InjectRepository(VehicleAccess) private access: Repository<VehicleAccess>,
  ) {}

  async resolveAccess(vehicleId: string, userId: string): Promise<VehicleAccessResolution> {
    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('ماشین یافت نشد');
    if (vehicle.userId === userId) return { isOwner: true, isMechanic: false };
    const grant = await this.access.findOne({ where: { vehicleId, mechanicId: userId, revoked: false } });
    return { isOwner: false, isMechanic: !!grant };
  }

  async assertAccess(
    vehicleId: string,
    userId: string,
    allow: ('owner' | 'mechanic')[],
  ): Promise<VehicleAccessResolution> {
    const resolution = await this.resolveAccess(vehicleId, userId);
    const ok =
      (resolution.isOwner && allow.includes('owner')) ||
      (resolution.isMechanic && allow.includes('mechanic'));
    if (!ok) throw new ForbiddenException();
    return resolution;
  }

  async createInvite(vehicleId: string, ownerId: string) {
    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('ماشین یافت نشد');
    if (vehicle.userId !== ownerId) throw new ForbiddenException();

    const invite = this.invites.create({
      vehicleId,
      code: this.generateCode(),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    });
    return this.invites.save(invite);
  }

  async listAccess(vehicleId: string, ownerId: string) {
    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('ماشین یافت نشد');
    if (vehicle.userId !== ownerId) throw new ForbiddenException();

    const rows = await this.access.find({
      where: { vehicleId, revoked: false },
      relations: ['mechanic'],
      order: { grantedAt: 'DESC' },
    });
    return rows.map((r) => ({
      id: r.id,
      mechanicId: r.mechanicId,
      workshopName: r.mechanic?.workshopName,
      workshopAddress: r.mechanic?.workshopAddress,
      mechanicPhone: r.mechanic?.phone,
      grantedAt: r.grantedAt,
    }));
  }

  async revokeAccess(vehicleId: string, accessId: string, ownerId: string) {
    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('ماشین یافت نشد');
    if (vehicle.userId !== ownerId) throw new ForbiddenException();

    const grant = await this.access.findOne({ where: { id: accessId, vehicleId } });
    if (!grant) throw new NotFoundException();
    grant.revoked = true;
    await this.access.save(grant);
  }

  async redeem(code: string, mechanicId: string) {
    const normalized = code.trim().toUpperCase();
    const result = await this.invites
      .createQueryBuilder()
      .update(VehicleInvite)
      .set({ usedByUserId: mechanicId, usedAt: new Date() })
      .where('code = :code', { code: normalized })
      .andWhere('"usedByUserId" IS NULL')
      .andWhere('revoked = false')
      .andWhere('"expiresAt" > :now', { now: new Date() })
      .returning('*')
      .execute();

    if (result.affected === 0) {
      throw new BadRequestException('کد نامعتبر، منقضی‌شده یا استفاده‌شده است');
    }
    const invite = result.raw[0];

    try {
      const grant = this.access.create({
        vehicleId: invite.vehicleId,
        mechanicId,
        inviteId: invite.id,
      });
      await this.access.save(grant);
    } catch (e: any) {
      if (e.code !== POSTGRES_UNIQUE_VIOLATION) throw e;
      // already has active access to this vehicle — redemption still succeeds
    }

    const vehicle = await this.vehicles.findOne({ where: { id: invite.vehicleId } });
    return { vehicleId: invite.vehicleId, make: vehicle?.make, model: vehicle?.model };
  }

  async grantDirect(vehicleId: string, mechanicId: string) {
    try {
      const grant = this.access.create({ vehicleId, mechanicId });
      await this.access.save(grant);
    } catch (e: any) {
      if (e.code !== POSTGRES_UNIQUE_VIOLATION) throw e;
      // already has active access to this vehicle
    }
  }

  async listMechanicVehicles(mechanicId: string) {
    const rows = await this.access.find({
      where: { mechanicId, revoked: false },
      relations: ['vehicle', 'vehicle.user'],
      order: { grantedAt: 'DESC' },
    });
    return rows.map((r) => ({
      accessId: r.id,
      vehicleId: r.vehicleId,
      make: r.vehicle.make,
      model: r.vehicle.model,
      year: r.vehicle.year,
      plateNumber: r.vehicle.plateNumber,
      currentMileage: r.vehicle.currentMileage,
      ownerName: r.vehicle.user?.name || r.vehicle.customerName,
      grantedAt: r.grantedAt,
      linkStatus: r.vehicle.linkStatus,
      customerName: r.vehicle.customerName,
    }));
  }

  private generateCode(): string {
    let code = '';
    const bytes = crypto.randomBytes(CODE_LENGTH);
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    }
    return code;
  }
}

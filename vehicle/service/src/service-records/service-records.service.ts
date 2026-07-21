import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceRecord } from './service-record.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehicleAccessService } from '../vehicle-access/vehicle-access.service';

@Injectable()
export class ServiceRecordsService {
  constructor(
    @InjectRepository(ServiceRecord) private repo: Repository<ServiceRecord>,
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
    private access: VehicleAccessService,
  ) {}

  async create(
    vehicleId: string,
    userId: string,
    role: 'owner' | 'mechanic',
    data: Partial<ServiceRecord>,
  ) {
    await this.access.assertAccess(vehicleId, userId, ['owner', 'mechanic']);
    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('ماشین یافت نشد');

    if (data.mileage && data.mileage > vehicle.currentMileage) {
      vehicle.currentMileage = data.mileage;
      await this.vehicles.save(vehicle);
    }

    const record = this.repo.create({
      ...data,
      vehicleId,
      createdByUserId: userId,
      createdByRole: role,
    });
    const saved = await this.repo.save(record);
    return this.toResponse(saved, { name: undefined, role });
  }

  async findByVehicle(vehicleId: string, userId: string) {
    await this.access.assertAccess(vehicleId, userId, ['owner', 'mechanic']);
    const records = await this.repo.find({
      where: { vehicleId },
      order: { serviceDate: 'DESC' },
      relations: ['createdBy', 'invoice', 'invoice.items'],
    });
    return records.map((r) => this.toResponse(r, { name: r.createdBy?.name, role: r.createdByRole }));
  }

  async update(id: string, userId: string, data: Partial<ServiceRecord>) {
    const record = await this.repo.findOne({ where: { id }, relations: ['vehicle'] });
    if (!record) throw new NotFoundException();
    const resolution = await this.access.assertAccess(record.vehicleId, userId, ['owner', 'mechanic']);

    // mechanics may edit any record on a vehicle they have access to; an owner may only
    // edit records they logged themselves — records a mechanic logged stay read-only for them
    const canEdit = resolution.isMechanic || (resolution.isOwner && record.createdByRole === 'owner');
    if (!canEdit) throw new ForbiddenException('این سرویس توسط تعمیرگاه ثبت شده و قابل ویرایش توسط شما نیست');

    Object.assign(record, data);
    await this.repo.save(record);

    if (data.mileage && record.vehicle && data.mileage > record.vehicle.currentMileage) {
      record.vehicle.currentMileage = data.mileage;
      await this.vehicles.save(record.vehicle);
    }

    const full = await this.repo.findOne({
      where: { id },
      relations: ['createdBy', 'invoice', 'invoice.items'],
    });
    return this.toResponse(full!, { name: full!.createdBy?.name, role: full!.createdByRole });
  }

  async historyForPdf(vehicleId: string, userId: string) {
    await this.access.assertAccess(vehicleId, userId, ['owner', 'mechanic']);
    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('ماشین یافت نشد');
    const records = await this.repo.find({ where: { vehicleId }, order: { serviceDate: 'DESC' } });
    return { vehicle, records };
  }

  async remove(id: string, userId: string) {
    const record = await this.repo.findOne({ where: { id }, relations: ['vehicle'] });
    if (!record) throw new NotFoundException();
    const resolution = await this.access.assertAccess(record.vehicleId, userId, ['owner', 'mechanic']);
    if (!resolution.isOwner && record.createdByUserId !== userId) throw new ForbiddenException();
    await this.repo.remove(record);
  }

  private toResponse(record: ServiceRecord, createdBy: { name?: string; role?: string | null }) {
    const { invoice, createdBy: _omit, ...rest } = record as any;
    let invoiceSummary: any = undefined;
    if (invoice) {
      const items = invoice.items ?? [];
      const subtotal = items.reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0);
      const total = subtotal - invoice.discount;
      const paymentStatus = invoice.paidAmount <= 0 ? 'unpaid' : invoice.paidAmount >= total ? 'paid' : 'partial';
      invoiceSummary = { subtotal, total, paidAmount: invoice.paidAmount, paymentStatus, itemCount: items.length };
    }
    return { ...rest, createdByName: createdBy.name, createdByRole: createdBy.role, invoice: invoiceSummary };
  }
}

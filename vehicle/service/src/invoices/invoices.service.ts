import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Invoice } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
import { ServiceRecord } from '../service-records/service-record.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehicleAccessService } from '../vehicle-access/vehicle-access.service';

export interface InvoiceItemInput {
  type: 'part' | 'labor';
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface UpsertInvoiceInput {
  discount?: number;
  paidAmount?: number;
  notes?: string;
  items: InvoiceItemInput[];
}

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice) private invoices: Repository<Invoice>,
    @InjectRepository(ServiceRecord) private records: Repository<ServiceRecord>,
    @InjectRepository(Vehicle) private vehicles: Repository<Vehicle>,
    private access: VehicleAccessService,
    private dataSource: DataSource,
  ) {}

  async upsert(vehicleId: string, recordId: string, userId: string, dto: UpsertInvoiceInput) {
    const record = await this.getRecordForVehicle(vehicleId, recordId);
    await this.access.assertAccess(vehicleId, userId, ['owner', 'mechanic']);

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('حداقل یک قلم هزینه لازم است');
    }
    for (const item of dto.items) {
      if (item.quantity <= 0 || item.unitPrice < 0) {
        throw new BadRequestException('تعداد و قیمت اقلام باید معتبر باشد');
      }
    }
    const subtotal = dto.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const discount = dto.discount ?? 0;
    if (discount < 0 || discount > subtotal) {
      throw new BadRequestException('تخفیف نامعتبر است');
    }

    return this.dataSource.transaction(async (manager) => {
      let invoice = await manager.findOne(Invoice, { where: { serviceRecordId: recordId } });
      if (invoice) {
        await manager.delete(InvoiceItem, { invoiceId: invoice.id });
      } else {
        invoice = manager.create(Invoice, { serviceRecordId: recordId });
      }
      invoice.createdByUserId = userId;
      invoice.discount = discount;
      invoice.paidAmount = dto.paidAmount ?? 0;
      invoice.notes = dto.notes;
      invoice.items = dto.items.map((i) =>
        manager.create(InvoiceItem, {
          type: i.type,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        }),
      );
      const saved = await manager.save(Invoice, invoice);
      return this.toResponse(saved);
    });
  }

  async get(vehicleId: string, recordId: string, userId: string) {
    await this.getRecordForVehicle(vehicleId, recordId);
    await this.access.assertAccess(vehicleId, userId, ['owner', 'mechanic']);

    const invoice = await this.invoices.findOne({ where: { serviceRecordId: recordId }, relations: ['items'] });
    if (!invoice) throw new NotFoundException();
    return this.toResponse(invoice);
  }

  async remove(vehicleId: string, recordId: string, userId: string) {
    await this.getRecordForVehicle(vehicleId, recordId);
    const resolution = await this.access.assertAccess(vehicleId, userId, ['owner', 'mechanic']);

    const invoice = await this.invoices.findOne({ where: { serviceRecordId: recordId } });
    if (!invoice) throw new NotFoundException();
    if (!resolution.isOwner && invoice.createdByUserId !== userId) throw new ForbiddenException();
    await this.invoices.remove(invoice);
  }

  async getFullForPdf(vehicleId: string, recordId: string, userId: string) {
    const record = await this.getRecordForVehicle(vehicleId, recordId);
    await this.access.assertAccess(vehicleId, userId, ['owner', 'mechanic']);
    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException();
    const invoice = await this.invoices.findOne({ where: { serviceRecordId: recordId }, relations: ['items'] });
    if (!invoice) throw new NotFoundException();
    return { vehicle, record, invoice: this.toResponse(invoice) };
  }

  private async getRecordForVehicle(vehicleId: string, recordId: string) {
    const record = await this.records.findOne({ where: { id: recordId } });
    if (!record || record.vehicleId !== vehicleId) throw new NotFoundException('سرویس یافت نشد');
    return record;
  }

  private toResponse(invoice: Invoice) {
    const items = invoice.items ?? [];
    const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const total = subtotal - invoice.discount;
    const paymentStatus = invoice.paidAmount <= 0 ? 'unpaid' : invoice.paidAmount >= total ? 'paid' : 'partial';
    return {
      id: invoice.id,
      serviceRecordId: invoice.serviceRecordId,
      createdByUserId: invoice.createdByUserId,
      discount: invoice.discount,
      paidAmount: invoice.paidAmount,
      notes: invoice.notes,
      createdAt: invoice.createdAt,
      items: items.map((i) => ({ id: i.id, type: i.type, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
      subtotal,
      total,
      paymentStatus,
    };
  }
}

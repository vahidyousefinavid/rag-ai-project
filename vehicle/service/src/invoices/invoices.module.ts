import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
import { ServiceRecord } from '../service-records/service-record.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { VehicleAccessModule } from '../vehicle-access/vehicle-access.module';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, InvoiceItem, ServiceRecord, Vehicle]), VehicleAccessModule, PdfModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}

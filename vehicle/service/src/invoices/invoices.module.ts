import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './invoice.entity';
import { InvoiceItem } from './invoice-item.entity';
import { ServiceRecord } from '../service-records/service-record.entity';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { VehicleAccessModule } from '../vehicle-access/vehicle-access.module';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, InvoiceItem, ServiceRecord]), VehicleAccessModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}

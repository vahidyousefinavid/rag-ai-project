import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceRecord } from './service-record.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { ServiceRecordsController } from './service-records.controller';
import { ServiceRecordsService } from './service-records.service';
import { VehicleAccessModule } from '../vehicle-access/vehicle-access.module';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceRecord, Vehicle]), VehicleAccessModule],
  controllers: [ServiceRecordsController],
  providers: [ServiceRecordsService],
  exports: [ServiceRecordsService],
})
export class ServiceRecordsModule {}

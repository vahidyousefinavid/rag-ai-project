import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from './vehicle.entity';
import { ServiceRecord } from '../service-records/service-record.entity';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, ServiceRecord])],
  controllers: [VehiclesController],
  providers: [VehiclesService],
})
export class VehiclesModule {}

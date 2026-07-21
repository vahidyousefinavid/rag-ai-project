import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';
import { User } from '../users/user.entity';
import { MechanicController } from './mechanic.controller';
import { MechanicService } from './mechanic.service';
import { VehicleAccessModule } from '../vehicle-access/vehicle-access.module';
import { ServiceRecordsModule } from '../service-records/service-records.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle, User]),
    VehicleAccessModule,
    ServiceRecordsModule,
    NotificationsModule,
  ],
  controllers: [MechanicController],
  providers: [MechanicService],
})
export class MechanicModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { ServiceRecord } from '../service-records/service-record.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { VehicleAccessModule } from '../vehicle-access/vehicle-access.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, Vehicle, ServiceRecord]), VehicleAccessModule, PushModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehicleInvite } from './vehicle-invite.entity';
import { VehicleAccess } from './vehicle-access.entity';
import { VehicleAccessController } from './vehicle-access.controller';
import { InvitesController } from './invites.controller';
import { VehicleAccessService } from './vehicle-access.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, VehicleInvite, VehicleAccess])],
  controllers: [VehicleAccessController, InvitesController],
  providers: [VehicleAccessService],
  exports: [VehicleAccessService],
})
export class VehicleAccessModule {}

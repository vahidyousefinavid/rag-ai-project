import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MechanicService } from './mechanic-service.entity';
import { MechanicServicesController } from './mechanic-services.controller';
import { MechanicServicesService } from './mechanic-services.service';

@Module({
  imports: [TypeOrmModule.forFeature([MechanicService])],
  controllers: [MechanicServicesController],
  providers: [MechanicServicesService],
  exports: [MechanicServicesService],
})
export class MechanicServicesModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';
import { ServiceRecord } from '../service-records/service-record.entity';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, ServiceRecord])],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}

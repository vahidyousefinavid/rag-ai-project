import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FuelLog } from './fuel-log.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { FuelLogsController } from './fuel-logs.controller';
import { FuelLogsService } from './fuel-logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([FuelLog, Vehicle])],
  controllers: [FuelLogsController],
  providers: [FuelLogsService],
  exports: [FuelLogsService],
})
export class FuelLogsModule {}

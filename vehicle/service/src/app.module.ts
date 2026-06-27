import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { ServiceRecordsModule } from './service-records/service-records.module';
import { FuelLogsModule } from './fuel-logs/fuel-logs.module';
import { DocumentsModule } from './documents/documents.module';
import { RemindersModule } from './reminders/reminders.module';
import { AiModule } from './ai/ai.module';
import { User } from './users/user.entity';
import { Vehicle } from './vehicles/vehicle.entity';
import { ServiceRecord } from './service-records/service-record.entity';
import { FuelLog } from './fuel-logs/fuel-log.entity';
import { VehicleDocument } from './documents/document.entity';
import { Reminder } from './reminders/reminder.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host:     process.env.POSTGRES_HOST     || 'localhost',
      port:     Number(process.env.POSTGRES_PORT) || 5432,
      username: process.env.POSTGRES_USER     || 'rag_user',
      password: process.env.POSTGRES_PASSWORD || 'rag_password',
      database: process.env.POSTGRES_DB       || 'vehicle_db',
      entities: [User, Vehicle, ServiceRecord, FuelLog, VehicleDocument, Reminder],
      synchronize: true,
    }),
    AuthModule,
    VehiclesModule,
    ServiceRecordsModule,
    FuelLogsModule,
    DocumentsModule,
    RemindersModule,
    AiModule,
  ],
})
export class AppModule {}

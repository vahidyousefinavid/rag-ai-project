import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { PaymentsModule } from './payments/payments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProductsModule } from './products/products.module';

import { User } from './users/user.entity';
import { Vehicle } from './vehicles/vehicle.entity';
import { ServiceRecord } from './service-records/service-record.entity';
import { FuelLog } from './fuel-logs/fuel-log.entity';
import { VehicleDocument } from './documents/document.entity';
import { Reminder } from './reminders/reminder.entity';
import { VehicleInvite } from './vehicle-access/vehicle-invite.entity';
import { VehicleAccess } from './vehicle-access/vehicle-access.entity';
import { Invoice } from './invoices/invoice.entity';
import { InvoiceItem } from './invoices/invoice-item.entity';
import { Notification } from './notifications/notification.entity';
import { Review } from './reviews/review.entity';
import { Appointment } from './appointments/appointment.entity';
import { Message } from './messages/message.entity';
import { PushSubscription } from './push/push-subscription.entity';
import { Part } from './parts/part.entity';
import { Organization } from './organizations/organization.entity';
import { OrganizationMember } from './organizations/organization-member.entity';
import { Payment } from './payments/payment.entity';
import { MechanicService } from './mechanic-services/mechanic-service.entity';
import { Product } from './products/product.entity';

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
      entities: [
        User, Vehicle, ServiceRecord, FuelLog, VehicleDocument, Reminder,
        VehicleInvite, VehicleAccess, Invoice, InvoiceItem, Notification,
        Review, Appointment, Message, PushSubscription, Part,
        Organization, OrganizationMember, Payment, MechanicService, Product,
      ],
      // This app shares the vehicle-service database but never owns the schema —
      // vehicle/service (synchronize: true) is the single source of truth for migrations.
      synchronize: false,
    }),
    AuthModule,
    DashboardModule,
    UsersModule,
    VehiclesModule,
    AppointmentsModule,
    PaymentsModule,
    ReviewsModule,
    OrganizationsModule,
    ProductsModule,
  ],
})
export class AppModule {}

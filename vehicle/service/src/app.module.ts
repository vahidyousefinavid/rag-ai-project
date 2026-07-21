import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { ServiceRecordsModule } from './service-records/service-records.module';
import { FuelLogsModule } from './fuel-logs/fuel-logs.module';
import { DocumentsModule } from './documents/documents.module';
import { RemindersModule } from './reminders/reminders.module';
import { AiModule } from './ai/ai.module';
import { VehicleAccessModule } from './vehicle-access/vehicle-access.module';
import { InvoicesModule } from './invoices/invoices.module';
import { MechanicModule } from './mechanic/mechanic.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReviewsModule } from './reviews/reviews.module';
import { WorkshopsModule } from './workshops/workshops.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { MessagesModule } from './messages/messages.module';
import { PushModule } from './push/push.module';
import { PdfModule } from './pdf/pdf.module';
import { PartsModule } from './parts/parts.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PaymentsModule } from './payments/payments.module';
import { MechanicServicesModule } from './mechanic-services/mechanic-services.module';
import { GeocodeModule } from './geocode/geocode.module';
import { MapModule } from './map/map.module';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]),
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
        Organization, OrganizationMember, Payment, MechanicService,
      ],
      synchronize: true,
    }),
    AuthModule,
    VehiclesModule,
    ServiceRecordsModule,
    FuelLogsModule,
    DocumentsModule,
    RemindersModule,
    AiModule,
    VehicleAccessModule,
    InvoicesModule,
    MechanicModule,
    NotificationsModule,
    ReviewsModule,
    WorkshopsModule,
    AppointmentsModule,
    MessagesModule,
    PushModule,
    PdfModule,
    PartsModule,
    OrganizationsModule,
    PaymentsModule,
    MechanicServicesModule,
    GeocodeModule,
    MapModule,
  ],
})
export class AppModule {}

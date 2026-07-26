import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { ServiceRecord } from '../service-records/service-record.entity';
import { FuelLog } from '../fuel-logs/fuel-log.entity';
import { VehicleDocument } from '../documents/document.entity';
import { Reminder } from '../reminders/reminder.entity';
import { VehicleInvite } from '../vehicle-access/vehicle-invite.entity';
import { VehicleAccess } from '../vehicle-access/vehicle-access.entity';
import { Invoice } from '../invoices/invoice.entity';
import { InvoiceItem } from '../invoices/invoice-item.entity';
import { Notification } from '../notifications/notification.entity';
import { Review } from '../reviews/review.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Message } from '../messages/message.entity';
import { PushSubscription } from '../push/push-subscription.entity';
import { Part } from '../parts/part.entity';
import { Organization } from '../organizations/organization.entity';
import { OrganizationMember } from '../organizations/organization-member.entity';
import { Payment } from '../payments/payment.entity';
import { MechanicService } from '../mechanic-services/mechanic-service.entity';

// Usage: PHONE=09120000000 NAME="مدیر سیستم" PASSWORD=secret npm run seed:admin
async function main() {
  const phone = process.env.PHONE;
  const name = process.env.NAME || 'مدیر سیستم';
  const password = process.env.PASSWORD;

  if (!phone || !password) {
    console.error('Usage: PHONE=... NAME=... PASSWORD=... npm run seed:admin');
    process.exit(1);
  }

  const ds = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT) || 5432,
    username: process.env.POSTGRES_USER || 'rag_user',
    password: process.env.POSTGRES_PASSWORD || 'rag_password',
    database: process.env.POSTGRES_DB || 'vehicle_db',
    entities: [
      User, Vehicle, ServiceRecord, FuelLog, VehicleDocument, Reminder,
      VehicleInvite, VehicleAccess, Invoice, InvoiceItem, Notification,
      Review, Appointment, Message, PushSubscription, Part,
      Organization, OrganizationMember, Payment, MechanicService,
    ],
  });
  await ds.initialize();
  const users = ds.getRepository(User);

  const hash = await bcrypt.hash(password, 10);
  let user = await users.findOne({ where: { phone } });
  if (user) {
    user.password = hash;
    user.role = 'admin';
    user.active = true;
    user.name = name;
    await users.save(user);
    console.log(`Updated existing user ${phone} to admin.`);
  } else {
    user = users.create({ phone, name, role: 'admin', password: hash, active: true });
    await users.save(user);
    console.log(`Created admin ${phone}.`);
  }

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

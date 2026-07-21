import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

export interface MechanicLinkRequestData {
  mechanicVehicleId: string;
  realVehicleId: string;
  mechanicId: string;
  workshopName?: string;
  plateNumber?: string;
}

export interface AppointmentNotificationData {
  appointmentId: string;
  vehicleId: string;
}

export interface MessageNotificationData {
  vehicleId: string;
  mechanicId: string;
}

export type NotificationData = MechanicLinkRequestData | AppointmentNotificationData | MessageNotificationData;

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ default: 'mechanic_link_request' })
  type: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'confirmed' | 'rejected';

  @Column()
  title: string;

  @Column()
  body: string;

  @Column({ type: 'jsonb', nullable: true })
  data: NotificationData | null;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';
import { User } from '../users/user.entity';

export type AppointmentStatus = 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';
export type AppointmentMode = 'in_shop' | 'on_site';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() vehicleId: string;
  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicleId' }) vehicle: Vehicle;

  @Column() ownerId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' }) owner: User;

  @Column() mechanicId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mechanicId' }) mechanic: User;

  @Column() requestedAt: string;
  @Column({ nullable: true }) serviceType: string;
  @Column({ nullable: true }) notes: string;
  @Column({ default: 'pending' }) status: AppointmentStatus;

  @Column({ default: 'in_shop' }) mode: AppointmentMode;
  @Column({ nullable: true }) address: string;
  @Column({ type: 'double precision', nullable: true }) lat: number;
  @Column({ type: 'double precision', nullable: true }) lng: number;

  @CreateDateColumn() createdAt: Date;
}

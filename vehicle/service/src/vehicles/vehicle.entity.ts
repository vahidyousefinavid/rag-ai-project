import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { ServiceRecord } from '../service-records/service-record.entity';
import { FuelLog } from '../fuel-logs/fuel-log.entity';
import { VehicleDocument } from '../documents/document.entity';
import { Reminder } from '../reminders/reminder.entity';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ nullable: true }) userId: string;

  @ManyToOne(() => User, (u) => u.vehicles, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' }) user: User;

  // set when a mechanic creates this vehicle before it belongs to any registered user
  @Column({ nullable: true }) addedByMechanicId: string;
  @Column({ nullable: true }) customerName: string;
  @Column({ default: 'none' }) linkStatus: 'none' | 'pending' | 'rejected';
  @Column({ nullable: true }) linkedOwnerId: string;

  @Column({ nullable: true }) organizationId: string;

  @Column() make: string;
  @Column() model: string;
  @Column() year: number;
  @Column({ nullable: true }) plateNumber: string;
  @Column({ nullable: true }) vin: string;
  @Column({ nullable: true }) color: string;
  @Column({ default: 0 }) currentMileage: number;
  @Column({ nullable: true }) notes: string;

  @Column({ nullable: true }) fuelType: string;
  @Column({ nullable: true }) engineCapacity: string;
  @Column({ nullable: true }) transmission: string;

  @Column({ nullable: true }) insuranceExpiry: string;
  @Column({ nullable: true }) technicalExpiry: string;
  @Column({ nullable: true }) registrationExpiry: string;

  @CreateDateColumn() createdAt: Date;

  @OneToMany(() => ServiceRecord, (r) => r.vehicle) serviceRecords: ServiceRecord[];
  @OneToMany(() => FuelLog, (f) => f.vehicle) fuelLogs: FuelLog[];
  @OneToMany(() => VehicleDocument, (d) => d.vehicle) documents: VehicleDocument[];
  @OneToMany(() => Reminder, (r) => r.vehicle) reminders: Reminder[];
}

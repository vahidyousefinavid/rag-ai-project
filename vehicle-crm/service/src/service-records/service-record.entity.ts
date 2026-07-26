import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';
import { User } from '../users/user.entity';
import { Invoice } from '../invoices/invoice.entity';

@Entity('service_records')
export class ServiceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vehicleId: string;

  @ManyToOne(() => Vehicle, (v) => v.serviceRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

  @Column()
  serviceType: string;

  @Column()
  serviceDate: string;

  @Column({ default: 0 })
  mileage: number;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'real', nullable: true })
  cost: number;

  @Column({ nullable: true })
  workshop: string;

  @Column({ nullable: true })
  nextServiceMileage: number;

  @Column({ nullable: true })
  nextServiceDate: string;

  @Column({ nullable: true })
  createdByUserId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  createdBy: User;

  @Column({ nullable: true })
  createdByRole: 'owner' | 'mechanic';

  @OneToOne(() => Invoice, (i) => i.serviceRecord)
  invoice: Invoice;

  @CreateDateColumn()
  createdAt: Date;
}

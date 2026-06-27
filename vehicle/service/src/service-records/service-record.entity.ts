import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';

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

  @CreateDateColumn()
  createdAt: Date;
}

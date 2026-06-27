import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';

@Entity('fuel_logs')
export class FuelLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() vehicleId: string;
  @ManyToOne(() => Vehicle, (v) => v.fuelLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicleId' }) vehicle: Vehicle;

  @Column() date: string;
  @Column({ type: 'real' }) liters: number;
  @Column({ type: 'real', nullable: true }) cost: number;
  @Column({ default: 0 }) mileage: number;
  @Column({ default: true }) isFullTank: boolean;
  @Column({ nullable: true }) station: string;
  @Column({ nullable: true }) notes: string;
  @CreateDateColumn() createdAt: Date;
}

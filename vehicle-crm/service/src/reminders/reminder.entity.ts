import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';

@Entity('reminders')
export class Reminder {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() vehicleId: string;
  @ManyToOne(() => Vehicle, (v) => v.reminders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicleId' }) vehicle: Vehicle;

  @Column() title: string;
  @Column({ nullable: true }) description: string;
  @Column({ nullable: true }) dueMileage: number;
  @Column({ nullable: true }) dueDate: string;
  @Column({ default: false }) isCompleted: boolean;
  @Column({ default: 'medium' }) priority: string; // low | medium | high
  @CreateDateColumn() createdAt: Date;
}

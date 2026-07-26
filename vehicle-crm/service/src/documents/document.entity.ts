import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';

export type DocType = 'insurance' | 'technical' | 'registration' | 'warranty' | 'other';

@Entity('vehicle_documents')
export class VehicleDocument {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() vehicleId: string;
  @ManyToOne(() => Vehicle, (v) => v.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicleId' }) vehicle: Vehicle;

  @Column() type: DocType;
  @Column() title: string;
  @Column({ nullable: true }) issueDate: string;
  @Column({ nullable: true }) expiryDate: string;
  @Column({ nullable: true }) notes: string;
  @CreateDateColumn() createdAt: Date;
}

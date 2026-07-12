import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';
import { User } from '../users/user.entity';

@Entity('vehicle_invites')
export class VehicleInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vehicleId: string;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

  @Column({ unique: true })
  code: string;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  usedByUserId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usedByUserId' })
  usedBy: User;

  @Column({ nullable: true })
  usedAt: Date;

  @Column({ default: false })
  revoked: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

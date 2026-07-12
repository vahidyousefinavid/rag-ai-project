import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';
import { User } from '../users/user.entity';
import { VehicleInvite } from './vehicle-invite.entity';

@Entity('vehicle_access')
@Index(['vehicleId', 'mechanicId'], { unique: true, where: '"revoked" = false' })
export class VehicleAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vehicleId: string;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

  @Column()
  mechanicId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mechanicId' })
  mechanic: User;

  @Column({ nullable: true })
  inviteId: string;

  @CreateDateColumn()
  grantedAt: Date;

  @Column({ default: false })
  revoked: boolean;
}

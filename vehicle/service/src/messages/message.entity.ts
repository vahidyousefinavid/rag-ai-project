import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';
import { User } from '../users/user.entity';

@Entity('messages')
@Index(['vehicleId', 'mechanicId'])
export class Message {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() vehicleId: string;
  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicleId' }) vehicle: Vehicle;

  @Column() mechanicId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mechanicId' }) mechanic: User;

  @Column() senderId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' }) sender: User;

  @Column() senderRole: 'owner' | 'mechanic';

  @Column({ type: 'text' }) body: string;
  @Column({ default: false }) read: boolean;

  @CreateDateColumn() createdAt: Date;
}

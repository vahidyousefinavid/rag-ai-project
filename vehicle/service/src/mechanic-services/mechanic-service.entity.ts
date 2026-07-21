import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('mechanic_services')
export class MechanicService {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() mechanicId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mechanicId' }) mechanic: User;

  @Column() serviceType: string;
  @Column({ nullable: true }) customName: string;
  @Column({ type: 'real', nullable: true }) price: number;
  @Column({ default: true }) supportsInShop: boolean;
  @Column({ default: false }) supportsOnSite: boolean;

  @CreateDateColumn() createdAt: Date;
}

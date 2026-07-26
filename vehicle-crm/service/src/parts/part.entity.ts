import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('parts')
export class Part {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() mechanicId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mechanicId' }) mechanic: User;

  @Column() name: string;
  @Column({ nullable: true }) category: string;
  @Column({ nullable: true }) sku: string;
  @Column({ default: 'عدد' }) unit: string;
  @Column({ type: 'real' }) unitPrice: number;
  @Column({ type: 'int', default: 0 }) quantity: number;
  @Column({ default: true }) inStock: boolean;

  @CreateDateColumn() createdAt: Date;
}

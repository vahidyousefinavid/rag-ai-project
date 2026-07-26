import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() sellerId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerId' }) seller: User;

  @Column() name: string;
  @Column({ nullable: true }) category: string;
  @Column({ type: 'text', nullable: true }) description: string;
  @Column({ type: 'real' }) price: number;
  @Column({ type: 'int', default: 0 }) stock: number;
  @Column({ default: 'عدد' }) unit: string;
  @Column({ nullable: true }) imageUrl: string;
  @Column({ default: true }) active: boolean;

  @CreateDateColumn() createdAt: Date;
}

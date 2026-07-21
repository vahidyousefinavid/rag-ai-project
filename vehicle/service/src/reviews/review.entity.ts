import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('reviews')
@Index(['mechanicId', 'ownerId'], { unique: true })
export class Review {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() mechanicId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mechanicId' }) mechanic: User;

  @Column() ownerId: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' }) owner: User;

  @Column() rating: number;
  @Column({ nullable: true }) comment: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

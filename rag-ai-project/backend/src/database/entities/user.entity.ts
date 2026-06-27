import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { ChatSession } from './chat-session.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email!: string;

  @Column({ nullable: true })
  name!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => ChatSession, (session) => session.user)
  sessions!: ChatSession[];
}

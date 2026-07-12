import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Message } from './message.entity';

@Entity('chat_sessions')
export class ChatSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  title: string;

  @ManyToOne(() => User, (user) => user.sessions, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  /**
   * RAG source scope: null = general chat, '' = "all sources" RAG chat,
   * uuid = chat scoped to a single RagSource.
   */
  @Column({ name: 'source_id', type: 'varchar', nullable: true })
  sourceId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Message, (message) => message.session)
  messages: Message[];
}

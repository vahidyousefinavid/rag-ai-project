import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type SourceType   = 'postgres' | 'mysql' | 'mongodb' | 'file';
export type SourceStatus = 'idle' | 'indexing' | 'ready' | 'error';

@Entity('rag_sources')
export class RagSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  sourceType: SourceType;

  @Column('jsonb', { default: {} })
  config: Record<string, any>;

  @Column({ default: 'idle' })
  status: SourceStatus;

  @Column({ default: 0 })
  docCount: number;

  @Column({ type: 'int', nullable: true })
  totalChunks: number | null;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type ProfileStatus = 'pending' | 'ready' | 'error';

/**
 * The local model's analysis of a source's data shape — what the data is about,
 * which field to group records by, which field is a date. Kept per-source so
 * ingestion can use it instead of pure heuristics, and kept around so future
 * profiling runs (on other sources) can be given recent profiles as context.
 */
@Entity('source_profiles')
export class SourceProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  sourceId: string;

  @Column({ default: 'pending' })
  status: ProfileStatus;

  @Column({ type: 'text', nullable: true })
  domainSummary: string | null;

  @Column({ type: 'varchar', nullable: true })
  idKey: string | null;

  @Column({ type: 'varchar', nullable: true })
  dateKey: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'text', nullable: true })
  rawResponse: string | null;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

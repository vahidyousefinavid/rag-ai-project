import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { MonitorTarget } from './monitor-target.entity';

@Entity('monitor_runs')
export class MonitorRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MonitorTarget, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_id' })
  target: MonitorTarget;

  @Column({ name: 'target_id' })
  targetId: string;

  @Column({ default: false })
  changed: boolean;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ default: 0 })
  pagesChecked: number;

  @Column({ default: 0 })
  extractedCount: number;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'text', nullable: true })
  dbSinkError: string | null;

  @CreateDateColumn()
  ranAt: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('tracks')
@Index(['userId', 'provider', 'providerId'], { unique: true })
export class Track {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ default: 'youtube' })
  provider: string;

  @Column()
  providerId: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  artist: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'int', nullable: true })
  durationSec: number;

  /** Direct, legally-licensed stream URL for providers without an embedded player (e.g. Jamendo). */
  @Column({ type: 'text', nullable: true })
  streamUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}

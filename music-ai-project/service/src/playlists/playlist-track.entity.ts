import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('playlist_tracks')
@Index(['playlistId', 'trackId'], { unique: true })
export class PlaylistTrack {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  playlistId: string;

  @Column()
  trackId: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @CreateDateColumn()
  createdAt: Date;
}

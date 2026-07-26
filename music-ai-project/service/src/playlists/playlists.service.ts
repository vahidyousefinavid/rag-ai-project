import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Playlist } from './playlist.entity';
import { PlaylistTrack } from './playlist-track.entity';
import { Track } from '../library/track.entity';
import { LibraryService } from '../library/library.service';

@Injectable()
export class PlaylistsService {
  constructor(
    @InjectRepository(Playlist) private playlists: Repository<Playlist>,
    @InjectRepository(PlaylistTrack) private playlistTracks: Repository<PlaylistTrack>,
    @InjectRepository(Track) private tracks: Repository<Track>,
    private library: LibraryService,
  ) {}

  async list(userId: string) {
    const items = await this.playlists.find({ where: { userId }, order: { createdAt: 'DESC' } });
    const counts = await this.playlistTracks
      .createQueryBuilder('pt')
      .select('pt.playlistId', 'playlistId')
      .addSelect('COUNT(*)', 'count')
      .where('pt.playlistId IN (:...ids)', { ids: items.length ? items.map((p) => p.id) : [''] })
      .groupBy('pt.playlistId')
      .getRawMany();
    const countMap = new Map(counts.map((c) => [c.playlistId, Number(c.count)]));
    return items.map((p) => ({ ...p, trackCount: countMap.get(p.id) || 0 }));
  }

  async create(userId: string, name: string, color?: string) {
    const playlist = this.playlists.create({ userId, name, color: color || undefined });
    return this.playlists.save(playlist);
  }

  async update(id: string, userId: string, dto: { name?: string; color?: string }) {
    const playlist = await this.getOwned(id, userId);
    Object.assign(playlist, dto);
    return this.playlists.save(playlist);
  }

  async remove(id: string, userId: string) {
    await this.getOwned(id, userId);
    await this.playlistTracks.delete({ playlistId: id });
    await this.playlists.delete(id);
  }

  async detail(id: string, userId: string) {
    const playlist = await this.getOwned(id, userId);
    const links = await this.playlistTracks.find({ where: { playlistId: id }, order: { position: 'ASC' } });
    const trackMap = new Map(
      (await this.tracks.find({ where: { id: In(links.length ? links.map((l) => l.trackId) : ['']) } })).map((t) => [t.id, t]),
    );
    const tracks = links.map((l) => trackMap.get(l.trackId)).filter(Boolean);
    return { ...playlist, tracks };
  }

  async addTrack(id: string, userId: string, trackId: string) {
    await this.getOwned(id, userId);
    await this.library.findOwned(trackId, userId);
    const existing = await this.playlistTracks.findOne({ where: { playlistId: id, trackId } });
    if (existing) throw new ConflictException('این آهنگ قبلاً به این دسته‌بندی اضافه شده');
    const count = await this.playlistTracks.count({ where: { playlistId: id } });
    const link = this.playlistTracks.create({ playlistId: id, trackId, position: count });
    return this.playlistTracks.save(link);
  }

  async removeTrack(id: string, userId: string, trackId: string) {
    await this.getOwned(id, userId);
    await this.playlistTracks.delete({ playlistId: id, trackId });
  }

  private async getOwned(id: string, userId: string) {
    const playlist = await this.playlists.findOne({ where: { id } });
    if (!playlist) throw new NotFoundException();
    if (playlist.userId !== userId) throw new ForbiddenException();
    return playlist;
  }
}

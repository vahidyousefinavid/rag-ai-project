import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Track } from './track.entity';

@Injectable()
export class LibraryService {
  constructor(@InjectRepository(Track) private tracks: Repository<Track>) {}

  list(userId: string) {
    return this.tracks.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async create(userId: string, dto: Partial<Track>) {
    const existing = await this.tracks.findOne({
      where: { userId, provider: dto.provider || 'youtube', providerId: dto.providerId },
    });
    if (existing) throw new ConflictException('این آهنگ قبلاً در کتابخانه ذخیره شده');
    const track = this.tracks.create({ ...dto, userId, provider: dto.provider || 'youtube' });
    return this.tracks.save(track);
  }

  async remove(id: string, userId: string) {
    const track = await this.tracks.findOne({ where: { id } });
    if (!track) throw new NotFoundException();
    if (track.userId !== userId) throw new ForbiddenException();
    await this.tracks.delete(id);
  }

  async findOwned(id: string, userId: string) {
    const track = await this.tracks.findOne({ where: { id } });
    if (!track) throw new NotFoundException();
    if (track.userId !== userId) throw new ForbiddenException();
    return track;
  }
}

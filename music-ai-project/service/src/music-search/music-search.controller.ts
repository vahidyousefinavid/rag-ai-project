import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MusicSearchService } from './music-search.service';

@UseGuards(JwtAuthGuard)
@Controller('search')
export class MusicSearchController {
  constructor(private svc: MusicSearchService) {}

  @Get()
  search(@Query('q') q: string) {
    if (!q?.trim()) throw new BadRequestException('پارامتر q الزامی است');
    return this.svc.search(q.trim());
  }
}

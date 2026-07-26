import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlaylistsService } from './playlists.service';

class CreatePlaylistDto {
  @IsString() name: string;
  @IsOptional() @IsString() color?: string;
}

class UpdatePlaylistDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() color?: string;
}

class AddTrackDto {
  @IsString() trackId: string;
}

@UseGuards(JwtAuthGuard)
@Controller('playlists')
export class PlaylistsController {
  constructor(private svc: PlaylistsService) {}

  @Get() list(@Request() req) { return this.svc.list(req.user.id); }

  @Post() create(@Body() dto: CreatePlaylistDto, @Request() req) {
    return this.svc.create(req.user.id, dto.name, dto.color);
  }

  @Get(':id') detail(@Param('id') id: string, @Request() req) { return this.svc.detail(id, req.user.id); }

  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdatePlaylistDto, @Request() req) {
    return this.svc.update(id, req.user.id, dto);
  }

  @Delete(':id') @HttpCode(204) remove(@Param('id') id: string, @Request() req) { return this.svc.remove(id, req.user.id); }

  @Post(':id/tracks') addTrack(@Param('id') id: string, @Body() dto: AddTrackDto, @Request() req) {
    return this.svc.addTrack(id, req.user.id, dto.trackId);
  }

  @Delete(':id/tracks/:trackId') @HttpCode(204) removeTrack(
    @Param('id') id: string, @Param('trackId') trackId: string, @Request() req,
  ) {
    return this.svc.removeTrack(id, req.user.id, trackId);
  }
}

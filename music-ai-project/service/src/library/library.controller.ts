import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LibraryService } from './library.service';

class AddTrackDto {
  @IsOptional() @IsIn(['youtube', 'jamendo']) provider?: 'youtube' | 'jamendo';
  @IsString() providerId: string;
  @IsString() title: string;
  @IsOptional() @IsString() artist?: string;
  @IsOptional() @IsString() thumbnailUrl?: string;
  @IsOptional() @IsNumber() @Type(() => Number) durationSec?: number;
  @IsOptional() @IsString() streamUrl?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('library')
export class LibraryController {
  constructor(private svc: LibraryService) {}

  @Get() list(@Request() req) { return this.svc.list(req.user.id); }

  @Post() create(@Body() dto: AddTrackDto, @Request() req) { return this.svc.create(req.user.id, dto); }

  @Delete(':id') @HttpCode(204) remove(@Param('id') id: string, @Request() req) { return this.svc.remove(id, req.user.id); }
}

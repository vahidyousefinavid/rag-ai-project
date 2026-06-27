import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FuelLogsService } from './fuel-logs.service';

class CreateFuelLogDto {
  @IsString() date: string;
  @IsNumber() @Type(() => Number) liters: number;
  @IsOptional() @IsNumber() @Type(() => Number) cost?: number;
  @IsOptional() @IsNumber() @Type(() => Number) mileage?: number;
  @IsOptional() @IsBoolean() isFullTank?: boolean;
  @IsOptional() @IsString() station?: string;
  @IsOptional() @IsString() notes?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('vehicles/:vehicleId/fuel')
export class FuelLogsController {
  constructor(private svc: FuelLogsService) {}

  @Get() list(@Param('vehicleId') vid: string, @Request() req) { return this.svc.list(vid, req.user.id); }
  @Get('stats') stats(@Param('vehicleId') vid: string, @Request() req) { return this.svc.stats(vid, req.user.id); }
  @Post() create(@Param('vehicleId') vid: string, @Body() dto: CreateFuelLogDto, @Request() req) { return this.svc.create(vid, req.user.id, dto); }
  @Delete(':id') @HttpCode(204) remove(@Param('id') id: string, @Request() req) { return this.svc.remove(id, req.user.id); }
}

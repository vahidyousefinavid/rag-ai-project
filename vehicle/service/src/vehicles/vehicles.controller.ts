import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VehiclesService } from './vehicles.service';

class CreateVehicleDto {
  @IsString() make: string;
  @IsString() model: string;
  @IsNumber() @Min(1900) @Max(2100) @Type(() => Number) year: number;
  @IsOptional() @IsString() plateNumber?: string;
  @IsOptional() @IsString() vin?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsNumber() @Type(() => Number) currentMileage?: number;
  @IsOptional() @IsString() notes?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private svc: VehiclesService) {}

  @Get()
  list(@Request() req) {
    return this.svc.findAll(req.user.id);
  }

  @Get(':id')
  get(@Param('id') id: string, @Request() req) {
    return this.svc.findOne(id, req.user.id);
  }

  @Post()
  create(@Body() dto: CreateVehicleDto, @Request() req) {
    return this.svc.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateVehicleDto>, @Request() req) {
    return this.svc.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @Request() req) {
    return this.svc.remove(id, req.user.id);
  }
}

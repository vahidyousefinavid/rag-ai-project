import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MechanicService } from './mechanic.service';
import { VehicleAccessService } from '../vehicle-access/vehicle-access.service';

class CreateMechanicVehicleDto {
  @IsString() make: string;
  @IsString() model: string;
  @IsNumber() @Min(1900) @Max(2100) @Type(() => Number) year: number;
  @IsOptional() @IsString() plateNumber?: string;
  @IsOptional() @IsString() customerName?: string;
  @IsOptional() @IsString() vin?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsNumber() @Type(() => Number) currentMileage?: number;
  @IsOptional() @IsString() notes?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mechanic')
@Controller('mechanic')
export class MechanicController {
  constructor(
    private svc: MechanicService,
    private access: VehicleAccessService,
  ) {}

  @Get('vehicles')
  listVehicles(@Request() req) {
    return this.access.listMechanicVehicles(req.user.id);
  }

  @Post('vehicles')
  createVehicle(@Body() dto: CreateMechanicVehicleDto, @Request() req) {
    return this.svc.createVehicle(req.user.id, dto);
  }

  @Get('vehicles/:id')
  getVehicle(@Param('id') id: string, @Request() req) {
    return this.svc.getVehicleDetail(id, req.user.id);
  }
}

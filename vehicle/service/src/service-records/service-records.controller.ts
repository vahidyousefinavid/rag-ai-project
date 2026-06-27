import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ServiceRecordsService } from './service-records.service';

class CreateServiceRecordDto {
  @IsString() serviceType: string;
  @IsString() serviceDate: string;
  @IsOptional() @IsNumber() @Type(() => Number) mileage?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Type(() => Number) cost?: number;
  @IsOptional() @IsString() workshop?: string;
  @IsOptional() @IsNumber() @Type(() => Number) nextServiceMileage?: number;
  @IsOptional() @IsString() nextServiceDate?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('vehicles/:vehicleId/records')
export class ServiceRecordsController {
  constructor(private svc: ServiceRecordsService) {}

  @Get()
  list(@Param('vehicleId') vehicleId: string, @Request() req) {
    return this.svc.findByVehicle(vehicleId, req.user.id);
  }

  @Post()
  create(@Param('vehicleId') vehicleId: string, @Body() dto: CreateServiceRecordDto, @Request() req) {
    return this.svc.create(vehicleId, req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @Request() req) {
    return this.svc.remove(id, req.user.id);
  }
}

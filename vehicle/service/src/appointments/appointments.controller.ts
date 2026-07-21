import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { IsString, IsOptional, IsIn, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AppointmentsService } from './appointments.service';

class CreateAppointmentDto {
  @IsString() vehicleId: string;
  @IsString() mechanicId: string;
  @IsString() requestedAt: string;
  @IsOptional() @IsString() serviceType?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsIn(['in_shop', 'on_site']) mode?: 'in_shop' | 'on_site';
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsNumber() @Type(() => Number) lat?: number;
  @IsOptional() @IsNumber() @Type(() => Number) lng?: number;
}

class RespondDto {
  @IsIn(['confirmed', 'rejected']) status: 'confirmed' | 'rejected';
}

@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private svc: AppointmentsService) {}

  @Get('mine')
  mine(@Request() req) {
    return req.user.role === 'mechanic' ? this.svc.listForMechanic(req.user.id) : this.svc.listForOwner(req.user.id);
  }

  @Post()
  create(@Body() dto: CreateAppointmentDto, @Request() req) {
    return this.svc.create(req.user.id, dto);
  }

  @Post(':id/respond')
  respond(@Param('id') id: string, @Body() dto: RespondDto, @Request() req) {
    return this.svc.respond(id, req.user.id, dto.status);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Request() req) {
    return this.svc.complete(id, req.user.id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Request() req) {
    return this.svc.cancel(id, req.user.id);
  }
}

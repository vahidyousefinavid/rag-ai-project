import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RemindersService } from './reminders.service';

class ReminderDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Type(() => Number) dueMileage?: number;
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsString() priority?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('vehicles/:vehicleId/reminders')
export class RemindersController {
  constructor(private svc: RemindersService) {}

  @Get() list(@Param('vehicleId') vid: string, @Request() req) { return this.svc.list(vid, req.user.id); }
  @Post() create(@Param('vehicleId') vid: string, @Body() dto: ReminderDto, @Request() req) { return this.svc.create(vid, req.user.id, dto as any); }
  @Patch(':id/toggle') toggle(@Param('id') id: string, @Request() req) { return this.svc.toggle(id, req.user.id); }
  @Delete(':id') @HttpCode(204) remove(@Param('id') id: string, @Request() req) { return this.svc.remove(id, req.user.id); }
}

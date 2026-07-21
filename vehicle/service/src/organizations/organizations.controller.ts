import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { IsString, IsIn, IsOptional, IsMobilePhone } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrganizationsService } from './organizations.service';

class CreateOrgDto {
  @IsString() name: string;
}

class AddMemberDto {
  @IsMobilePhone('fa-IR') phone: string;
  @IsOptional() @IsIn(['admin', 'driver']) role?: 'admin' | 'driver';
}

@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private svc: OrganizationsService) {}

  @Get('mine')
  mine(@Request() req) {
    return this.svc.listMine(req.user.id);
  }

  @Post()
  create(@Body() dto: CreateOrgDto, @Request() req) {
    return this.svc.create(req.user.id, dto.name);
  }

  @Get(':id/members')
  members(@Param('id') id: string, @Request() req) {
    return this.svc.listMembers(id, req.user.id);
  }

  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() dto: AddMemberDto, @Request() req) {
    return this.svc.addMember(id, req.user.id, dto.phone, dto.role ?? 'driver');
  }

  @Delete(':id/members/:userId')
  @HttpCode(204)
  removeMember(@Param('id') id: string, @Param('userId') userId: string, @Request() req) {
    return this.svc.removeMember(id, req.user.id, userId);
  }

  @Get(':id/vehicles')
  vehicles(@Param('id') id: string, @Request() req) {
    return this.svc.listVehicles(id, req.user.id);
  }

  @Post(':id/vehicles/:vehicleId')
  assignVehicle(@Param('id') id: string, @Param('vehicleId') vehicleId: string, @Request() req) {
    return this.svc.assignVehicle(id, req.user.id, vehicleId);
  }

  @Delete(':id/vehicles/:vehicleId')
  @HttpCode(204)
  unassignVehicle(@Param('id') id: string, @Param('vehicleId') vehicleId: string, @Request() req) {
    return this.svc.unassignVehicle(id, req.user.id, vehicleId);
  }
}

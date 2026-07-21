import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MechanicServicesService } from './mechanic-services.service';

class UpsertMechanicServiceDto {
  @IsString() serviceType: string;
  @IsOptional() @IsString() customName?: string;
  @IsOptional() @IsNumber() @Type(() => Number) price?: number;
  @IsOptional() @IsBoolean() supportsInShop?: boolean;
  @IsOptional() @IsBoolean() supportsOnSite?: boolean;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mechanic')
@Controller('mechanic/services')
export class MechanicServicesController {
  constructor(private svc: MechanicServicesService) {}

  @Get()
  list(@Request() req) {
    return this.svc.list(req.user.id);
  }

  @Post()
  create(@Body() dto: UpsertMechanicServiceDto, @Request() req) {
    return this.svc.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<UpsertMechanicServiceDto>, @Request() req) {
    return this.svc.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @Request() req) {
    return this.svc.remove(id, req.user.id);
  }
}

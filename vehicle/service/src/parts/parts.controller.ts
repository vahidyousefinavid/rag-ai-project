import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, HttpCode } from '@nestjs/common';
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PartsService } from './parts.service';

class PartDto {
  @IsString() name: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() unit?: string;
  @IsNumber() @Type(() => Number) unitPrice: number;
  @IsOptional() @IsNumber() @Type(() => Number) quantity?: number;
  @IsOptional() @IsBoolean() inStock?: boolean;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mechanic')
@Controller('mechanic/parts')
export class PartsController {
  constructor(private svc: PartsService) {}

  @Get()
  list(@Query('q') q: string, @Request() req) {
    return this.svc.list(req.user.id, q);
  }

  @Post()
  create(@Body() dto: PartDto, @Request() req) {
    return this.svc.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<PartDto>, @Request() req) {
    return this.svc.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @Request() req) {
    return this.svc.remove(id, req.user.id);
  }
}

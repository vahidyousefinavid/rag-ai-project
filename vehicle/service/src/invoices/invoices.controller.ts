import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { IsString, IsNumber, IsOptional, IsIn, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InvoicesService } from './invoices.service';

class InvoiceItemDto {
  @IsIn(['part', 'labor'])
  type: 'part' | 'labor';

  @IsString()
  name: string;

  @IsNumber() @Min(0.01) @Type(() => Number)
  quantity: number;

  @IsNumber() @Min(0) @Type(() => Number)
  unitPrice: number;
}

class UpsertInvoiceDto {
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  discount?: number;

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  paidAmount?: number;

  @IsOptional() @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}

@UseGuards(JwtAuthGuard)
@Controller('vehicles/:vehicleId/records/:recordId/invoice')
export class InvoicesController {
  constructor(private svc: InvoicesService) {}

  @Post()
  upsert(
    @Param('vehicleId') vehicleId: string,
    @Param('recordId') recordId: string,
    @Body() dto: UpsertInvoiceDto,
    @Request() req,
  ) {
    return this.svc.upsert(vehicleId, recordId, req.user.id, dto);
  }

  @Get()
  get(@Param('vehicleId') vehicleId: string, @Param('recordId') recordId: string, @Request() req) {
    return this.svc.get(vehicleId, recordId, req.user.id);
  }

  @Delete()
  @HttpCode(204)
  remove(@Param('vehicleId') vehicleId: string, @Param('recordId') recordId: string, @Request() req) {
    return this.svc.remove(vehicleId, recordId, req.user.id);
  }
}

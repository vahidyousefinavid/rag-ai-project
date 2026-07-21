import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, HttpCode, Res } from '@nestjs/common';
import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ServiceRecordsService } from './service-records.service';
import { PdfService } from '../pdf/pdf.service';

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

class UpdateServiceRecordDto {
  @IsOptional() @IsString() serviceType?: string;
  @IsOptional() @IsString() serviceDate?: string;
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
  constructor(private svc: ServiceRecordsService, private pdf: PdfService) {}

  @Get()
  list(@Param('vehicleId') vehicleId: string, @Request() req) {
    return this.svc.findByVehicle(vehicleId, req.user.id);
  }

  @Get('pdf')
  async pdfHistory(@Param('vehicleId') vehicleId: string, @Request() req, @Res() res: Response) {
    const { vehicle, records } = await this.svc.historyForPdf(vehicleId, req.user.id);
    const buf = await this.pdf.historyPdf(vehicle, records);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="history-${vehicleId}.pdf"` });
    res.send(buf);
  }

  @Post()
  create(@Param('vehicleId') vehicleId: string, @Body() dto: CreateServiceRecordDto, @Request() req) {
    return this.svc.create(vehicleId, req.user.id, req.user.role, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateServiceRecordDto, @Request() req) {
    return this.svc.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @Request() req) {
    return this.svc.remove(id, req.user.id);
  }
}

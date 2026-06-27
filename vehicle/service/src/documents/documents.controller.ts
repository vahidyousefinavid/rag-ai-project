import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DocumentsService } from './documents.service';

class DocDto {
  @IsString() type: string;
  @IsString() title: string;
  @IsOptional() @IsString() issueDate?: string;
  @IsOptional() @IsString() expiryDate?: string;
  @IsOptional() @IsString() notes?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('vehicles/:vehicleId/documents')
export class DocumentsController {
  constructor(private svc: DocumentsService) {}

  @Get() list(@Param('vehicleId') vid: string, @Request() req) { return this.svc.list(vid, req.user.id); }
  @Post() create(@Param('vehicleId') vid: string, @Body() dto: DocDto, @Request() req) { return this.svc.create(vid, req.user.id, dto as any); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: Partial<DocDto>, @Request() req) { return this.svc.update(id, req.user.id, dto as any); }
  @Delete(':id') @HttpCode(204) remove(@Param('id') id: string, @Request() req) { return this.svc.remove(id, req.user.id); }
}

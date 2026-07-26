import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors,
  UploadedFile, Request, HttpCode, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ProductsService } from './products.service';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'products');

class ProductDto {
  @IsString() name: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @Type(() => Number) price: number;
  @IsOptional() @IsNumber() @Type(() => Number) stock?: number;
  @IsOptional() @IsString() unit?: string;
}

class SetActiveDto {
  @IsBoolean() @Type(() => Boolean) active: boolean;
}

const imageUpload = FileInterceptor('image', {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
      cb(null, unique);
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new BadRequestException('فقط فایل تصویری مجاز است'), false);
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('seller')
@Controller('seller/products')
export class ProductsController {
  constructor(private svc: ProductsService) {}

  @Get()
  list(@Query('q') q: string, @Request() req) {
    return this.svc.list(req.user.id, q);
  }

  @Post()
  @UseInterceptors(imageUpload)
  create(@Body() dto: ProductDto, @UploadedFile() file: Express.Multer.File, @Request() req) {
    const imageUrl = file ? `/uploads/products/${file.filename}` : undefined;
    return this.svc.create(req.user.id, dto, imageUrl);
  }

  @Patch(':id')
  @UseInterceptors(imageUpload)
  update(@Param('id') id: string, @Body() dto: Partial<ProductDto>, @UploadedFile() file: Express.Multer.File, @Request() req) {
    const imageUrl = file ? `/uploads/products/${file.filename}` : undefined;
    return this.svc.update(id, req.user.id, dto, imageUrl);
  }

  @Patch(':id/active')
  setActive(@Param('id') id: string, @Body() dto: SetActiveDto, @Request() req) {
    return this.svc.setActive(id, req.user.id, dto.active);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @Request() req) {
    return this.svc.remove(id, req.user.id);
  }
}

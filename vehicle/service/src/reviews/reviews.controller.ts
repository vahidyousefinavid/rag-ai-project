import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReviewsService } from './reviews.service';

class UpsertReviewDto {
  @IsInt() @Min(1) @Max(5) @Type(() => Number) rating: number;
  @IsOptional() @IsString() comment?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('mechanics/:mechanicId/reviews')
export class ReviewsController {
  constructor(private svc: ReviewsService) {}

  @Get()
  list(@Param('mechanicId') mechanicId: string) {
    return this.svc.listForMechanic(mechanicId);
  }

  @Get('summary')
  summary(@Param('mechanicId') mechanicId: string) {
    return this.svc.summary(mechanicId);
  }

  @Get('mine')
  mine(@Param('mechanicId') mechanicId: string, @Request() req) {
    return this.svc.myReview(mechanicId, req.user.id);
  }

  @Post()
  upsert(@Param('mechanicId') mechanicId: string, @Body() dto: UpsertReviewDto, @Request() req) {
    return this.svc.upsert(mechanicId, req.user.id, dto);
  }
}

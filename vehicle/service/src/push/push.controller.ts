import { Controller, Get, Post, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { IsString, IsObject } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PushService } from './push.service';

class SubscribeDto {
  @IsString() endpoint: string;
  @IsObject() keys: { p256dh: string; auth: string };
}

class UnsubscribeDto {
  @IsString() endpoint: string;
}

@Controller('push')
export class PushController {
  constructor(private svc: PushService) {}

  @Get('vapid-public-key')
  publicKey() {
    return { key: this.svc.publicKey };
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  subscribe(@Body() dto: SubscribeDto, @Request() req) {
    return this.svc.subscribe(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('subscribe')
  unsubscribe(@Body() dto: UnsubscribeDto, @Request() req) {
    return this.svc.unsubscribe(req.user.id, dto.endpoint);
  }
}

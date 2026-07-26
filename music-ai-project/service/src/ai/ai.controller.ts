import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiService } from './ai.service';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private svc: AiService) {}

  @Post('search')
  search(@Body('message') message: string) {
    if (!message?.trim()) throw new BadRequestException('پارامتر message الزامی است');
    return this.svc.search(message.trim());
  }
}

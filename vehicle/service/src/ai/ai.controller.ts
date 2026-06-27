import { Controller, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiService } from './ai.service';

class AskDto {
  @IsString() question: string;
}

@UseGuards(JwtAuthGuard)
@Controller('vehicles/:vehicleId/ask')
export class AiController {
  constructor(private ai: AiService) {}

  @Post()
  ask(@Param('vehicleId') vehicleId: string, @Body() dto: AskDto, @Request() req) {
    return this.ai.ask(vehicleId, req.user.id, dto.question);
  }
}

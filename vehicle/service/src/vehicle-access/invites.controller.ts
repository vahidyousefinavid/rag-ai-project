import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { VehicleAccessService } from './vehicle-access.service';

class RedeemDto {
  @IsString()
  @Length(4, 16)
  code: string;
}

@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
@Controller('invites')
export class InvitesController {
  constructor(private svc: VehicleAccessService) {}

  @Roles('mechanic')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('redeem')
  redeem(@Body() dto: RedeemDto, @Request() req) {
    return this.svc.redeem(dto.code, req.user.id);
  }
}

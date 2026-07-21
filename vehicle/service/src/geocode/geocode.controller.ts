import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GeocodeService } from './geocode.service';

@UseGuards(JwtAuthGuard)
@Controller('geocode')
export class GeocodeController {
  constructor(private svc: GeocodeService) {}

  @Get('reverse')
  reverse(@Query('lat') lat: string, @Query('lng') lng: string) {
    return this.svc.reverse(Number(lat), Number(lng));
  }
}

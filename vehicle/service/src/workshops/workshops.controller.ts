import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkshopsService } from './workshops.service';

@UseGuards(JwtAuthGuard)
@Controller('workshops')
export class WorkshopsController {
  constructor(private svc: WorkshopsService) {}

  @Get()
  search(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('q') q?: string,
    @Query('serviceType') serviceType?: string,
    @Query('mode') mode?: 'in_shop' | 'on_site',
  ) {
    return this.svc.search({
      lat: lat !== undefined ? Number(lat) : undefined,
      lng: lng !== undefined ? Number(lng) : undefined,
      q,
      serviceType,
      mode,
    });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.svc.detail(id);
  }
}

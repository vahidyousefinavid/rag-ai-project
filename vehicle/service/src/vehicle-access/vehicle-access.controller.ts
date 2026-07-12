import { Controller, Get, Post, Delete, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VehicleAccessService } from './vehicle-access.service';

@UseGuards(JwtAuthGuard)
@Controller('vehicles/:vehicleId')
export class VehicleAccessController {
  constructor(private svc: VehicleAccessService) {}

  @Post('invites')
  createInvite(@Param('vehicleId') vehicleId: string, @Request() req) {
    return this.svc.createInvite(vehicleId, req.user.id);
  }

  @Get('access')
  listAccess(@Param('vehicleId') vehicleId: string, @Request() req) {
    return this.svc.listAccess(vehicleId, req.user.id);
  }

  @Delete('access/:accessId')
  @HttpCode(204)
  revokeAccess(
    @Param('vehicleId') vehicleId: string,
    @Param('accessId') accessId: string,
    @Request() req,
  ) {
    return this.svc.revokeAccess(vehicleId, accessId, req.user.id);
  }
}

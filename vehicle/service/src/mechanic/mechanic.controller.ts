import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MechanicService } from './mechanic.service';
import { VehicleAccessService } from '../vehicle-access/vehicle-access.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('mechanic')
@Controller('mechanic')
export class MechanicController {
  constructor(
    private svc: MechanicService,
    private access: VehicleAccessService,
  ) {}

  @Get('vehicles')
  listVehicles(@Request() req) {
    return this.access.listMechanicVehicles(req.user.id);
  }

  @Get('vehicles/:id')
  getVehicle(@Param('id') id: string, @Request() req) {
    return this.svc.getVehicleDetail(id, req.user.id);
  }
}

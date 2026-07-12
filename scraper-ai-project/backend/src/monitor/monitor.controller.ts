import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { MonitorService, CreateMonitorDto } from './monitor.service';

@Controller('monitors')
export class MonitorController {
  constructor(private svc: MonitorService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  create(@Body() dto: CreateMonitorDto) {
    return this.svc.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Post(':id/check-now')
  checkNow(@Param('id') id: string) {
    return this.svc.checkNow(id);
  }

  @Get(':id/runs')
  getRuns(@Param('id') id: string) {
    return this.svc.getRuns(id);
  }
}

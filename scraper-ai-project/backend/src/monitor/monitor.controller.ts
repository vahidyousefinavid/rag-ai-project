import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Headers,
  Res, UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';
import { MonitorService, CreateMonitorDto, UpdateMonitorDto } from './monitor.service';
import { DbSinkService, DbSinkTestConfig } from './db-sink.service';
import { MonitorWizardService, WizardTurnMessage } from './monitor-wizard.service';
import { toCsv } from './csv.util';

@Controller('monitors')
export class MonitorController {
  constructor(private svc: MonitorService, private dbSinkSvc: DbSinkService, private wizard: MonitorWizardService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  /** Conversational monitor setup: caller resends the full history each turn (stateless — see MonitorWizardService). */
  @Post('wizard/turn')
  wizardTurn(@Body() body: { history?: WizardTurnMessage[]; message: string }) {
    return this.wizard.turn(body.history ?? [], body.message);
  }

  @Post()
  create(@Body() dto: CreateMonitorDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMonitorDto) {
    return this.svc.update(id, dto);
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

  @Post(':id/api-key')
  issueApiKey(@Param('id') id: string) {
    return this.svc.issueApiKey(id);
  }

  @Delete(':id/api-key')
  revokeApiKey(@Param('id') id: string) {
    return this.svc.revokeApiKey(id);
  }

  /** Admin preview — same record shape as /data, no key required (same trust level as the rest of this API). */
  @Get(':id/data/preview')
  async preview(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.svc.getExportRecords(id, limit ? Number(limit) : undefined);
  }

  /** External-facing export — requires the per-monitor API key issued via POST /monitors/:id/api-key. */
  @Get(':id/data')
  async getData(
    @Param('id') id: string,
    @Query('format') format: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('apiKey') queryKey: string | undefined,
    @Headers('x-api-key') headerKey: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const target = await this.svc.get(id);
    if (!target.apiKeyHash) throw new ForbiddenException('برای این مانیتور هنوز API key ساخته نشده — اول یکی بسازید');
    if (!this.svc.verifyApiKey(target, headerKey || queryKey)) throw new UnauthorizedException('API key نامعتبر است');

    const records = await this.svc.getExportRecords(id, limit ? Number(limit) : undefined);
    if (format === 'csv') {
      res.header('Content-Type', 'text/csv; charset=utf-8');
      return toCsv(records);
    }
    return records;
  }

  @Post('db-sink/test')
  testDbSink(@Body() cfg: DbSinkTestConfig) {
    return this.dbSinkSvc.testConnection(cfg);
  }
}

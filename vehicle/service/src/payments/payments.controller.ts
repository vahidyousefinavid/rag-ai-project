import { Controller, Post, Get, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsController {
  constructor(private svc: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('vehicles/:vehicleId/records/:recordId/invoice/pay')
  initiate(@Param('vehicleId') vehicleId: string, @Param('recordId') recordId: string, @Request() req) {
    return this.svc.initiate(vehicleId, recordId, req.user.id);
  }

  @Get('payments/verify')
  async verify(
    @Query('paymentId') paymentId: string,
    @Query('Authority') authority: string,
    @Query('Status') status: string,
    @Res() res: Response,
  ) {
    const { redirectUrl } = await this.svc.verify(paymentId, authority, status);
    res.redirect(redirectUrl);
  }
}

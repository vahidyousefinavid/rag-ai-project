import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './payment.entity';
import { Invoice } from '../invoices/invoice.entity';
import { InvoicesService } from '../invoices/invoices.service';

const MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID || '00000000-0000-0000-0000-000000000000';
const SANDBOX = (process.env.ZARINPAL_SANDBOX ?? 'true') !== 'false';
const BASE = SANDBOX ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com';
const BACKEND_URL = process.env.BACKEND_PUBLIC_URL || 'http://localhost:3002';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3003';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment) private payments: Repository<Payment>,
    @InjectRepository(Invoice) private invoices: Repository<Invoice>,
    private invoicesService: InvoicesService,
  ) {}

  async initiate(vehicleId: string, recordId: string, userId: string) {
    const { invoice } = await this.invoicesService.getFullForPdf(vehicleId, recordId, userId);
    const remaining = invoice.total - invoice.paidAmount;
    if (remaining <= 0) throw new BadRequestException('این فاکتور قبلاً تسویه شده است');

    const payment = await this.payments.save(
      this.payments.create({ invoiceId: (invoice as any).id, vehicleId, recordId, amount: remaining, status: 'pending' }),
    );

    const callbackUrl = `${BACKEND_URL}/payments/verify?paymentId=${payment.id}`;
    const res = await fetch(`${BASE}/pg/v4/payment/request.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: MERCHANT_ID,
        amount: Math.round(remaining * 10),
        callback_url: callbackUrl,
        description: `پرداخت فاکتور سرویس خودرو`,
      }),
    });
    const json = await res.json().catch(() => ({}));
    const code = json?.data?.code;
    const authority = json?.data?.authority;

    if (code !== 100 || !authority) {
      payment.status = 'failed';
      await this.payments.save(payment);
      this.logger.warn(`zarinpal request failed: ${JSON.stringify(json)}`);
      throw new BadRequestException('اتصال به درگاه پرداخت ناموفق بود');
    }

    payment.authority = authority;
    await this.payments.save(payment);

    return { paymentUrl: `${BASE}/pg/StartPay/${authority}` };
  }

  async verify(paymentId: string, authority?: string, status?: string) {
    const payment = await this.payments.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException();
    const redirectBase = `${FRONTEND_URL}/vehicles/${payment.vehicleId}?tab=records&payment=`;

    if (payment.status === 'success') return { redirectUrl: `${redirectBase}success` };
    if (status !== 'OK' || !authority || authority !== payment.authority) {
      payment.status = 'failed';
      await this.payments.save(payment);
      return { redirectUrl: `${redirectBase}failed` };
    }

    const res = await fetch(`${BASE}/pg/v4/payment/verify.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant_id: MERCHANT_ID, amount: Math.round(payment.amount * 10), authority }),
    });
    const json = await res.json().catch(() => ({}));
    const code = json?.data?.code;

    if (code === 100 || code === 101) {
      payment.status = 'success';
      payment.refId = json?.data?.ref_id ? String(json.data.ref_id) : undefined;
      await this.payments.save(payment);

      const invoice = await this.invoices.findOne({ where: { id: payment.invoiceId } });
      if (invoice) {
        invoice.paidAmount = (invoice.paidAmount || 0) + payment.amount;
        await this.invoices.save(invoice);
      }
      return { redirectUrl: `${redirectBase}success` };
    }

    payment.status = 'failed';
    await this.payments.save(payment);
    this.logger.warn(`zarinpal verify failed: ${JSON.stringify(json)}`);
    return { redirectUrl: `${redirectBase}failed` };
  }
}

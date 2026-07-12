import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Sends SMS via Kavenegar (https://kavenegar.com) — the most common SMS gateway for Iranian numbers. */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private config: ConfigService) {}

  async send(phone: string, text: string): Promise<void> {
    const apiKey = this.config.get<string>('kavenegar.apiKey');
    if (!apiKey) {
      this.logger.warn('KAVENEGAR_API_KEY not configured — skipping SMS notification');
      return;
    }
    const sender = this.config.get<string>('kavenegar.sender');
    const params = new URLSearchParams({ receptor: phone, message: text.slice(0, 300) });
    if (sender) params.set('sender', sender);

    const res = await fetch(`https://api.kavenegar.com/v1/${apiKey}/sms/send.json?${params.toString()}`);
    if (!res.ok) this.logger.warn(`SMS send failed: ${res.status} ${await res.text()}`);
  }
}

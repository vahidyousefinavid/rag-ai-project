import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('smtp.host');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('smtp.port'),
        secure: this.config.get<boolean>('smtp.secure'),
        auth: { user: this.config.get<string>('smtp.user'), pass: this.config.get<string>('smtp.pass') },
      });
    }
  }

  async send(to: string, subject: string, text: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('SMTP not configured (SMTP_HOST) — skipping email notification');
      return;
    }
    const from = this.config.get<string>('smtp.from') || this.config.get<string>('smtp.user');
    await this.transporter.sendMail({ from, to, subject, text });
  }
}

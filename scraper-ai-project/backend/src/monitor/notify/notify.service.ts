import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.service';
import { TelegramService } from './telegram.service';
import { WebhookService } from './webhook.service';
import { SmsService } from './sms.service';
import { MonitorTarget } from '../entities/monitor-target.entity';

@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);

  constructor(
    private email: EmailService,
    private telegram: TelegramService,
    private webhook: WebhookService,
    private sms: SmsService,
  ) {}

  async notifyChange(target: MonitorTarget, summary: string): Promise<void> {
    const subject = `تغییر در ${target.name}`;
    const body = `سایت «${target.name}» (${target.url}) تغییر کرد:\n\n${summary}`;
    const jobs: Promise<void>[] = [];

    if (target.notifyChannels.includes('email') && target.notifyConfig.email) {
      jobs.push(
        this.email.send(target.notifyConfig.email, subject, body)
          .catch((e) => this.logger.warn(`email notify failed: ${e.message}`)),
      );
    }
    if (target.notifyChannels.includes('telegram') && target.notifyConfig.telegramChatId) {
      jobs.push(
        this.telegram.send(target.notifyConfig.telegramChatId, body)
          .catch((e) => this.logger.warn(`telegram notify failed: ${e.message}`)),
      );
    }
    if (target.notifyChannels.includes('webhook') && target.notifyConfig.webhookUrl) {
      jobs.push(
        this.webhook.send(target.notifyConfig.webhookUrl, {
          targetId: target.id, name: target.name, url: target.url, summary, changedAt: new Date().toISOString(),
        }),
      );
    }
    if (target.notifyChannels.includes('sms') && target.notifyConfig.smsPhone) {
      jobs.push(
        this.sms.send(target.notifyConfig.smsPhone, body)
          .catch((e) => this.logger.warn(`sms notify failed: ${e.message}`)),
      );
    }

    await Promise.all(jobs);
  }
}

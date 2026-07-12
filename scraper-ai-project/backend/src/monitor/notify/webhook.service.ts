import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  async send(url: string, payload: Record<string, any>): Promise<void> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) this.logger.warn(`Webhook ${url} responded ${res.status}`);
    } catch (err: any) {
      this.logger.warn(`Webhook ${url} failed: ${err.message}`);
    }
  }
}

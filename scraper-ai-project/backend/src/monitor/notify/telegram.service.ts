import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private config: ConfigService) {}

  async send(chatId: string, text: string): Promise<void> {
    const token = this.config.get<string>('telegram.botToken');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured — skipping telegram notification');
      return;
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) this.logger.warn(`Telegram send failed: ${res.status} ${await res.text()}`);
  }
}

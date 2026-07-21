import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from './push-subscription.entity';

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  publicKey: string;

  constructor(@InjectRepository(PushSubscription) private repo: Repository<PushSubscription>) {}

  onModuleInit() {
    let publicKey = process.env.VAPID_PUBLIC_KEY;
    let privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
      const generated = webpush.generateVAPIDKeys();
      publicKey = generated.publicKey;
      privateKey = generated.privateKey;
      this.logger.warn(
        'VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY تنظیم نشده؛ کلید موقت ساخته شد (بعد از هر ری‌استارت باطل می‌شود). ' +
          'برای پروداکشن این دو مقدار را در env قرار بده:',
      );
      this.logger.warn(`VAPID_PUBLIC_KEY=${publicKey}`);
      this.logger.warn(`VAPID_PRIVATE_KEY=${privateKey}`);
    }
    this.publicKey = publicKey;
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', publicKey, privateKey);
  }

  async subscribe(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    let row = await this.repo.findOne({ where: { endpoint: sub.endpoint } });
    if (!row) row = this.repo.create({ endpoint: sub.endpoint });
    row.userId = userId;
    row.p256dh = sub.keys.p256dh;
    row.auth = sub.keys.auth;
    await this.repo.save(row);
    return { ok: true };
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.repo.delete({ userId, endpoint });
    return { ok: true };
  }

  async notifyUser(userId: string, payload: { title: string; body: string }) {
    const subs = await this.repo.find({ where: { userId } });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(payload),
          );
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await this.repo.delete({ id: s.id });
          } else {
            this.logger.warn(`push failed: ${err?.message || err}`);
          }
        }
      }),
    );
  }
}

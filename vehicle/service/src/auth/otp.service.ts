import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { OtpCode } from './otp-code.entity';

const CODE_TTL_MS = 2 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;
const SEND_WINDOW_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly pepper: string;
  private readonly apiKey = process.env.SMS_IR_API_KEY;
  private readonly templateId = process.env.SMS_IR_TEMPLATE_ID || '256420';

  constructor(@InjectRepository(OtpCode) private repo: Repository<OtpCode>) {
    const pepper = process.env.OTP_SECRET;
    if (!pepper) throw new Error('OTP_SECRET env var is required');
    this.pepper = pepper;
  }

  async request(phone: string) {
    const recent = await this.repo.findOne({ where: { phone }, order: { createdAt: 'DESC' } });
    if (recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      throw new BadRequestException('کمی صبر کنید و دوباره تلاش کنید');
    }
    const windowStart = new Date(Date.now() - SEND_WINDOW_MS);
    const recentCount = await this.repo.count({ where: { phone, createdAt: MoreThan(windowStart) } });
    if (recentCount >= MAX_SENDS_PER_WINDOW) {
      throw new BadRequestException('تعداد درخواست‌های شما بیش از حد مجاز است، بعداً تلاش کنید');
    }

    const code = randomInt(1000, 10000).toString();
    const otp = this.repo.create({
      phone,
      codeHash: this.hash(phone, code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });
    await this.repo.save(otp);
    await this.send(phone, code);
  }

  async verify(phone: string, code: string) {
    const otp = await this.repo.findOne({ where: { phone, consumed: false }, order: { createdAt: 'DESC' } });
    if (!otp) throw new UnauthorizedException('کد ارسال نشده یا منقضی شده است');
    if (otp.expiresAt.getTime() < Date.now()) throw new UnauthorizedException('کد منقضی شده است');
    if (otp.attempts >= MAX_VERIFY_ATTEMPTS) throw new UnauthorizedException('تعداد تلاش بیش از حد مجاز است');

    const expected = Buffer.from(this.hash(phone, code), 'hex');
    const actual = Buffer.from(otp.codeHash, 'hex');
    const matches = expected.length === actual.length && timingSafeEqual(expected, actual);

    if (!matches) {
      otp.attempts += 1;
      await this.repo.save(otp);
      throw new UnauthorizedException('کد وارد شده صحیح نیست');
    }

    otp.consumed = true;
    await this.repo.save(otp);
  }

  private hash(phone: string, code: string) {
    return createHmac('sha256', this.pepper).update(`${phone}:${code}`).digest('hex');
  }

  private async send(phone: string, code: string) {
    if (!this.apiKey) {
      this.logger.warn(`SMS_IR_API_KEY تنظیم نشده — کد ${phone}: ${code}`);
      return;
    }
    try {
      const res = await fetch('https://api.sms.ir/v1/send/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/plain',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          mobile: phone,
          templateId: this.templateId,
          parameters: [{ name: 'code', value: code }],
        }),
      });
      const body = await res.text();
      let status: number | undefined;
      try {
        status = JSON.parse(body)?.status;
      } catch {
        // sms.ir may return a non-JSON body on gateway errors
      }
      if (!res.ok || (status !== undefined && status !== 1)) {
        this.logger.warn(`sms.ir otp send failed: HTTP ${res.status} — ${body}`);
      }
    } catch (err: any) {
      this.logger.warn(`sms.ir otp send failed: ${err?.message || err}`);
    }
  }
}

import { Injectable, Logger, OnApplicationBootstrap, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
  ) {}

  // Ensures a working admin login always exists, even against a fresh or
  // previously-broken (missing password) database.
  async onApplicationBootstrap() {
    const phone = process.env.ADMIN_PHONE || '09182144790';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    let admin = await this.users.findOne({ where: { phone, role: 'admin' } });
    if (!admin) {
      admin = this.users.create({
        phone,
        name: 'مدیر سیستم',
        role: 'admin',
        active: true,
        password: await bcrypt.hash(password, 10),
      });
      await this.users.save(admin);
      this.logger.log(`Seeded default admin user (${phone})`);
    } else if (!admin.password) {
      admin.password = await bcrypt.hash(password, 10);
      await this.users.save(admin);
      this.logger.log(`Set password for existing admin user (${phone})`);
    }
  }

  async login(phone: string, password: string) {
    const user = await this.users.findOne({ where: { phone, role: 'admin' } });
    if (!user || !user.password) throw new UnauthorizedException('نام کاربری یا رمز عبور اشتباه است');
    if (!user.active) throw new UnauthorizedException('این حساب غیرفعال شده است');
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('نام کاربری یا رمز عبور اشتباه است');
    return this.makeToken(user);
  }

  async findById(id: string) {
    return this.users.findOne({ where: { id } });
  }

  private makeToken(user: User) {
    return {
      access_token: this.jwt.sign({ sub: user.id, phone: user.phone }),
      user: { id: user.id, phone: user.phone, name: user.name, role: user.role },
    };
  }
}

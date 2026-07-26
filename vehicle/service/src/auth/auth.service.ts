import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/user.entity';
import { RegisterDto } from './auth.controller';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
    private otp: OtpService,
  ) {}

  async requestOtp(phone: string) {
    await this.otp.request(phone);
    return { sent: true };
  }

  async register(dto: RegisterDto) {
    const existing = await this.users.findOne({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException('این شماره قبلاً ثبت شده');
    await this.otp.verify(dto.phone, dto.code);
    const user = this.users.create({
      phone: dto.phone,
      name: dto.name,
      role: dto.role ?? 'owner',
      workshopName: dto.role === 'mechanic' || dto.role === 'seller' ? dto.workshopName : undefined,
      workshopAddress: dto.role === 'mechanic' || dto.role === 'seller' ? dto.workshopAddress : undefined,
    });
    await this.users.save(user);
    return this.makeToken(user);
  }

  async login(phone: string, code: string) {
    await this.otp.verify(phone, code);
    const user = await this.users.findOne({ where: { phone } });
    if (!user) throw new UnauthorizedException('شماره موبایل یافت نشد');
    if (!user.active) throw new UnauthorizedException('این حساب مسدود شده است');
    return this.makeToken(user);
  }

  async findById(id: string) {
    return this.users.findOne({ where: { id } });
  }

  async updateProfile(userId: string, dto: { workshopName?: string; workshopAddress?: string; workshopLat?: number; workshopLng?: number }) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (user.role !== 'mechanic' && user.role !== 'seller') throw new UnauthorizedException('فقط برای حساب مکانیک یا فروشنده');
    Object.assign(user, dto);
    await this.users.save(user);
    return {
      id: user.id, phone: user.phone, name: user.name, role: user.role,
      workshopName: user.workshopName, workshopAddress: user.workshopAddress,
      workshopLat: user.workshopLat, workshopLng: user.workshopLng,
    };
  }

  private makeToken(user: User) {
    return {
      access_token: this.jwt.sign({ sub: user.id, phone: user.phone }),
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        workshopName: user.workshopName,
        workshopAddress: user.workshopAddress,
      },
    };
  }
}

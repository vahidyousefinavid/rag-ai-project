import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/user.entity';
import { RegisterDto } from './auth.controller';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findOne({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException('این شماره قبلاً ثبت شده');
    const user = this.users.create({
      phone: dto.phone,
      name: dto.name,
      role: dto.role ?? 'owner',
      workshopName: dto.role === 'mechanic' ? dto.workshopName : undefined,
      workshopAddress: dto.role === 'mechanic' ? dto.workshopAddress : undefined,
    });
    await this.users.save(user);
    return this.makeToken(user);
  }

  async login(phone: string) {
    const user = await this.users.findOne({ where: { phone } });
    if (!user) throw new UnauthorizedException('شماره موبایل یافت نشد');
    return this.makeToken(user);
  }

  async findById(id: string) {
    return this.users.findOne({ where: { id } });
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

import { Controller, Post, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { IsString, IsMobilePhone, IsOptional, IsIn, IsNumber, Length, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

export class RegisterDto {
  @IsMobilePhone('fa-IR')
  phone: string;

  @IsString()
  @Length(4, 4)
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsIn(['owner', 'mechanic', 'seller'])
  role?: 'owner' | 'mechanic' | 'seller';

  @ValidateIf((o) => o.role === 'mechanic' || o.role === 'seller')
  @IsString()
  workshopName?: string;

  @IsOptional()
  @IsString()
  workshopAddress?: string;
}

class RequestOtpDto {
  @IsMobilePhone('fa-IR')
  phone: string;
}

class LoginDto {
  @IsMobilePhone('fa-IR')
  phone: string;

  @IsString()
  @Length(4, 4)
  code: string;
}

class UpdateProfileDto {
  @IsOptional() @IsString() workshopName?: string;
  @IsOptional() @IsString() workshopAddress?: string;
  @IsOptional() @IsNumber() @Type(() => Number) workshopLat?: number;
  @IsOptional() @IsNumber() @Type(() => Number) workshopLng?: number;
}

@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('otp/request')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.phone);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.phone, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(@Body() dto: UpdateProfileDto, @Request() req) {
    return this.auth.updateProfile(req.user.id, dto);
  }
}

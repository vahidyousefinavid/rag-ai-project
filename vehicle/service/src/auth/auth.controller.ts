import { Controller, Post, Body } from '@nestjs/common';
import { IsString, IsMobilePhone, IsOptional, IsIn, ValidateIf } from 'class-validator';
import { AuthService } from './auth.service';

export class RegisterDto {
  @IsMobilePhone('fa-IR')
  phone: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsIn(['owner', 'mechanic'])
  role?: 'owner' | 'mechanic';

  @ValidateIf((o) => o.role === 'mechanic')
  @IsString()
  workshopName?: string;

  @IsOptional()
  @IsString()
  workshopAddress?: string;
}

class LoginDto {
  @IsString()
  phone: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.phone);
  }
}

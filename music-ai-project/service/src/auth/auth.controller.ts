import { Controller, Post, Body } from '@nestjs/common';
import { IsString, IsMobilePhone } from 'class-validator';
import { AuthService } from './auth.service';

export class RegisterDto {
  @IsMobilePhone('fa-IR')
  phone: string;

  @IsString()
  name: string;
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

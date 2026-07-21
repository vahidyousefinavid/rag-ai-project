import { Controller, Post, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { IsString, IsMobilePhone, IsOptional, IsIn, IsNumber, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

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

class UpdateProfileDto {
  @IsOptional() @IsString() workshopName?: string;
  @IsOptional() @IsString() workshopAddress?: string;
  @IsOptional() @IsNumber() @Type(() => Number) workshopLat?: number;
  @IsOptional() @IsNumber() @Type(() => Number) workshopLng?: number;
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

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(@Body() dto: UpdateProfileDto, @Request() req) {
    return this.auth.updateProfile(req.user.id, dto);
  }
}

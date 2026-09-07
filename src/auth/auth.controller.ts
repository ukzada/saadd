import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ok } from '../common/response.util';
import type { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const data = await this.auth.login(dto);
    return ok(data, 'Login successful');
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const data = await this.auth.register(dto);
    return ok(data, 'Account created');
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: User) {
    return ok(user, 'Current user');
  }
}

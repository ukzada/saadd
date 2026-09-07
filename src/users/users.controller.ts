import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ok } from '../common/response.util';
import type { User } from '@prisma/client';

@Controller('user')
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('profile')
  async profile(@CurrentUser() user: User) {
    const data = await this.users.getProfile(user.id);
    return ok(data);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ) {
    const data = await this.users.updateProfile(user.id, dto);
    return ok(data, 'Profile updated');
  }
}

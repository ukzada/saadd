import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { HotelsService } from './hotels.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { ok } from '../common/response.util';
import type { User } from '@prisma/client';

@Controller('hotels')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class HotelsController {
  constructor(private readonly hotels: HotelsService) {}

  @Get()
  async list(@CurrentUser() user: User) {
    const data = await this.hotels.list(user.id);
    return ok(data);
  }

  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user: User) {
    const data = await this.hotels.get(id, user);
    return ok(data);
  }

  @Roles('hotel_owner', 'admin')
  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateHotelDto) {
    const data = await this.hotels.create(user.id, dto);
    return ok(data, 'Hotel created');
  }

  @Roles('hotel_owner', 'admin')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateHotelDto,
  ) {
    const data = await this.hotels.update(id, user, dto);
    return ok(data, 'Hotel updated');
  }

  @Roles('hotel_owner', 'admin')
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    const data = await this.hotels.remove(id, user);
    return ok(data, 'Hotel deleted');
  }
}

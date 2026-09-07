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
import { RoomsService } from './rooms.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ok } from '../common/response.util';
import type { User } from '@prisma/client';

@Controller('hotels/:hotelId/rooms')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Get()
  async list(
    @Param('hotelId') hotelId: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.rooms.list(hotelId, user);
    return ok(data);
  }

  @Get(':roomId')
  async get(
    @Param('hotelId') hotelId: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.rooms.get(hotelId, roomId, user);
    return ok(data);
  }

  @Roles('hotel_owner', 'admin')
  @Post()
  async create(
    @Param('hotelId') hotelId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateRoomDto,
  ) {
    const data = await this.rooms.create(hotelId, user, dto);
    return ok(data, 'Room created');
  }

  @Roles('hotel_owner', 'admin')
  @Patch(':roomId')
  async update(
    @Param('hotelId') hotelId: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateRoomDto,
  ) {
    const data = await this.rooms.update(hotelId, roomId, user, dto);
    return ok(data, 'Room updated');
  }

  @Roles('hotel_owner', 'admin')
  @Delete(':roomId')
  async remove(
    @Param('hotelId') hotelId: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.rooms.remove(hotelId, roomId, user);
    return ok(data, 'Room deleted');
  }
}

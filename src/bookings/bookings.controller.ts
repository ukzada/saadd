import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { ok } from '../common/response.util';
import type { User } from '@prisma/client';

@Controller('bookings')
@UseGuards(FirebaseAuthGuard)
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  async list(@CurrentUser() user: User) {
    const data = await this.bookings.list(user);
    return ok(data);
  }

  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user: User) {
    const data = await this.bookings.get(id, user);
    return ok(data);
  }

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateBookingDto) {
    const data = await this.bookings.create(user.id, dto);
    return ok(data, 'Booking created');
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: UpdateBookingStatusDto) {
    const data = await this.bookings.updateStatus(id, user, dto);
    return ok(data, 'Booking status updated');
  }
}

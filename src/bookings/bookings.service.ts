import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, type User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBookingDto } from './dto/create-booking.dto';
import type { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseBookingDates(startDate: string, endDate?: string) {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('startDate must be a valid ISO date');
    }

    if (end && Number.isNaN(end.getTime())) {
      throw new BadRequestException('endDate must be a valid ISO date');
    }

    if (end && end < start) {
      throw new BadRequestException('endDate must be greater than or equal to startDate');
    }

    return { start, end };
  }

  private async validateHotelRoomAvailability(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    dto: CreateBookingDto,
    start: Date,
    end: Date | null,
  ) {
    if (!dto.hotelId || !dto.roomId) {
      throw new NotFoundException('hotelId and roomId are required for HotelRoom bookings');
    }

    const room = await tx.room.findUnique({
      where: { id: dto.roomId },
      select: { id: true, hotelId: true, maxGuests: true, totalUnits: true },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.hotelId !== dto.hotelId) {
      throw new BadRequestException('Selected room does not belong to the selected hotel');
    }

    if ((dto.numGuests ?? 1) > room.maxGuests) {
      throw new BadRequestException('Guest count exceeds the room capacity');
    }

    if (room.totalUnits <= 0) {
      throw new ConflictException('No units are available for this room');
    }

    const periodEnd = end ?? new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const overlappingBooking = await tx.booking.findFirst({
      where: {
        roomId: dto.roomId,
        status: { notIn: ['Cancelled', 'Refunded'] },
        OR: [
          { startDate: { lte: periodEnd }, endDate: { gte: start } },
          { startDate: { lte: start }, endDate: null },
        ],
      },
      select: { id: true, startDate: true, endDate: true, status: true },
    });

    if (overlappingBooking) {
      throw new ConflictException('This room is already booked for the selected date range');
    }

    return room;
  }

  private async validateBundleAvailability(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    dto: CreateBookingDto,
    start: Date,
    end: Date | null,
  ) {
    if (!dto.bundleId) {
      throw new NotFoundException('bundleId is required for Bundle bookings');
    }

    const bundle = await tx.bundle.findUnique({
      where: { id: dto.bundleId },
      select: { id: true, status: true, groupSize: true },
    });

    if (!bundle) {
      throw new NotFoundException('Bundle not found');
    }

    if (bundle.status !== 'Published') {
      throw new ConflictException('This bundle is not available for booking');
    }

    const periodEnd = end ?? new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const overlappingBundleBooking = await tx.booking.findFirst({
      where: {
        bundleId: dto.bundleId,
        status: { notIn: ['Cancelled', 'Refunded'] },
        OR: [
          { startDate: { lte: periodEnd }, endDate: { gte: start } },
          { startDate: { lte: start }, endDate: null },
        ],
      },
      select: { id: true },
    });

    if (bundle.groupSize && overlappingBundleBooking) {
      const activeCount = await tx.booking.count({
        where: {
          bundleId: dto.bundleId,
          status: { notIn: ['Cancelled', 'Refunded'] },
          OR: [
            { startDate: { lte: periodEnd }, endDate: { gte: start } },
            { startDate: { lte: start }, endDate: null },
          ],
        },
      });

      if (activeCount >= (bundle.groupSize ?? 1)) {
        throw new ConflictException('This bundle has reached its group capacity for the selected dates');
      }
    }

    return bundle;
  }

  async create(userId: string, dto: CreateBookingDto) {
    const { start, end } = this.parseBookingDates(dto.startDate, dto.endDate);

    return this.prisma.$transaction(async (tx) => {
      if (dto.type === 'HotelRoom') {
        await this.validateHotelRoomAvailability(tx, dto, start, end);
      } else {
        await this.validateBundleAvailability(tx, dto, start, end);
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        include: {
          subscriptions: {
            include: { plan: true },
            where: { status: 'Active' },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      const activePlan = user?.subscriptions[0]?.plan ?? null;
      const commissionRate = activePlan && activePlan.type === 'Commission' && activePlan.commissionRate
        ? Number(activePlan.commissionRate)
        : 1;
      const commissionAmount = (Number(dto.totalAmount) * commissionRate) / 100;

      const data: any = {
        userId,
        type: dto.type,
        startDate: start,
        endDate: end,
        numGuests: dto.numGuests ?? 1,
        totalAmount: dto.totalAmount,
        commissionRate: commissionRate,
        commissionAmount: commissionAmount,
        metadata: dto.metadata ?? null,
      };

      if (dto.type === 'HotelRoom') {
        data.hotelId = dto.hotelId;
        data.roomId = dto.roomId;
      } else {
        data.bundleId = dto.bundleId;
      }

      return tx.booking.create({ data });
    });
  }

  /** Relations included so clients (web/mobile) can render details in one call. */
  private readonly bookingInclude = {
    user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
    hotel: { select: { id: true, name: true, location: true, city: true, images: true } },
    room: { select: { id: true, roomType: true, bedType: true, images: true } },
    bundle: { select: { id: true, title: true, description: true, destinations: true, images: true } },
  } as const;

  async list(user: User) {
    if (user.role === 'HotelOwner') {
      const hotels = await this.prisma.hotel.findMany({ where: { ownerId: user.id }, select: { id: true } });
      const hotelIds = hotels.map((h) => h.id);
      return this.prisma.booking.findMany({
        where: { OR: [{ hotelId: { in: hotelIds } }, { userId: user.id }] },
        include: this.bookingInclude,
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.booking.findMany({
      where: { userId: user.id },
      include: this.bookingInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string, user: User) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: this.bookingInclude,
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== user.id && user.role !== 'Admin') {
      if (user.role === 'HotelOwner') {
        const hotel = booking.hotelId ? await this.prisma.hotel.findUnique({ where: { id: booking.hotelId } }) : null;
        if (hotel?.ownerId === user.id) return booking;
      }
      throw new ForbiddenException('You do not have access to this booking');
    }
    return booking;
  }

  async updateStatus(id: string, user: User, dto: UpdateBookingStatusDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    if (user.role !== 'Admin' && booking.userId !== user.id) {
      if (user.role === 'HotelOwner' && booking.hotelId) {
        const hotel = await this.prisma.hotel.findUnique({ where: { id: booking.hotelId } });
        if (hotel?.ownerId !== user.id) {
          throw new ForbiddenException('You do not have permission to update this booking');
        }
      } else {
        throw new ForbiddenException('You do not have permission to update this booking');
      }
    }

    const status = dto.status as BookingStatus;
    if (!status) {
      throw new BadRequestException('Status is required');
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status },
    });
  }
}

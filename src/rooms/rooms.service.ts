import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateRoomDto } from './dto/create-room.dto';
import type { UpdateRoomDto } from './dto/update-room.dto';
import type { User } from '@prisma/client';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(hotelId: string, user: User) {
    await this.assertHotelOwned(hotelId, user);
    return this.prisma.room.findMany({
      where: { hotelId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(hotelId: string, roomId: string, user: User) {
    await this.assertHotelOwned(hotelId, user);
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.hotelId !== hotelId) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  async create(hotelId: string, user: User, dto: CreateRoomDto) {
    await this.assertHotelOwned(hotelId, user);
    return this.prisma.room.create({
      data: {
        hotelId,
        roomType: dto.roomType,
        bedType: dto.bedType,
        maxGuests: dto.maxGuests,
        pricePerNight: dto.pricePerNight,
        size: dto.size,
        amenities: dto.amenities,
        images: dto.images,
        totalUnits: dto.totalUnits,
        availableUnits: dto.totalUnits,
      },
    });
  }

  async update(hotelId: string, roomId: string, user: User, dto: UpdateRoomDto) {
    await this.get(hotelId, roomId, user);
    return this.prisma.room.update({
      where: { id: roomId },
      data: {
        ...(dto.roomType !== undefined && { roomType: dto.roomType }),
        ...(dto.bedType !== undefined && { bedType: dto.bedType }),
        ...(dto.maxGuests !== undefined && { maxGuests: dto.maxGuests }),
        ...(dto.pricePerNight !== undefined && { pricePerNight: dto.pricePerNight }),
        ...(dto.size !== undefined && { size: dto.size }),
        ...(dto.amenities !== undefined && { amenities: dto.amenities }),
        ...(dto.images !== undefined && { images: dto.images }),
        ...(dto.totalUnits !== undefined && {
          totalUnits: dto.totalUnits,
          availableUnits: dto.totalUnits,
        }),
      },
    });
  }

  async remove(hotelId: string, roomId: string, user: User) {
    await this.get(hotelId, roomId, user);
    await this.prisma.room.delete({ where: { id: roomId } });
    return { id: roomId };
  }

  private async assertHotelOwned(hotelId: string, user: User) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { ownerId: true },
    });
    if (!hotel) throw new NotFoundException('Hotel not found');
    if (hotel.ownerId !== user.id && user.role !== 'Admin') {
      throw new ForbiddenException('You do not own this hotel');
    }
  }
}

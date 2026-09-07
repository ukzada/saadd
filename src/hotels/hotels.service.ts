import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateHotelDto } from './dto/create-hotel.dto';
import type { UpdateHotelDto } from './dto/update-hotel.dto';
import type { User } from '@prisma/client';

@Injectable()
export class HotelsService {
  constructor(private readonly prisma: PrismaService) {}

  list(ownerId: string) {
    return this.prisma.hotel.findMany({
      where: { ownerId },
      include: { rooms: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string, user: User) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id },
      include: { rooms: true },
    });
    if (!hotel) throw new NotFoundException('Hotel not found');
    if (hotel.ownerId !== user.id && user.role !== 'Admin') {
      throw new ForbiddenException('You do not own this hotel');
    }
    return hotel;
  }

  create(ownerId: string, dto: CreateHotelDto) {
    return this.prisma.hotel.create({
      data: {
        ownerId,
        name: dto.name,
        description: dto.description,
        starRating: dto.starRating,
        location: dto.location,
        city: dto.city,
        latitude: dto.latitude,
        longitude: dto.longitude,
        amenities: dto.amenities,
        images: dto.images,
        policies: dto.policies ?? null,
      },
      include: { rooms: true },
    });
  }

  async update(id: string, user: User, dto: UpdateHotelDto) {
    const existing = await this.get(id, user);
    return this.prisma.hotel.update({
      where: { id: existing.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.starRating !== undefined && { starRating: dto.starRating }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.amenities !== undefined && { amenities: dto.amenities }),
        ...(dto.images !== undefined && { images: dto.images }),
        ...(dto.policies !== undefined && { policies: dto.policies }),
      },
      include: { rooms: true },
    });
  }

  async remove(id: string, user: User) {
    await this.get(id, user);
    await this.prisma.hotel.delete({ where: { id } });
    return { id };
  }
}

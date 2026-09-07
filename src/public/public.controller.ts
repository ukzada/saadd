import { Controller, Get, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ok } from '../common/response.util';

@Controller('public')
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('hotels')
  async listHotels() {
    const data = await this.prisma.hotel.findMany({
      include: { rooms: true },
      orderBy: { createdAt: 'desc' },
    });
    return ok(data);
  }

  @Get('hotels/:id')
  async getHotel(@Param('id') id: string) {
    const data = await this.prisma.hotel.findUnique({ where: { id }, include: { rooms: true } });
    return ok(data);
  }

  @Get('bundles')
  async listBundles() {
    const data = await this.prisma.bundle.findMany({
      where: { status: 'Published' },
      include: { days: { include: { items: true }, orderBy: { dayNumber: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return ok(data);
  }

  @Get('bundles/:id')
  async getBundle(@Param('id') id: string) {
    const data = await this.prisma.bundle.findUnique({
      where: { id, },
      include: { days: { include: { items: true }, orderBy: { dayNumber: 'asc' } } },
    });
    if (!data || data.status !== 'Published') return ok(null);
    return ok(data);
  }
}

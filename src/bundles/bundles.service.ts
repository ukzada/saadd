import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBundleDto } from './dto/create-bundle.dto';
import type { UpdateBundleDto } from './dto/update-bundle.dto';
import type { User } from '@prisma/client';

@Injectable()
export class BundlesService {
  constructor(private readonly prisma: PrismaService) {}

  list(creatorId: string) {
    return this.prisma.bundle.findMany({
      where: { creatorId },
      include: { days: { include: { items: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string, user: User) {
    const bundle = await this.prisma.bundle.findUnique({
      where: { id },
      include: { days: { include: { items: true }, orderBy: { dayNumber: 'asc' } } },
    });
    if (!bundle) throw new NotFoundException('Bundle not found');
    if (bundle.creatorId !== user.id && user.role !== 'Admin') {
      throw new ForbiddenException('You do not own this bundle');
    }
    return bundle;
  }

  async create(creatorId: string, dto: CreateBundleDto) {
    return this.prisma.bundle.create({
      data: {
        creatorId,
        title: dto.title,
        description: dto.description,
        durationDays: dto.durationDays,
        destinations: dto.destinations,
        images: dto.images,
        guideName: dto.guideName,
        price: dto.price,
        difficulty: dto.difficulty ?? 'easy',
        groupSize: dto.groupSize,
        includedServices: dto.includedServices,
        status: 'Draft',
        days: {
          create: dto.days.map((d) => ({
            dayNumber: d.dayNumber,
            title: d.title,
            description: d.description,
            items: {
              create: d.items.map((it) => ({
                type: it.type,
                title: it.title,
                description: it.description,
                startTime: it.startTime,
                endTime: it.endTime,
                location: it.location,
                cost: it.cost,
                includedServices: it.includedServices ?? [],
                metadata: it.metadata as any,
              })),
            },
          })),
        },
      },
      include: { days: { include: { items: true }, orderBy: { dayNumber: 'asc' } } },
    });
  }

  async update(id: string, user: User, dto: UpdateBundleDto) {
    const existing = await this.get(id, user);

    // For nested day updates, replace the entire tree (simple and predictable).
    if (dto.days && dto.days.length > 0) {
      await this.prisma.bundleDay.deleteMany({ where: { bundleId: existing.id } });
      await this.prisma.bundleDay.createMany({
        data: dto.days.map((d) => ({
          bundleId: existing.id,
          dayNumber: d.dayNumber,
          title: d.title,
          description: d.description,
        })),
      });
      // Re-create items for each new day.
      const createdDays = await this.prisma.bundleDay.findMany({
        where: { bundleId: existing.id },
        orderBy: { dayNumber: 'asc' },
      });
      for (const [i, d] of dto.days.entries()) {
        const dbDay = createdDays[i];
        if (!dbDay) continue;
        if (d.items && d.items.length > 0) {
          await this.prisma.bundleItem.createMany({
            data: d.items.map((it) => ({
              bundleDayId: dbDay.id,
              type: it.type,
              title: it.title,
              description: it.description,
              startTime: it.startTime,
              endTime: it.endTime,
              location: it.location,
              cost: it.cost,
              includedServices: it.includedServices ?? [],
              metadata: it.metadata as any,
            })),
          });
        }
      }
    }

    return this.prisma.bundle.update({
      where: { id: existing.id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.durationDays !== undefined && { durationDays: dto.durationDays }),
        ...(dto.destinations !== undefined && { destinations: dto.destinations }),
        ...(dto.images !== undefined && { images: dto.images }),
        ...(dto.guideName !== undefined && { guideName: dto.guideName }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.difficulty !== undefined && { difficulty: dto.difficulty }),
        ...(dto.groupSize !== undefined && { groupSize: dto.groupSize }),
        ...(dto.includedServices !== undefined && {
          includedServices: dto.includedServices,
        }),
      },
      include: { days: { include: { items: true }, orderBy: { dayNumber: 'asc' } } },
    });
  }

  async remove(id: string, user: User) {
    await this.get(id, user);
    await this.prisma.bundle.delete({ where: { id } });
    return { id };
  }
}

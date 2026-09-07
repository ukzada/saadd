import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import type { User } from '@prisma/client';
import type { UserRole } from './shared-types';

const PRISMA_TO_SHARED: Record<string, UserRole> = {
  HotelOwner: 'hotel_owner',
  BundleCreator: 'bundle_creator',
  Traveler: 'traveler',
  Admin: 'admin',
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();
    const user: User | undefined = req.user;
    if (!user) throw new ForbiddenException('Not authenticated');

    const sharedRole = PRISMA_TO_SHARED[user.role];
    if (!required.includes(sharedRole)) {
      throw new ForbiddenException(
        `Role '${sharedRole}' is not permitted for this endpoint`,
      );
    }
    return true;
  }
}

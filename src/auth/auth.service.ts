import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { AuthResponse, JwtPayload } from '../common/shared-types';

/**
 * AuthService
 * ───────────────────────────────────────────────────────────
 * In MOCK_AUTH mode:
 *   • Login accepts any email + password (password must be ≥6 chars)
 *     and returns a JWT for either an existing user or a freshly
 *     created dev user with the requested role.
 *   • Register creates a real DB row.
 *
 * Demo accounts are seeded on boot (see `seedDemoAccounts`) when
 * SEED_DEMO_ACCOUNTS=true. The credentials are configurable via env
 * so production deployments can disable them with one switch.
 *
 * The verifyToken method is the single swap point for Firebase.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ───────────────────────────────────────────────────────────
  // Demo-account seeding — runs once on bootstrap.
  // Set SEED_DEMO_ACCOUNTS=false in production to disable.
  // ───────────────────────────────────────────────────────────
  async seedDemoAccounts(): Promise<void> {
    if (this.config.get<string>('SEED_DEMO_ACCOUNTS', 'true') !== 'true') return;

    const accounts = [
      {
        email: this.config.get<string>('DEMO_HOTEL_EMAIL', 'hotel@viatrips.com'),
        password: this.config.get<string>('DEMO_HOTEL_PASSWORD', 'password123'),
        name: 'Hotel Owner Demo',
        role: 'HotelOwner' as UserRole,
        companyName: 'Via Trips Hotel Group',
      },
      {
        email: this.config.get<string>('DEMO_BUNDLE_EMAIL', 'bundle@viatrips.com'),
        password: this.config.get<string>('DEMO_BUNDLE_PASSWORD', 'password123'),
        name: 'Bundle Creator Demo',
        role: 'BundleCreator' as UserRole,
        companyName: 'Via Trips Adventures',
      },
    ];

    for (const acc of accounts) {
      const existing = await this.prisma.user.findUnique({
        where: { email: acc.email.toLowerCase() },
      });
      if (existing) continue;
      await this.prisma.user.create({
        data: {
          email: acc.email.toLowerCase(),
          passwordHash: this.hashPassword(acc.password),
          name: acc.name,
          role: acc.role,
          companyName: acc.companyName,
          languagesSpoken: [],
        },
      });
      this.logger.log(`Seeded demo account: ${acc.email} (${acc.role})`);
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const role = this.normaliseRole(dto.role, dto.email);

    // Find or create user (mock mode tolerates unknown emails).
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash: this.hashPassword(dto.password),
          name: dto.email.split('@')[0],
          role,
          languagesSpoken: [],
        },
      });
      this.logger.log(`Auto-created mock user ${user.email} (${user.role})`);
    }

    return this.buildAuthResponse(user.id, user.email, user.role);
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email already registered');

    const prismaRole = this.roleToPrisma(dto.role);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: this.hashPassword(dto.password),
        name: dto.name,
        role: prismaRole,
        phone: dto.phone,
        companyName: dto.companyName,
        businessLicense: dto.businessLicense,
        tourGuideLicense: dto.tourGuideLicense,
        yearsExperience: dto.yearsExperience,
        languagesSpoken: dto.languagesSpoken ?? [],
      },
    });
    return this.buildAuthResponse(user.id, user.email, user.role);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ── Helpers ───────────────────────────────────────────────

  private async buildAuthResponse(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<AuthResponse> {
    const payload: JwtPayload = { sub: userId, email, role: this.roleFromPrisma(role) };
    const token = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '7d'),
    });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return { token, user: user as any };
  }

  /**
   * Swap point for Firebase. Currently decodes our local JWT.
   * Replace body with `admin.auth().verifyIdToken(token)` later.
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    return this.jwt.verifyAsync(token, {
      secret: this.config.get<string>('JWT_SECRET'),
    });
  }

  private normaliseRole(
    role: LoginDto['role'],
    email: string,
  ): UserRole {
    if (role === 'hotel_owner') return 'HotelOwner';
    if (role === 'bundle_creator') return 'BundleCreator';
    if (role === 'traveler') return 'Traveler';
    if (role === 'admin') return 'Admin';
    if (email.includes('bundle')) return 'BundleCreator';
    if (email.includes('traveler')) return 'Traveler';
    if (email.includes('admin')) return 'Admin';
    return 'HotelOwner';
  }

  private roleToPrisma(r: RegisterDto['role']): UserRole {
    if (r === 'hotel_owner') return 'HotelOwner';
    if (r === 'bundle_creator') return 'BundleCreator';
    if (r === 'traveler') return 'Traveler';
    return 'Admin';
  }

  private roleFromPrisma(r: UserRole): 'hotel_owner' | 'bundle_creator' | 'traveler' | 'admin' {
    if (r === 'HotelOwner') return 'hotel_owner';
    if (r === 'BundleCreator') return 'bundle_creator';
    if (r === 'Traveler') return 'traveler';
    return 'admin';
  }

  /**
   * NOT secure — for dev mock only. Replace with bcrypt before production.
   */
  private hashPassword(p: string): string {
    return `mock$${Buffer.from(p).toString('base64')}`;
  }
}

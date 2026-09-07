import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

/**
 * FirebaseAuthGuard
 * ───────────────────────────────────────────────────────────
 * Single global guard that handles BOTH modes:
 *
 *  • MOCK_AUTH=true  → verifies local dev JWT signed by AuthService
 *  • MOCK_AUTH=false → verifies Firebase ID tokens via firebase-admin
 *                      (initialise admin in src/main.ts; the verify
 *                       path is left as a TODO stub below)
 *
 * The verified user is attached to `request.user` as a full Prisma
 * User row so downstream services can rely on it.
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger('FirebaseAuthGuard');

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const authHeader: string | undefined = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Authorization header');
    }
    const token = authHeader.slice(7);

    const mockAuth = this.config.get<string>('MOCK_AUTH', 'true') === 'true';

    let userId: string;
    if (mockAuth) {
      userId = await this.verifyMockToken(token);
    } else {
      userId = await this.verifyFirebaseToken(token);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    req.user = user;
    return true;
  }

  /**
   * Mock mode — verify a locally-signed JWT.
   */
  private async verifyMockToken(token: string): Promise<string> {
    try {
      const payload = await this.jwt.verifyAsync(token);
      return payload.sub as string;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Production mode — verify a Firebase ID token.
   *
   * TODO(firebase): wire up `firebase-admin`:
   *
   *   import * as admin from 'firebase-admin';
   *   const decoded = await admin.auth().verifyIdToken(token);
   *   const firebaseUid = decoded.uid;
   *   const user = await this.prisma.user.findUnique({ where: { firebaseUid } });
   *   if (!user) throw new UnauthorizedException('User not linked');
   *   return user.id;
   *
   * The firebase-admin app must be initialised once in src/main.ts.
   */
  private async verifyFirebaseToken(_token: string): Promise<string> {
    this.logger.warn(
      'Firebase verification not implemented yet — set MOCK_AUTH=true for dev.',
    );
    throw new UnauthorizedException('Firebase auth not configured');
  }
}

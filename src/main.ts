// Load .env from this directory BEFORE any other import so DATABASE_URL
// is available when PrismaClient is constructed. `override: true` ensures
// our value wins even if a parent project's .env was already loaded.
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
loadEnv({ path: resolve(__dirname, '..', '.env'), override: true });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const prefix = config.get<string>('API_PREFIX', 'v1');
  app.setGlobalPrefix(prefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const corsOriginsRaw = config.get<string>('CORS_ORIGINS', 'http://localhost:3000');
  const origins = corsOriginsRaw.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ── Firebase Admin init (skipped in mock mode) ─────────────
  // When MOCK_AUTH=false, initialise firebase-admin here using
  // FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
  // and inject it into FirebaseAuthGuard. See auth/firebase-auth.guard.ts.

  const port = config.get<number>('PORT', 3001);
  const host = config.get<string>('HOST', '0.0.0.0');
  await app.listen(port, host);
  logger.log(`API ready on http://${host}:${port}/${prefix}`);
  logger.log(`Localhost fallback: http://localhost:${port}/${prefix}`);
  logger.log(`CORS origins: ${origins.join(', ')}`);
  logger.log(`Mock auth: ${config.get<string>('MOCK_AUTH', 'true')}`);

  // ── Seed demo accounts (dev only) ───────────────────────────
  // Disabled automatically when SEED_DEMO_ACCOUNTS=false in production.
  try {
    const authService = app.get(AuthService);
    await authService.seedDemoAccounts();
  } catch (err) {
    logger.warn(`Demo-account seeding skipped: ${(err as Error).message}`);
  }
}
bootstrap();

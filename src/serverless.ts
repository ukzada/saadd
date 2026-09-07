/**
 * Vercel serverless bootstrap.
 *
 * Unlike main.ts (long-running server with app.listen), this entry creates
 * the NestJS application on top of an ExpressAdapter, initialises it, and
 * returns the raw Express instance. Vercel's Node runtime invokes functions
 * with Node-style (req, res), and an Express app IS a valid Node request
 * handler — so api/index.js simply calls expressApp(req, res).
 * The instance is created once and cached across warm invocations.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

export async function bootstrapServerless() {
  const logger = new Logger('ServerlessBootstrap');

  // Fail-fast visibility for the most common Vercel misconfigurations.
  // DATABASE_URL: PrismaService logs the authoritative error, but a crash
  // before Nest is created would hide it - warn here as well.
  if (!process.env.DATABASE_URL) {
    logger.error(
      'DATABASE_URL is missing! Add it in Vercel -> Settings -> Environment Variables, then redeploy.',
    );
  }
  if (!process.env.JWT_SECRET) {
    logger.warn(
      'JWT_SECRET is not set - authenticated endpoints (login, Bearer routes) will fail until it is provided.',
    );
  }

  const expressApp = new ExpressAdapter();
  const app = await NestFactory.create(AppModule, expressApp, {
    bufferLogs: true,
  });
  const config = app.get(ConfigService);

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

  // Friendly root endpoint — the API itself lives under /${prefix}
  expressApp.get('/', (_req: any, res: any) => {
    res.status(200).json({
      success: true,
      message: 'Via Trips API is running',
      docs: `Try GET /${prefix}/public/hotels`,
      timestamp: new Date().toISOString(),
    });
  });

  await app.init(); // triggers PrismaService.onModuleInit -> $connect
  logger.log(`Nest application initialised (prefix: /${prefix})`);

  // Express instance doubles as a (req, res) Node handler — exactly what
  // Vercel's serverless runtime expects. No Lambda adapter needed.
  return expressApp.getInstance();
}

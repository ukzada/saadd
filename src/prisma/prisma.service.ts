import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('PrismaService');
  private connected = false;

  /**
   * Serverless-safe startup: a cold start must NEVER crash the whole
   * function because the database is momentarily unreachable or
   * DATABASE_URL is misconfigured.
   *
   * - $connect() failures are logged (full stack -> Vercel logs) but do
   *   not rethrow, so Nest finishes initialising and the function can
   *   serve a useful 500 JSON instead of FUNCTION_INVOCATION_FAILED.
   * - Prisma reconnects lazily on the first actual query, so a database
   *   that becomes available later still works without a redeploy.
   */
  async onModuleInit(): Promise<void> {
    if (!process.env.DATABASE_URL) {
      this.logger.error(
        'DATABASE_URL is not set! Set it in Vercel -> Settings -> Environment Variables. ' +
          'Database queries will fail until it is provided.',
      );
      return;
    }
    try {
      await this.$connect();
      this.connected = true;
      this.logger.log('Database connection established');
    } catch (err) {
      this.logger.error(
        `Initial database connection failed: ${(err as Error).message}\n` +
          (err as Error).stack,
      );
      this.logger.warn(
        'Continuing without a live connection - queries will retry connecting automatically.',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connected) {
      await this.$disconnect().catch(() => undefined);
    }
  }
}

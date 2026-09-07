import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HotelsModule } from './hotels/hotels.module';
import { RoomsModule } from './rooms/rooms.module';
import { BundlesModule } from './bundles/bundles.module';
import { KycModule } from './kyc/kyc.module';
import { UsersModule } from './users/users.module';
import { BookingsModule } from './bookings/bookings.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PublicModule } from './public/public.module';
import { CommonModule } from './common/common.module';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './common/global-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    HotelsModule,
    RoomsModule,
    BundlesModule,
    KycModule,
    BookingsModule,
    SubscriptionsModule,
    // public endpoints for mobile apps
    PublicModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}

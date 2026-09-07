import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../common/roles.guard';
import { ok } from '../common/response.util';
import { SubscriptionsService } from './subscriptions.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { UpdateSubscriptionStatusDto } from './dto/update-subscription-status.dto';
import type { User } from '@prisma/client';

@Controller('subscriptions')
@UseGuards(FirebaseAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('plans')
  async listPlans() {
    const data = await this.subscriptions.listPlans();
    return ok(data);
  }

  @Get('me')
  async mySubscription(@CurrentUser() user: User) {
    const data = await this.subscriptions.getUserSubscription(user.id);
    return ok(data);
  }

  @Post('subscribe')
  async subscribe(@CurrentUser() user: User, @Body() dto: SubscribeDto) {
    const data = await this.subscriptions.subscribe(user.id, dto);
    return ok(data, 'Subscription saved');
  }
}

@Controller('admin/subscriptions')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class AdminSubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Roles('admin')
  @Get()
  async list() {
    const data = await this.subscriptions.listAdminSubscriptions();
    return ok(data);
  }

  @Roles('admin')
  @Post('plans')
  async createPlan(@Body() dto: CreatePlanDto) {
    const data = await this.subscriptions.createPlan(dto);
    return ok(data, 'Subscription plan created');
  }

  @Roles('admin')
  @Patch('plans/:id')
  async updatePlan(@Param('id') id: string, @Body() dto: Partial<CreatePlanDto>) {
    const data = await this.subscriptions.updatePlan(id, dto);
    return ok(data, 'Subscription plan updated');
  }

  @Roles('admin')
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateSubscriptionStatusDto) {
    const data = await this.subscriptions.updateAdminSubscriptionStatus(id, dto);
    return ok(data, 'Subscription status updated');
  }
}

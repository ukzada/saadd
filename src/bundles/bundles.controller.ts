import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BundlesService } from './bundles.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { UpdateBundleDto } from './dto/update-bundle.dto';
import { ok } from '../common/response.util';
import type { User } from '@prisma/client';

@Controller('bundles')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class BundlesController {
  constructor(private readonly bundles: BundlesService) {}

  @Get()
  async list(@CurrentUser() user: User) {
    const data = await this.bundles.list(user.id);
    return ok(data);
  }

  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user: User) {
    const data = await this.bundles.get(id, user);
    return ok(data);
  }

  @Roles('bundle_creator', 'admin')
  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateBundleDto) {
    const data = await this.bundles.create(user.id, dto);
    return ok(data, 'Bundle created');
  }

  @Roles('bundle_creator', 'admin')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateBundleDto,
  ) {
    const data = await this.bundles.update(id, user, dto);
    return ok(data, 'Bundle updated');
  }

  @Roles('bundle_creator', 'admin')
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    const data = await this.bundles.remove(id, user);
    return ok(data, 'Bundle deleted');
  }
}

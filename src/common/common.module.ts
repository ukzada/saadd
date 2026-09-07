import { Module } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { GlobalExceptionFilter } from './global-exception.filter';

@Module({
  providers: [RolesGuard, GlobalExceptionFilter],
  exports: [RolesGuard, GlobalExceptionFilter],
})
export class CommonModule {}

import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSubscriptionStatusDto {
  @IsNotEmpty()
  @IsEnum(['Pending', 'Active', 'Expired', 'Cancelled', 'Suspended'])
  status!: 'Pending' | 'Active' | 'Expired' | 'Cancelled' | 'Suspended';

  @IsOptional()
  @IsString()
  adminNotes?: string;
}

import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubscribeDto {
  @IsNotEmpty()
  @IsString()
  planId!: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}

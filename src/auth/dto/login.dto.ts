import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsIn(['hotel_owner', 'bundle_creator', 'traveler', 'admin'])
  role?: 'hotel_owner' | 'bundle_creator' | 'traveler' | 'admin';
}

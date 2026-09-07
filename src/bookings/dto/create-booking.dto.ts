import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsIn(['HotelRoom', 'Bundle'])
  type!: 'HotelRoom' | 'Bundle';

  @IsOptional()
  @IsString()
  hotelId?: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsString()
  bundleId?: string;

  @IsNotEmpty()
  @IsString()
  startDate!: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  numGuests?: number;

  @IsNotEmpty()
  @IsNumber()
  totalAmount!: number;

  @IsOptional()
  metadata?: any;
}

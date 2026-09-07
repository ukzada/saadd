import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateBookingStatusDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled', 'Refunded'])
  status!: 'Pending' | 'Confirmed' | 'Active' | 'Completed' | 'Cancelled' | 'Refunded';
}

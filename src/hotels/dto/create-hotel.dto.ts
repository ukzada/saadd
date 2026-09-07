import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

const STAR_RATINGS = [1, 2, 3, 4, 5] as const;
const AMENITIES = [
  'wifi', 'pool', 'gym', 'spa', 'parking', 'restaurant', 'bar',
  'business_center', 'concierge', 'room_service', 'airport_shuttle',
  'family_friendly', 'pet_friendly', 'beach_access',
] as const;

export class CreateHotelDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(10)
  description!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  starRating!: number;

  @IsString()
  @MinLength(3)
  location!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsArray()
  @IsIn(AMENITIES, { each: true })
  amenities!: string[];

  @IsArray()
  @IsString({ each: true })
  images!: string[];

  @IsOptional()
  @IsObject()
  policies?: {
    checkIn?: string;
    checkOut?: string;
    smokingAllowed?: boolean;
    petsAllowed?: boolean;
    cancellationPolicy?: string;
  };
}

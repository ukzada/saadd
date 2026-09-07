import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

const BED_TYPES = [
  'single', 'double', 'queen', 'king', 'twin', 'sofa_bed', 'bunk',
] as const;

const ROOM_AMENITIES = [
  'ac', 'minibar', 'safe', 'tv', 'balcony', 'kitchen',
  'washing_machine', 'city_view', 'sea_view',
] as const;

export class CreateRoomDto {
  @IsString()
  @MinLength(2)
  roomType!: string;

  @IsIn(BED_TYPES)
  bedType!: string;

  @IsInt()
  @Min(1)
  maxGuests!: number;

  @IsNumber()
  @Min(0)
  pricePerNight!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  size?: number;

  @IsArray()
  @IsIn(ROOM_AMENITIES, { each: true })
  amenities!: string[];

  @IsArray()
  @IsString({ each: true })
  images!: string[];

  @IsInt()
  @Min(1)
  totalUnits!: number;
}

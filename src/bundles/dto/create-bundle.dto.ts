import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const ITEM_TYPES = ['flight', 'hotel', 'tour', 'meal', 'transport', 'custom'] as const;
const DIFFICULTIES = ['easy', 'moderate', 'challenging'] as const;

export class CreateBundleItemDto {
  @IsIn(ITEM_TYPES)
  type!: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includedServices?: string[];

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class CreateBundleDayDto {
  @IsInt()
  @Min(1)
  dayNumber!: number;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBundleItemDto)
  items!: CreateBundleItemDto[];
}

export class CreateBundleDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(10)
  description!: string;

  @IsInt()
  @Min(1)
  durationDays!: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  destinations!: string[];

  @IsArray()
  @IsString({ each: true })
  images!: string[];

  @IsOptional()
  @IsString()
  guideName?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsIn(DIFFICULTIES)
  difficulty?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  groupSize?: number;

  @IsArray()
  @IsString({ each: true })
  includedServices!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBundleDayDto)
  days!: CreateBundleDayDto[];
}

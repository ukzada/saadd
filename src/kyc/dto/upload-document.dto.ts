import { IsIn, IsOptional, IsString } from 'class-validator';

const KYC_DOC_TYPES = [
  'business_license',
  'id_proof',
  'tax_certificate',
  'hotel_license',
  'property_ownership',
  'tour_guide_license',
] as const;

export class UploadKycDocumentDto {
  @IsIn(KYC_DOC_TYPES)
  type!: string;

  @IsString()
  fileUrl!: string;

  @IsString()
  fileName!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

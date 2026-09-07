import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UploadKycDocumentDto } from './dto/upload-document.dto';
import type { User, KycDocumentType } from '@prisma/client';

const TYPE_MAP: Record<string, KycDocumentType> = {
  business_license: 'BusinessLicense',
  id_proof: 'IdProof',
  tax_certificate: 'TaxCertificate',
  hotel_license: 'HotelLicense',
  property_ownership: 'PropertyOwnership',
  tour_guide_license: 'TourGuideLicense',
};

@Injectable()
export class KycService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(user: User) {
    const docs = await this.prisma.kycDocument.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    return {
      kycStatus: user.kycStatus,
      kycSubmittedAt: user.kycSubmittedAt,
      kycReviewedAt: user.kycReviewedAt,
      kycRejectionReason: user.kycRejectionReason,
      documents: docs,
    };
  }

  async uploadDocument(user: User, dto: UploadKycDocumentDto) {
    const prismaType = TYPE_MAP[dto.type];
    if (!prismaType) {
      throw new BadRequestException(`Unknown KYC document type: ${dto.type}`);
    }
    const doc = await this.prisma.kycDocument.create({
      data: {
        userId: user.id,
        type: prismaType,
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
        mimeType: dto.mimeType ?? 'application/octet-stream',
        status: user.kycStatus === 'Approved' ? 'Approved' : 'NotSubmitted',
      },
    });

    // If the user's KYC was previously rejected, allow them to reset to
    // not_submitted when they upload fresh documents.
    if (user.kycStatus === 'Rejected') {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          kycStatus: 'NotSubmitted',
          kycRejectionReason: null,
        },
      });
    }

    return this.prisma.kycDocument.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async submit(user: User) {
    const docs = await this.prisma.kycDocument.findMany({
      where: { userId: user.id },
    });
    if (docs.length === 0) {
      throw new BadRequestException(
        'Upload at least one document before submitting for review',
      );
    }
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        kycStatus: 'Pending',
        kycSubmittedAt: new Date(),
        kycRejectionReason: null,
      },
    });
    await this.prisma.kycDocument.updateMany({
      where: { userId: user.id },
      data: { status: 'Pending' },
    });
    return {
      kycStatus: updated.kycStatus,
      kycSubmittedAt: updated.kycSubmittedAt,
    };
  }

  // ── Admin placeholder (not wired to a route yet) ──────────
  // async approve(userId: string) { ... }
  // async reject(userId: string, reason: string) { ... }
}

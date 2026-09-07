import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { ConfigService } from '@nestjs/config';
import { KycService } from './kyc.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UploadKycDocumentDto } from './dto/upload-document.dto';
import { ok } from '../common/response.util';
import type { User } from '@prisma/client';

@Controller('kyc')
@UseGuards(FirebaseAuthGuard)
export class KycController {
  constructor(
    private readonly kyc: KycService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async status(@CurrentUser() user: User) {
    const data = await this.kyc.getStatus(user);
    return ok(data);
  }

  @Post('documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          // Vercel's filesystem is read-only except /tmp, and /tmp is
          // ephemeral. Local dev keeps ./uploads; serverless isolates
          // temp files under /tmp so a failed write can never take the
          // whole function down.
          const dir =
            process.env.UPLOAD_DIR ||
            (process.env.VERCEL ? '/tmp/uploads' : './uploads');
          try {
            mkdirSync(dir, { recursive: true });
            cb(null, dir);
          } catch (err) {
            cb(err as Error, dir);
          }
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadDocument(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { type: string; fileUrl?: string; fileName?: string; mimeType?: string },
  ) {
    if (!file) {
      // Fall back to URL-based upload if no file was attached (e.g. mock mode).
      const dto: UploadKycDocumentDto = {
        type: body.type,
        fileUrl: body.fileUrl ?? `mock://uploads/${body.type}`,
        fileName: body.fileName ?? `${body.type}.pdf`,
        mimeType: body.mimeType ?? 'application/octet-stream',
      };
      const data = await this.kyc.uploadDocument(user, dto);
      return ok(data, 'Document uploaded (mock URL)');
    }
    const dto: UploadKycDocumentDto = {
      type: body.type,
      fileUrl: `/uploads/${file.filename}`,
      fileName: file.originalname,
      mimeType: file.mimetype,
    };
    const data = await this.kyc.uploadDocument(user, dto);
    return ok(data, 'Document uploaded');
  }

  @Post('submit')
  async submit(@CurrentUser() user: User) {
    const data = await this.kyc.submit(user);
    return ok(data, 'KYC submitted for review');
  }
}

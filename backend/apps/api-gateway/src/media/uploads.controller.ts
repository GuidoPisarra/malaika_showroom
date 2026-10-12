/// <reference types="multer" />
import type { TenantContext } from '@malaika/common';
import { BadRequestException, Controller, HttpCode, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsIn, IsOptional } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { Auth } from '../auth/auth.guard.js';
import { CurrentTenant } from '../tenant/tenant.decorator.js';
import { UPLOAD_FOLDERS, UnsupportedImageError, processImage } from './image-processor.js';
import type { UploadFolder } from './image-processor.js';
import { StorageService } from './storage.service.js';

export const MAX_UPLOAD_MB = Number(process.env.UPLOAD_MAX_MB ?? 15);

const invalid = (message: string, code = 'INVALID_IMAGE') => new BadRequestException({ statusCode: 400, message, code });

export class UploadQuery {
  @IsOptional() @IsIn(Object.keys(UPLOAD_FOLDERS))
  folder?: UploadFolder;
}

@Controller('admin/uploads')
@Auth('ADMIN')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  /** Sube una imagen del comercio (campo "file") y devuelve su URL pública. */
  @Post()
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1 } }))
  async upload(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: UploadQuery,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file?.buffer?.length) throw invalid('Elegí una imagen para subir', 'FILE_REQUIRED');
    const folder = query.folder ?? 'products';

    let image;
    try {
      image = await processImage(file.buffer, folder);
    } catch (err) {
      if (err instanceof UnsupportedImageError) throw invalid(err.message);
      throw err;
    }

    const now = new Date();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const key = `${tenant.slug}/${folder}/${now.getUTCFullYear()}/${month}/${randomUUID()}.${image.extension}`;
    const stored = await this.storage.put(key, image.buffer, image.contentType);
    return { url: stored.url, width: image.width, height: image.height, size: image.buffer.length };
  }
}

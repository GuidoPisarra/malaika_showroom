import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

/**
 * Dónde se guardan las imágenes que suben los comercios.
 *
 * - `s3`: cualquier almacenamiento compatible con S3 (AWS S3, Cloudflare R2,
 *   DigitalOcean Spaces, MinIO). Es lo recomendado en producción.
 * - `local`: carpeta en el servidor, servida por el gateway en /api/uploads.
 *   Sirve para desarrollo o para un VPS sin almacenamiento externo.
 */
export type StorageDriver = 's3' | 'local';

export interface StoredFile {
  key: string;
  url: string;
}

const trimSlash = (s: string) => s.replace(/\/+$/, '');

export function storageDriver(): StorageDriver {
  return process.env.STORAGE_DRIVER === 's3' ? 's3' : 'local';
}

export function localUploadsDir(): string {
  return resolve(process.env.UPLOADS_DIR ?? 'uploads');
}

/** Variables obligatorias según el driver elegido. */
export function storageRequiredEnv(): string[] {
  return storageDriver() === 's3' ? ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_PUBLIC_URL'] : [];
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  readonly driver = storageDriver();
  private readonly s3 =
    this.driver === 's3'
      ? new S3Client({
          region: process.env.S3_REGION || 'auto',
          endpoint: process.env.S3_ENDPOINT || undefined,
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
          },
        })
      : null;

  constructor() {
    this.logger.log(this.driver === 's3' ? `Imágenes en el bucket ${process.env.S3_BUCKET}` : `Imágenes en ${localUploadsDir()}`);
  }

  async put(key: string, body: Buffer, contentType: string): Promise<StoredFile> {
    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key,
          Body: body,
          ContentType: contentType,
          // El nombre es único, así que el navegador y la CDN pueden guardarla para siempre.
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
      return { key, url: `${trimSlash(process.env.S3_PUBLIC_URL!)}/${key}` };
    }

    const path = join(localUploadsDir(), key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
    const base = process.env.PUBLIC_UPLOADS_URL || `${trimSlash(process.env.PUBLIC_API_URL ?? 'http://localhost:3100')}/api/uploads`;
    return { key, url: `${trimSlash(base)}/${key}` };
  }
}

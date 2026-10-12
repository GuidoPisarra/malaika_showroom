import sharp from 'sharp';

/** Carpetas en las que el panel guarda imágenes, con el lado máximo de cada una. */
export const UPLOAD_FOLDERS = {
  products: 2000,
  looks: 2000,
  showroom: 4096,
  brand: 1200,
} as const;

export type UploadFolder = keyof typeof UPLOAD_FOLDERS;

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp', 'avif', 'gif', 'tiff']);

export class UnsupportedImageError extends Error {}

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  contentType: string;
  extension: string;
}

/**
 * Valida que el archivo sea una imagen (por su contenido, no por la extensión),
 * la endereza según el EXIF, la achica si hace falta y la pasa a WebP.
 * Los metadatos (incluida la ubicación GPS de las fotos del celular) se descartan.
 */
export async function processImage(input: Buffer, folder: UploadFolder): Promise<ProcessedImage> {
  let format: string | undefined;
  try {
    format = (await sharp(input).metadata()).format;
  } catch {
    throw new UnsupportedImageError('El archivo no es una imagen válida');
  }
  if (!format || !ACCEPTED_FORMATS.has(format)) {
    throw new UnsupportedImageError('Formato no soportado. Subí la imagen en JPG, PNG, WebP o AVIF');
  }

  const maxSide = UPLOAD_FOLDERS[folder];
  const { data, info } = await sharp(input, { animated: false })
    .rotate()
    .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  return { buffer: data, width: info.width, height: info.height, contentType: 'image/webp', extension: 'webp' };
}

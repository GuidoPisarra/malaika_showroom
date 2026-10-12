import sharp from 'sharp';
import { UnsupportedImageError, processImage } from './image-processor.js';

const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#c08a5b' } }).png().toBuffer();

describe('processImage', () => {
  it('pasa la imagen a WebP y la achica al máximo de la carpeta', async () => {
    const out = await processImage(await png(3000, 1500), 'products');
    expect(out).toMatchObject({ contentType: 'image/webp', width: 2000, height: 1000 });
    expect((await sharp(out.buffer).metadata()).format).toBe('webp');
  });

  it('no agranda imágenes chicas y deja más resolución para el showroom', async () => {
    expect((await processImage(await png(800, 600), 'products')).width).toBe(800);
    expect((await processImage(await png(5000, 1000), 'showroom')).width).toBe(4096);
  });

  it('rechaza archivos que no son imágenes aunque digan serlo', async () => {
    await expect(processImage(Buffer.from('%PDF-1.7 hola'), 'products')).rejects.toBeInstanceOf(UnsupportedImageError);
  });

  it('descarta los metadatos EXIF', async () => {
    const withExif = await sharp(await png(400, 300))
      .jpeg()
      .withExif({ IFD0: { Copyright: 'privado' } })
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();
    const out = await processImage(withExif, 'products');
    expect((await sharp(out.buffer).metadata()).exif).toBeUndefined();
  });
});

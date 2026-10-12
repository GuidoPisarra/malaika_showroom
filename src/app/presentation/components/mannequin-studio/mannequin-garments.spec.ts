import { Product } from '../../../domain/catalog/models/product.model';
import { buildGarmentLayers } from './mannequin-garments';

const item = (slot: Product['slot'], category: string, svgType?: string) =>
  ({
    slot,
    category,
    colors: [{ name: 'Negro', hex: '#1C1917' }],
    silhouette: svgType ? { svgType, colorHex: '#1C1917' } : undefined,
  }) as unknown as Product;

describe('buildGarmentLayers', () => {
  it('no dibuja nada con el maniquí vacío', () => {
    expect(buildGarmentLayers({})).toEqual([]);
  });

  it('dibuja productos sin datos de maniquí con su forma por defecto', () => {
    const layers = buildGarmentLayers({ dress: item('dress', 'vestidos') });
    expect(layers.map((l) => l.key)).toEqual(['dress-skirt', 'dress-bodice', 'dress-seam']);
    expect(layers.every((l) => !('fill' in l) || l.fill !== undefined)).toBe(true);
  });

  it('pone la parte de abajo detrás de la de arriba y los accesorios al final', () => {
    const keys = buildGarmentLayers({
      top: item('top', 'tops', 'blazer'),
      bottom: item('bottom', 'pantalones', 'pants-palazzo'),
      shoes: item('shoes', 'calzado', 'shoes-mules'),
      accessory: item('accessory', 'accesorios', 'hat-fedora'),
    }).map((l) => l.key);
    expect(keys.indexOf('pants')).toBeLessThan(keys.indexOf('blazer-body'));
    expect(keys.indexOf('blazer-body')).toBeLessThan(keys.indexOf('shoe-left'));
    expect(keys.at(-1)).toBe('hat-band');
  });

  it('ajusta las prendas ceñidas a zonas del cuerpo', () => {
    const blouse = buildGarmentLayers({ top: item('top', 'tops', 'top-blouse') });
    expect(blouse.filter((l) => l.kind === 'hug').map((l) => l.key)).toEqual(['blouse', 'blouse-sleeve-left', 'blouse-sleeve-right']);
  });
});

import { Product } from '../../catalog/models/product.model';
import { resolveSilhouette } from './garment-silhouette';

const base = {
  slot: 'dress',
  category: 'vestidos',
  colors: [{ name: 'Rojo', hex: '#C41E3A' }],
  silhouette: undefined,
} as Pick<Product, 'slot' | 'category' | 'colors' | 'silhouette'>;

describe('resolveSilhouette', () => {
  it('arma la silueta con la categoría y el primer color cuando falta', () => {
    expect(resolveSilhouette(base)).toEqual({ svgType: 'dress-midi', colorHex: '#C41E3A', texturePattern: 'solid' });
    expect(resolveSilhouette({ ...base, slot: 'bottom', category: 'faldas' }).svgType).toBe('skirt-satin');
    expect(resolveSilhouette({ ...base, slot: 'accessory', category: 'joyeria' })).toMatchObject({
      svgType: 'jewelry-necklace',
      texturePattern: 'gold',
    });
  });

  it('respeta lo cargado en el panel', () => {
    const silhouette = { svgType: 'dress-silk', colorHex: '#164E43', texturePattern: 'silk' } as const;
    expect(resolveSilhouette({ ...base, silhouette })).toEqual(silhouette);
  });

  it('corrige una forma que no corresponde al lugar del maniquí', () => {
    const silhouette = { svgType: 'blazer', colorHex: '#000000' } as const;
    expect(resolveSilhouette({ ...base, slot: 'shoes', category: 'calzado', silhouette }).svgType).toBe('shoes-heels');
  });

  it('usa un color neutro si no hay ninguno válido', () => {
    expect(resolveSilhouette({ ...base, colors: [], silhouette: { svgType: 'dress-silk', colorHex: 'rojo' } }).colorHex).toBe('#B8A99A');
  });
});

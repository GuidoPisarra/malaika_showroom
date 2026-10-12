import { Product } from '../models/product.model';
import { availableStock, firstAvailableSelection, isColorAvailable, isSizeAvailable } from './variant-stock';

const negro = { name: 'Negro', hex: '#000' };
const rojo = { name: 'Rojo', hex: '#f00' };

const dress = {
  stock: 3,
  inStock: true,
  sizes: ['S', 'M'],
  colors: [negro, rojo],
  variantStock: true,
  variants: [
    { size: 'S', color: 'Negro', stock: 0 },
    { size: 'S', color: 'Rojo', stock: 1 },
    { size: 'M', color: 'Negro', stock: 2 },
    { size: 'M', color: 'Rojo', stock: 0 },
  ],
} as unknown as Product;

describe('variant-stock', () => {
  it('lee el stock de cada combinación', () => {
    expect(availableStock(dress, 'S', 'Rojo')).toBe(1);
    expect(availableStock(dress, 'M', 'Rojo')).toBe(0);
    expect(availableStock({ ...dress, variantStock: false }, 'M', 'Rojo')).toBe(3);
  });

  it('marca talles y colores disponibles según lo elegido', () => {
    expect(isSizeAvailable(dress, 'S', 'Negro')).toBe(false);
    expect(isSizeAvailable(dress, 'S')).toBe(true);
    expect(isColorAvailable(dress, 'Rojo', 'M')).toBe(false);
    expect(isColorAvailable(dress, 'Rojo')).toBe(true);
  });

  it('elige por defecto la primera combinación con stock, respetando el color elegido', () => {
    expect(firstAvailableSelection(dress)).toEqual({ size: 'M', color: negro });
    expect(firstAvailableSelection(dress, { color: rojo })).toEqual({ size: 'S', color: rojo });
  });

  it('un producto agotado no tiene stock en ningún talle', () => {
    expect(availableStock({ ...dress, inStock: false }, 'S', 'Rojo')).toBe(0);
  });
});

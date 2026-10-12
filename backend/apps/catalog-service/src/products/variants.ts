import type { ProductColor, ProductView, VariantStock } from './product.types.js';

interface VariantAxes {
  sizes: string[];
  colors: ProductColor[];
}

/**
 * Talle y color con los que se guarda una variante. Si el producto no tiene
 * talles (o colores) ese eje queda vacío, así un accesorio de talle único
 * se maneja igual que una prenda.
 */
export function variantKey(product: VariantAxes, size?: string | null, color?: string | null) {
  return {
    size: product.sizes.length ? (size ?? '') : '',
    color: product.colors.length ? (color ?? '') : '',
  };
}

/** Todas las combinaciones válidas de talle y color de un producto. */
export function variantCombinations(product: VariantAxes): Array<{ size: string; color: string }> {
  const sizes = product.sizes.length ? product.sizes : [''];
  const colors = product.colors.length ? product.colors.map((c) => c.name) : [''];
  return sizes.flatMap((size) => colors.map((color) => ({ size, color })));
}

/** Ordena las variantes como el producto lista sus talles y colores. */
export function sortVariants<T extends { size: string; color: string }>(product: VariantAxes, variants: T[]): T[] {
  const sizeIndex = (s: string) => product.sizes.indexOf(s);
  const colorIndex = (c: string) => product.colors.findIndex((x) => x.name === c);
  return [...variants].sort((a, b) => sizeIndex(a.size) - sizeIndex(b.size) || colorIndex(a.color) - colorIndex(b.color));
}

/** true si queda stock de algún color en ese talle. */
export function sizeInStock(product: Pick<ProductView, 'stock' | 'variantStock' | 'variants'>, size: string): boolean {
  if (!product.variantStock) return product.stock > 0;
  return product.variants.some((v: VariantStock) => v.size === size && v.stock > 0);
}

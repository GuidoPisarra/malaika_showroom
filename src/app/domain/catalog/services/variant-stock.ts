import { Product, ProductColor } from '../models/product.model';

type StockView = Pick<Product, 'stock' | 'inStock' | 'sizes' | 'colors' | 'variantStock' | 'variants'>;

/**
 * Talle y color con los que el backend guarda una variante: si el producto no
 * tiene talles (o colores), ese eje queda vacío.
 */
function variantKey(product: StockView, size?: string | null, color?: string | null) {
  return {
    size: product.sizes.length ? (size ?? '') : '',
    color: product.colors.length ? (color ?? '') : '',
  };
}

/** Unidades disponibles de un talle y color. Si el producto no controla stock por variante, es el stock general. */
export function availableStock(product: StockView, size?: string | null, color?: string | null): number {
  if (!product.inStock) return 0;
  if (!product.variantStock) return product.stock;
  const key = variantKey(product, size, color);
  return product.variants?.find((v) => v.size === key.size && v.color === key.color)?.stock ?? 0;
}

/** true si queda stock del talle (en el color indicado, o en cualquiera si no se indica). */
export function isSizeAvailable(product: StockView, size: string, color?: string | null): boolean {
  if (!product.variantStock) return product.inStock && product.stock > 0;
  if (color) return availableStock(product, size, color) > 0;
  return product.colors.length
    ? product.colors.some((c) => availableStock(product, size, c.name) > 0)
    : availableStock(product, size, null) > 0;
}

/** true si queda stock del color (en el talle indicado, o en cualquiera si no se indica). */
export function isColorAvailable(product: StockView, color: string, size?: string | null): boolean {
  if (!product.variantStock) return product.inStock && product.stock > 0;
  if (size) return availableStock(product, size, color) > 0;
  return product.sizes.length
    ? product.sizes.some((s) => availableStock(product, s, color) > 0)
    : availableStock(product, null, color) > 0;
}

/**
 * Primer talle y color con stock, para elegir por defecto. Respeta el color o
 * talle que ya eligió la clienta si todavía hay stock con esa combinación.
 */
export function firstAvailableSelection(
  product: StockView,
  preferred: { size?: string | null; color?: ProductColor | null } = {},
): { size: string; color: ProductColor | undefined } {
  const sizes = product.sizes.length ? product.sizes : [''];
  const colors: Array<ProductColor | undefined> = product.colors.length ? product.colors : [undefined];
  const fallback = { size: preferred.size || product.sizes[0] || '', color: preferred.color ?? product.colors[0] };

  const ordered = <T>(list: T[], first: T | undefined, same: (a: T, b: T) => boolean) =>
    first === undefined ? list : [...list.filter((x) => same(x, first)), ...list.filter((x) => !same(x, first))];
  const sizeOrder = ordered(sizes, preferred.size || undefined, (a, b) => a === b);
  const colorOrder = ordered(colors, preferred.color ?? undefined, (a, b) => a?.name === b?.name);

  for (const color of colorOrder) {
    for (const size of sizeOrder) {
      if (availableStock(product, size, color?.name) > 0) return { size, color };
    }
  }
  return fallback;
}

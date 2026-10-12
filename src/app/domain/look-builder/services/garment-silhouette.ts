import {
  GarmentShape,
  GarmentSilhouetteLayer,
  GarmentSlot,
  GarmentTexture,
  Product,
  ProductCategory,
} from '../../catalog/models/product.model';

/** Formas que entran en cada lugar del maniquí. */
export const SHAPES_BY_SLOT: Record<GarmentSlot, GarmentShape[]> = {
  dress: ['dress-silk', 'dress-midi'],
  top: ['top-blouse', 'top-crop', 'blazer', 'vest-long'],
  outer: ['vest-long', 'blazer'],
  bottom: ['pants-palazzo', 'skirt-satin'],
  shoes: ['shoes-heels', 'shoes-mules'],
  accessory: ['bag-clutch', 'jewelry-necklace', 'hat-fedora'],
};

export const SHAPE_LABELS: Record<GarmentShape, string> = {
  'dress-silk': 'Vestido largo',
  'dress-midi': 'Vestido midi',
  'top-blouse': 'Blusa',
  'top-crop': 'Top corto',
  blazer: 'Blazer o saco',
  'vest-long': 'Chaleco largo',
  'pants-palazzo': 'Pantalón',
  'skirt-satin': 'Falda',
  'shoes-heels': 'Sandalias o stilettos',
  'shoes-mules': 'Mules o zapatos cerrados',
  'bag-clutch': 'Cartera',
  'jewelry-necklace': 'Collar',
  'hat-fedora': 'Sombrero',
};

export const TEXTURE_LABELS: Record<GarmentTexture, string> = {
  solid: 'Lisa',
  silk: 'Seda o satén',
  linen: 'Lino o algodón',
  leather: 'Cuero',
  gold: 'Metal dorado',
};

const CATEGORY_SHAPE: Partial<Record<ProductCategory, GarmentShape>> = {
  vestidos: 'dress-midi',
  tops: 'top-blouse',
  pantalones: 'pants-palazzo',
  faldas: 'skirt-satin',
  calzado: 'shoes-heels',
  accesorios: 'bag-clutch',
  joyeria: 'jewelry-necklace',
};

const FALLBACK_COLOR = '#B8A99A';
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Forma por defecto para un producto según su lugar en el maniquí y su categoría. */
export function defaultShape(slot: GarmentSlot, category?: string): GarmentShape {
  const byCategory = CATEGORY_SHAPE[category as ProductCategory];
  if (byCategory && SHAPES_BY_SLOT[slot].includes(byCategory)) return byCategory;
  return SHAPES_BY_SLOT[slot][0];
}

/**
 * Silueta con la que se dibuja el producto. Completa lo que falte (productos
 * cargados desde el panel sin datos de maniquí) y corrige una forma que no
 * corresponda a su lugar, así el maniquí nunca queda sin dibujar.
 */
export function resolveSilhouette(product: Pick<Product, 'slot' | 'category' | 'colors' | 'silhouette'>): GarmentSilhouetteLayer {
  const slot: GarmentSlot = product.slot in SHAPES_BY_SLOT ? product.slot : 'accessory';
  const given = product.silhouette ?? undefined;
  const svgType = given?.svgType && SHAPES_BY_SLOT[slot].includes(given.svgType) ? given.svgType : defaultShape(slot, product.category);
  const firstColor = product.colors?.find((c) => HEX.test(c.hex))?.hex;
  const colorHex = given?.colorHex && HEX.test(given.colorHex) ? given.colorHex : (firstColor ?? FALLBACK_COLOR);
  const texturePattern = given?.texturePattern ?? (svgType === 'jewelry-necklace' ? 'gold' : 'solid');
  return { svgType, colorHex, texturePattern };
}

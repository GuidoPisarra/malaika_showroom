export type ProductCategory = 
  | 'vestidos'
  | 'tops'
  | 'pantalones'
  | 'faldas'
  | 'calzado'
  | 'accesorios'
  | 'joyeria';

export type GarmentSlot = 'top' | 'bottom' | 'shoes' | 'accessory' | 'dress';

export type FashionOccasion = 'casual' | 'fiesta' | 'noche' | 'oficina' | 'cocktail';

export interface ProductColor {
  name: string;
  hex: string;
}

/** Stock de una combinación de talle y color. Vacío si el producto no tiene talles o colores. */
export interface VariantStock {
  size: string;
  color: string;
  stock: number;
}

export type GarmentShape =
  | 'dress-silk'
  | 'dress-midi'
  | 'top-blouse'
  | 'top-crop'
  | 'blazer'
  | 'pants-palazzo'
  | 'skirt-satin'
  | 'shoes-heels'
  | 'shoes-mules'
  | 'bag-clutch'
  | 'jewelry-necklace'
  | 'hat-fedora';

export type GarmentTexture = 'silk' | 'linen' | 'leather' | 'gold' | 'solid';

/** Cómo se dibuja la prenda sobre el maniquí. */
export interface GarmentSilhouetteLayer {
  svgType: GarmentShape;
  colorHex: string;
  texturePattern?: GarmentTexture;
}

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  originalPrice?: number;
  category: ProductCategory;
  slot: GarmentSlot;
  image: string;
  gallery: string[];
  colors: ProductColor[];
  sizes: string[];
  selectedSize?: string;
  selectedColor?: ProductColor;
  material: string;
  occasion: FashionOccasion;
  isNew?: boolean;
  isTrending?: boolean;
  rating: number;
  reviewsCount: number;
  description: string;
  details: string[];
  stock: number;
  inStock: boolean;
  /** true si el stock se controla por talle y color (ver `variants`). */
  variantStock?: boolean;
  variants?: VariantStock[];
  /** Puede faltar en productos cargados desde el panel; ver `resolveSilhouette`. */
  silhouette?: GarmentSilhouetteLayer | null;
  arModelType?: 'hanger' | 'mannequin' | 'display-stand';
  arScale?: number;
}

import { Product } from '../../catalog/models/product.model';

export type MannequinPose = 'classic' | 'runway' | 'relaxed';

export interface MannequinSlots {
  dress?: Product;
  top?: Product;
  bottom?: Product;
  shoes?: Product;
  accessory?: Product;
  /** Abrigo o chaleco, encima de la parte de arriba o del vestido. */
  outer?: Product;
}

/** Pone la prenda en su lugar; un vestido saca la parte de arriba y la de abajo, y viceversa. */
export function placeOnMannequin(slots: MannequinSlots, product: Product): MannequinSlots {
  const next = { ...slots };
  if (product.slot === 'dress') {
    next.top = undefined;
    next.bottom = undefined;
  } else if (product.slot === 'top' || product.slot === 'bottom') {
    next.dress = undefined;
  }
  next[product.slot] = product;
  return next;
}

export interface LookCompatibilityScore {
  score: number; // 0 to 100
  title: string;
  paletteDescription: string;
  vibe: 'Minimalista Sofisticado' | 'Elegancia Nocturna' | 'Lujo Relajado' | 'Boho Chic' | 'Monocromático Glam';
  tips: string[];
}

export interface LookPreset {
  id: string;
  name: string;
  subtitle: string;
  tag: string;
  imagePreview: string;
  itemIds: string[];
}

export interface SavedLook {
  id: string;
  name: string;
  createdAt: string;
  items: Product[];
  totalPrice: number;
}

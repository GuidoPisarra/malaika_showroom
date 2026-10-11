import { Product } from '../../catalog/models/product.model';

export type MannequinPose = 'classic' | 'runway' | 'relaxed';

export interface MannequinSlots {
  dress?: Product;
  top?: Product;
  bottom?: Product;
  shoes?: Product;
  accessory?: Product;
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

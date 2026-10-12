export interface ProductColor {
  name: string;
  hex: string;
}

/** Forma del producto que consume el front (domain/catalog/models/product.model.ts). */
export interface ProductView {
  id: string;
  sku: string | null;
  name: string;
  subtitle: string;
  price: number;
  originalPrice?: number;
  category: string;
  slot: string;
  image: string;
  gallery: string[];
  colors: ProductColor[];
  sizes: string[];
  material: string;
  occasion: string;
  isNew: boolean;
  isTrending: boolean;
  rating: number;
  reviewsCount: number;
  description: string;
  details: string[];
  stock: number;
  inStock: boolean;
  silhouette?: unknown;
  arModelType?: string;
  arScale?: number;
  active: boolean;
  createdAt: string;
}

export type SortCriteria = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest';

export interface ProductFilter {
  search?: string;
  category?: string;
  occasion?: string;
  sizes?: string[];
  colors?: string[];
  minPrice?: number;
  maxPrice?: number;
  onlyInStock?: boolean;
  sortBy?: SortCriteria;
}

export interface ProductInput {
  sku?: string | null;
  name: string;
  subtitle?: string;
  description?: string;
  price: number;
  originalPrice?: number | null;
  category: string;
  slot?: string;
  image: string;
  gallery?: string[];
  colors?: ProductColor[];
  sizes?: string[];
  material?: string;
  occasion?: string;
  isNew?: boolean;
  isTrending?: boolean;
  rating?: number;
  reviewsCount?: number;
  details?: string[];
  stock?: number;
  silhouette?: unknown;
  arModelType?: string | null;
  arScale?: number | null;
  active?: boolean;
  position?: number;
}

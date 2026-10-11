import { FashionOccasion, ProductCategory } from './product.model';

export type SortCriteria = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest';

export interface CatalogFilterCriteria {
  searchQuery: string;
  category: ProductCategory | 'all';
  occasion: FashionOccasion | 'all';
  sizes: string[];
  colors: string[];
  minPrice: number;
  maxPrice: number;
  onlyInStock: boolean;
  sortBy: SortCriteria;
}

export const DEFAULT_FILTER_CRITERIA: CatalogFilterCriteria = {
  searchQuery: '',
  category: 'all',
  occasion: 'all',
  sizes: [],
  colors: [],
  minPrice: 0,
  maxPrice: 350000,
  onlyInStock: false,
  sortBy: 'featured',
};

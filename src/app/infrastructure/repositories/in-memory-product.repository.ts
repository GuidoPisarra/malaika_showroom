import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Product } from '../../domain/catalog/models/product.model';
import { CatalogFilterCriteria } from '../../domain/catalog/models/filter.model';
import { IProductRepository } from '../../domain/catalog/repositories/product.repository.interface';
import { MOCK_PRODUCTS } from '../data/mock-catalog.data';

@Injectable({
  providedIn: 'root',
})
export class InMemoryProductRepository implements IProductRepository {
  private products: Product[] = [...MOCK_PRODUCTS];

  getAll(): Observable<Product[]> {
    return of(this.products);
  }

  getById(id: string): Observable<Product | undefined> {
    const item = this.products.find((p) => p.id === id);
    return of(item);
  }

  getFeatured(): Observable<Product[]> {
    return of(this.products.filter((p) => p.isTrending || p.isNew));
  }

  filter(criteria: CatalogFilterCriteria): Observable<Product[]> {
    let result = [...this.products];

    // Search query
    if (criteria.searchQuery.trim()) {
      const q = criteria.searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.subtitle.toLowerCase().includes(q) ||
          p.material.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    // Category
    if (criteria.category !== 'all') {
      result = result.filter((p) => p.category === criteria.category);
    }

    // Occasion
    if (criteria.occasion !== 'all') {
      result = result.filter((p) => p.occasion === criteria.occasion);
    }

    // Sizes
    if (criteria.sizes && criteria.sizes.length > 0) {
      result = result.filter((p) =>
        p.sizes.some((size) => criteria.sizes.includes(size))
      );
    }

    // Colors
    if (criteria.colors && criteria.colors.length > 0) {
      result = result.filter((p) =>
        p.colors.some((color) => criteria.colors.includes(color.name))
      );
    }

    // Price range
    result = result.filter(
      (p) => p.price >= criteria.minPrice && p.price <= criteria.maxPrice
    );

    // Stock
    if (criteria.onlyInStock) {
      result = result.filter((p) => p.inStock && p.stock > 0);
    }

    // Sorting
    switch (criteria.sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
      case 'featured':
      default:
        result.sort((a, b) => (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0));
        break;
    }

    return of(result);
  }
}

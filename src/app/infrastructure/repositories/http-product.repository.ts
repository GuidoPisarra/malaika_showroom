import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { CatalogFilterCriteria } from '../../domain/catalog/models/filter.model';
import { Product } from '../../domain/catalog/models/product.model';
import { IProductRepository } from '../../domain/catalog/repositories/product.repository.interface';
import { API_BASE_URL } from '../http/api.config';

/** Catálogo del comercio servido por la API (catalog-service). */
@Injectable({
  providedIn: 'root',
})
export class HttpProductRepository implements IProductRepository {
  private http = inject(HttpClient);
  private api = inject(API_BASE_URL);

  getAll(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.api}/products`);
  }

  getById(id: string): Observable<Product | undefined> {
    return this.http
      .get<Product>(`${this.api}/products/${encodeURIComponent(id)}`)
      .pipe(catchError(() => of(undefined)));
  }

  getFeatured(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.api}/products/featured`);
  }

  filter(criteria: CatalogFilterCriteria): Observable<Product[]> {
    let params = new HttpParams()
      .set('minPrice', criteria.minPrice)
      .set('maxPrice', criteria.maxPrice)
      .set('sortBy', criteria.sortBy);
    if (criteria.searchQuery.trim()) params = params.set('search', criteria.searchQuery.trim());
    if (criteria.category !== 'all') params = params.set('category', criteria.category);
    if (criteria.occasion !== 'all') params = params.set('occasion', criteria.occasion);
    if (criteria.sizes.length) params = params.set('sizes', criteria.sizes.join(','));
    if (criteria.colors.length) params = params.set('colors', criteria.colors.join(','));
    if (criteria.onlyInStock) params = params.set('onlyInStock', true);
    return this.http.get<Product[]>(`${this.api}/products`, { params });
  }
}

import { Observable } from 'rxjs';
import { Product } from '../models/product.model';
import { CatalogFilterCriteria } from '../models/filter.model';

export interface IProductRepository {
  getAll(): Observable<Product[]>;
  getById(id: string): Observable<Product | undefined>;
  filter(criteria: CatalogFilterCriteria): Observable<Product[]>;
  getFeatured(): Observable<Product[]>;
}

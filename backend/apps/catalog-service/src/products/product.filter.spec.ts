import { filterProducts } from './product.filter.js';
import type { ProductView } from './product.types.js';

const base = {
  sku: null, subtitle: '', slot: 'dress', image: '', gallery: [], sizes: ['S', 'M'], material: 'seda',
  occasion: 'fiesta', isNew: false, isTrending: false, rating: 4, reviewsCount: 0, description: '', details: [],
  stock: 1, inStock: true, active: true, createdAt: '2026-01-01T00:00:00.000Z',
};
const products: ProductView[] = [
  { ...base, id: 'a', name: 'Vestido Rojo', price: 100, category: 'vestidos', colors: [{ name: 'Rojo', hex: '#f00' }] },
  { ...base, id: 'b', name: 'Blusa Lino', price: 50, category: 'tops', colors: [{ name: 'Blanco', hex: '#fff' }], isTrending: true },
  { ...base, id: 'c', name: 'Falda', price: 70, category: 'faldas', colors: [], stock: 0, inStock: false, sizes: ['L'] },
];

describe('filterProducts', () => {
  it('busca por texto y filtra por categoría', () => {
    expect(filterProducts(products, { search: 'lino' }).map((p) => p.id)).toEqual(['b']);
    expect(filterProducts(products, { category: 'vestidos' }).map((p) => p.id)).toEqual(['a']);
  });

  it('filtra por talle, color, precio y stock', () => {
    expect(filterProducts(products, { sizes: ['L'] }).map((p) => p.id)).toEqual(['c']);
    expect(filterProducts(products, { colors: ['Rojo'] }).map((p) => p.id)).toEqual(['a']);
    expect(filterProducts(products, { minPrice: 60, maxPrice: 90 }).map((p) => p.id)).toEqual(['c']);
    expect(filterProducts(products, { onlyInStock: true }).map((p) => p.id).sort()).toEqual(['a', 'b']);
  });

  it('ordena destacados primero y por precio', () => {
    expect(filterProducts(products, { sortBy: 'featured' })[0].id).toBe('b');
    expect(filterProducts(products, { sortBy: 'price-asc' }).map((p) => p.id)).toEqual(['b', 'c', 'a']);
  });
});

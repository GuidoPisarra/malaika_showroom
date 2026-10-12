import { ProductFilter, ProductView } from './product.types.js';
import { sizeInStock } from './variants.js';

/** Mismo criterio de búsqueda y orden que usaba el repositorio en memoria del front. */
export function filterProducts(products: ProductView[], f: ProductFilter): ProductView[] {
  let result = [...products];

  const q = f.search?.trim().toLowerCase();
  if (q) {
    result = result.filter((p) =>
      [p.name, p.subtitle, p.material, p.category, p.description].some((v) => v.toLowerCase().includes(q)),
    );
  }
  if (f.category && f.category !== 'all') result = result.filter((p) => p.category === f.category);
  if (f.occasion && f.occasion !== 'all') result = result.filter((p) => p.occasion === f.occasion);
  if (f.sizes?.length) result = result.filter((p) => p.sizes.some((s) => f.sizes!.includes(s)));
  if (f.colors?.length) result = result.filter((p) => p.colors.some((c) => f.colors!.includes(c.name)));
  if (f.minPrice !== undefined) result = result.filter((p) => p.price >= f.minPrice!);
  if (f.maxPrice !== undefined) result = result.filter((p) => p.price <= f.maxPrice!);
  if (f.onlyInStock) {
    // Con talles elegidos, tiene que quedar stock de alguno de esos talles.
    result = result.filter((p) => p.inStock && (!f.sizes?.length || f.sizes.some((s) => sizeInStock(p, s))));
  }

  switch (f.sortBy) {
    case 'price-asc':
      return result.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return result.sort((a, b) => b.price - a.price);
    case 'rating':
      return result.sort((a, b) => b.rating - a.rating);
    case 'newest':
      return result.sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.createdAt.localeCompare(a.createdAt));
    case 'featured':
    default:
      return result.sort((a, b) => Number(b.isTrending) - Number(a.isTrending));
  }
}

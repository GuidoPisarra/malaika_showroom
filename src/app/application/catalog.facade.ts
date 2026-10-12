import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpProductRepository } from '../infrastructure/repositories/http-product.repository';
import { CartFacade } from './cart.facade';
import { Product, ProductCategory, FashionOccasion } from '../domain/catalog/models/product.model';
import { CatalogFilterCriteria, DEFAULT_FILTER_CRITERIA, SortCriteria } from '../domain/catalog/models/filter.model';
import { isSizeAvailable } from '../domain/catalog/services/variant-stock';

@Injectable({
  providedIn: 'root',
})
export class CatalogFacade {
  private productRepo = inject(HttpProductRepository);
  private cartFacade = inject(CartFacade);

  // State Signals
  readonly allProducts = signal<Product[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly loadError = signal<string | null>(null);
  readonly filterCriteria = signal<CatalogFilterCriteria>({ ...DEFAULT_FILTER_CRITERIA });
  readonly selectedProductForModal = signal<Product | null>(null);
  readonly isQuickViewOpen = signal<boolean>(false);
  readonly activeCategory = computed(() => this.filterCriteria().category);
  readonly searchQuery = computed(() => this.filterCriteria().searchQuery);

  // Filtered Products Computed
  readonly filteredProducts = computed(() => {
    const products = this.allProducts();
    const criteria = this.filterCriteria();
    let result = [...products];

    // Search text
    if (criteria.searchQuery.trim()) {
      const q = criteria.searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.subtitle.toLowerCase().includes(q) ||
          p.material.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
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
    if (criteria.sizes.length > 0) {
      result = result.filter((p) =>
        p.sizes.some((s) => criteria.sizes.includes(s))
      );
    }

    // Colors
    if (criteria.colors.length > 0) {
      result = result.filter((p) =>
        p.colors.some((c) => criteria.colors.includes(c.name))
      );
    }

    // Price
    result = result.filter(
      (p) => p.price >= criteria.minPrice && p.price <= criteria.maxPrice
    );

    // Stock: con talles elegidos, tiene que quedar alguno de esos talles.
    if (criteria.onlyInStock) {
      result = result.filter(
        (p) => p.inStock && p.stock > 0 && (!criteria.sizes.length || criteria.sizes.some((s) => isSizeAvailable(p, s))),
      );
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

    return result;
  });

  // Featured and trending slices
  readonly trendingProducts = computed(() =>
    this.allProducts().filter((p) => p.isTrending).slice(0, 4)
  );

  constructor() {
    this.loadInitialCatalog();
  }

  private loadInitialCatalog(): void {
    // El catálogo es chico: se trae completo y se filtra en el navegador para que los filtros respondan al instante.
    this.productRepo.getAll().subscribe({
      next: (items) => {
        this.allProducts.set(items);
        this.isLoading.set(false);
        this.cartFacade.syncWithCatalog(items);
      },
      error: () => {
        this.isLoading.set(false);
        this.loadError.set('No pudimos cargar el catálogo. Probá recargar la página en unos segundos.');
      },
    });
  }

  reload(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.loadInitialCatalog();
  }

  setCategory(category: ProductCategory | 'all'): void {
    this.filterCriteria.update((prev) => ({ ...prev, category }));
  }

  setOccasion(occasion: FashionOccasion | 'all'): void {
    this.filterCriteria.update((prev) => ({ ...prev, occasion }));
  }

  setSearchQuery(searchQuery: string): void {
    this.filterCriteria.update((prev) => ({ ...prev, searchQuery }));
  }

  setSortBy(sortBy: SortCriteria): void {
    this.filterCriteria.update((prev) => ({ ...prev, sortBy }));
  }

  setPriceRange(minPrice: number, maxPrice: number): void {
    this.filterCriteria.update((prev) => ({ ...prev, minPrice, maxPrice }));
  }

  toggleSize(size: string): void {
    this.filterCriteria.update((prev) => {
      const sizes = prev.sizes.includes(size)
        ? prev.sizes.filter((s) => s !== size)
        : [...prev.sizes, size];
      return { ...prev, sizes };
    });
  }

  toggleColor(colorName: string): void {
    this.filterCriteria.update((prev) => {
      const colors = prev.colors.includes(colorName)
        ? prev.colors.filter((c) => c !== colorName)
        : [...prev.colors, colorName];
      return { ...prev, colors };
    });
  }

  toggleOnlyInStock(): void {
    this.filterCriteria.update((prev) => ({
      ...prev,
      onlyInStock: !prev.onlyInStock,
    }));
  }

  resetFilters(): void {
    this.filterCriteria.set({ ...DEFAULT_FILTER_CRITERIA });
  }

  openQuickView(product: Product): void {
    this.selectedProductForModal.set(product);
    this.isQuickViewOpen.set(true);
  }

  closeQuickView(): void {
    this.isQuickViewOpen.set(false);
    this.selectedProductForModal.set(null);
  }

  navigateModal(direction: 'prev' | 'next'): void {
    const current = this.selectedProductForModal();
    if (!current) return;

    // Use current screen garments (filteredProducts), falling back to allProducts
    const list = this.filteredProducts().length > 0 ? this.filteredProducts() : this.allProducts();
    if (list.length <= 1) return;

    const currentIndex = list.findIndex((p) => p.id === current.id);
    if (currentIndex === -1) {
      this.selectedProductForModal.set(list[0]);
      return;
    }

    const nextIndex = direction === 'next'
      ? (currentIndex + 1) % list.length
      : (currentIndex - 1 + list.length) % list.length;

    this.selectedProductForModal.set(list[nextIndex]);
  }

  getProductById(id: string): Product | undefined {
    return this.allProducts().find((p) => p.id === id);
  }
}

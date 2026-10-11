import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogFacade } from '../../../../application/catalog.facade';
import { ProductCategory, FashionOccasion } from '../../../../domain/catalog/models/product.model';
import { SortCriteria } from '../../../../domain/catalog/models/filter.model';
import { ArsCurrencyPipe } from '../../../shared/pipes/ars-currency.pipe';

@Component({
  selector: 'app-catalog-filter',
  imports: [CommonModule, FormsModule, ArsCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <!-- Search and Quick Category Bar -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <!-- Search Input -->
        <div class="relative flex-1 max-w-md">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
            <span class="material-symbols-outlined text-xl">search</span>
          </span>
          <input
            id="catalog-search-input"
            type="text"
            [ngModel]="catalogFacade.searchQuery()"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Buscar vestidos, lino, tops, stilettos, accesorios..."
            class="w-full pl-10 pr-9 py-2.5 bg-white border border-stone-200 rounded-full text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700 shadow-sm"
          />
          @if (catalogFacade.searchQuery()) {
            <button
              (click)="onSearchChange('')"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600"
              aria-label="Limpiar búsqueda"
            >
              <span class="material-symbols-outlined text-base">close</span>
            </button>
          }
        </div>

        <!-- Filter Toggle & Sorting Select -->
        <div class="flex items-center gap-2.5 justify-between sm:justify-end">
          <!-- Advanced Filters Button Toggle -->
          <button
            id="btn-toggle-filters"
            (click)="toggleAdvancedFilters()"
            type="button"
            class="px-4 py-2.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-semibold tracking-wider uppercase rounded-full shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <span class="material-symbols-outlined text-base text-amber-700">tune</span>
            <span>Filtros Avanzados</span>
            @if (activeFiltersCount() > 0) {
              <span class="w-5 h-5 rounded-full bg-amber-700 text-white text-[10px] flex items-center justify-center font-bold">
                {{ activeFiltersCount() }}
              </span>
            }
          </button>

          <!-- Sort Dropdown -->
          <div class="relative">
            <select
              id="catalog-sort-select"
              [ngModel]="catalogFacade.filterCriteria().sortBy"
              (ngModelChange)="onSortChange($event)"
              class="appearance-none pl-3 pr-8 py-2.5 bg-white border border-stone-200 rounded-full text-xs font-medium text-stone-700 focus:outline-none focus:border-amber-700 shadow-sm cursor-pointer"
            >
              <option value="featured">Destacados</option>
              <option value="price-asc">Menor precio</option>
              <option value="price-desc">Mayor precio</option>
              <option value="rating">Mejor valorados</option>
              <option value="newest">Novedades</option>
            </select>
            <span class="material-symbols-outlined text-base text-stone-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
              arrow_drop_down
            </span>
          </div>
        </div>
      </div>

      <!-- Horizontal Scrollable Category Pills (Mobile-first, touch-friendly) -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        @for (cat of categories; track cat.key) {
          <button
            [id]="'category-pill-' + cat.key"
            (click)="selectCategory(cat.key)"
            type="button"
            class="whitespace-nowrap px-4 py-2 rounded-full text-xs font-medium tracking-wide uppercase transition-all duration-200 shrink-0"
            [ngClass]="{
              'bg-stone-900 text-amber-200 shadow-md': catalogFacade.activeCategory() === cat.key,
              'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200': catalogFacade.activeCategory() !== cat.key
            }"
          >
            {{ cat.label }}
          </button>
        }
      </div>

      <!-- Expandable Advanced Filters Accordion Drawer -->
      @if (isAdvancedOpen()) {
        <div class="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm space-y-6 animate-fadeIn">
          <div class="flex items-center justify-between pb-3 border-b border-stone-100">
            <h4 class="font-serif text-lg font-medium text-stone-900">
              Filtros Detallados
            </h4>
            <div class="flex items-center gap-3">
              @if (activeFiltersCount() > 0) {
                <button
                  (click)="catalogFacade.resetFilters()"
                  class="text-xs text-amber-800 hover:text-amber-950 underline font-medium"
                >
                  Restablecer todos
                </button>
              }
              <button
                (click)="toggleAdvancedFilters()"
                class="text-stone-400 hover:text-stone-600 p-1"
                aria-label="Cerrar filtros"
              >
                <span class="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <!-- Filter: Occasion -->
            <div>
              <span class="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2.5">
                Ocasión / Vibe
              </span>
              <div class="flex flex-wrap gap-1.5">
                @for (occ of occasions; track occ.key) {
                  <button
                    type="button"
                    (click)="selectOccasion(occ.key)"
                    class="px-3 py-1.5 rounded-lg text-xs transition-colors"
                    [ngClass]="{
                      'bg-amber-900 text-white font-medium': catalogFacade.filterCriteria().occasion === occ.key,
                      'bg-stone-100 text-stone-700 hover:bg-stone-200': catalogFacade.filterCriteria().occasion !== occ.key
                    }"
                  >
                    {{ occ.label }}
                  </button>
                }
              </div>
            </div>

            <!-- Filter: Price Range -->
            <div>
              <div class="flex items-center justify-between text-xs mb-2">
                <span class="font-semibold uppercase tracking-wider text-stone-500">Rango de Precio</span>
                <span class="font-mono text-stone-800 font-semibold">
                  Hasta {{ catalogFacade.filterCriteria().maxPrice | arsCurrency }}
                </span>
              </div>
              <input
                id="filter-price-slider"
                type="range"
                min="50000"
                max="350000"
                step="10000"
                aria-label="Rango de Precio Máximo"
                [ngModel]="catalogFacade.filterCriteria().maxPrice"
                (ngModelChange)="onPriceChange($event)"
                class="w-full accent-amber-700 cursor-pointer"
              />
              <div class="flex justify-between text-[11px] text-stone-400 font-mono mt-1">
                <span>{{ 50000 | arsCurrency }}</span>
                <span>{{ 200000 | arsCurrency }}</span>
                <span>{{ 350000 | arsCurrency }}</span>
              </div>
            </div>

            <!-- Filter: Sizes -->
            <div>
              <span class="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2.5">
                Talles Disponibles
              </span>
              <div class="flex flex-wrap gap-1.5">
                @for (size of availableSizes; track size) {
                  <button
                    type="button"
                    (click)="catalogFacade.toggleSize(size)"
                    class="w-9 h-8 rounded-lg text-xs font-medium border flex items-center justify-center transition-all"
                    [ngClass]="{
                      'bg-stone-900 text-amber-200 border-stone-900 shadow-sm': catalogFacade.filterCriteria().sizes.includes(size),
                      'bg-white text-stone-700 border-stone-200 hover:border-stone-400': !catalogFacade.filterCriteria().sizes.includes(size)
                    }"
                  >
                    {{ size }}
                  </button>
                }
              </div>
            </div>

            <!-- Filter: Availability & Stock -->
            <div class="flex flex-col justify-between">
              <div>
                <span class="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2.5">
                  Disponibilidad
                </span>
                <label for="chk-only-in-stock" class="inline-flex items-center gap-2 cursor-pointer text-xs text-stone-800 select-none">
                  <input
                    id="chk-only-in-stock"
                    type="checkbox"
                    [checked]="catalogFacade.filterCriteria().onlyInStock"
                    (change)="catalogFacade.toggleOnlyInStock()"
                    class="rounded text-amber-700 focus:ring-amber-700 w-4 h-4"
                  />
                  <span>Mostrar sólo prendas con stock inmediato</span>
                </label>
              </div>

              <div class="pt-3">
                <button
                  (click)="toggleAdvancedFilters()"
                  class="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors"
                >
                  Aplicar Filtros ({{ catalogFacade.filteredProducts().length }} resultados)
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class CatalogFilterComponent {
  readonly catalogFacade = inject(CatalogFacade);
  readonly isAdvancedOpen = signal<boolean>(false);

  readonly categories: { key: ProductCategory | 'all'; label: string }[] = [
    { key: 'all', label: 'Todo' },
    { key: 'vestidos', label: 'Vestidos' },
    { key: 'tops', label: 'Tops & Blusas' },
    { key: 'pantalones', label: 'Pantalones' },
    { key: 'faldas', label: 'Faldas' },
    { key: 'calzado', label: 'Calzado' },
    { key: 'accesorios', label: 'Accesorios' },
    { key: 'joyeria', label: 'Joyería' },
  ];

  readonly occasions: { key: FashionOccasion | 'all'; label: string }[] = [
    { key: 'all', label: 'Cualquiera' },
    { key: 'casual', label: 'Casual Chic' },
    { key: 'fiesta', label: 'Fiesta & Eventos' },
    { key: 'noche', label: 'Gala Nocturna' },
    { key: 'oficina', label: 'Ejecutivo Sastre' },
    { key: 'cocktail', label: 'Cocktail' },
  ];

  readonly availableSizes = ['XS', 'S', 'M', 'L', 'XL', '36', '37', '38', '39', '40'];

  activeFiltersCount(): number {
    const c = this.catalogFacade.filterCriteria();
    let count = 0;
    if (c.category !== 'all') count++;
    if (c.occasion !== 'all') count++;
    if (c.sizes.length > 0) count += c.sizes.length;
    if (c.colors.length > 0) count += c.colors.length;
    if (c.maxPrice < 350000) count++;
    if (c.onlyInStock) count++;
    if (c.searchQuery.trim().length > 0) count++;
    return count;
  }

  toggleAdvancedFilters(): void {
    this.isAdvancedOpen.update((v) => !v);
  }

  selectCategory(category: ProductCategory | 'all'): void {
    this.catalogFacade.setCategory(category);
  }

  selectOccasion(occasion: FashionOccasion | 'all'): void {
    this.catalogFacade.setOccasion(occasion);
  }

  onSearchChange(text: string): void {
    this.catalogFacade.setSearchQuery(text);
  }

  onSortChange(sortBy: SortCriteria): void {
    this.catalogFacade.setSortBy(sortBy);
  }

  onPriceChange(maxPrice: number): void {
    this.catalogFacade.setPriceRange(0, Number(maxPrice));
  }
}

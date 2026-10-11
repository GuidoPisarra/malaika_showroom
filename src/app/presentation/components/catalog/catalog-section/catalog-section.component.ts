import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CatalogFacade } from '../../../../application/catalog.facade';
import { CatalogFilterComponent } from '../catalog-filter/catalog-filter.component';
import { ProductCardComponent } from '../product-card/product-card.component';
import { ProductDetailModalComponent } from '../product-detail-modal/product-detail-modal.component';

@Component({
  selector: 'app-catalog-section',
  imports: [
    CommonModule,
    CatalogFilterComponent,
    ProductCardComponent,
    ProductDetailModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="catalogo" class="pt-16 sm:pt-24 pb-10 sm:pb-14 bg-[#FAF8F5]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <!-- Section Header -->
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200/80 pb-6">
          <div class="space-y-1">
            <div class="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-amber-800">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-700"></span>
              <span>Colección Atelier 2026</span>
            </div>
            <h2 class="font-display text-3xl sm:text-4xl lg:text-5xl text-stone-900 font-medium tracking-tight">
              Catálogo Interactivo
            </h2>
            <p class="text-sm text-stone-500 font-light max-w-lg">
              Prendas confeccionadas en sedas naturales, linos italianos y algodones pima. Explora o pruébalas en el maniquí.
            </p>
          </div>

          <!-- Product Counter Badge -->
          <div class="text-xs font-mono text-stone-500 bg-white px-3.5 py-1.5 rounded-full border border-stone-200 shadow-xs self-start sm:self-auto">
            Mostrando <strong class="text-stone-900">{{ catalogFacade.filteredProducts().length }}</strong> de {{ catalogFacade.allProducts().length }} prendas
          </div>
        </div>

        <!-- Filter Controls -->
        <app-catalog-filter />

        <!-- Products Grid -->
        @if (catalogFacade.filteredProducts().length === 0) {
          <div class="text-center py-20 bg-white rounded-3xl border border-stone-200/70 p-8 space-y-4">
            <div class="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
              <span class="material-symbols-outlined text-3xl">filter_list_off</span>
            </div>
            <h3 class="font-serif text-xl text-stone-800">No encontramos prendas con esos filtros</h3>
            <p class="text-xs text-stone-500 max-w-md mx-auto">
              Intenta ampliar el rango de precios, seleccionar otra ocasión o limpiar los términos de búsqueda.
            </p>
            <div>
              <button
                type="button"
                (click)="catalogFacade.resetFilters()"
                class="px-5 py-2.5 bg-stone-900 text-amber-200 rounded-full text-xs font-semibold uppercase tracking-wider shadow-sm hover:bg-stone-800 transition-colors"
              >
                Restablecer Filtros
              </button>
            </div>
          </div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
            @for (product of catalogFacade.filteredProducts(); track product.id) {
              <app-product-card [product]="product" />
            }
          </div>
        }

        <!-- Quick View Detail Modal -->
        <app-product-detail-modal />
      </div>
    </section>
  `,
})
export class CatalogSectionComponent {
  readonly catalogFacade = inject(CatalogFacade);
}

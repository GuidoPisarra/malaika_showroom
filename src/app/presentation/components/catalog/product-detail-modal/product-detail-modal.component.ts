import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CatalogFacade } from '../../../../application/catalog.facade';
import { CartFacade } from '../../../../application/cart.facade';
import { LookBuilderFacade } from '../../../../application/look-builder.facade';
import { ProductColor, Product } from '../../../../domain/catalog/models/product.model';
import { ArsCurrencyPipe } from '../../../shared/pipes/ars-currency.pipe';

@Component({
  selector: 'app-product-detail-modal',
  imports: [CommonModule, ArsCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'handleKeydown($event)',
  },
  template: `
    @if (catalogFacade.isQuickViewOpen() && catalogFacade.selectedProductForModal(); as product) {
      <div
        id="product-detail-modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de Prenda"
        class="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 animate-fadeIn"
      >
        <!-- Backdrop close target -->
        <button
          type="button"
          class="fixed inset-0 bg-transparent w-full h-full cursor-default"
          (click)="catalogFacade.closeQuickView()"
          aria-label="Cerrar modal de detalle"
        ></button>

        <!-- Centered Modal Stage with Side Navigation Arrows -->
        <div class="relative w-full max-w-5xl flex items-center justify-center my-auto z-10 px-1 sm:px-14">
          
          <!-- Left Navigation Arrow (Prenda anterior en pantalla) -->
          <button
            type="button"
            (click)="onNavigate('prev', $event)"
            class="absolute left-1 sm:left-2 z-30 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-white/95 hover:bg-white text-stone-800 hover:text-amber-900 border border-stone-200/90 shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
            aria-label="Ver prenda anterior en pantalla"
            title="Prenda anterior (←)"
          >
            <span class="material-symbols-outlined text-2xl sm:text-3xl select-none">chevron_left</span>
          </button>

          <!-- Main Card Container -->
          <div
            id="product-detail-modal-container"
            class="bg-[#FAF8F5] rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-stone-200 relative"
          >
            <!-- Close Button -->
            <button
              (click)="catalogFacade.closeQuickView()"
              class="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-stone-700 hover:text-stone-950 flex items-center justify-center shadow-md transition-colors cursor-pointer"
              aria-label="Cerrar detalle"
            >
              <span class="material-symbols-outlined text-2xl">close</span>
            </button>

            <div class="grid grid-cols-1 md:grid-cols-2">
              <!-- Left: Gallery Carousel -->
              <div class="relative bg-stone-100 p-4 sm:p-6 flex flex-col justify-between">
                <div class="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-inner bg-white">
                  <img
                    [src]="activeImage() || product.image"
                    [alt]="product.name"
                    class="w-full h-full object-cover object-center"
                  />
                </div>

                <!-- Thumbnails -->
                @if (product.gallery.length > 1) {
                  <div class="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                    @for (img of product.gallery; track img) {
                      <button
                        type="button"
                        (click)="setActiveImage(img)"
                        class="w-14 h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0"
                        [ngClass]="{
                          'border-amber-700 ring-1 ring-amber-700': (activeImage() || product.image) === img,
                          'border-transparent opacity-70 hover:opacity-100': (activeImage() || product.image) !== img
                        }"
                      >
                        <img [src]="img" alt="Miniatura" class="w-full h-full object-cover" />
                      </button>
                    }
                  </div>
                }
              </div>

              <!-- Right: Product Information & Customization -->
              <div class="p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div class="space-y-4">
                  <!-- Category & Occasion Badges -->
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] uppercase font-bold tracking-widest text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                      {{ product.category }}
                    </span>
                    <span class="text-[10px] uppercase font-semibold tracking-wider text-stone-500 bg-stone-200/70 px-2.5 py-1 rounded-full">
                      Ocasión: {{ product.occasion }}
                    </span>
                  </div>

                  <!-- Title & Price -->
                  <div>
                    <h2 class="font-display text-2xl sm:text-3xl text-stone-900 font-medium leading-tight">
                      {{ product.name }}
                    </h2>
                    <p class="text-sm text-stone-500 font-light mt-1">
                      {{ product.subtitle }}
                    </p>
                    <div class="flex items-baseline gap-2 mt-3">
                      <span class="text-2xl font-bold font-mono text-stone-900">
                        {{ product.price | arsCurrency }}
                      </span>
                      @if (product.originalPrice) {
                        <span class="text-sm text-stone-400 line-through font-mono">
                          {{ product.originalPrice | arsCurrency }}
                        </span>
                      }
                    </div>
                  </div>

                  <!-- Color Selection -->
                  <div>
                    <span class="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2">
                      Color: <span class="text-stone-900 font-normal">{{ selectedColor()?.name || product.colors[0].name }}</span>
                    </span>
                    <div class="flex items-center gap-2">
                      @for (c of product.colors; track c.name) {
                        <button
                          type="button"
                          (click)="selectedColor.set(c)"
                          class="w-7 h-7 rounded-full border-2 transition-all relative flex items-center justify-center"
                          [ngClass]="{
                            'border-stone-900 ring-2 ring-stone-900 ring-offset-2': (selectedColor()?.name || product.colors[0].name) === c.name,
                            'border-stone-300 hover:scale-105': (selectedColor()?.name || product.colors[0].name) !== c.name
                          }"
                          [style.backgroundColor]="c.hex"
                          [title]="c.name"
                        ></button>
                      }
                    </div>
                  </div>

                  <!-- Size Selection -->
                  <div>
                    <div class="flex items-center justify-between text-xs mb-2">
                      <span class="font-semibold uppercase tracking-wider text-stone-600">Talle</span>
                      <span class="text-stone-400">Guía de talles disponible</span>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      @for (s of product.sizes; track s) {
                        <button
                          type="button"
                          (click)="selectedSize.set(s)"
                          class="px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all"
                          [ngClass]="{
                            'bg-stone-900 text-amber-200 border-stone-900 shadow-sm': (selectedSize() || product.sizes[0]) === s,
                            'bg-white text-stone-700 border-stone-200 hover:border-stone-400': (selectedSize() || product.sizes[0]) !== s
                          }"
                        >
                          {{ s }}
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Fabric & Details Accordion -->
                  <div class="bg-stone-100/80 p-3.5 rounded-xl space-y-1.5 text-xs text-stone-700">
                    <p><strong>Composición:</strong> {{ product.material }}</p>
                    <ul class="list-disc list-inside text-stone-600 space-y-0.5">
                      @for (detail of product.details; track detail) {
                        <li>{{ detail }}</li>
                      }
                    </ul>
                  </div>
                </div>

                <!-- Actions Area -->
                <div class="space-y-2.5 pt-4 border-t border-stone-200">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <!-- Add to Bag -->
                    <button
                      type="button"
                      (click)="addToBag(product)"
                      class="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 text-amber-200 text-xs font-bold tracking-wider uppercase rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <span class="material-symbols-outlined text-base">shopping_bag</span>
                      <span>Añadir a Bolsa</span>
                    </button>

                    <!-- Equip on Mannequin Studio -->
                    <button
                      type="button"
                      (click)="equipOnMannequin(product)"
                      class="w-full py-3 px-4 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold tracking-wider uppercase rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <span class="material-symbols-outlined text-base">accessibility_new</span>
                      <span>Probar en Modelo</span>
                    </button>
                  </div>

                  <!-- Link to AR Showroom -->
                  <a
                    href="#showroom-ar"
                    (click)="catalogFacade.closeQuickView()"
                    class="w-full py-2 text-center text-xs text-stone-600 hover:text-amber-800 font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span class="material-symbols-outlined text-amber-700 text-sm">view_in_ar</span>
                    <span>Ver cómo luce en el Showroom Realidad Aumentada</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Navigation Arrow (Siguiente prenda en pantalla) -->
          <button
            type="button"
            (click)="onNavigate('next', $event)"
            class="absolute right-1 sm:right-2 z-30 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-white/95 hover:bg-white text-stone-800 hover:text-amber-900 border border-stone-200/90 shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
            aria-label="Ver siguiente prenda en pantalla"
            title="Siguiente prenda (→)"
          >
            <span class="material-symbols-outlined text-2xl sm:text-3xl select-none">chevron_right</span>
          </button>

        </div>
      </div>
    }
  `,
})
export class ProductDetailModalComponent {
  readonly catalogFacade = inject(CatalogFacade);
  readonly cartFacade = inject(CartFacade);
  readonly lookBuilderFacade = inject(LookBuilderFacade);

  readonly activeImage = signal<string | null>(null);
  readonly selectedSize = signal<string | null>(null);
  readonly selectedColor = signal<ProductColor | null>(null);

  handleKeydown(event: KeyboardEvent): void {
    if (!this.catalogFacade.isQuickViewOpen()) return;
    if (event.key === 'ArrowLeft') {
      this.onNavigate('prev');
    } else if (event.key === 'ArrowRight') {
      this.onNavigate('next');
    } else if (event.key === 'Escape') {
      this.catalogFacade.closeQuickView();
    }
  }

  onNavigate(direction: 'prev' | 'next', event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.catalogFacade.navigateModal(direction);
    // Reset product-specific selections so new item loads cleanly
    this.activeImage.set(null);
    this.selectedSize.set(null);
    this.selectedColor.set(null);
  }

  setActiveImage(img: string): void {
    this.activeImage.set(img);
  }

  addToBag(product: Product): void {
    const size = this.selectedSize() || product.sizes[0];
    const color = this.selectedColor() || product.colors[0];
    this.cartFacade.addItem(product, size, color);
    this.catalogFacade.closeQuickView();
  }

  equipOnMannequin(product: Product): void {
    this.lookBuilderFacade.equipItem(product);
    this.catalogFacade.closeQuickView();
  }
}

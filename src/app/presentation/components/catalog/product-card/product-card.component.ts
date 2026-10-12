import { Component, ChangeDetectionStrategy, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../../domain/catalog/models/product.model';
import { CartFacade } from '../../../../application/cart.facade';
import { LookBuilderFacade } from '../../../../application/look-builder.facade';
import { CatalogFacade } from '../../../../application/catalog.facade';
import { ArsCurrencyPipe } from '../../../shared/pipes/ars-currency.pipe';

@Component({
  selector: 'app-product-card',
  imports: [CommonModule, ArsCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      [id]="'product-card-' + product.id"
      class="group relative bg-white rounded-2xl overflow-hidden border border-stone-200/70 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
    >
      <!-- Image Container -->
      <div class="relative aspect-[3/4] overflow-hidden bg-stone-100">
        <button
          type="button"
          class="w-full h-full cursor-pointer text-left block border-none p-0"
          (click)="openQuickView()"
          [attr.aria-label]="'Ver detalle de ' + product.name"
        >
          <img
            [src]="product.image"
            [alt]="product.name"
            loading="lazy"
            class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        </button>

        <!-- Badges (Top Left) -->
        <div class="absolute top-3 left-3 flex flex-col gap-1 z-10 pointer-events-none">
          @if (product.isNew) {
            <span class="px-2.5 py-1 bg-stone-900 text-amber-200 text-[10px] font-bold tracking-wider uppercase rounded-full shadow-sm">
              Nuevo
            </span>
          }
          @if (product.isTrending) {
            <span class="px-2.5 py-1 bg-amber-100 text-amber-900 text-[10px] font-bold tracking-wider uppercase rounded-full shadow-sm">
              Tendencia
            </span>
          }
          @if (!product.inStock) {
            <span class="px-2.5 py-1 bg-stone-200 text-stone-700 text-[10px] font-bold tracking-wider uppercase rounded-full shadow-sm">
              Agotado
            </span>
          } @else if (product.stock <= 3) {
            <span class="px-2.5 py-1 bg-white/95 text-amber-900 text-[10px] font-bold tracking-wider uppercase rounded-full shadow-sm">
              Últimas unidades
            </span>
          }
          @if (product.originalPrice) {
            <span class="px-2.5 py-1 bg-rose-900 text-rose-100 text-[10px] font-bold tracking-wider uppercase rounded-full shadow-sm">
              Oferta
            </span>
          }
        </div>

        <!-- Slot / Category Tag (Top Right) -->
        <div class="absolute top-3 right-3 z-10 pointer-events-none">
          <span class="px-2 py-0.5 bg-white/90 backdrop-blur-md text-stone-700 text-[10px] font-semibold tracking-wider uppercase rounded-md shadow-xs">
            {{ product.category }}
          </span>
        </div>

        <!-- Floating Quick Action Overlay -->
        <div class="absolute inset-x-3 bottom-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <button
            type="button"
            (click)="equipOnMannequin($event)"
            title="Probar en el Maniquí Virtual"
            class="flex-1 py-2.5 px-3 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-transform active:scale-95"
            [ngClass]="{'ring-2 ring-white ring-offset-2': isEquippedOnMannequin()}"
          >
            <span class="material-symbols-outlined text-base">styler</span>
            <span>{{ isEquippedOnMannequin() ? 'En Maniquí' : 'Probar en Maniquí' }}</span>
          </button>

          <button
            type="button"
            (click)="quickAddToBag($event)"
            [disabled]="!product.inStock"
            [title]="product.inStock ? 'Añadir a la bolsa' : 'Agotado'"
            class="p-2.5 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-400 disabled:cursor-not-allowed text-amber-200 rounded-xl shadow-lg transition-transform active:scale-95"
            aria-label="Añadir rápido a la bolsa"
          >
            <span class="material-symbols-outlined text-base">shopping_bag</span>
          </button>
        </div>
      </div>

      <!-- Details Section -->
      <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <!-- Material & Rating -->
          <div class="flex items-center justify-between text-[11px] text-stone-500 mb-1">
            <span class="truncate max-w-[150px]" [title]="product.material">{{ product.material }}</span>
            <div class="flex items-center gap-0.5 text-amber-600 font-semibold">
              <span class="material-symbols-outlined text-xs">star</span>
              <span>{{ product.rating }}</span>
            </div>
          </div>

          <!-- Title -->
          <h3 class="font-display text-lg text-stone-900 font-medium leading-tight">
            <button
              type="button"
              (click)="openQuickView()"
              class="text-left hover:text-amber-800 transition-colors font-medium leading-tight cursor-pointer"
            >
              {{ product.name }}
            </button>
          </h3>

          <!-- Subtitle / Fit description -->
          <p class="text-xs text-stone-500 font-light line-clamp-1 mt-0.5">
            {{ product.subtitle }}
          </p>
        </div>

        <!-- Color circles preview -->
        <div class="flex items-center gap-1.5 pt-1">
          @for (color of product.colors; track color.name) {
            <span
              class="w-3.5 h-3.5 rounded-full border border-stone-300 shadow-xs"
              [style.backgroundColor]="color.hex"
              [title]="color.name"
            ></span>
          }
          <span class="text-[10px] text-stone-400 ml-1">
            {{ product.colors.length }} {{ product.colors.length === 1 ? 'tono' : 'tonos' }}
          </span>
        </div>

        <!-- Price and Primary Action -->
        <div class="pt-2 border-t border-stone-100 flex items-center justify-between">
          <div>
            <div class="flex items-baseline gap-1.5">
              <span class="text-base font-bold text-stone-900 font-mono">
                {{ product.price | arsCurrency }}
              </span>
              @if (product.originalPrice) {
                <span class="text-xs text-stone-400 line-through font-mono">
                  {{ product.originalPrice | arsCurrency }}
                </span>
              }
            </div>
            <span class="text-[10px] text-stone-500 block">3 cuotas de {{ (product.price / 3) | arsCurrency }}</span>
          </div>

          <!-- Try in Mannequin subtle button (always accessible on mobile) -->
          <button
            type="button"
            (click)="equipOnMannequin($event)"
            class="sm:hidden text-xs text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1"
          >
            <span class="material-symbols-outlined text-sm">styler</span>
            <span>Maniquí</span>
          </button>
        </div>
      </div>
    </article>
  `,
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;

  private cartFacade = inject(CartFacade);
  private lookBuilderFacade = inject(LookBuilderFacade);
  private catalogFacade = inject(CatalogFacade);

  readonly justEquipped = signal<boolean>(false);

  isEquippedOnMannequin(): boolean {
    const slots = this.lookBuilderFacade.slots();
    return (
      slots.dress?.id === this.product.id ||
      slots.top?.id === this.product.id ||
      slots.bottom?.id === this.product.id ||
      slots.shoes?.id === this.product.id ||
      slots.accessory?.id === this.product.id
    );
  }

  equipOnMannequin(event: Event): void {
    event.stopPropagation();
    this.lookBuilderFacade.equipItem(this.product);
    this.justEquipped.set(true);
    setTimeout(() => this.justEquipped.set(false), 1500);
  }

  quickAddToBag(event: Event): void {
    event.stopPropagation();
    this.cartFacade.addItem(this.product);
  }

  openQuickView(): void {
    this.catalogFacade.openQuickView(this.product);
  }
}

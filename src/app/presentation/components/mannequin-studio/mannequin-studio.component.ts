import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LookBuilderFacade } from '../../../application/look-builder.facade';
import { CatalogFacade } from '../../../application/catalog.facade';
import { CartFacade } from '../../../application/cart.facade';
import { Product } from '../../../domain/catalog/models/product.model';
import { LookPreset } from '../../../domain/look-builder/models/look.model';
import { ArsCurrencyPipe } from '../../shared/pipes/ars-currency.pipe';
import { resolveSilhouette } from '../../../domain/look-builder/services/garment-silhouette';
import { MannequinFigureComponent } from './mannequin-figure.component';

export interface SilhouetteSkinTone {
  id: 'arena' | 'porcelain' | 'caramel' | 'ebony';
  label: string;
  fill: string;
  shadow: string;
  stroke: string;
  hair: string;
  accent: string;
  previewHex: string;
}

export const SILHOUETTE_SKIN_TONES: SilhouetteSkinTone[] = [
  {
    id: 'arena',
    label: 'Arena Boutique (Foto)',
    fill: '#D8C7B3',
    shadow: '#BFAEA0',
    stroke: '#9E8B79',
    hair: '#382D26',
    accent: '#D4AF37',
    previewHex: '#D8C7B3',
  },
  {
    id: 'porcelain',
    label: 'Porcelana',
    fill: '#F5EBE1',
    shadow: '#DECEBD',
    stroke: '#C6B09B',
    hair: '#29211C',
    accent: '#D4AF37',
    previewHex: '#F5EBE1',
  },
  {
    id: 'caramel',
    label: 'Caramelo',
    fill: '#D8A881',
    shadow: '#B7825A',
    stroke: '#9A633B',
    hair: '#1D1613',
    accent: '#E5C07B',
    previewHex: '#D8A881',
  },
  {
    id: 'ebony',
    label: 'Ébano',
    fill: '#8D5C43',
    shadow: '#6E3F28',
    stroke: '#542E1B',
    hair: '#120D0C',
    accent: '#E5C07B',
    previewHex: '#8D5C43',
  },
];

@Component({
  selector: 'app-mannequin-studio',
  imports: [CommonModule, ArsCurrencyPipe, MannequinFigureComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="maniqui-studio" class="py-16 sm:py-24 bg-[#F5EFE6] border-y border-stone-200/80 relative overflow-hidden">
      <!-- Background subtle accent glow -->
      <div class="absolute top-0 right-0 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute bottom-0 left-0 w-96 h-96 bg-stone-300/20 rounded-full blur-3xl pointer-events-none"></div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <!-- Section Header -->
        <div class="text-center max-w-3xl mx-auto space-y-3 mb-10 sm:mb-14">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-900 text-amber-200 text-xs font-semibold tracking-widest uppercase">
            <span class="material-symbols-outlined text-sm">styler</span>
            <span>Virtual Fitting Room</span>
          </div>
          <h2 class="font-display text-3xl sm:text-4xl lg:text-5xl text-stone-900 font-medium tracking-tight">
            Probador Virtual con Silueta de Modelo
          </h2>
          <p class="text-sm sm:text-base text-stone-600 font-light max-w-xl mx-auto">
            Visualiza cómo lucen vestidos, palazzos, blusas y calzado sobre una silueta femenina estilizada con brazos y piernas completas para apreciar cada caída y longitud.
          </p>

          <!-- Toast Notification for equipped item -->
          @if (lookBuilderFacade.lastEquippedNotification(); as notification) {
            <div class="inline-block mt-2 px-4 py-1.5 bg-stone-900 text-amber-200 text-xs font-medium rounded-full shadow-md animate-fadeIn">
              {{ notification }}
            </div>
          }
        </div>

        <!-- Preset Looks Pills -->
        <div class="flex items-center justify-center gap-2 sm:gap-3 flex-wrap mb-8">
          <span class="text-xs uppercase tracking-wider text-stone-500 font-semibold mr-1">
            Inspiraciones:
          </span>
          @for (preset of lookBuilderFacade.presets(); track preset.id) {
            <button
              type="button"
              (click)="applyPreset(preset)"
              class="px-4 py-1.5 bg-white hover:bg-amber-50 border border-stone-300 hover:border-amber-400 text-stone-800 text-xs font-medium rounded-full shadow-xs transition-all duration-200 flex items-center gap-1.5"
            >
              <span class="w-2 h-2 rounded-full bg-amber-600"></span>
              <span>{{ preset.name }}</span>
              <span class="text-[10px] text-stone-400 hidden sm:inline">({{ preset.tag }})</span>
            </button>
          }
          <button
            type="button"
            (click)="lookBuilderFacade.clearMannequin()"
            class="px-3 py-1.5 text-stone-500 hover:text-stone-800 text-xs font-medium transition-colors cursor-pointer"
            title="Limpiar probador"
          >
            Reiniciar
          </button>
        </div>

        <!-- Main Studio Grid: Mannequin Stage & Wardrobe Rack Selector -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <!-- Column 1: The Interactive Visual Mannequin Stage (5 cols) -->
          <div class="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-200/90 relative flex flex-col items-center">
            
            <!-- Mannequin Header: Style Diagnostic Pill & Render Mode Selector -->
            <div class="w-full flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <span class="text-[10px] uppercase font-bold tracking-widest text-amber-800 block">
                  Diagnóstico de Estilo
                </span>
                <span class="font-serif text-base font-semibold text-stone-900">
                  {{ lookBuilderFacade.harmony().vibe }}
                </span>
              </div>
              <!-- Harmony Score Meter -->
              <div class="text-right">
                <span class="text-[10px] uppercase text-stone-400 tracking-wider block">Armonía</span>
                <span class="text-sm font-bold font-mono text-amber-700">
                  {{ lookBuilderFacade.harmony().score }}%
                </span>
              </div>
            </div>

            <!-- Skin Tone Bar -->
            <div class="w-full flex items-center justify-between py-2.5 border-b border-stone-100 text-xs gap-2">
              <span class="text-[11px] font-medium text-stone-500 flex items-center gap-1">
                <span class="material-symbols-outlined text-xs text-amber-700">accessibility_new</span>
                Tono del maniquí
              </span>
              <div class="flex items-center gap-1.5">
                @for (tone of skinTones; track tone.id) {
                  <button
                    type="button"
                    (click)="setSkinTone(tone.id)"
                    class="w-5 h-5 rounded-full border transition-transform cursor-pointer"
                    [style.backgroundColor]="tone.previewHex"
                    [class.ring-2]="selectedSkinToneId() === tone.id"
                    [class.ring-amber-700]="selectedSkinToneId() === tone.id"
                    [class.scale-110]="selectedSkinToneId() === tone.id"
                    [class.border-stone-300]="selectedSkinToneId() !== tone.id"
                    [title]="tone.label"
                    [attr.aria-label]="tone.label"
                  ></button>
                }
              </div>
            </div>

            <!-- Mannequin Stage: garments fitted over the mannequin photo -->
            <div class="relative w-full max-w-[280px] sm:max-w-[320px] aspect-[1/2] my-4 flex items-center justify-center">

              <app-mannequin-figure class="block w-full h-full" [slots]="lookBuilderFacade.slots()" [bodyFilter]="mannequinFilter()" />

              <!-- Slot Hotspot Tags on Avatar (Quick unequip or inspect) -->
              <div class="absolute inset-0 pointer-events-none">
                <!-- Top / Dress Hotspot -->
                @if (lookBuilderFacade.slots().dress || lookBuilderFacade.slots().top; as piece) {
                  <div class="absolute top-[26%] -left-3 pointer-events-auto">
                    <button
                      (click)="lookBuilderFacade.unequipSlot(lookBuilderFacade.slots().dress ? 'dress' : 'top')"
                      class="px-2 py-1 bg-stone-900/90 text-amber-200 text-[10px] rounded-lg shadow-md flex items-center gap-1 hover:bg-rose-900 transition-colors cursor-pointer"
                      title="Quitar prenda"
                    >
                      <span class="max-w-[85px] truncate">{{ piece.name }}</span>
                      <span class="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>
                }

                <!-- Bottom Hotspot -->
                @if (lookBuilderFacade.slots().bottom; as bottom) {
                  <div class="absolute top-[58%] -right-3 pointer-events-auto">
                    <button
                      (click)="lookBuilderFacade.unequipSlot('bottom')"
                      class="px-2 py-1 bg-stone-900/90 text-amber-200 text-[10px] rounded-lg shadow-md flex items-center gap-1 hover:bg-rose-900 transition-colors cursor-pointer"
                      title="Quitar prenda"
                    >
                      <span class="max-w-[85px] truncate">{{ bottom.name }}</span>
                      <span class="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>
                }

                <!-- Shoes Hotspot -->
                @if (lookBuilderFacade.slots().shoes; as shoes) {
                  <div class="absolute bottom-6 -left-3 pointer-events-auto">
                    <button
                      (click)="lookBuilderFacade.unequipSlot('shoes')"
                      class="px-2 py-1 bg-stone-900/90 text-amber-200 text-[10px] rounded-lg shadow-md flex items-center gap-1 hover:bg-rose-900 transition-colors cursor-pointer"
                      title="Quitar calzado"
                    >
                      <span class="max-w-[85px] truncate">{{ shoes.name }}</span>
                      <span class="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>
                }

                <!-- Accessory Hotspot -->
                @if (lookBuilderFacade.slots().accessory; as acc) {
                  <div
                    class="absolute -right-3 pointer-events-auto transition-all"
                    [class.top-[40%]]="accessoryShape() === 'bag-clutch'"
                    [class.top-[14%]]="accessoryShape() !== 'bag-clutch'"
                  >
                    <button
                      (click)="lookBuilderFacade.unequipSlot('accessory')"
                      class="px-2 py-1 bg-stone-900/90 text-amber-200 text-[10px] rounded-lg shadow-md flex items-center gap-1 hover:bg-rose-900 transition-colors cursor-pointer"
                      title="Quitar accesorio"
                    >
                      <span class="max-w-[85px] truncate">{{ acc.name }}</span>
                      <span class="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>
                }
              </div>
            </div>

            <!-- Equipped Garments Bar with High-Res Thumbnails -->
            @if (lookBuilderFacade.equippedCount() > 0) {
              <div class="w-full bg-stone-50 border border-stone-200/80 rounded-2xl p-2.5 my-2">
                <div class="flex items-center justify-between text-[11px] text-stone-500 font-medium mb-1.5 px-0.5">
                  <span class="flex items-center gap-1 text-amber-800 font-semibold">
                    <span class="material-symbols-outlined text-sm">accessibility_new</span>
                    Prendas en la Modelo ({{ lookBuilderFacade.equippedCount() }})
                  </span>
                  <span class="text-[10px] text-stone-400">Click en la X para desvestir</span>
                </div>
                <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  @for (item of lookBuilderFacade.equippedItems(); track item.id) {
                    <div class="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white border border-stone-200 shadow-xs shrink-0">
                      <img [src]="item.image" [alt]="item.name" class="w-7 h-7 rounded-lg object-cover border border-stone-100" />
                      <div class="text-[11px] leading-tight pr-1">
                        <span class="font-medium text-stone-800 block max-w-[100px] truncate">{{ item.name }}</span>
                        <span class="text-stone-500 font-mono text-[10px]">{{ item.price | arsCurrency }}</span>
                      </div>
                      <button
                        type="button"
                        (click)="lookBuilderFacade.unequipSlot(item.slot)"
                        class="text-stone-400 hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer"
                        title="Quitar prenda de la modelo"
                      >
                        <span class="material-symbols-outlined text-xs">close</span>
                      </button>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Mannequin Footer: Pricing, Bundle Discount & Buy Whole Look -->
            <div class="w-full pt-4 border-t border-stone-100 space-y-3">
              <!-- Pricing Line -->
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs text-stone-500 block">Total del Look ({{ lookBuilderFacade.equippedCount() }} prendas)</span>
                  <div class="flex items-baseline gap-2">
                    <span class="text-2xl font-bold font-mono text-stone-900">
                      {{ lookBuilderFacade.finalLookPrice() | arsCurrency }}
                    </span>
                    @if (lookBuilderFacade.bundleDiscountAmount() > 0) {
                      <span class="text-sm font-mono text-stone-400 line-through">
                        {{ lookBuilderFacade.rawTotalPrice() | arsCurrency }}
                      </span>
                    }
                  </div>
                </div>

                @if (lookBuilderFacade.discountRate() > 0) {
                  <span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold tracking-wide">
                    -{{ lookBuilderFacade.discountRate() * 100 }}% OFF Pack Look
                  </span>
                }
              </div>

              <!-- Main Look Actions -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  (click)="addWholeLookToBag()"
                  [disabled]="lookBuilderFacade.equippedCount() === 0"
                  class="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:hover:bg-stone-900 text-amber-200 text-xs font-bold tracking-wider uppercase rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
                >
                  <span class="material-symbols-outlined text-base">shopping_bag</span>
                  <span>Comprar Look Completo</span>
                </button>

                <button
                  type="button"
                  (click)="lookBuilderFacade.saveCurrentLook()"
                  [disabled]="lookBuilderFacade.equippedCount() === 0"
                  class="w-full py-3 px-3 bg-white hover:bg-stone-50 disabled:opacity-40 border border-stone-300 text-stone-800 text-xs font-semibold tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <span class="material-symbols-outlined text-base text-amber-700">bookmark</span>
                  <span>Guardar Look</span>
                </button>
              </div>

              <!-- Stylist Advice Tip -->
              <div class="p-3 bg-stone-50 rounded-xl text-xs text-stone-600 space-y-1">
                <p class="font-medium text-stone-900 flex items-center gap-1">
                  <span class="material-symbols-outlined text-amber-600 text-sm">tips_and_updates</span>
                  <span>Consejo de Estilismo Malaika:</span>
                </p>
                <p class="text-stone-500 font-light">
                  {{ lookBuilderFacade.harmony().paletteDescription }}
                </p>
              </div>
            </div>

          </div>

          <!-- Column 2: The Dressing Wardrobe Rack Selector (7 cols) -->
          <div class="lg:col-span-7 space-y-5">
            <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-200/80">
              
              <!-- Slot Category Selector Tabs -->
              <div class="relative pb-4 border-b border-stone-100 mb-5">
                <div class="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 pr-8">
                  <button
                    type="button"
                    (click)="lookBuilderFacade.setSlotSelector('dress')"
                    class="px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all shrink-0"
                    [ngClass]="{
                      'bg-stone-900 text-amber-200': lookBuilderFacade.activeSlotSelector() === 'dress',
                      'bg-stone-100 text-stone-700 hover:bg-stone-200': lookBuilderFacade.activeSlotSelector() !== 'dress'
                    }"
                  >
                    Vestidos
                  </button>
                  <button
                    type="button"
                    (click)="lookBuilderFacade.setSlotSelector('top')"
                    class="px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all shrink-0"
                    [ngClass]="{
                      'bg-stone-900 text-amber-200': lookBuilderFacade.activeSlotSelector() === 'top',
                      'bg-stone-100 text-stone-700 hover:bg-stone-200': lookBuilderFacade.activeSlotSelector() !== 'top'
                    }"
                  >
                    Tops & Blazers
                  </button>
                  <button
                    type="button"
                    (click)="lookBuilderFacade.setSlotSelector('bottom')"
                    class="px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all shrink-0"
                    [ngClass]="{
                      'bg-stone-900 text-amber-200': lookBuilderFacade.activeSlotSelector() === 'bottom',
                      'bg-stone-100 text-stone-700 hover:bg-stone-200': lookBuilderFacade.activeSlotSelector() !== 'bottom'
                    }"
                  >
                    Pantalones & Faldas
                  </button>
                  <button
                    type="button"
                    (click)="lookBuilderFacade.setSlotSelector('shoes')"
                    class="px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all shrink-0"
                    [ngClass]="{
                      'bg-stone-900 text-amber-200': lookBuilderFacade.activeSlotSelector() === 'shoes',
                      'bg-stone-100 text-stone-700 hover:bg-stone-200': lookBuilderFacade.activeSlotSelector() !== 'shoes'
                    }"
                  >
                    Calzado
                  </button>
                  <button
                    type="button"
                    (click)="lookBuilderFacade.setSlotSelector('accessory')"
                    class="px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all shrink-0"
                    [ngClass]="{
                      'bg-stone-900 text-amber-200': lookBuilderFacade.activeSlotSelector() === 'accessory',
                      'bg-stone-100 text-stone-700 hover:bg-stone-200': lookBuilderFacade.activeSlotSelector() !== 'accessory'
                    }"
                  >
                    Accesorios & Joyas
                  </button>
                </div>
                <div class="pointer-events-none absolute inset-y-0 right-0 bottom-4 w-10 bg-gradient-to-l from-white to-transparent" aria-hidden="true"></div>
              </div>

              <!-- Available Garments Rack for the Active Slot -->
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4 max-h-[520px] overflow-y-auto pr-1">
                @for (prod of activeSlotProducts(); track prod.id) {
                  <div
                    [id]="'rack-item-' + prod.id"
                    (click)="lookBuilderFacade.equipItem(prod)"
                    role="button"
                    tabindex="0"
                    (keydown.enter)="lookBuilderFacade.equipItem(prod)"
                    class="group relative bg-stone-50 hover:bg-white rounded-2xl p-2.5 border transition-all duration-200 cursor-pointer flex flex-col justify-between"
                    [ngClass]="{
                      'border-amber-600 ring-2 ring-amber-600 bg-amber-50/40': isItemEquipped(prod),
                      'border-stone-200 hover:border-stone-400 hover:shadow-md': !isItemEquipped(prod)
                    }"
                  >
                    <div class="relative aspect-[3/4] rounded-xl overflow-hidden bg-stone-200">
                      <img [src]="prod.image" [alt]="prod.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      @if (isItemEquipped(prod)) {
                        <div class="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-md">
                          <span class="material-symbols-outlined text-sm">check</span>
                        </div>
                      }
                    </div>

                    <div class="pt-2">
                      <p class="text-xs font-medium text-stone-900 truncate">{{ prod.name }}</p>
                      <div class="flex items-center justify-between mt-1">
                        <span class="text-xs font-mono font-bold text-stone-800">{{ prod.price | arsCurrency }}</span>
                        <span
                          class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          [ngClass]="isItemEquipped(prod) ? 'text-stone-600 bg-stone-100' : 'text-white bg-amber-700'"
                        >
                          {{ isItemEquipped(prod) ? 'En Maniquí' : 'Poner' }}
                        </span>
                      </div>
                    </div>
                  </div>
                }
              </div>

              <div class="pt-4 text-center">
                <a
                  href="#catalogo"
                  class="text-xs text-stone-500 hover:text-amber-800 font-medium inline-flex items-center gap-1"
                >
                  <span>Ver más prendas en el catálogo general</span>
                  <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </a>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  `,
})
export class MannequinStudioComponent {
  readonly lookBuilderFacade = inject(LookBuilderFacade);
  readonly catalogFacade = inject(CatalogFacade);
  readonly cartFacade = inject(CartFacade);

  readonly accessoryShape = computed(() => {
    const acc = this.lookBuilderFacade.slots().accessory;
    return acc ? resolveSilhouette(acc).svgType : null;
  });

  /**
   * Tone selection for the mannequin.
   */
  readonly skinTones = SILHOUETTE_SKIN_TONES;
  readonly selectedSkinToneId = signal<'arena' | 'porcelain' | 'caramel' | 'ebony'>('arena');

  readonly mannequinFilter = computed(() => {
    switch (this.selectedSkinToneId()) {
      case 'porcelain':
        return 'brightness(1.08) contrast(0.96) saturate(0.85)';
      case 'caramel':
        return 'sepia(0.28) saturate(1.25) brightness(0.92) contrast(1.02)';
      case 'ebony':
        return 'brightness(0.68) contrast(1.1) saturate(0.92) sepia(0.15)';
      case 'arena':
      default:
        return 'none';
    }
  });

  setSkinTone(id: 'arena' | 'porcelain' | 'caramel' | 'ebony'): void {
    this.selectedSkinToneId.set(id);
  }

  activeSlotProducts(): Product[] {
    const slot = this.lookBuilderFacade.activeSlotSelector();
    const all = this.catalogFacade.allProducts();

    if (slot === 'dress') {
      return all.filter((p) => p.slot === 'dress');
    }
    if (slot === 'top') {
      return all.filter((p) => p.slot === 'top');
    }
    if (slot === 'bottom') {
      return all.filter((p) => p.slot === 'bottom');
    }
    if (slot === 'shoes') {
      return all.filter((p) => p.slot === 'shoes');
    }
    if (slot === 'accessory') {
      return all.filter((p) => p.slot === 'accessory');
    }
    return all;
  }

  isItemEquipped(product: Product): boolean {
    const slots = this.lookBuilderFacade.slots();
    return (
      slots.dress?.id === product.id ||
      slots.top?.id === product.id ||
      slots.bottom?.id === product.id ||
      slots.shoes?.id === product.id ||
      slots.accessory?.id === product.id
    );
  }

  applyPreset(preset: LookPreset): void {
    this.lookBuilderFacade.applyPreset(preset, this.catalogFacade.allProducts());
  }

  addWholeLookToBag(): void {
    const items = this.lookBuilderFacade.equippedItems();
    if (items.length > 0) {
      this.cartFacade.addOutfitBundle(items);
    }
  }
}

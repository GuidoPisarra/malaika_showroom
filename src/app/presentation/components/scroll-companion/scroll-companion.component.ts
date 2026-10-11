import {
  Component,
  ChangeDetectionStrategy,
  HostListener,
  inject,
  signal,
  computed,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { LookBuilderFacade } from '../../../application/look-builder.facade';
import { CartFacade } from '../../../application/cart.facade';
import { ArsCurrencyPipe } from '../../shared/pipes/ars-currency.pipe';

@Component({
  selector: 'app-scroll-companion',
  imports: [CommonModule, ArsCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Floating Dynamic Scroll Companion -->
    <aside
      id="scroll-companion-widget"
      aria-label="Asistente dinámico de estilismo y navegación"
      class="fixed right-3 sm:right-6 bottom-6 sm:bottom-10 z-40 transition-transform duration-500 ease-out select-none"
      [style.transform]="transformStyle()"
    >
      <div class="relative group">
        <!-- Floating Ambient Glow Aura -->
        <div
          class="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-400/40 via-amber-200/20 to-amber-500/30 blur-md opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse-glow"
        ></div>

        <!-- Main Companion Capsule -->
        <div
          class="relative bg-stone-900/90 text-stone-100 backdrop-blur-md border border-amber-300/30 shadow-2xl rounded-2xl p-2.5 sm:p-3 flex items-center gap-3 transition-all duration-300 group-hover:border-amber-400"
        >
          <!-- Dynamic Circular Scroll Progress Gauge with Mannequin Icon -->
          <div
            (click)="toggleMiniDrawer()"
            role="button"
            tabindex="0"
            (keydown.enter)="toggleMiniDrawer()"
            title="Abrir vista rápida de tu look en maniquí"
            class="relative w-12 h-12 flex items-center justify-center cursor-pointer rounded-full bg-stone-950/80 hover:scale-105 transition-transform"
          >
            <!-- SVG Progress Ring -->
            <svg class="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle
                cx="24"
                cy="24"
                r="20"
                class="stroke-stone-800"
                stroke-width="3"
                fill="none"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                class="stroke-amber-400 transition-all duration-150 ease-out"
                stroke-width="3"
                stroke-linecap="round"
                fill="none"
                [attr.stroke-dasharray]="circumference"
                [attr.stroke-dashoffset]="strokeDashoffset()"
              />
            </svg>

            <!-- Center Icon: Mannequin Avatar / Active Outfit Indicator -->
            <div class="absolute inset-0 flex items-center justify-center text-amber-200">
              <span class="material-symbols-outlined text-xl transition-transform group-hover:rotate-12">
                styler
              </span>
              @if (lookBuilderFacade.equippedCount() > 0) {
                <span class="absolute top-0 right-0 w-3 h-3 bg-amber-500 rounded-full border-2 border-stone-900 animate-ping"></span>
                <span class="absolute top-0 right-0 w-3 h-3 bg-amber-500 rounded-full border-2 border-stone-900"></span>
              }
            </div>
          </div>

          <!-- Dynamic Text info (appears on scroll or desktop) -->
          <button type="button" class="hidden sm:flex flex-col pr-1 cursor-pointer text-left border-none bg-transparent" (click)="toggleMiniDrawer()" aria-label="Alternar estilista virtual">
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] uppercase tracking-widest text-amber-300 font-semibold">
                Malaika Stylist
              </span>
              <span class="text-[10px] text-stone-400 font-mono">
                {{ scrollPercentage() }}%
              </span>
            </div>
            <div class="text-xs font-medium text-stone-200 flex items-center gap-1">
              @if (lookBuilderFacade.equippedCount() > 0) {
                <span>Look: {{ lookBuilderFacade.equippedCount() }} prendas</span>
              } @else {
                <span>Diseña tu Look</span>
              }
              <span class="material-symbols-outlined text-sm text-stone-400">
                {{ isMiniDrawerOpen() ? 'expand_more' : 'expand_less' }}
              </span>
            </div>
          </button>

          <!-- Quick Actions: Scroll To Top button if scrolled down -->
          @if (scrollPercentage() > 20) {
            <button
              id="btn-scroll-top"
              (click)="scrollToTop($event)"
              type="button"
              class="p-1.5 hover:bg-stone-800 rounded-full text-stone-300 hover:text-white transition-colors"
              title="Volver al inicio"
              aria-label="Volver arriba"
            >
              <span class="material-symbols-outlined text-lg">arrow_upward</span>
            </button>
          }
        </div>

        <!-- Popover: Active Look Mini-Panel on click -->
        @if (isMiniDrawerOpen()) {
          <div
            class="absolute bottom-full right-0 mb-3 w-72 bg-stone-900/95 backdrop-blur-xl border border-stone-700/80 rounded-2xl shadow-2xl p-4 text-stone-100 animate-fadeIn"
          >
            <div class="flex items-center justify-between pb-2.5 border-b border-stone-800">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-amber-400 text-lg">accessibility_new</span>
                <span class="font-serif text-base tracking-wide text-stone-100 font-medium">
                  Tu Look en Maniquí
                </span>
              </div>
              <button
                (click)="closeMiniDrawer()"
                class="text-stone-400 hover:text-white p-0.5 rounded"
                aria-label="Cerrar"
              >
                <span class="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <!-- Equipped Items Preview in Mini Drawer -->
            <div class="py-3">
              @if (lookBuilderFacade.equippedCount() === 0) {
                <div class="text-center py-4 text-stone-400 text-xs">
                  <p>Aún no has vestido al maniquí.</p>
                  <p class="text-amber-300/80 mt-1">Explora el catálogo y pulsa "Probar en Maniquí" para armar tu conjunto.</p>
                </div>
              } @else {
                <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
                  @for (item of lookBuilderFacade.equippedItems(); track item.id) {
                    <div class="flex items-center gap-2.5 bg-stone-800/60 p-2 rounded-lg border border-stone-700/40">
                      <img [src]="item.image" [alt]="item.name" class="w-10 h-10 object-cover rounded" />
                      <div class="flex-1 min-w-0">
                        <p class="text-xs font-medium text-stone-200 truncate">{{ item.name }}</p>
                        <p class="text-[11px] text-amber-400">{{ item.price | arsCurrency }}</p>
                      </div>
                      <button
                        (click)="lookBuilderFacade.unequipSlot(item.slot)"
                        class="text-stone-400 hover:text-rose-400 p-1"
                        title="Quitar prenda"
                      >
                        <span class="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  }
                </div>

                <!-- Harmony & Total Price Summary -->
                <div class="mt-3 pt-2.5 border-t border-stone-800 flex items-center justify-between text-xs">
                  <div>
                    <span class="text-stone-400 text-[11px]">Total Look:</span>
                    <p class="font-semibold text-amber-300 text-sm">
                      {{ lookBuilderFacade.finalLookPrice() | arsCurrency }}
                    </p>
                  </div>
                  <span class="text-[10px] bg-amber-900/60 text-amber-300 px-2 py-0.5 rounded-full font-medium">
                    Armonía: {{ lookBuilderFacade.harmony().score }}%
                  </span>
                </div>
              }
            </div>

            <!-- Call to Actions -->
            <div class="grid grid-cols-2 gap-2 pt-2">
              <a
                href="#maniqui-studio"
                (click)="closeMiniDrawer()"
                class="text-center text-xs py-2 px-2.5 rounded-lg border border-stone-700 hover:border-amber-400 text-stone-200 hover:text-white transition-colors"
              >
                Abrir Maniquí
              </a>
              <button
                (click)="addCurrentLookToBag()"
                [disabled]="lookBuilderFacade.equippedCount() === 0"
                class="text-center text-xs py-2 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-stone-950 font-semibold transition-colors"
              >
                Comprar Look
              </button>
            </div>
          </div>
        }
      </div>
    </aside>
  `,
})
export class ScrollCompanionComponent {
  private platformId = inject(PLATFORM_ID);
  readonly lookBuilderFacade = inject(LookBuilderFacade);
  readonly cartFacade = inject(CartFacade);

  readonly scrollY = signal<number>(0);
  readonly scrollPercentage = signal<number>(0);
  readonly isMiniDrawerOpen = signal<boolean>(false);

  readonly radius = 20;
  readonly circumference = 2 * Math.PI * this.radius;

  readonly strokeDashoffset = computed(() => {
    const p = this.scrollPercentage();
    return this.circumference - (p / 100) * this.circumference;
  });

  // Smooth floating translation responding to scroll displacement
  readonly transformStyle = computed(() => {
    // A subtle floating shift based on scroll momentum
    const offset = Math.sin(this.scrollY() * 0.005) * 4;
    return `translateY(${offset}px)`;
  });

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const current = window.scrollY || document.documentElement.scrollTop;
    this.scrollY.set(current);

    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? Math.min(100, Math.max(0, Math.round((current / docHeight) * 100))) : 0;
    this.scrollPercentage.set(pct);
  }

  toggleMiniDrawer(): void {
    this.isMiniDrawerOpen.update((v) => !v);
  }

  closeMiniDrawer(): void {
    this.isMiniDrawerOpen.set(false);
  }

  scrollToTop(event: Event): void {
    event.stopPropagation();
    if (!isPlatformBrowser(this.platformId)) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  addCurrentLookToBag(): void {
    const items = this.lookBuilderFacade.equippedItems();
    if (items.length > 0) {
      this.cartFacade.addOutfitBundle(items);
      this.closeMiniDrawer();
    }
  }
}

import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartFacade } from '../../../application/cart.facade';
import { LookBuilderFacade } from '../../../application/look-builder.facade';
import { CatalogFacade } from '../../../application/catalog.facade';
import { AccountFacade } from '../../../application/account.facade';
import { AuthSessionService } from '../../../infrastructure/auth/auth-session.service';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-stone-200/80 transition-all duration-300">
      <!-- Announcement top bar -->
      <div class="bg-stone-900 text-stone-200 text-xs py-1.5 px-4 text-center tracking-wider font-light flex items-center justify-center gap-2">
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
        <span>NUEVA COLECCIÓN CÁPSULA 2026 — <strong>3 CUOTAS SIN INTERÉS</strong> & ENVÍO GRATIS DESDE $150.000</span>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-20">
          <!-- Mobile Menu Button -->
          <div class="flex items-center lg:hidden">
            <button
              id="btn-mobile-menu"
              (click)="toggleMobileMenu()"
              type="button"
              class="p-2 -ml-2 text-stone-700 hover:text-stone-950 focus:outline-none"
              aria-label="Abrir menú"
            >
              <span class="material-symbols-outlined text-2xl">
                {{ isMobileMenuOpen() ? 'close' : 'menu' }}
              </span>
            </button>
          </div>

          <!-- Brand Logo -->
          <div class="flex-1 lg:flex-initial flex justify-center lg:justify-start">
            <a href="#" class="inline-block group focus:outline-none">
              <img
                src="assets/brand/malaika-logo.png"
                alt="Malaika Showroom"
                class="h-9 sm:h-10 w-auto opacity-90 group-hover:opacity-100 transition-opacity"
              />
            </a>
          </div>

          <!-- Desktop Navigation -->
          <nav class="hidden lg:flex items-center space-x-8">
            <a
              href="#catalogo"
              class="text-sm font-medium tracking-wider uppercase text-stone-700 hover:text-amber-800 transition-colors relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1.5px] after:bg-amber-700 hover:after:w-full after:transition-all"
            >
              Catálogo
            </a>
            <a
              href="#maniqui-studio"
              class="text-sm font-medium tracking-wider uppercase text-stone-700 hover:text-amber-800 transition-colors relative py-1 flex items-center gap-1.5 group"
            >
              <span>Maniquí Virtual</span>
              <span class="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-full font-semibold">
                Look Builder
              </span>
            </a>
            <a
              href="#showroom-ar"
              class="text-sm font-medium tracking-wider uppercase text-stone-700 hover:text-amber-800 transition-colors relative py-1 flex items-center gap-1.5"
            >
              <span class="material-symbols-outlined text-base text-amber-700">view_in_ar</span>
              <span>Showroom AR 360°</span>
            </a>
            <a
              href="#nosotros"
              class="text-sm font-medium tracking-wider uppercase text-stone-700 hover:text-amber-800 transition-colors relative py-1"
            >
              Boutique
            </a>
          </nav>

          <!-- Action Icons (Look Builder Counter + Search + Cart) -->
          <div class="flex items-center space-x-3 sm:space-x-5">
            <!-- Jump to Mannequin Look Builder -->
            <a
              id="nav-btn-mannequin"
              href="#maniqui-studio"
              title="Ver maniquí y prendas en prueba"
              class="relative p-2 text-stone-700 hover:text-amber-800 transition-colors rounded-full hover:bg-stone-100"
            >
              <span class="material-symbols-outlined text-2xl">accessibility_new</span>
              @if (lookBuilderFacade.equippedCount() > 0) {
                <span class="absolute -top-0.5 -right-0.5 bg-amber-700 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {{ lookBuilderFacade.equippedCount() }}
                </span>
              }
            </a>

            <!-- Cuenta de la clienta -->
            <button
              id="nav-btn-account"
              (click)="accountFacade.open()"
              type="button"
              class="relative p-2 text-stone-700 hover:text-amber-800 transition-colors rounded-full hover:bg-stone-100 flex items-center gap-1"
              [attr.aria-label]="auth.isLoggedIn() ? 'Mi cuenta' : 'Ingresar'"
              [title]="auth.isLoggedIn() ? 'Mi cuenta' : 'Ingresar o seguir un pedido'"
            >
              <span class="material-symbols-outlined text-2xl">{{ auth.isLoggedIn() ? 'account_circle' : 'person' }}</span>
              @if (auth.user(); as user) {
                <span class="hidden md:inline text-xs font-semibold max-w-[90px] truncate">{{ user.name.split(' ')[0] }}</span>
              }
            </button>

            <!-- Cart Drawer Trigger -->
            <button
              id="nav-btn-cart"
              (click)="cartFacade.openCart()"
              type="button"
              class="relative p-2 text-stone-800 hover:text-amber-800 transition-colors rounded-full hover:bg-stone-100 focus:outline-none flex items-center"
              aria-label="Ver bolsa de compras"
            >
              <span class="material-symbols-outlined text-2xl">shopping_bag</span>
              @if (cartFacade.totalItemsCount() > 0) {
                <span class="absolute -top-0.5 -right-0.5 bg-stone-900 text-amber-300 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-[#FAF8F5]">
                  {{ cartFacade.totalItemsCount() }}
                </span>
              }
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Dropdown Menu -->
      @if (isMobileMenuOpen()) {
        <div class="lg:hidden bg-[#FAF8F5] border-b border-stone-200 px-4 pt-3 pb-6 space-y-3 animate-fadeIn">
          <a
            (click)="closeMobileMenu()"
            href="#catalogo"
            class="block py-2 text-base font-medium text-stone-800 border-b border-stone-200/60"
          >
            Catálogo & Colección
          </a>
          <a
            (click)="closeMobileMenu()"
            href="#maniqui-studio"
            class="block py-2 text-base font-medium text-amber-900 flex items-center justify-between border-b border-stone-200/60"
          >
            <span>Maniquí Virtual (Look Builder)</span>
            <span class="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
              {{ lookBuilderFacade.equippedCount() }} prendas
            </span>
          </a>
          <a
            (click)="closeMobileMenu()"
            href="#showroom-ar"
            class="block py-2 text-base font-medium text-stone-800 flex items-center gap-2 border-b border-stone-200/60"
          >
            <span class="material-symbols-outlined text-amber-700">view_in_ar</span>
            <span>Showroom Realidad Aumentada</span>
          </a>
          <a
            (click)="closeMobileMenu()"
            href="#nosotros"
            class="block py-2 text-base font-medium text-stone-700"
          >
            Boutique & Garantía
          </a>
        </div>
      }
    </header>
  `,
})
export class NavbarComponent {
  readonly cartFacade = inject(CartFacade);
  readonly lookBuilderFacade = inject(LookBuilderFacade);
  readonly catalogFacade = inject(CatalogFacade);
  readonly accountFacade = inject(AccountFacade);
  readonly auth = inject(AuthSessionService);

  readonly isMobileMenuOpen = signal<boolean>(false);

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }
}

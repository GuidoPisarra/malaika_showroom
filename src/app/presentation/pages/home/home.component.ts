import { Component, ChangeDetectionStrategy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { HeroBannerComponent } from '../../components/hero/hero-banner.component';
import { ScrollCompanionComponent } from '../../components/scroll-companion/scroll-companion.component';
import { CatalogSectionComponent } from '../../components/catalog/catalog-section/catalog-section.component';
import { MannequinStudioComponent } from '../../components/mannequin-studio/mannequin-studio.component';
import { ARShowroomComponent } from '../../components/ar-showroom/ar-showroom.component';
import { CartDrawerComponent } from '../../components/cart-drawer/cart-drawer.component';
import { CheckoutModalComponent } from '../../components/checkout-modal/checkout-modal.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { AccountModalComponent } from '../../components/account-modal/account-modal.component';
import { CheckoutFacade } from '../../../application/checkout.facade';
import { AccountFacade } from '../../../application/account.facade';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    NavbarComponent,
    HeroBannerComponent,
    ScrollCompanionComponent,
    CatalogSectionComponent,
    MannequinStudioComponent,
    ARShowroomComponent,
    CartDrawerComponent,
    CheckoutModalComponent,
    FooterComponent,
    AccountModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-800 selection:bg-amber-800 selection:text-white">
      <!-- Top Navigation Bar -->
      <app-navbar />

      <!-- Main Content -->
      <main class="flex-1">
        <!-- Hero Luxury Banner -->
        <app-hero-banner />

        <!-- Mannequin Studio (Virtual Fitting Room) -->
        <app-mannequin-studio />

        <!-- Interactive Catalog with Advanced Filters & Quick View -->
        <app-catalog-section />

        <!-- Augmented Reality & 360° Virtual Showroom Experience -->
        <app-ar-showroom />
      </main>

      <!-- Boutique Footer -->
      <app-footer />

      <!-- Scroll-Reactive Dynamic Element (Scroll Companion) -->
      <app-scroll-companion />

      <!-- Slide-in Shopping Bag Drawer -->
      <app-cart-drawer />

      <!-- Secure Payment Gateway & Checkout Flow -->
      <app-checkout-modal />

      <!-- Cuenta: ingreso, registro, mis pedidos -->
      <app-account-modal />
    </div>
  `,
})
export class HomeComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private checkout = inject(CheckoutFacade);
  private account = inject(AccountFacade);

  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  ngOnInit(): void {
    if (!this.isBrowser) return;
    // Vuelta desde Mercado Pago: /?order=MLK-123456&payment=success|pending|failure
    const params = this.route.snapshot.queryParamMap;
    const orderNumber = params.get('order');
    // Link de los emails de pedido: /?pedido=MLK-123456&email=...
    const trackNumber = params.get('pedido');
    const trackEmail = params.get('email');
    if (orderNumber) {
      this.checkout.handlePaymentReturn(orderNumber, params.get('payment'));
    } else if (trackNumber && trackEmail) {
      this.account.openTracking(trackNumber, trackEmail);
    } else {
      return;
    }
    void this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }
}

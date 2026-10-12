import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CheckoutFacade } from '../../../application/checkout.facade';
import { CartFacade } from '../../../application/cart.facade';
import { ShippingFacade } from '../../../application/shipping.facade';
import { StoreFacade } from '../../../application/store.facade';
import { AR_PROVINCES } from '../../../domain/store/provinces';
import { ORDER_STATUS_LABELS, OrderStatus } from '../../../domain/checkout/models/order.model';
import { ArsCurrencyPipe } from '../../shared/pipes/ars-currency.pipe';

@Component({
  selector: 'app-checkout-modal',
  imports: [CommonModule, FormsModule, ArsCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (checkoutFacade.isCheckoutOpen()) {
      <div
        id="checkout-modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Finalizar compra"
        class="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
      >
        <!-- Backdrop close button -->
        <button
          type="button"
          class="fixed inset-0 bg-transparent w-full h-full cursor-default"
          (click)="checkoutFacade.closeCheckout()"
          aria-label="Cerrar modal de pago"
        ></button>

        <div
          id="checkout-modal-container"
          class="bg-[#FAF8F5] rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-stone-200/90 relative my-auto flex flex-col max-h-[92vh] z-10"
        >
          <!-- Top Header & Security Badge -->
          <div class="p-5 sm:p-6 bg-white border-b border-stone-200 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <span class="material-symbols-outlined text-xl">verified_user</span>
              </div>
              <div>
                <h3 class="font-display text-xl text-stone-900 font-medium">
                  Finalizar compra
                </h3>
                <p class="text-[11px] text-stone-500 flex items-center gap-1 font-mono">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Pago protegido por Mercado Pago</span>
                </p>
              </div>
            </div>

            <button
              (click)="checkoutFacade.closeCheckout()"
              [disabled]="checkoutFacade.isProcessing()"
              class="text-stone-400 hover:text-stone-800 p-1.5 rounded-full hover:bg-stone-100 disabled:opacity-30"
              aria-label="Cerrar pasarela de pago"
            >
              <span class="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>

          <!-- Progress Step Breadcrumb -->
          <div class="bg-stone-50 px-6 py-2.5 border-b border-stone-200/60 flex items-center justify-center gap-3 sm:gap-6 text-xs">
            <div
              class="flex items-center gap-1.5 font-medium"
              [ngClass]="{
                'text-amber-900 font-bold': checkoutFacade.currentStep() === 'shipping',
                'text-stone-400': checkoutFacade.currentStep() !== 'shipping'
              }"
            >
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" [ngClass]="checkoutFacade.currentStep() === 'shipping' ? 'bg-amber-800 text-white' : 'bg-stone-200 text-stone-600'">1</span>
              <span>Envío</span>
            </div>
            <span class="material-symbols-outlined text-xs text-stone-300">chevron_right</span>

            <div
              class="flex items-center gap-1.5 font-medium"
              [ngClass]="{
                'text-amber-900 font-bold': checkoutFacade.currentStep() === 'payment',
                'text-stone-400': checkoutFacade.currentStep() !== 'payment'
              }"
            >
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" [ngClass]="checkoutFacade.currentStep() === 'payment' ? 'bg-amber-800 text-white' : 'bg-stone-200 text-stone-600'">2</span>
              <span>Pago Seguro</span>
            </div>
            <span class="material-symbols-outlined text-xs text-stone-300">chevron_right</span>

            <div
              class="flex items-center gap-1.5 font-medium"
              [ngClass]="{
                'text-emerald-700 font-bold': checkoutFacade.currentStep() === 'confirmation',
                'text-stone-400': checkoutFacade.currentStep() !== 'confirmation'
              }"
            >
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" [ngClass]="checkoutFacade.currentStep() === 'confirmation' ? 'bg-emerald-700 text-white' : 'bg-stone-200 text-stone-600'">3</span>
              <span>Comprobante</span>
            </div>
          </div>

          <!-- Body Content Area (Scrollable) -->
          <div class="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
            
            <!-- Error Banner if any -->
            @if (checkoutFacade.errorMessage(); as err) {
              <div class="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 animate-fadeIn">
                <span class="material-symbols-outlined text-base text-rose-600">error</span>
                <span>{{ err }}</span>
              </div>
            }

            <!-- STEP 1: DATOS DE ENVÍO -->
            @if (checkoutFacade.currentStep() === 'shipping') {
              <div class="space-y-4">
                <div class="flex items-center justify-between pb-2 border-b border-stone-200">
                  <h4 class="font-serif text-lg font-medium text-stone-900">
                    Datos de Entrega y Facturación
                  </h4>
                  <span class="text-xs text-stone-500">Envío asegurado express</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div class="sm:col-span-2">
                    <label for="ship-fullname" class="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                      Nombre y Apellido Completo *
                    </label>
                    <input
                      id="ship-fullname"
                      type="text"
                      [ngModel]="checkoutFacade.shipping().fullName"
                      (ngModelChange)="checkoutFacade.updateShipping({ fullName: $event })"
                      placeholder="Ej. Sofía Rossi"
                      class="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-700 shadow-xs"
                    />
                  </div>

                  <div>
                    <label for="ship-email" class="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                      Email de Notificación *
                    </label>
                    <input
                      id="ship-email"
                      type="email"
                      [ngModel]="checkoutFacade.shipping().email"
                      (ngModelChange)="checkoutFacade.updateShipping({ email: $event })"
                      placeholder="sofia@ejemplo.com"
                      class="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-700 shadow-xs"
                    />
                  </div>

                  <div>
                    <label for="ship-phone" class="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                      Teléfono de Contacto *
                    </label>
                    <input
                      id="ship-phone"
                      type="tel"
                      [ngModel]="checkoutFacade.shipping().phone"
                      (ngModelChange)="checkoutFacade.updateShipping({ phone: $event })"
                      placeholder="+54 9 11 4567-8901"
                      class="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-700 shadow-xs"
                    />
                  </div>

                  <div class="sm:col-span-2">
                    <label for="ship-address" class="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                      Dirección y Número *
                    </label>
                    <input
                      id="ship-address"
                      type="text"
                      [ngModel]="checkoutFacade.shipping().address"
                      (ngModelChange)="checkoutFacade.updateShipping({ address: $event })"
                      placeholder="Av. Alvear 1850"
                      class="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-700 shadow-xs"
                    />
                  </div>

                  <div>
                    <label for="ship-apartment" class="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                      Piso / Depto (Opcional)
                    </label>
                    <input
                      id="ship-apartment"
                      type="text"
                      [ngModel]="checkoutFacade.shipping().apartment"
                      (ngModelChange)="checkoutFacade.updateShipping({ apartment: $event })"
                      placeholder="Piso 4 - Depto B"
                      class="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-700 shadow-xs"
                    />
                  </div>

                  <div>
                    <label for="ship-province" class="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                      Provincia *
                    </label>
                    <select
                      id="ship-province"
                      [ngModel]="checkoutFacade.shipping().provinceState"
                      (ngModelChange)="checkoutFacade.updateShipping({ provinceState: $event })"
                      class="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-700 shadow-xs"
                    >
                      @for (p of provinces; track p) {
                        <option [value]="p">{{ p }}</option>
                      }
                    </select>
                  </div>

                  <div class="sm:col-span-2">
                    <span class="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                      Ciudad y Código Postal *
                    </span>
                    <div class="grid grid-cols-2 gap-2">
                      <input
                        id="ship-city"
                        type="text"
                        aria-label="Ciudad"
                        [ngModel]="checkoutFacade.shipping().city"
                        (ngModelChange)="checkoutFacade.updateShipping({ city: $event })"
                        placeholder="Ciudad"
                        class="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-700 shadow-xs"
                      />
                      <input
                        id="ship-postal"
                        type="text"
                        aria-label="Código Postal"
                        [ngModel]="checkoutFacade.shipping().postalCode"
                        (ngModelChange)="checkoutFacade.updateShipping({ postalCode: $event })"
                        placeholder="C1014"
                        class="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-700 shadow-xs"
                      />
                    </div>
                  </div>

                  <!-- Costo de envío según la zona -->
                  <div class="sm:col-span-2 text-xs" aria-live="polite">
                    @if (shippingFacade.isQuoting()) {
                      <p class="text-stone-500 flex items-center gap-1.5">
                        <span class="w-3 h-3 border-2 border-stone-400 border-t-transparent rounded-full animate-spin"></span>
                        Calculando el envío...
                      </p>
                    } @else if (shippingFacade.quote(); as quote) {
                      @if (quote.available) {
                        <p class="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center gap-2">
                          <span class="material-symbols-outlined text-base text-emerald-700">local_shipping</span>
                          <span>
                            Envío{{ quote.zoneName ? ' a ' + quote.zoneName : '' }}:
                            <strong>{{ cartFacade.summary().shipping === 0 ? 'gratis' : (cartFacade.summary().shipping | arsCurrency) }}</strong>
                            @if (quote.eta) {
                              <span class="text-emerald-700"> · llega en {{ quote.eta }}</span>
                            }
                          </span>
                        </p>
                      } @else {
                        <p class="px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-center gap-2">
                          <span class="material-symbols-outlined text-base text-rose-600">block</span>
                          <span>Por ahora no hacemos envíos a ese código postal.</span>
                        </p>
                      }
                    } @else if (shippingFacade.hasZones()) {
                      <p class="text-stone-500">Ingresá tu código postal para ver el costo de envío.</p>
                    }
                  </div>
                </div>

                <!-- Order summary thumbnail preview -->
                <div class="p-3.5 bg-stone-100/80 rounded-xl flex items-center justify-between text-xs text-stone-700">
                  <span>Total de compra a pagar:</span>
                  <span class="font-bold text-base font-mono text-stone-950">
                    {{ checkoutFacade.finalCheckoutAmount() | arsCurrency }}
                  </span>
                </div>
              </div>
            }

            <!-- STEP 2: MEDIO DE PAGO -->
            @if (checkoutFacade.currentStep() === 'payment') {
              <div class="space-y-6">
                <!-- Payment Method Selector -->
                <div class="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    (click)="checkoutFacade.setPaymentMethod('mercado-pago')"
                    class="p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5"
                    [ngClass]="{
                      'bg-sky-900 text-sky-100 border-sky-900 shadow-md': checkoutFacade.selectedPaymentMethod() === 'mercado-pago',
                      'bg-white text-stone-700 border-stone-200 hover:border-stone-400': checkoutFacade.selectedPaymentMethod() !== 'mercado-pago'
                    }"
                  >
                    <span class="material-symbols-outlined text-2xl">account_balance_wallet</span>
                    <span class="text-xs font-semibold leading-tight">Mercado Pago</span>
                    <span class="text-[10px] opacity-80 leading-tight">Tarjetas de crédito, débito y dinero en cuenta</span>
                  </button>

                  <button
                    type="button"
                    (click)="checkoutFacade.setPaymentMethod('bank-transfer')"
                    class="p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5"
                    [ngClass]="{
                      'bg-emerald-900 text-emerald-100 border-emerald-900 shadow-md': checkoutFacade.selectedPaymentMethod() === 'bank-transfer',
                      'bg-white text-stone-700 border-stone-200 hover:border-stone-400': checkoutFacade.selectedPaymentMethod() !== 'bank-transfer'
                    }"
                  >
                    <span class="material-symbols-outlined text-2xl">payments</span>
                    <span class="text-xs font-semibold leading-tight">Transferencia bancaria</span>
                    @if (checkoutFacade.bankTransferPercent() > 0) {
                      <span class="text-[10px] opacity-80 leading-tight">{{ checkoutFacade.bankTransferPercent() }}% de descuento extra</span>
                    }
                  </button>
                </div>

                <!-- SUB-VIEW: Mercado Pago -->
                @if (checkoutFacade.selectedPaymentMethod() === 'mercado-pago') {
                  <div class="p-5 bg-sky-50 border border-sky-200 rounded-2xl space-y-3 text-xs text-sky-900 animate-fadeIn">
                    <div class="flex items-center gap-2">
                      <span class="material-symbols-outlined text-sky-700 text-xl">lock</span>
                      <strong class="text-sm">Pagás en Mercado Pago</strong>
                    </div>
                    <p>
                      Al confirmar te llevamos al sitio seguro de Mercado Pago, donde elegís tarjeta, cuotas o dinero en cuenta.
                      Nosotros nunca vemos los datos de tu tarjeta. Cuando termines, volvés a la tienda con tu comprobante.
                    </p>
                  </div>
                }

                <!-- SUB-VIEW: Bank Transfer -->
                @if (checkoutFacade.selectedPaymentMethod() === 'bank-transfer') {
                  <div class="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 text-xs text-emerald-900 animate-fadeIn">
                    <div class="flex items-center justify-between">
                      <strong class="text-sm flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-emerald-700">savings</span>
                        <span>Transferencia bancaria</span>
                      </strong>
                      @if (checkoutFacade.bankTransferPercent() > 0) {
                        <span class="px-2 py-0.5 bg-emerald-700 text-white rounded font-bold">{{ checkoutFacade.bankTransferPercent() }}% OFF EXTRA</span>
                      }
                    </div>
                    <p>
                      Reservamos tus prendas y te mostramos los datos para transferir. Cuando recibamos la transferencia confirmamos tu pedido.
                    </p>
                  </div>
                }
              </div>
            }

            <!-- STEP 3: CONFIRMACIÓN DEL PEDIDO -->
            @if (checkoutFacade.currentStep() === 'confirmation' && checkoutFacade.lastCompletedOrder(); as order) {
              <div class="text-center space-y-5 animate-fadeIn">
                @if (order.status === 'PENDING_PAYMENT' && order.paymentMethod === 'BANK_TRANSFER') {
                  <div class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                    <span class="material-symbols-outlined text-4xl">inventory_2</span>
                  </div>
                  <div>
                    <span class="text-xs uppercase tracking-widest text-emerald-800 font-bold">¡Pedido reservado!</span>
                    <h4 class="font-display text-2xl sm:text-3xl text-stone-900 font-semibold mt-1">
                      Gracias, {{ order.customer.fullName }}
                    </h4>
                    <p class="text-xs text-stone-500 font-light mt-1">
                      Transferí <strong>{{ order.totals.total | arsCurrency }}</strong> indicando el número de pedido. Te guardamos las prendas hasta
                      <strong>{{ order.expiresAt | date: 'd/M HH:mm' }}</strong>.
                    </p>
                  </div>
                  @if (checkoutFacade.bankTransferInfo() ?? storeFacade.settings().bankTransfer; as bank) {
                    <div class="bg-white/80 p-4 rounded-xl space-y-1 font-mono text-[11px] border border-emerald-200 text-left text-emerald-950">
                      <p><strong>CBU / CVU:</strong> {{ bank.cbu }}</p>
                      <p><strong>Alias:</strong> {{ bank.alias }}</p>
                      <p><strong>Titular:</strong> {{ bank.holder }}</p>
                      <p><strong>Banco:</strong> {{ bank.bank }}</p>
                      @if (bank.cuit) {
                        <p><strong>CUIT:</strong> {{ bank.cuit }}</p>
                      }
                    </div>
                  } @else {
                    <p class="text-xs text-stone-600">Te enviamos los datos para transferir a <strong>{{ order.customer.email }}</strong>.</p>
                  }
                } @else if (order.status === 'PENDING_PAYMENT') {
                  <div class="w-16 h-16 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center mx-auto shadow-inner">
                    @if (checkoutFacade.isAwaitingPaymentConfirmation()) {
                      <span class="w-7 h-7 border-2 border-sky-700 border-t-transparent rounded-full animate-spin"></span>
                    } @else {
                      <span class="material-symbols-outlined text-4xl">hourglass_top</span>
                    }
                  </div>
                  <div>
                    <span class="text-xs uppercase tracking-widest text-sky-800 font-bold">Estamos confirmando tu pago</span>
                    <h4 class="font-display text-2xl sm:text-3xl text-stone-900 font-semibold mt-1">
                      Gracias, {{ order.customer.fullName }}
                    </h4>
                    <p class="text-xs text-stone-500 font-light mt-1">
                      Mercado Pago nos avisa en unos instantes. Si pagaste en efectivo puede demorar más; te escribimos a
                      <strong>{{ order.customer.email }}</strong> cuando se acredite.
                    </p>
                  </div>
                } @else {
                  <div class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                    <span class="material-symbols-outlined text-4xl">check_circle</span>
                  </div>
                  <div>
                    <span class="text-xs uppercase tracking-widest text-emerald-800 font-bold">¡Pago aprobado!</span>
                    <h4 class="font-display text-2xl sm:text-3xl text-stone-900 font-semibold mt-1">
                      Gracias por tu compra, {{ order.customer.fullName }}
                    </h4>
                    <p class="text-xs text-stone-500 font-light mt-1">
                      Te vamos a escribir a <strong>{{ order.customer.email }}</strong> con el seguimiento del envío.
                    </p>
                  </div>
                }

                <!-- Comprobante -->
                <div class="bg-white p-5 rounded-2xl border border-stone-200 text-left space-y-4 shadow-sm">
                  <div class="flex items-center justify-between pb-3 border-b border-stone-100">
                    <div>
                      <span class="text-[10px] text-stone-400 uppercase tracking-wider block">Número de pedido</span>
                      <span class="font-mono text-sm font-bold text-stone-900">{{ order.orderNumber }}</span>
                    </div>
                    <div class="text-right">
                      <span class="text-[10px] text-stone-400 uppercase tracking-wider block">Estado</span>
                      <span class="text-xs font-semibold text-amber-800">{{ statusLabel(order.status) }}</span>
                    </div>
                  </div>

                  <div class="space-y-2 text-xs">
                    <p><strong>Dirección de entrega:</strong> {{ order.customer.address }}, {{ order.customer.city }}</p>
                    <p><strong>Medio de pago:</strong> {{ order.paymentMethod === 'BANK_TRANSFER' ? 'Transferencia bancaria' : 'Mercado Pago' }}</p>
                  </div>

                  <div class="pt-2 border-t border-stone-100">
                    <span class="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-2">
                      Prendas:
                    </span>
                    <div class="space-y-2">
                      @for (it of order.items; track it.productId + it.size + it.color.name) {
                        <div class="flex items-center justify-between text-xs">
                          <span class="truncate max-w-[220px]">{{ it.quantity }}x {{ it.name }} ({{ it.size }}, {{ it.color.name }})</span>
                          <span class="font-mono font-semibold">{{ it.unitPrice * it.quantity | arsCurrency }}</span>
                        </div>
                      }
                    </div>
                  </div>

                  <div class="pt-3 border-t border-stone-100 space-y-1 text-xs text-stone-600">
                    @if (order.totals.bundleDiscount) {
                      <div class="flex justify-between"><span>Descuento por look</span><span class="font-mono">-{{ order.totals.bundleDiscount | arsCurrency }}</span></div>
                    }
                    @if (order.totals.couponDiscount) {
                      <div class="flex justify-between"><span>Cupón {{ order.totals.couponCode }}</span><span class="font-mono">-{{ order.totals.couponDiscount | arsCurrency }}</span></div>
                    }
                    @if (order.totals.paymentDiscount) {
                      <div class="flex justify-between"><span>Descuento por transferencia</span><span class="font-mono">-{{ order.totals.paymentDiscount | arsCurrency }}</span></div>
                    }
                    <div class="flex justify-between"><span>Envío{{ order.customer.zone ? ' (' + order.customer.zone + ')' : '' }}</span><span class="font-mono">{{ order.totals.shipping ? (order.totals.shipping | arsCurrency) : 'Gratis' }}</span></div>
                    @if (order.customer.eta) {
                      <p class="text-[11px] text-stone-500 text-right">Llega en {{ order.customer.eta }}</p>
                    }
                  </div>

                  <div class="pt-3 border-t border-stone-100 flex items-center justify-between text-sm font-bold text-stone-900">
                    <span>Total</span>
                    <span class="font-mono text-amber-900 text-base">{{ order.totals.total | arsCurrency }}</span>
                  </div>
                </div>

                <div class="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <button
                    type="button"
                    (click)="printReceipt()"
                    class="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span class="material-symbols-outlined text-base">print</span>
                    <span>Imprimir comprobante</span>
                  </button>

                  <button
                    type="button"
                    (click)="checkoutFacade.resetCheckout()"
                    class="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors"
                  >
                    Seguir en la tienda
                  </button>
                </div>
              </div>
            }

          </div>

          <!-- Bottom Actions Bar (Steps 1 and 2) -->
          @if (checkoutFacade.currentStep() !== 'confirmation') {
            <div class="p-5 sm:p-6 bg-white border-t border-stone-200 flex items-center justify-between">
              @if (checkoutFacade.currentStep() === 'payment') {
                <button
                  type="button"
                  (click)="checkoutFacade.backToShipping()"
                  [disabled]="checkoutFacade.isProcessing()"
                  class="text-xs text-stone-600 hover:text-stone-900 font-semibold flex items-center gap-1"
                >
                  <span class="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Volver a Envío</span>
                </button>
              } @else {
                <div class="text-xs text-stone-500">
                  Total: <strong class="text-stone-900 font-mono">{{ checkoutFacade.finalCheckoutAmount() | arsCurrency }}</strong>
                </div>
              }

              <!-- Forward / Submit Button -->
              @if (checkoutFacade.currentStep() === 'shipping') {
                <button
                  type="button"
                  (click)="checkoutFacade.proceedToPayment()"
                  class="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-amber-200 text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg flex items-center gap-1.5 transition-all"
                >
                  <span>Continuar al Pago</span>
                  <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              }

              @if (checkoutFacade.currentStep() === 'payment') {
                <button
                  id="btn-confirm-payment"
                  type="button"
                  (click)="checkoutFacade.submitOrder()"
                  [disabled]="checkoutFacade.isProcessing()"
                  class="px-7 py-3 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xl flex items-center gap-2 transition-all"
                >
                  @if (checkoutFacade.isProcessing()) {
                    <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>{{ checkoutFacade.processingMessage() }}</span>
                  } @else {
                    <span class="material-symbols-outlined text-base">lock</span>
                    <span>
                      {{ checkoutFacade.selectedPaymentMethod() === 'bank-transfer' ? 'Reservar' : 'Pagar' }}
                      {{ checkoutFacade.finalCheckoutAmount() | arsCurrency }}
                    </span>
                  }
                </button>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class CheckoutModalComponent {
  readonly checkoutFacade = inject(CheckoutFacade);
  readonly cartFacade = inject(CartFacade);
  readonly storeFacade = inject(StoreFacade);
  readonly shippingFacade = inject(ShippingFacade);
  readonly provinces = AR_PROVINCES;

  statusLabel(status: OrderStatus): string {
    return ORDER_STATUS_LABELS[status];
  }

  printReceipt(): void {
    window.print();
  }
}

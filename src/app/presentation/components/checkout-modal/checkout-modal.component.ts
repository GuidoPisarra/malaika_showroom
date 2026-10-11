import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CheckoutFacade } from '../../../application/checkout.facade';
import { CartFacade } from '../../../application/cart.facade';
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
        aria-label="Pasarela de Pago Segura"
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
                  Pasarela de Pago Segura Malaika
                </h3>
                <p class="text-[11px] text-stone-500 flex items-center gap-1 font-mono">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>ENCRIPTACIÓN SSL 256-BIT • PCI-DSS CERTIFICADO</span>
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

            <!-- STEP 2: PASARELA DE PAGO & TARJETA INTERACTIVA -->
            @if (checkoutFacade.currentStep() === 'payment') {
              <div class="space-y-6">
                <!-- Payment Method Selector Tabs -->
                <div class="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    (click)="checkoutFacade.setPaymentMethod('credit-card')"
                    class="p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5"
                    [ngClass]="{
                      'bg-stone-900 text-amber-200 border-stone-900 shadow-md': checkoutFacade.selectedPaymentMethod() === 'credit-card',
                      'bg-white text-stone-700 border-stone-200 hover:border-stone-400': checkoutFacade.selectedPaymentMethod() !== 'credit-card'
                    }"
                  >
                    <span class="material-symbols-outlined text-2xl">credit_card</span>
                    <span class="text-xs font-semibold leading-tight">Tarjeta Crédito / Débito</span>
                  </button>

                  <button
                    type="button"
                    (click)="checkoutFacade.setPaymentMethod('mercado-pago')"
                    class="p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5"
                    [ngClass]="{
                      'bg-sky-900 text-sky-100 border-sky-900 shadow-md': checkoutFacade.selectedPaymentMethod() === 'mercado-pago',
                      'bg-white text-stone-700 border-stone-200 hover:border-stone-400': checkoutFacade.selectedPaymentMethod() !== 'mercado-pago'
                    }"
                  >
                    <span class="material-symbols-outlined text-2xl">account_balance_wallet</span>
                    <span class="text-xs font-semibold leading-tight">Mercado Pago</span>
                  </button>

                  <button
                    type="button"
                    (click)="checkoutFacade.setPaymentMethod('bank-transfer')"
                    class="p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5"
                    [ngClass]="{
                      'bg-emerald-900 text-emerald-100 border-emerald-900 shadow-md': checkoutFacade.selectedPaymentMethod() === 'bank-transfer',
                      'bg-white text-stone-700 border-stone-200 hover:border-stone-400': checkoutFacade.selectedPaymentMethod() !== 'bank-transfer'
                    }"
                  >
                    <span class="material-symbols-outlined text-2xl">payments</span>
                    <span class="text-xs font-semibold leading-tight">Transferencia (-5% EXTRA)</span>
                  </button>
                </div>

                <!-- SUB-VIEW: Credit Card Details with 3D Flip Card Widget -->
                @if (checkoutFacade.selectedPaymentMethod() === 'credit-card') {
                  <div class="space-y-4">
                    <!-- Interactive Visual Luxury Credit Card (Flips on CVV focus) -->
                    <div class="relative w-full max-w-sm mx-auto aspect-[1.586] perspective-1000 select-none">
                      <div
                        class="w-full h-full rounded-2xl p-6 text-stone-100 shadow-2xl transition-transform duration-500 transform-style-3d relative overflow-hidden"
                        [ngClass]="{
                          'rotate-y-180': checkoutFacade.isCardFlipped(),
                          'bg-gradient-to-tr from-stone-900 via-stone-800 to-amber-950 border border-amber-500/40': true
                        }"
                      >
                        <!-- FRONT SIDE -->
                        @if (!checkoutFacade.isCardFlipped()) {
                          <div class="h-full flex flex-col justify-between relative z-10">
                            <div class="flex items-center justify-between">
                              <span class="font-serif italic tracking-widest text-amber-300 text-sm font-semibold">
                                MALAIKA CARD
                              </span>
                              <!-- Brand Logo (Visa, Mastercard, Amex) -->
                              <span class="text-xs font-bold uppercase tracking-wider font-mono bg-stone-950/60 px-2 py-0.5 rounded text-amber-200">
                                {{ checkoutFacade.card().cardBrand.toUpperCase() }}
                              </span>
                            </div>

                            <!-- Metallic Chip -->
                            <div class="w-11 h-8 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-inner flex items-center justify-center">
                              <span class="material-symbols-outlined text-stone-900 text-sm opacity-60">memory</span>
                            </div>

                            <!-- Formatted Card Number -->
                            <div>
                              <p class="font-mono text-base sm:text-lg tracking-widest text-amber-100 font-semibold drop-shadow-sm">
                                {{ formattedCardNumber() }}
                              </p>
                            </div>

                            <!-- Holder & Expiry -->
                            <div class="flex justify-between items-end text-xs">
                              <div>
                                <span class="text-[9px] uppercase tracking-wider text-stone-400 block">Titular</span>
                                <span class="font-medium tracking-wide text-stone-100 uppercase truncate max-w-[170px] block">
                                  {{ checkoutFacade.card().cardHolder || 'NOMBRE Y APELLIDO' }}
                                </span>
                              </div>
                              <div class="text-right">
                                <span class="text-[9px] uppercase tracking-wider text-stone-400 block">Vence</span>
                                <span class="font-mono font-medium text-stone-100">
                                  {{ checkoutFacade.card().expiryMonth }}/{{ checkoutFacade.card().expiryYear }}
                                </span>
                              </div>
                            </div>
                          </div>
                        }

                        <!-- BACK SIDE (When CVV is focused) -->
                        @if (checkoutFacade.isCardFlipped()) {
                          <div class="h-full flex flex-col justify-between py-2 -mx-6 text-stone-100 rotate-y-180">
                            <!-- Black Magnetic Stripe -->
                            <div class="w-full h-10 bg-stone-950"></div>
                            
                            <!-- White Signature Strip & CVV Box -->
                            <div class="px-6 flex items-center justify-end">
                              <div class="bg-stone-200 text-stone-900 font-mono text-xs px-3 py-1.5 rounded font-bold tracking-widest">
                                CVV: {{ checkoutFacade.card().cvv || '•••' }}
                              </div>
                            </div>

                            <p class="px-6 text-[9px] text-stone-400 text-center font-mono">
                              Firma autorizada • Seguridad 3D Secure activa
                            </p>
                          </div>
                        }
                      </div>
                    </div>

                    <!-- Card Input Fields -->
                    <div class="space-y-3 pt-2">
                      <div>
                        <label for="input-card-number" class="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                          Número de Tarjeta *
                        </label>
                        <div class="relative">
                          <input
                            id="input-card-number"
                            type="text"
                            maxlength="19"
                            [ngModel]="checkoutFacade.card().cardNumber"
                            (ngModelChange)="onCardNumberChange($event)"
                            placeholder="4500 0000 0000 0000"
                            class="w-full pl-3.5 pr-12 py-2.5 bg-white border border-stone-200 rounded-xl font-mono text-sm focus:outline-none focus:border-amber-700 shadow-xs"
                          />
                          <span class="material-symbols-outlined text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2">
                            credit_card
                          </span>
                        </div>
                      </div>

                      <div>
                        <label for="input-card-holder" class="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                          Nombre del Titular (como figura en la tarjeta) *
                        </label>
                        <input
                          id="input-card-holder"
                          type="text"
                          [ngModel]="checkoutFacade.card().cardHolder"
                          (ngModelChange)="checkoutFacade.updateCard({ cardHolder: $event.toUpperCase() })"
                          placeholder="SOFIA ROSSI"
                          class="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl uppercase text-sm focus:outline-none focus:border-amber-700 shadow-xs"
                        />
                      </div>

                      <div class="grid grid-cols-3 gap-3">
                        <div>
                          <label for="select-card-month" class="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                            Mes
                          </label>
                          <select
                            id="select-card-month"
                            [ngModel]="checkoutFacade.card().expiryMonth"
                            (ngModelChange)="checkoutFacade.updateCard({ expiryMonth: $event })"
                            class="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-700"
                          >
                            @for (m of months; track m) {
                              <option [value]="m">{{ m }}</option>
                            }
                          </select>
                        </div>

                        <div>
                          <label for="select-card-year" class="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                            Año
                          </label>
                          <select
                            id="select-card-year"
                            [ngModel]="checkoutFacade.card().expiryYear"
                            (ngModelChange)="checkoutFacade.updateCard({ expiryYear: $event })"
                            class="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-700"
                          >
                            @for (y of years; track y) {
                              <option [value]="y">{{ y }}</option>
                            }
                          </select>
                        </div>

                        <div>
                          <label for="input-card-cvv" class="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                            CVV *
                          </label>
                          <input
                            id="input-card-cvv"
                            type="password"
                            maxlength="4"
                            [ngModel]="checkoutFacade.card().cvv"
                            (ngModelChange)="checkoutFacade.updateCard({ cvv: $event })"
                            (focus)="checkoutFacade.setCardFlipped(true)"
                            (blur)="checkoutFacade.setCardFlipped(false)"
                            placeholder="123"
                            class="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl font-mono text-sm focus:outline-none focus:border-amber-700 text-center shadow-xs"
                          />
                        </div>
                      </div>

                      <!-- Installments Selector -->
                      <div>
                        <label for="select-card-installments" class="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1">
                          Planes de Pago & Cuotas
                        </label>
                        <select
                          id="select-card-installments"
                          [ngModel]="checkoutFacade.card().installments"
                          (ngModelChange)="checkoutFacade.updateCard({ installments: $event })"
                          class="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:border-amber-700"
                        >
                          <option [value]="1">1 cuota de {{ checkoutFacade.finalCheckoutAmount() | arsCurrency }} (Sin interés)</option>
                          <option [value]="3">3 cuotas de {{ (checkoutFacade.finalCheckoutAmount() / 3) | arsCurrency }} (Sin interés)</option>
                          <option [value]="6">6 cuotas fijas de {{ ((checkoutFacade.finalCheckoutAmount() * 1.08) / 6) | arsCurrency }}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                }

                <!-- SUB-VIEW: Mercado Pago -->
                @if (checkoutFacade.selectedPaymentMethod() === 'mercado-pago') {
                  <div class="p-5 bg-sky-50 border border-sky-200 rounded-2xl space-y-3 text-xs text-sky-900 animate-fadeIn">
                    <div class="flex items-center gap-2">
                      <span class="material-symbols-outlined text-sky-700 text-xl">account_balance_wallet</span>
                      <strong class="text-sm">Mercado Pago Checkout Pro</strong>
                    </div>
                    <p>
                      Al presionar <strong>"Finalizar Compra Segura"</strong>, procesaremos tu pago mediante la plataforma de Mercado Pago con dinero en cuenta, débito o tarjetas asociadas.
                    </p>
                    <p class="text-[11px] text-sky-700">
                      Protección al Comprador 100% garantizada.
                    </p>
                  </div>
                }

                <!-- SUB-VIEW: Bank Transfer -->
                @if (checkoutFacade.selectedPaymentMethod() === 'bank-transfer') {
                  <div class="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 text-xs text-emerald-900 animate-fadeIn">
                    <div class="flex items-center justify-between">
                      <strong class="text-sm flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-emerald-700">savings</span>
                        <span>Transferencia Bancaria Inmediata</span>
                      </strong>
                      <span class="px-2 py-0.5 bg-emerald-700 text-white rounded font-bold">5% OFF EXTRA</span>
                    </div>
                    <div class="bg-white/80 p-3 rounded-xl space-y-1 font-mono text-[11px] border border-emerald-200">
                      <p><strong>CBU / CVU:</strong> 0000003100045892147852</p>
                      <p><strong>Alias:</strong> MALAIKA.SHOWROOM</p>
                      <p><strong>Titular:</strong> MALAIKA ATELIER S.A.</p>
                      <p><strong>CUIT:</strong> 30-71654892-4</p>
                    </div>
                    <p class="text-[11px] text-emerald-800">
                      El comprobante se validará de manera automática con tu número de orden.
                    </p>
                  </div>
                }
              </div>
            }

            <!-- STEP 3: CONFIRMACIÓN Y COMPROBANTE DE ORDEN -->
            @if (checkoutFacade.currentStep() === 'confirmation' && checkoutFacade.lastCompletedOrder(); as order) {
              <div class="text-center space-y-5 animate-fadeIn">
                <!-- Success icon -->
                <div class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                  <span class="material-symbols-outlined text-4xl">check_circle</span>
                </div>

                <div>
                  <span class="text-xs uppercase tracking-widest text-emerald-800 font-bold">¡Pago Aprobado con Éxito!</span>
                  <h4 class="font-display text-2xl sm:text-3xl text-stone-900 font-semibold mt-1">
                    Gracias por tu compra, {{ order.customer.fullName }}
                  </h4>
                  <p class="text-xs text-stone-500 font-light mt-1">
                    Hemos enviado el comprobante oficial y el seguimiento de envío a <strong>{{ order.customer.email }}</strong>.
                  </p>
                </div>

                <!-- Receipt Voucher Card -->
                <div class="bg-white p-5 rounded-2xl border border-stone-200 text-left space-y-4 shadow-sm">
                  <div class="flex items-center justify-between pb-3 border-b border-stone-100">
                    <div>
                      <span class="text-[10px] text-stone-400 uppercase tracking-wider block">Número de Orden</span>
                      <span class="font-mono text-sm font-bold text-stone-900">{{ order.orderNumber }}</span>
                    </div>
                    <div class="text-right">
                      <span class="text-[10px] text-stone-400 uppercase tracking-wider block">Código de Seguimiento</span>
                      <span class="font-mono text-xs font-semibold text-amber-800">{{ order.trackingNumber }}</span>
                    </div>
                  </div>

                  <div class="space-y-2 text-xs">
                    <p><strong>Dirección de Entrega:</strong> {{ order.customer.address }}, {{ order.customer.city }}</p>
                    <p><strong>Fecha Estimada de Entrega:</strong> {{ order.estimatedDelivery }}</p>
                    <p><strong>Método de Pago:</strong> {{ order.paymentMethod === 'credit-card' ? 'Tarjeta de Crédito (Terminada en ' + order.cardLastFour + ')' : order.paymentMethod }}</p>
                  </div>

                  <!-- Items Purchased List -->
                  <div class="pt-2 border-t border-stone-100">
                    <span class="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-2">
                      Prendas Adquiridas:
                    </span>
                    <div class="space-y-2">
                      @for (it of order.items; track it.id) {
                        <div class="flex items-center justify-between text-xs">
                          <span class="truncate max-w-[200px]">{{ it.quantity }}x {{ it.product.name }} ({{ it.selectedSize }})</span>
                          <span class="font-mono font-semibold">{{ it.product.price * it.quantity | arsCurrency }}</span>
                        </div>
                      }
                    </div>
                  </div>

                  <div class="pt-3 border-t border-stone-100 flex items-center justify-between text-sm font-bold text-stone-900">
                    <span>Total Abonado</span>
                    <span class="font-mono text-amber-900 text-base">{{ order.summary.total | arsCurrency }}</span>
                  </div>
                </div>

                <!-- Action Button in Confirmation -->
                <div class="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <button
                    type="button"
                    (click)="printReceipt()"
                    class="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span class="material-symbols-outlined text-base">print</span>
                    <span>Imprimir Comprobante</span>
                  </button>

                  <button
                    type="button"
                    (click)="checkoutFacade.resetCheckout()"
                    class="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-amber-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors"
                  >
                    Continuar en la Boutique
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
                    <span>Pagar {{ checkoutFacade.finalCheckoutAmount() | arsCurrency }}</span>
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

  readonly months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  readonly years = ['26', '27', '28', '29', '30', '31'];

  formattedCardNumber(): string {
    const raw = this.checkoutFacade.card().cardNumber.replace(/\s+/g, '');
    if (!raw) return '•••• •••• •••• ••••';
    const chunks = raw.match(/.{1,4}/g) || [];
    return chunks.join(' ');
  }

  onCardNumberChange(val: string): void {
    const sanitized = val.replace(/\D/g, '').substring(0, 16);
    this.checkoutFacade.updateCard({ cardNumber: sanitized });
  }

  printReceipt(): void {
    window.print();
  }
}

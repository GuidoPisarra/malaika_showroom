import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountFacade } from '../../../application/account.facade';
import { LookBuilderFacade } from '../../../application/look-builder.facade';
import { ORDER_STATUS_LABELS, OrderStatus } from '../../../domain/checkout/models/order.model';
import { ArsCurrencyPipe } from '../../shared/pipes/ars-currency.pipe';

@Component({
  selector: 'app-account-modal',
  imports: [FormsModule, DatePipe, ArsCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (account.isOpen()) {
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mi cuenta"
        class="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
      >
        <button type="button" class="fixed inset-0 w-full h-full cursor-default" (click)="account.close()" aria-label="Cerrar"></button>

        <div class="bg-[#FAF8F5] rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 relative z-10 my-auto max-h-[90vh] flex flex-col overflow-hidden">
          <div class="p-5 bg-white border-b border-stone-200 flex items-center justify-between">
            <h3 class="font-display text-xl text-stone-900 font-medium">
              @switch (account.view()) {
                @case ('register') { Crear cuenta }
                @case ('account') { Mi cuenta }
                @case ('track') { Seguir mi pedido }
                @default { Ingresar }
              }
            </h3>
            <button type="button" (click)="account.close()" class="text-stone-400 hover:text-stone-800 p-1.5 rounded-full hover:bg-stone-100" aria-label="Cerrar">
              <span class="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>

          <div class="p-5 sm:p-6 overflow-y-auto space-y-4">
            @if (account.error(); as error) {
              <div role="alert" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">{{ error }}</div>
            }

            @switch (account.view()) {
              @case ('login') {
                <form class="space-y-3" (ngSubmit)="account.login(email, password)">
                  <input name="email" type="email" required [(ngModel)]="email" placeholder="Correo electrónico" autocomplete="email" class="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-700" />
                  <input name="password" type="password" required [(ngModel)]="password" placeholder="Contraseña" autocomplete="current-password" class="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-700" />
                  <button type="submit" [disabled]="account.isBusy()" class="w-full py-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-amber-200 text-xs font-bold uppercase tracking-wider rounded-xl">
                    {{ account.isBusy() ? 'Ingresando...' : 'Ingresar' }}
                  </button>
                </form>
                <div class="text-xs text-stone-600 space-y-2 text-center">
                  <p>¿Todavía no tenés cuenta? <button type="button" class="font-semibold text-amber-800 underline" (click)="account.setView('register')">Creala acá</button></p>
                  <p>¿Compraste como invitada? <button type="button" class="font-semibold text-amber-800 underline" (click)="account.setView('track')">Seguí tu pedido</button></p>
                </div>
              }

              @case ('register') {
                <form class="space-y-3" (ngSubmit)="account.register(name, email, password)">
                  <input name="name" required [(ngModel)]="name" placeholder="Nombre y apellido" autocomplete="name" class="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-700" />
                  <input name="email" type="email" required [(ngModel)]="email" placeholder="Correo electrónico" autocomplete="email" class="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-700" />
                  <input name="password" type="password" required minlength="8" [(ngModel)]="password" placeholder="Contraseña (mínimo 8 caracteres)" autocomplete="new-password" class="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-700" />
                  <button type="submit" [disabled]="account.isBusy()" class="w-full py-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-amber-200 text-xs font-bold uppercase tracking-wider rounded-xl">
                    {{ account.isBusy() ? 'Creando cuenta...' : 'Crear cuenta' }}
                  </button>
                  <p class="text-[11px] text-stone-500">Con tu cuenta ves tus pedidos y guardás tus looks del maniquí. También podés comprar sin cuenta.</p>
                </form>
                <p class="text-xs text-stone-600 text-center">¿Ya tenés cuenta? <button type="button" class="font-semibold text-amber-800 underline" (click)="account.setView('login')">Ingresá</button></p>
              }

              @case ('track') {
                <form class="space-y-3" (ngSubmit)="account.track(orderNumber, email)">
                  <input name="orderNumber" required [(ngModel)]="orderNumber" placeholder="Número de pedido (ej. MLK-123456)" class="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:border-amber-700" />
                  <input name="email" type="email" required [(ngModel)]="email" placeholder="Correo con el que compraste" class="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-700" />
                  <button type="submit" [disabled]="account.isBusy()" class="w-full py-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-amber-200 text-xs font-bold uppercase tracking-wider rounded-xl">Buscar pedido</button>
                </form>
                @if (account.trackedOrder(); as order) {
                  <div class="p-4 bg-white rounded-2xl border border-stone-200 text-xs space-y-1">
                    <div class="flex justify-between"><span class="font-mono font-bold">{{ order.orderNumber }}</span><span class="font-semibold text-amber-800">{{ statusLabel(order.status) }}</span></div>
                    <p class="text-stone-500">{{ order.createdAt | date: 'd/M/yyyy' }} · {{ order.totals.itemsCount }} prendas · {{ order.totals.total | arsCurrency }}</p>
                    @if (order.trackingNumber) { <p>Seguimiento del envío: <strong class="font-mono">{{ order.trackingNumber }}</strong></p> }
                  </div>
                }
                <p class="text-xs text-stone-600 text-center"><button type="button" class="font-semibold text-amber-800 underline" (click)="account.setView('login')">Volver</button></p>
              }

              @case ('account') {
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-semibold text-stone-900">Hola, {{ account.user()?.name }}</p>
                    <p class="text-xs text-stone-500">{{ account.user()?.email }}</p>
                  </div>
                  <button type="button" (click)="account.logout()" class="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1">
                    <span class="material-symbols-outlined text-base">logout</span> Salir
                  </button>
                </div>

                <section class="space-y-2">
                  <h4 class="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Mis pedidos</h4>
                  @for (order of account.orders(); track order.id) {
                    <div class="p-4 bg-white rounded-2xl border border-stone-200 text-xs space-y-1">
                      <div class="flex justify-between"><span class="font-mono font-bold">{{ order.orderNumber }}</span><span class="font-semibold text-amber-800">{{ statusLabel(order.status) }}</span></div>
                      <p class="text-stone-500">{{ order.createdAt | date: 'd/M/yyyy' }} · {{ order.totals.itemsCount }} prendas · {{ order.totals.total | arsCurrency }}</p>
                      @if (order.trackingNumber) { <p>Seguimiento del envío: <strong class="font-mono">{{ order.trackingNumber }}</strong></p> }
                    </div>
                  } @empty {
                    <p class="text-xs text-stone-500">Todavía no hiciste pedidos con esta cuenta.</p>
                  }
                </section>

                <section class="space-y-2">
                  <h4 class="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Mis looks guardados</h4>
                  @for (look of lookBuilder.savedLooks(); track look.id) {
                    <div class="p-3 bg-white rounded-2xl border border-stone-200 text-xs flex items-center justify-between gap-3">
                      <div class="min-w-0">
                        <p class="font-semibold text-stone-900 truncate">{{ look.name }}</p>
                        <p class="text-stone-500 truncate">{{ itemNames(look.items) }}</p>
                      </div>
                      <button type="button" (click)="lookBuilder.deleteSavedLook(look.id)" class="text-stone-400 hover:text-rose-700 p-1" aria-label="Borrar look">
                        <span class="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  } @empty {
                    <p class="text-xs text-stone-500">Armá un look en el maniquí y tocá "Guardar look".</p>
                  }
                </section>
              }
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class AccountModalComponent {
  readonly account = inject(AccountFacade);
  readonly lookBuilder = inject(LookBuilderFacade);

  email = '';
  password = '';
  name = '';
  orderNumber = '';

  constructor() {
    // Si el seguimiento se abrió desde el link de un email, el formulario queda completo.
    effect(() => {
      const prefill = this.account.trackPrefill();
      if (!prefill) return;
      this.orderNumber = prefill.orderNumber;
      this.email = prefill.email;
    });
  }

  statusLabel(status: OrderStatus): string {
    return ORDER_STATUS_LABELS[status];
  }

  itemNames(items: { name: string }[]): string {
    return items.map((i) => i.name).join(' · ');
  }
}

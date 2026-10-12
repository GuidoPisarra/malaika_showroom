import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  AdminOrder,
  EMAIL_STATUS_LABELS,
  EmailLogEntry,
  EmailStatus,
  ORDER_STATUS_LABELS,
  ORDER_TRANSITIONS,
  OrderStatus,
  PAYMENT_METHOD_LABELS,
} from '../../../domain/admin/admin.models';
import { AdminApiService } from '../../../infrastructure/http/admin-api.service';
import { apiErrorMessage } from '../../../infrastructure/http/api.config';
import { ArsCurrencyPipe } from '../../shared/pipes/ars-currency.pipe';
import { LoadingComponent, StatusBadgeComponent, UI } from '../shared/admin-ui';
import { OrdersListPage } from './orders-list.page';

const EMAIL_STATUS_STYLES: Record<EmailStatus, string> = {
  SENT: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  SKIPPED: 'bg-stone-100 text-stone-600 border-stone-300',
};

const ACTION_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Pendiente de pago',
  PAID: 'Marcar como pagado',
  PREPARING: 'Pasar a preparación',
  SHIPPED: 'Marcar como enviado',
  DELIVERED: 'Marcar como entregado',
  CANCELLED: 'Cancelar pedido',
};

@Component({
  selector: 'admin-order-detail-drawer',
  imports: [FormsModule, DatePipe, ArsCurrencyPipe, StatusBadgeComponent, LoadingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close()' },
  template: `
    <div class="fixed inset-0 z-50 flex justify-end">
      <button type="button" class="absolute inset-0 bg-stone-950/40 backdrop-blur-[1px]" aria-label="Cerrar detalle" (click)="close()"></button>
      <aside class="relative flex h-full w-full max-w-xl flex-col bg-stone-50 shadow-2xl" role="dialog" aria-modal="true" aria-label="Detalle del pedido">
        <header class="flex items-center justify-between border-b border-stone-200 bg-white px-5 py-4">
          <div>
            <p class="text-xs uppercase tracking-wider text-stone-500">Pedido</p>
            <h2 class="font-display text-2xl font-semibold">{{ order()?.orderNumber ?? '…' }}</h2>
          </div>
          <button type="button" class="${UI.btnIcon}" (click)="close()" aria-label="Cerrar">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <div class="flex-1 overflow-y-auto p-5 space-y-5">
          @if (error()) {
            <div class="${UI.error}">{{ error() }}</div>
          }
          @if (success()) {
            <div class="${UI.success}">{{ success() }}</div>
          }

          @if (loading() && !order()) {
            <admin-loading text="Cargando pedido…" />
          } @else if (order(); as o) {
            <section class="${UI.card} p-4 flex flex-wrap items-center justify-between gap-3">
              <div class="space-y-1">
                <admin-status-badge [status]="o.status" />
                <p class="text-xs text-stone-500">Creado el {{ o.createdAt | date: 'dd/MM/yyyy HH:mm' }}</p>
                @if (o.paidAt) {
                  <p class="text-xs text-stone-500">Pagado el {{ o.paidAt | date: 'dd/MM/yyyy HH:mm' }}</p>
                }
                @if (o.cancelledAt) {
                  <p class="text-xs text-stone-500">Cancelado el {{ o.cancelledAt | date: 'dd/MM/yyyy HH:mm' }}</p>
                }
              </div>
              <div class="text-right">
                <p class="text-xs text-stone-500">Total</p>
                <p class="font-display text-3xl font-semibold">{{ o.totals.total | arsCurrency }}</p>
              </div>
            </section>

            @if (transitions().length) {
              <section class="${UI.card} p-4 space-y-3">
                <h3 class="font-sans text-sm font-semibold text-stone-900">Cambiar estado</h3>
                <div>
                  <label for="tracking" class="${UI.label}">Número de seguimiento (opcional)</label>
                  <input id="tracking" class="${UI.input}" maxlength="80" [(ngModel)]="trackingNumber" placeholder="Ej.: OCA 1234567" />
                </div>
                <div>
                  <label for="notes" class="${UI.label}">Notas internas (opcional)</label>
                  <textarea id="notes" rows="2" class="${UI.input}" maxlength="1000" [(ngModel)]="adminNotes"></textarea>
                </div>
                <div class="flex flex-wrap gap-2">
                  @for (t of transitions(); track t) {
                    <button
                      type="button"
                      [class]="t === 'CANCELLED' ? '${UI.btnDanger}' : '${UI.btnPrimary}'"
                      [disabled]="saving()"
                      (click)="changeStatus(t)"
                    >
                      {{ actionLabels[t] }}
                    </button>
                  }
                </div>
              </section>
            }

            <section class="${UI.card} p-4">
              <h3 class="mb-2 font-sans text-sm font-semibold text-stone-900 flex items-center gap-1.5">
                <span class="material-symbols-outlined text-lg text-amber-700">person</span> Clienta
              </h3>
              <p class="text-sm font-medium">{{ o.customer.fullName }}</p>
              <p class="text-sm text-stone-600"><a class="hover:text-amber-800" [href]="'mailto:' + o.customer.email">{{ o.customer.email }}</a></p>
              @if (o.customer.phone) {
                <p class="text-sm text-stone-600">Tel.: {{ o.customer.phone }}</p>
              }
            </section>

            <section class="${UI.card} p-4">
              <h3 class="mb-2 font-sans text-sm font-semibold text-stone-900 flex items-center gap-1.5">
                <span class="material-symbols-outlined text-lg text-amber-700">local_shipping</span> Envío
              </h3>
              <p class="text-sm text-stone-700">
                {{ o.customer.address }}@if (o.customer.apartment) {, {{ o.customer.apartment }}}
              </p>
              <p class="text-sm text-stone-700">
                {{ o.customer.city }}@if (o.customer.provinceState) {, {{ o.customer.provinceState }}} @if (o.customer.postalCode) {&nbsp;({{ o.customer.postalCode }})}
              </p>
              @if (o.customer.notes) {
                <p class="mt-2 text-sm italic text-stone-500">“{{ o.customer.notes }}”</p>
              }
              @if (o.trackingNumber) {
                <p class="mt-2 text-sm"><span class="text-stone-500">Seguimiento:</span> <span class="font-mono">{{ o.trackingNumber }}</span></p>
              }
              @if (o.adminNotes) {
                <p class="mt-2 text-sm"><span class="text-stone-500">Notas internas:</span> {{ o.adminNotes }}</p>
              }
            </section>

            <section class="${UI.card} p-4">
              <h3 class="mb-3 font-sans text-sm font-semibold text-stone-900 flex items-center gap-1.5">
                <span class="material-symbols-outlined text-lg text-amber-700">shopping_bag</span> Prendas ({{ o.totals.itemsCount }})
              </h3>
              <ul class="divide-y divide-stone-100">
                @for (item of o.items; track $index) {
                  <li class="flex gap-3 py-2.5">
                    <img [src]="item.image" [alt]="item.name" class="text-transparent h-14 w-12 shrink-0 rounded-lg object-cover bg-stone-100" loading="lazy" />
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium">{{ item.name }}</p>
                      <p class="flex items-center gap-1.5 text-xs text-stone-500">
                        @if (item.color.hex) {
                          <span class="inline-block h-3 w-3 rounded-full border border-stone-300" [style.background]="item.color.hex"></span>
                        }
                        {{ item.color.name }}@if (item.size) { · Talle {{ item.size }}} · x{{ item.quantity }}
                      </p>
                    </div>
                    <p class="text-sm font-medium whitespace-nowrap">{{ item.unitPrice * item.quantity | arsCurrency }}</p>
                  </li>
                }
              </ul>
              <dl class="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm">
                <div class="flex justify-between"><dt class="text-stone-500">Subtotal</dt><dd>{{ o.totals.subtotal | arsCurrency }}</dd></div>
                @if (o.totals.bundleDiscount) {
                  <div class="flex justify-between"><dt class="text-stone-500">Descuento por look</dt><dd class="text-emerald-700">−{{ o.totals.bundleDiscount | arsCurrency }}</dd></div>
                }
                @if (o.totals.couponDiscount) {
                  <div class="flex justify-between"><dt class="text-stone-500">Cupón {{ o.totals.couponCode }}</dt><dd class="text-emerald-700">−{{ o.totals.couponDiscount | arsCurrency }}</dd></div>
                }
                @if (o.totals.paymentDiscount) {
                  <div class="flex justify-between"><dt class="text-stone-500">Descuento por medio de pago</dt><dd class="text-emerald-700">−{{ o.totals.paymentDiscount | arsCurrency }}</dd></div>
                }
                <div class="flex justify-between"><dt class="text-stone-500">Envío</dt><dd>{{ o.totals.shipping ? (o.totals.shipping | arsCurrency) : 'Gratis' }}</dd></div>
                <div class="flex justify-between border-t border-stone-100 pt-2 font-semibold"><dt>Total</dt><dd>{{ o.totals.total | arsCurrency }}</dd></div>
              </dl>
            </section>

            <section class="${UI.card} p-4">
              <h3 class="mb-2 font-sans text-sm font-semibold text-stone-900 flex items-center gap-1.5">
                <span class="material-symbols-outlined text-lg text-amber-700">payments</span> Pago
              </h3>
              <p class="text-sm">{{ paymentLabels[o.paymentMethod] ?? o.paymentMethod }}</p>
              <p class="text-xs text-stone-500">Estado del pago: {{ o.paymentStatus }}</p>
              @if (o.status === 'PENDING_PAYMENT' && o.expiresAt) {
                <p class="text-xs text-stone-500">La reserva vence el {{ o.expiresAt | date: 'dd/MM/yyyy HH:mm' }}</p>
              }
            </section>

            <section class="${UI.card} p-4">
              <h3 class="mb-2 font-sans text-sm font-semibold text-stone-900 flex items-center gap-1.5">
                <span class="material-symbols-outlined text-lg text-amber-700">mail</span> Emails
              </h3>
              @if (emailsError()) {
                <p class="text-sm text-rose-700">{{ emailsError() }}</p>
              } @else if (emails() === null) {
                <p class="text-sm text-stone-400">Cargando emails…</p>
              } @else {
                <ul class="divide-y divide-stone-100">
                  @for (e of emails(); track e.id) {
                    <li class="flex items-start gap-3 py-2.5">
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium" [title]="e.subject">{{ e.subject }}</p>
                        <p class="truncate text-xs text-stone-500">Para {{ e.to }} · {{ (e.sentAt ?? e.createdAt) | date: 'dd/MM/yyyy HH:mm' }}</p>
                        @if (e.status === 'FAILED' && e.error) {
                          <p class="mt-0.5 line-clamp-2 text-xs text-rose-700">{{ e.error }}</p>
                        }
                      </div>
                      <span
                        class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                        [class]="emailStatusStyles[e.status]"
                        [attr.title]="e.error || null"
                      >
                        @if (e.status === 'FAILED') {
                          <span class="material-symbols-outlined text-sm">error</span>
                        }
                        {{ emailStatusLabels[e.status] }}
                      </span>
                    </li>
                  } @empty {
                    <li class="py-1 text-sm text-stone-400">Todavía no se mandaron emails de este pedido.</li>
                  }
                </ul>
              }
            </section>
          }
        </div>
      </aside>
    </div>
  `,
})
export class OrderDetailDrawer {
  private api = inject(AdminApiService);
  private router = inject(Router);
  private list = inject(OrdersListPage, { optional: true });

  /** Parámetro :id de la ruta. */
  readonly id = input.required<string>();

  readonly actionLabels = ACTION_LABELS;
  readonly paymentLabels = PAYMENT_METHOD_LABELS;
  readonly emailStatusLabels = EMAIL_STATUS_LABELS;
  readonly emailStatusStyles = EMAIL_STATUS_STYLES;
  readonly order = signal<AdminOrder | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  /** null mientras carga. */
  readonly emails = signal<EmailLogEntry[] | null>(null);
  readonly emailsError = signal<string | null>(null);
  readonly transitions = computed(() => {
    const o = this.order();
    return o ? ORDER_TRANSITIONS[o.status] : [];
  });
  trackingNumber = '';
  adminNotes = '';

  private request?: Subscription;
  private emailsRequest?: Subscription;

  constructor() {
    effect(() => this.load(this.id()));
  }

  private load(id: string): void {
    this.request?.unsubscribe();
    this.order.set(null);
    this.error.set(null);
    this.success.set(null);
    this.loading.set(true);
    this.emailsRequest?.unsubscribe();
    this.emails.set(null);
    this.emailsError.set(null);
    this.request = this.api.order(id).subscribe({
      next: (o) => {
        this.order.set(o);
        this.trackingNumber = o.trackingNumber ?? '';
        this.adminNotes = o.adminNotes ?? '';
        this.loading.set(false);
        this.loadEmails(o.id);
      },
      error: (err: unknown) => {
        this.error.set(apiErrorMessage(err, 'No encontramos el pedido.'));
        this.loading.set(false);
      },
    });
  }

  private loadEmails(orderId: string): void {
    this.emailsRequest?.unsubscribe();
    this.emailsError.set(null);
    this.emailsRequest = this.api.emails({ orderId, pageSize: 50 }).subscribe({
      next: (page) => this.emails.set(page.items),
      error: (err: unknown) => this.emailsError.set(apiErrorMessage(err, 'No pudimos cargar los emails.')),
    });
  }

  changeStatus(status: OrderStatus): void {
    const o = this.order();
    if (!o) return;
    if (status === 'CANCELLED' && !confirm(`¿Cancelar el pedido ${o.orderNumber}? Esta acción no se puede deshacer.`)) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    const trackingNumber = this.trackingNumber.trim();
    const adminNotes = this.adminNotes.trim();
    this.api
      .updateOrderStatus(o.id, {
        status,
        ...(trackingNumber ? { trackingNumber } : {}),
        ...(adminNotes ? { adminNotes } : {}),
      })
      .subscribe({
        next: (updated) => {
          this.order.set(updated);
          this.list?.orderUpdated(updated);
          this.saving.set(false);
          this.success.set(`Listo: el pedido quedó como “${ORDER_STATUS_LABELS[updated.status]}”.`);
          // El email del cambio de estado sale en segundo plano: lo buscamos un toque después.
          setTimeout(() => this.order()?.id === updated.id && this.loadEmails(updated.id), 1500);
        },
        error: (err: unknown) => {
          this.error.set(apiErrorMessage(err));
          this.saving.set(false);
        },
      });
  }

  close(): void {
    void this.router.navigate(['/admin/pedidos'], { queryParamsHandling: 'preserve' });
  }
}

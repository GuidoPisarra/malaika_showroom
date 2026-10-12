import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Dashboard, ORDER_STATUSES, ORDER_STATUS_LABELS, OrderStatus } from '../../../domain/admin/admin.models';
import { AdminApiService } from '../../../infrastructure/http/admin-api.service';
import { apiErrorMessage } from '../../../infrastructure/http/api.config';
import { ArsCurrencyPipe } from '../../shared/pipes/ars-currency.pipe';
import { LoadingComponent, StatusBadgeComponent, UI } from '../shared/admin-ui';

@Component({
  selector: 'admin-dashboard-page',
  imports: [RouterLink, ArsCurrencyPipe, LoadingComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 class="${UI.h1}">Inicio</h1>
        <p class="text-sm text-stone-500">Resumen de ventas de tu tienda.</p>
      </div>
      <button type="button" class="${UI.btnSecondary}" (click)="load()" [disabled]="loading()">
        <span class="material-symbols-outlined text-lg">refresh</span> Actualizar
      </button>
    </div>

    @if (error()) {
      <div class="${UI.error} mb-6">{{ error() }}</div>
    }

    @if (loading() && !data()) {
      <admin-loading />
    } @else if (data(); as d) {
      <section class="grid gap-4 sm:grid-cols-2 mb-8">
        @for (card of [{ title: 'Últimas 24 horas', s: d.last24Hours, icon: 'schedule' }, { title: 'Últimos 30 días', s: d.last30Days, icon: 'calendar_month' }]; track card.title) {
          <div class="${UI.card} p-5 sm:p-6">
            <div class="flex items-center gap-2 text-stone-500">
              <span class="material-symbols-outlined text-xl text-amber-700">{{ card.icon }}</span>
              <span class="text-xs font-semibold uppercase tracking-wider">{{ card.title }}</span>
            </div>
            <p class="mt-3 font-display text-4xl font-semibold text-stone-900">{{ card.s.revenue | arsCurrency }}</p>
            <p class="mt-1 text-sm text-stone-500">
              {{ card.s.orders }} {{ card.s.orders === 1 ? 'pedido cobrado' : 'pedidos cobrados' }}
            </p>
          </div>
        }
      </section>

      <section>
        <h2 class="font-display text-2xl font-semibold mb-3">Pedidos por estado</h2>
        <div class="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          @for (status of statuses; track status) {
            <a
              [routerLink]="['/admin/pedidos']"
              [queryParams]="{ status }"
              class="${UI.card} group p-4 hover:border-amber-300 hover:shadow-md transition"
              [attr.aria-label]="labels[status] + ': ver pedidos'"
            >
              <admin-status-badge [status]="status" />
              <p class="mt-3 text-3xl font-semibold text-stone-900">{{ d.ordersByStatus[status] ?? 0 }}</p>
              <p class="mt-1 flex items-center gap-1 text-xs text-stone-500 group-hover:text-amber-800">
                Ver pedidos <span class="material-symbols-outlined text-sm">arrow_forward</span>
              </p>
            </a>
          }
        </div>
      </section>
    }
  `,
})
export class DashboardPage {
  private api = inject(AdminApiService);

  readonly statuses: OrderStatus[] = ORDER_STATUSES;
  readonly labels = ORDER_STATUS_LABELS;
  readonly data = signal<Dashboard | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.dashboard().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(apiErrorMessage(err));
        this.loading.set(false);
      },
    });
  }
}

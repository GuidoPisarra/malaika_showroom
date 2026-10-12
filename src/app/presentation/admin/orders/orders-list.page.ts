import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  AdminOrder,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  OrderStatus,
  PAYMENT_METHOD_LABELS,
} from '../../../domain/admin/admin.models';
import { AdminApiService } from '../../../infrastructure/http/admin-api.service';
import { apiErrorMessage } from '../../../infrastructure/http/api.config';
import { ArsCurrencyPipe } from '../../shared/pipes/ars-currency.pipe';
import { EmptyComponent, LoadingComponent, PaginationComponent, StatusBadgeComponent, UI } from '../shared/admin-ui';

const PAGE_SIZE = 20;

@Component({
  selector: 'admin-orders-list-page',
  imports: [FormsModule, RouterLink, RouterOutlet, DatePipe, ArsCurrencyPipe, StatusBadgeComponent, PaginationComponent, LoadingComponent, EmptyComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6">
      <h1 class="${UI.h1}">Pedidos</h1>
      <p class="text-sm text-stone-500">Seguí cada compra, marcá pagos por transferencia y despachos.</p>
    </div>

    <form class="flex flex-col gap-3 sm:flex-row sm:items-end mb-4" (ngSubmit)="applySearch()">
      <div class="sm:w-56">
        <label for="status" class="${UI.label}">Estado</label>
        <select id="status" class="${UI.input}" [ngModel]="status()" name="status" (ngModelChange)="setStatus($event)">
          <option value="">Todos</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ labels[s] }}</option>
          }
        </select>
      </div>
      <div class="flex-1">
        <label for="search" class="${UI.label}">Buscar</label>
        <div class="relative">
          <span class="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-stone-400">search</span>
          <input id="search" name="search" type="search" class="${UI.input} pl-10" placeholder="Número, nombre o email" [(ngModel)]="searchText" />
        </div>
      </div>
      <button type="submit" class="${UI.btnPrimary}">Buscar</button>
    </form>

    @if (error()) {
      <div class="${UI.error} mb-4">{{ error() }}</div>
    }

    <div class="${UI.card} overflow-hidden">
      @if (loading() && !items().length) {
        <admin-loading text="Cargando pedidos…" />
      } @else if (!items().length) {
        <admin-empty icon="receipt_long" text="No hay pedidos con estos filtros." />
      } @else {
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-stone-100">
            <thead class="bg-stone-50/80">
              <tr>
                <th class="${UI.th}">Pedido</th>
                <th class="${UI.th}">Clienta</th>
                <th class="${UI.th} hidden md:table-cell">Fecha</th>
                <th class="${UI.th} hidden lg:table-cell">Pago</th>
                <th class="${UI.th}">Estado</th>
                <th class="${UI.th} text-right">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-stone-100" [class.opacity-60]="loading()">
              @for (o of items(); track o.id) {
                <tr class="cursor-pointer hover:bg-amber-50/40" [routerLink]="[o.id]" queryParamsHandling="preserve">
                  <td class="${UI.td} font-semibold text-stone-900">
                    <a [routerLink]="[o.id]" queryParamsHandling="preserve" class="hover:text-amber-800">{{ o.orderNumber }}</a>
                  </td>
                  <td class="${UI.td}">
                    <p class="font-medium text-stone-900">{{ o.customer.fullName }}</p>
                    <p class="text-xs text-stone-500">{{ o.customer.email }}</p>
                  </td>
                  <td class="${UI.td} hidden md:table-cell whitespace-nowrap">{{ o.createdAt | date: 'dd/MM/yy HH:mm' }}</td>
                  <td class="${UI.td} hidden lg:table-cell">{{ paymentLabels[o.paymentMethod] ?? o.paymentMethod }}</td>
                  <td class="${UI.td}"><admin-status-badge [status]="o.status" /></td>
                  <td class="${UI.td} text-right font-semibold text-stone-900 whitespace-nowrap">{{ o.totals.total | arsCurrency }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="border-t border-stone-100">
          <admin-pagination [page]="page()" [pageSize]="pageSize" [total]="total()" (pageChange)="goToPage($event)" />
        </div>
      }
    </div>

    <router-outlet />
  `,
})
export class OrdersListPage {
  private api = inject(AdminApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly statuses = ORDER_STATUSES;
  readonly labels = ORDER_STATUS_LABELS;
  readonly paymentLabels = PAYMENT_METHOD_LABELS;
  readonly pageSize = PAGE_SIZE;

  readonly items = signal<AdminOrder[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly status = signal<OrderStatus | ''>('');
  readonly search = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  searchText = '';

  private request?: Subscription;

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      const status = q.get('status') as OrderStatus | null;
      this.status.set(status && ORDER_STATUSES.includes(status) ? status : '');
      this.search.set(q.get('search') ?? '');
      this.searchText = this.search();
      this.page.set(Math.max(1, Number(q.get('page')) || 1));
      this.load();
    });
  }

  load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.request = this.api
      .orders({ status: this.status(), search: this.search(), page: this.page(), pageSize: PAGE_SIZE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(apiErrorMessage(err));
          this.loading.set(false);
        },
      });
  }

  /** Actualiza un pedido en la tabla (lo llama el detalle al cambiar el estado). */
  orderUpdated(order: AdminOrder): void {
    this.items.update((list) => list.map((o) => (o.id === order.id ? order : o)));
  }

  setStatus(status: OrderStatus | ''): void {
    this.navigate({ status: status || null, page: null });
  }

  applySearch(): void {
    this.navigate({ search: this.searchText.trim() || null, page: null });
  }

  goToPage(page: number): void {
    this.navigate({ page: page > 1 ? page : null });
  }

  private navigate(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate(['/admin/pedidos'], { queryParams, queryParamsHandling: 'merge' });
  }
}

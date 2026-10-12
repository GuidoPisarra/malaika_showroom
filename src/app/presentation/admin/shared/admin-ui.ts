import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ORDER_STATUS_LABELS, OrderStatus } from '../../../domain/admin/admin.models';

/** Clases compartidas del panel (Tailwind las detecta en este archivo). */
export const UI = {
  card: 'bg-white rounded-2xl border border-stone-200/80 shadow-sm',
  label: 'block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5',
  input:
    'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-700 focus:ring-2 focus:ring-amber-200 focus:outline-none disabled:bg-stone-100',
  btnPrimary:
    'inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
  btnSecondary:
    'inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:border-amber-700 hover:text-amber-800 disabled:opacity-50 transition-colors',
  btnDanger:
    'inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-colors',
  btnIcon: 'inline-flex items-center justify-center rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900',
  error: 'rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800',
  success: 'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800',
  th: 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-500',
  td: 'px-4 py-3 text-sm text-stone-700',
  h1: 'font-display text-3xl font-semibold text-stone-900',
} as const;

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'bg-amber-50 text-amber-800 border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  PREPARING: 'bg-sky-50 text-sky-800 border-sky-200',
  SHIPPED: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  DELIVERED: 'bg-stone-100 text-stone-800 border-stone-300',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
};

@Component({
  selector: 'admin-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold" [class]="style()">{{ label() }}</span>`,
})
export class StatusBadgeComponent {
  readonly status = input.required<OrderStatus>();
  readonly label = computed(() => ORDER_STATUS_LABELS[this.status()] ?? this.status());
  readonly style = computed(() => STATUS_STYLES[this.status()] ?? '');
}

@Component({
  selector: 'admin-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (total() > 0) {
      <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-stone-600">
        <span>{{ from() }}–{{ to() }} de {{ total() }}</span>
        <div class="flex items-center gap-1">
          <button type="button" class="${UI.btnIcon}" [disabled]="page() <= 1" (click)="pageChange.emit(page() - 1)" aria-label="Página anterior">
            <span class="material-symbols-outlined text-xl">chevron_left</span>
          </button>
          <span class="px-2">Página {{ page() }} de {{ pages() }}</span>
          <button type="button" class="${UI.btnIcon}" [disabled]="page() >= pages()" (click)="pageChange.emit(page() + 1)" aria-label="Página siguiente">
            <span class="material-symbols-outlined text-xl">chevron_right</span>
          </button>
        </div>
      </div>
    }
  `,
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();
  readonly pageChange = output<number>();
  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  readonly from = computed(() => (this.page() - 1) * this.pageSize() + 1);
  readonly to = computed(() => Math.min(this.total(), this.page() * this.pageSize()));
}

@Component({
  selector: 'admin-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-center gap-2 py-12 text-sm text-stone-500">
      <span class="material-symbols-outlined animate-spin text-xl text-amber-700">progress_activity</span>
      {{ text() }}
    </div>
  `,
})
export class LoadingComponent {
  readonly text = input('Cargando…');
}

@Component({
  selector: 'admin-empty',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <span class="material-symbols-outlined text-4xl text-stone-300">{{ icon() }}</span>
      <p class="text-sm text-stone-500">{{ text() }}</p>
      <ng-content />
    </div>
  `,
})
export class EmptyComponent {
  readonly icon = input('inbox');
  readonly text = input('No hay nada para mostrar.');
}

/** Convierte un valor de input numérico opcional a entero o null. */
export function intOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? n : null;
}

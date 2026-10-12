import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminProduct } from '../../../domain/admin/admin.models';
import { AdminApiService } from '../../../infrastructure/http/admin-api.service';
import { apiErrorMessage } from '../../../infrastructure/http/api.config';
import { ArsCurrencyPipe } from '../../shared/pipes/ars-currency.pipe';
import { EmptyComponent, LoadingComponent, PaginationComponent, UI } from '../shared/admin-ui';

const PAGE_SIZE = 20;

@Component({
  selector: 'admin-products-list-page',
  imports: [FormsModule, RouterLink, ArsCurrencyPipe, PaginationComponent, LoadingComponent, EmptyComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 class="${UI.h1}">Productos</h1>
        <p class="text-sm text-stone-500">Catálogo, precios y stock.</p>
      </div>
      <a routerLink="/admin/productos/nuevo" class="${UI.btnPrimary}">
        <span class="material-symbols-outlined text-lg">add</span> Nuevo producto
      </a>
    </div>

    <form class="flex gap-2 mb-4" (ngSubmit)="applySearch()">
      <div class="relative flex-1">
        <span class="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-stone-400">search</span>
        <input type="search" name="search" class="${UI.input} pl-10" placeholder="Buscar por nombre, SKU o categoría" [(ngModel)]="searchText" aria-label="Buscar productos" />
      </div>
      <button type="submit" class="${UI.btnPrimary}">Buscar</button>
    </form>

    @if (error()) {
      <div class="${UI.error} mb-4">{{ error() }}</div>
    }
    @if (notice()) {
      <div class="${UI.success} mb-4">{{ notice() }}</div>
    }

    <div class="${UI.card} overflow-hidden">
      @if (loading() && !items().length) {
        <admin-loading text="Cargando productos…" />
      } @else if (!items().length) {
        <admin-empty icon="checkroom" [text]="search() ? 'No encontramos productos con esa búsqueda.' : 'Todavía no cargaste productos.'">
          <a routerLink="/admin/productos/nuevo" class="${UI.btnSecondary} mt-2">Crear el primero</a>
        </admin-empty>
      } @else {
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-stone-100">
            <thead class="bg-stone-50/80">
              <tr>
                <th class="${UI.th}">Producto</th>
                <th class="${UI.th} hidden md:table-cell">Categoría</th>
                <th class="${UI.th} text-right">Precio</th>
                <th class="${UI.th}">Stock</th>
                <th class="${UI.th} hidden sm:table-cell">Estado</th>
                <th class="${UI.th}"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-stone-100" [class.opacity-60]="loading()">
              @for (p of items(); track p.id) {
                <tr class="hover:bg-amber-50/30">
                  <td class="${UI.td}">
                    <a [routerLink]="['/admin/productos', p.id]" class="flex items-center gap-3 group">
                      <img [src]="p.image" [alt]="p.name" class="text-transparent h-14 w-11 shrink-0 rounded-lg bg-stone-100 object-cover" loading="lazy" />
                      <span class="min-w-0">
                        <span class="block font-medium text-stone-900 group-hover:text-amber-800">{{ p.name }}</span>
                        @if (p.sku) {
                          <span class="block text-xs font-mono text-stone-400">{{ p.sku }}</span>
                        }
                      </span>
                    </a>
                  </td>
                  <td class="${UI.td} hidden md:table-cell capitalize">{{ p.category }}</td>
                  <td class="${UI.td} text-right whitespace-nowrap">
                    <span class="font-semibold text-stone-900">{{ p.price | arsCurrency }}</span>
                    @if (p.originalPrice) {
                      <span class="block text-xs text-stone-400 line-through">{{ p.originalPrice | arsCurrency }}</span>
                    }
                  </td>
                  <td class="${UI.td}">
                    @if (p.variantStock) {
                      <a
                        [routerLink]="['/admin/productos', p.id]"
                        fragment="stock"
                        class="inline-flex flex-col items-start rounded-lg px-2 py-1 text-sm hover:bg-stone-100"
                        title="Editar stock por talle y color"
                      >
                        <span class="inline-flex items-center gap-1.5">
                          <span [class.text-rose-700]="p.stock === 0" [class.font-semibold]="p.stock <= 3">{{ p.stock }}</span>
                          <span class="whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-amber-800">{{ variantLabel(p) }}</span>
                        </span>
                        @if (outOfStock(p); as n) {
                          <span class="mt-0.5 whitespace-nowrap text-xs text-rose-700">{{ n }} {{ n === 1 ? 'combinación agotada' : 'combinaciones agotadas' }}</span>
                        }
                      </a>
                    } @else if (editingStock() === p.id) {
                      <form class="flex items-center gap-1" (ngSubmit)="saveStock(p)">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          name="stock"
                          class="w-20 rounded-lg border border-stone-300 px-2 py-1 text-sm focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-200"
                          [(ngModel)]="stockDraft"
                          aria-label="Nuevo stock"
                          autofocus
                        />
                        <button type="submit" class="${UI.btnIcon} text-emerald-700" [disabled]="savingStock()" aria-label="Guardar stock">
                          <span class="material-symbols-outlined text-lg">check</span>
                        </button>
                        <button type="button" class="${UI.btnIcon}" (click)="editingStock.set(null)" aria-label="Cancelar">
                          <span class="material-symbols-outlined text-lg">close</span>
                        </button>
                      </form>
                    } @else {
                      <button
                        type="button"
                        class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm hover:bg-stone-100"
                        [class.text-rose-700]="p.stock === 0"
                        [class.font-semibold]="p.stock <= 3"
                        (click)="startStockEdit(p)"
                        title="Editar stock"
                      >
                        {{ p.stock }}
                        <span class="material-symbols-outlined text-sm text-stone-400">edit</span>
                      </button>
                    }
                  </td>
                  <td class="${UI.td} hidden sm:table-cell">
                    @if (p.active) {
                      <span class="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Activo</span>
                    } @else {
                      <span class="rounded-full border border-stone-300 bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">Inactivo</span>
                    }
                  </td>
                  <td class="${UI.td} text-right">
                    <a [routerLink]="['/admin/productos', p.id]" class="${UI.btnIcon}" aria-label="Editar producto">
                      <span class="material-symbols-outlined text-xl">chevron_right</span>
                    </a>
                  </td>
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
  `,
})
export class ProductsListPage {
  private api = inject(AdminApiService);
  private destroyRef = inject(DestroyRef);

  readonly pageSize = PAGE_SIZE;
  readonly items = signal<AdminProduct[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly search = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly editingStock = signal<string | null>(null);
  readonly savingStock = signal(false);
  searchText = '';
  stockDraft: number | null = 0;

  private request?: Subscription;

  constructor() {
    this.load();
  }

  load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.request = this.api
      .products({ search: this.search(), page: this.page(), pageSize: PAGE_SIZE })
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

  applySearch(): void {
    this.search.set(this.searchText.trim());
    this.page.set(1);
    this.load();
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  /** "por talle", "por color" o "por talle y color", según los ejes del producto. */
  variantLabel(p: AdminProduct): string {
    const sizes = p.sizes?.length > 0;
    const colors = p.colors?.length > 0;
    return sizes && colors ? 'por talle y color' : sizes ? 'por talle' : 'por color';
  }

  /** Combinaciones talle × color sin unidades (las que no figuran en `variants` también cuentan). */
  outOfStock(p: AdminProduct): number {
    const combos = Math.max(1, p.sizes?.length ?? 0) * Math.max(1, p.colors?.length ?? 0);
    const withStock = (p.variants ?? []).filter((v) => v.stock > 0).length;
    return Math.max(0, combos - withStock);
  }

  startStockEdit(p: AdminProduct): void {
    this.stockDraft = p.stock;
    this.notice.set(null);
    this.editingStock.set(p.id);
  }

  saveStock(p: AdminProduct): void {
    const stock = Math.round(Number(this.stockDraft));
    if (!Number.isFinite(stock) || stock < 0 || this.stockDraft === null) {
      this.error.set('El stock tiene que ser un número entero mayor o igual a 0.');
      return;
    }
    this.savingStock.set(true);
    this.error.set(null);
    this.api.setStock(p.id, { stock }).subscribe({
      next: (updated) => {
        this.items.update((list) => list.map((x) => (x.id === p.id ? { ...x, ...updated } : x)));
        this.editingStock.set(null);
        this.savingStock.set(false);
        this.notice.set(`Stock de “${p.name}” actualizado a ${updated.stock ?? stock}.`);
      },
      error: (err: unknown) => {
        this.error.set(apiErrorMessage(err));
        this.savingStock.set(false);
      },
    });
  }
}

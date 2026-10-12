import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Coupon, CouponInput } from '../../../domain/admin/admin.models';
import { AdminApiService } from '../../../infrastructure/http/admin-api.service';
import { apiErrorMessage } from '../../../infrastructure/http/api.config';
import { ArsCurrencyPipe } from '../../shared/pipes/ars-currency.pipe';
import { EmptyComponent, LoadingComponent, UI, intOrNull } from '../shared/admin-ui';

type DiscountType = 'percent' | 'fixed';

/** ISO → valor de <input type="datetime-local"> en hora local. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

@Component({
  selector: 'admin-coupons-page',
  imports: [ReactiveFormsModule, DatePipe, ArsCurrencyPipe, LoadingComponent, EmptyComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 class="${UI.h1}">Cupones</h1>
        <p class="text-sm text-stone-500">Descuentos con código, vigencia y límite de usos.</p>
      </div>
      @if (!formOpen()) {
        <button type="button" class="${UI.btnPrimary}" (click)="openForm(null)">
          <span class="material-symbols-outlined text-lg">add</span> Nuevo cupón
        </button>
      }
    </div>

    @if (error()) {
      <div class="${UI.error} mb-4">{{ error() }}</div>
    }

    @if (formOpen()) {
      <form [formGroup]="form" (ngSubmit)="save()" novalidate class="${UI.card} p-5 mb-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-xl font-semibold">{{ editing() ? 'Editar cupón ' + editing()!.code : 'Nuevo cupón' }}</h2>
          <button type="button" class="${UI.btnIcon}" (click)="closeForm()" aria-label="Cerrar formulario">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label for="code" class="${UI.label}">Código *</label>
            <input id="code" formControlName="code" class="${UI.input} font-mono uppercase" maxlength="40" placeholder="VERANO10" />
            @if (form.controls.code.touched && form.controls.code.invalid) {
              <p class="mt-1 text-xs text-rose-700">Letras, números o guiones (3 a 40).</p>
            }
          </div>
          <div class="sm:col-span-1 lg:col-span-3">
            <label for="description" class="${UI.label}">Descripción</label>
            <input id="description" formControlName="description" class="${UI.input}" maxlength="200" />
          </div>
          <div>
            <span class="${UI.label}">Tipo de descuento</span>
            <div class="flex rounded-xl border border-stone-300 p-1 text-sm">
              <label class="flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-center has-[:checked]:bg-stone-900 has-[:checked]:text-white">
                <input type="radio" class="sr-only" formControlName="type" value="percent" /> Porcentaje
              </label>
              <label class="flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-center has-[:checked]:bg-stone-900 has-[:checked]:text-white">
                <input type="radio" class="sr-only" formControlName="type" value="fixed" /> Monto fijo
              </label>
            </div>
          </div>
          <div>
            <label for="amount" class="${UI.label}">{{ form.controls.type.value === 'percent' ? 'Porcentaje (1 a 100) *' : 'Monto en pesos *' }}</label>
            <input id="amount" type="number" min="1" [max]="form.controls.type.value === 'percent' ? 100 : null" step="1" formControlName="amount" class="${UI.input}" />
          </div>
          <div>
            <label for="minSubtotal" class="${UI.label}">Compra mínima</label>
            <input id="minSubtotal" type="number" min="0" step="1" formControlName="minSubtotal" class="${UI.input}" placeholder="Sin mínimo" />
          </div>
          <div>
            <label for="maxUses" class="${UI.label}">Usos máximos</label>
            <input id="maxUses" type="number" min="1" step="1" formControlName="maxUses" class="${UI.input}" placeholder="Ilimitados" />
          </div>
          <div>
            <label for="startsAt" class="${UI.label}">Desde</label>
            <input id="startsAt" type="datetime-local" formControlName="startsAt" class="${UI.input}" />
          </div>
          <div>
            <label for="endsAt" class="${UI.label}">Hasta</label>
            <input id="endsAt" type="datetime-local" formControlName="endsAt" class="${UI.input}" />
          </div>
          <label class="flex items-center gap-3 text-sm sm:col-span-2 self-end pb-2.5">
            <input type="checkbox" formControlName="active" class="h-4 w-4 accent-amber-700" /> Activo
          </label>
        </div>
        @if (formError()) {
          <div class="${UI.error}" role="alert">{{ formError() }}</div>
        }
        <div class="flex gap-2">
          <button type="submit" class="${UI.btnPrimary}" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar cupón' }}</button>
          <button type="button" class="${UI.btnSecondary}" (click)="closeForm()">Cancelar</button>
        </div>
      </form>
    }

    <div class="${UI.card} overflow-hidden">
      @if (loading() && !coupons().length) {
        <admin-loading text="Cargando cupones…" />
      } @else if (!coupons().length) {
        <admin-empty icon="sell" text="Todavía no creaste cupones." />
      } @else {
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-stone-100">
            <thead class="bg-stone-50/80">
              <tr>
                <th class="${UI.th}">Código</th>
                <th class="${UI.th}">Descuento</th>
                <th class="${UI.th} hidden md:table-cell">Condiciones</th>
                <th class="${UI.th}">Usos</th>
                <th class="${UI.th} hidden sm:table-cell">Estado</th>
                <th class="${UI.th}"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-stone-100">
              @for (c of coupons(); track c.id) {
                <tr>
                  <td class="${UI.td}">
                    <p class="font-mono font-semibold text-stone-900">{{ c.code }}</p>
                    @if (c.description) {
                      <p class="text-xs text-stone-500">{{ c.description }}</p>
                    }
                  </td>
                  <td class="${UI.td} whitespace-nowrap font-medium">
                    {{ c.percent ? c.percent + ' %' : (c.fixedAmount | arsCurrency) }}
                  </td>
                  <td class="${UI.td} hidden md:table-cell text-xs text-stone-500">
                    @if (c.minSubtotal) {
                      <p>Mínimo {{ c.minSubtotal | arsCurrency }}</p>
                    }
                    @if (c.startsAt || c.endsAt) {
                      <p>
                        {{ c.startsAt ? 'Desde ' + (c.startsAt | date: 'dd/MM/yy') : '' }}
                        {{ c.endsAt ? 'hasta ' + (c.endsAt | date: 'dd/MM/yy') : '' }}
                      </p>
                    }
                    @if (!c.minSubtotal && !c.startsAt && !c.endsAt) {
                      <p>Sin condiciones</p>
                    }
                  </td>
                  <td class="${UI.td} whitespace-nowrap">{{ c.usedCount }} / {{ c.maxUses ?? '∞' }}</td>
                  <td class="${UI.td} hidden sm:table-cell">
                    @if (c.active) {
                      <span class="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Activo</span>
                    } @else {
                      <span class="rounded-full border border-stone-300 bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">Pausado</span>
                    }
                  </td>
                  <td class="${UI.td} text-right whitespace-nowrap">
                    <button type="button" class="${UI.btnIcon}" (click)="openForm(c)" [attr.aria-label]="'Editar ' + c.code">
                      <span class="material-symbols-outlined text-xl">edit</span>
                    </button>
                    <button type="button" class="${UI.btnIcon} hover:text-rose-700" (click)="remove(c)" [attr.aria-label]="'Eliminar ' + c.code">
                      <span class="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class CouponsPage {
  private api = inject(AdminApiService);
  private fb = inject(NonNullableFormBuilder);

  readonly coupons = signal<Coupon[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly formOpen = signal(false);
  readonly editing = signal<Coupon | null>(null);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]{3,40}$/)]],
    description: [''],
    type: ['percent' as DiscountType],
    amount: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    minSubtotal: new FormControl<number | null>(null, Validators.min(0)),
    maxUses: new FormControl<number | null>(null, Validators.min(1)),
    startsAt: [''],
    endsAt: [''],
    active: [true],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.coupons().subscribe({
      next: (list) => {
        this.coupons.set(list);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(apiErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  openForm(c: Coupon | null): void {
    this.editing.set(c);
    this.formError.set(null);
    this.form.reset({
      code: c?.code ?? '',
      description: c?.description ?? '',
      type: c?.fixedAmount && !c.percent ? 'fixed' : 'percent',
      amount: c ? (c.percent || c.fixedAmount) : null,
      minSubtotal: c?.minSubtotal ?? null,
      maxUses: c?.maxUses ?? null,
      startsAt: toLocalInput(c?.startsAt ?? null),
      endsAt: toLocalInput(c?.endsAt ?? null),
      active: c?.active ?? true,
    });
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  save(): void {
    const v = this.form.getRawValue();
    const amount = intOrNull(v.amount);
    if (this.form.invalid || amount === null) {
      this.form.markAllAsTouched();
      this.formError.set('Completá el código y el valor del descuento.');
      return;
    }
    if (v.type === 'percent' && amount > 100) {
      this.formError.set('El porcentaje debe estar entre 1 y 100.');
      return;
    }
    if (v.startsAt && v.endsAt && new Date(v.endsAt) <= new Date(v.startsAt)) {
      this.formError.set('La fecha de fin tiene que ser posterior a la de inicio.');
      return;
    }
    const body: CouponInput = {
      code: v.code.trim().toUpperCase(),
      description: v.description.trim(),
      percent: v.type === 'percent' ? amount : null,
      fixedAmount: v.type === 'fixed' ? amount : null,
      minSubtotal: intOrNull(v.minSubtotal),
      maxUses: intOrNull(v.maxUses),
      startsAt: fromLocalInput(v.startsAt),
      endsAt: fromLocalInput(v.endsAt),
      active: v.active,
    };
    const editing = this.editing();
    this.saving.set(true);
    this.formError.set(null);
    (editing ? this.api.updateCoupon(editing.id, body) : this.api.createCoupon(body)).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.coupons.update((list) => (editing ? list.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...list]));
        this.closeForm();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(err));
      },
    });
  }

  remove(c: Coupon): void {
    if (!confirm(`¿Eliminar el cupón ${c.code}? Los pedidos que ya lo usaron no cambian.`)) return;
    this.error.set(null);
    this.api.deleteCoupon(c.id).subscribe({
      next: () => {
        this.coupons.update((list) => list.filter((x) => x.id !== c.id));
        if (this.editing()?.id === c.id) this.closeForm();
      },
      error: (err: unknown) => this.error.set(apiErrorMessage(err)),
    });
  }
}

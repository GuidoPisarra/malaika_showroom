import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { StoreSettings } from '../../../domain/admin/admin.models';
import { AdminApiService } from '../../../infrastructure/http/admin-api.service';
import { apiErrorMessage } from '../../../infrastructure/http/api.config';
import { LoadingComponent, UI, intOrNull } from '../shared/admin-ui';
import { ShippingZonesCard } from './shipping-zones.card';

type TierGroup = FormGroup<{ minItems: FormControl<number | null>; percent: FormControl<number | null> }>;

@Component({
  selector: 'admin-store-settings-form',
  imports: [ReactiveFormsModule, LoadingComponent, ShippingZonesCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <admin-loading text="Cargando configuración…" />
    } @else {
      <form [formGroup]="form" (ngSubmit)="save()" novalidate class="space-y-6">
        <section class="${UI.card} p-5 space-y-4">
          <h3 class="font-sans text-sm font-semibold text-stone-900 flex items-center gap-2">
            <span class="material-symbols-outlined text-lg text-amber-700">local_shipping</span> Envíos
          </h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="shippingFee" class="${UI.label}">Costo de envío general (ARS)</label>
              <input id="shippingFee" type="number" min="0" step="1" formControlName="shippingFee" class="${UI.input}" />
            </div>
            <div>
              <label for="freeShippingThreshold" class="${UI.label}">Envío gratis desde (ARS)</label>
              <input id="freeShippingThreshold" type="number" min="0" step="1" formControlName="freeShippingThreshold" class="${UI.input}" />
            </div>
          </div>
          <p class="text-xs text-stone-500">Se aplican cuando no hay zonas o la dirección no cae en ninguna. Las zonas pueden usar este mínimo para envío gratis.</p>
        </section>

        @if (settings(); as s) {
          <admin-shipping-zones [settings]="s" />
        }

        <section class="${UI.card} p-5 space-y-3">
          <h3 class="font-sans text-sm font-semibold text-stone-900 flex items-center gap-2">
            <span class="material-symbols-outlined text-lg text-amber-700">percent</span> Descuentos por cantidad de prendas
          </h3>
          <p class="text-xs text-stone-500">Se aplica el escalón más alto que alcance el carrito (ej.: 3 prendas → 15 %).</p>
          <div formArrayName="bundleDiscounts" class="space-y-2">
            @for (tier of tiers.controls; track tier; let i = $index) {
              <div [formGroupName]="i" class="flex flex-wrap items-end gap-2">
                <div class="w-32">
                  <label [for]="'min' + i" class="${UI.label}">Desde prendas</label>
                  <input [id]="'min' + i" type="number" min="1" step="1" formControlName="minItems" class="${UI.input}" />
                </div>
                <div class="w-32">
                  <label [for]="'pct' + i" class="${UI.label}">Descuento %</label>
                  <input [id]="'pct' + i" type="number" min="0" max="90" step="1" formControlName="percent" class="${UI.input}" />
                </div>
                <button type="button" class="${UI.btnIcon} mb-1.5" (click)="tiers.removeAt(i)" aria-label="Quitar escalón">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            } @empty {
              <p class="text-sm text-stone-400">Sin descuentos por cantidad.</p>
            }
          </div>
          <button type="button" class="${UI.btnSecondary} py-1.5" (click)="addTier()" [disabled]="tiers.length >= 10">
            <span class="material-symbols-outlined text-lg">add</span> Agregar escalón
          </button>
        </section>

        <section class="${UI.card} p-5 space-y-4" formGroupName="bankTransfer">
          <h3 class="font-sans text-sm font-semibold text-stone-900 flex items-center gap-2">
            <span class="material-symbols-outlined text-lg text-amber-700">account_balance</span> Transferencia bancaria
          </h3>
          <p class="text-xs text-stone-500">Si dejás titular, CBU, alias y banco vacíos, la transferencia no se ofrece en el checkout.</p>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="holder" class="${UI.label}">Titular</label>
              <input id="holder" formControlName="holder" class="${UI.input}" maxlength="120" />
            </div>
            <div>
              <label for="bank" class="${UI.label}">Banco</label>
              <input id="bank" formControlName="bank" class="${UI.input}" maxlength="80" />
            </div>
            <div>
              <label for="cbu" class="${UI.label}">CBU / CVU</label>
              <input id="cbu" formControlName="cbu" class="${UI.input} font-mono" maxlength="30" inputmode="numeric" />
            </div>
            <div>
              <label for="alias" class="${UI.label}">Alias</label>
              <input id="alias" formControlName="alias" class="${UI.input} font-mono" maxlength="60" />
            </div>
            <div>
              <label for="cuit" class="${UI.label}">CUIT</label>
              <input id="cuit" formControlName="cuit" class="${UI.input} font-mono" maxlength="20" />
            </div>
          </div>
        </section>
        <section class="${UI.card} p-5">
          <label for="bankTransferDiscountPercent" class="${UI.label}">Descuento por pagar con transferencia (%)</label>
          <input id="bankTransferDiscountPercent" type="number" min="0" max="50" step="1" formControlName="bankTransferDiscountPercent" class="${UI.input} sm:w-40" />
        </section>

        <section class="${UI.card} p-5 space-y-4">
          <h3 class="font-sans text-sm font-semibold text-stone-900 flex items-center gap-2">
            <span class="material-symbols-outlined text-lg text-amber-700">contact_mail</span> Tienda y contacto
          </h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label for="storefrontUrl" class="${UI.label}">URL pública de la tienda</label>
              <input id="storefrontUrl" type="url" formControlName="storefrontUrl" class="${UI.input}" placeholder="https://mitienda.com" />
              <p class="mt-1 text-xs text-stone-500">Mercado Pago vuelve a esta dirección después del pago.</p>
            </div>
            <div>
              <label for="contactEmail" class="${UI.label}">Email de contacto</label>
              <input id="contactEmail" type="email" formControlName="contactEmail" class="${UI.input}" />
            </div>
            <div>
              <label for="contactPhone" class="${UI.label}">Teléfono / WhatsApp</label>
              <input id="contactPhone" formControlName="contactPhone" class="${UI.input}" maxlength="40" />
            </div>
            <div>
              <label for="orderPrefix" class="${UI.label}">Prefijo de pedidos</label>
              <input id="orderPrefix" formControlName="orderPrefix" class="${UI.input} font-mono uppercase" maxlength="6" />
              <p class="mt-1 text-xs text-stone-500">2 a 6 mayúsculas o números (ej.: MLK-123456).</p>
            </div>
          </div>
        </section>

        @if (error()) {
          <div class="${UI.error}" role="alert">{{ error() }}</div>
        }
        @if (notice()) {
          <div class="${UI.success}">{{ notice() }}</div>
        }
        <button type="submit" class="${UI.btnPrimary}" [disabled]="saving()">
          <span class="material-symbols-outlined text-lg">save</span> {{ saving() ? 'Guardando…' : 'Guardar configuración' }}
        </button>
      </form>
    }
  `,
})
export class StoreSettingsForm {
  private api = inject(AdminApiService);
  private fb = inject(NonNullableFormBuilder);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  /** Última configuración guardada (para las zonas de envío). */
  readonly settings = signal<StoreSettings | null>(null);

  readonly form = this.fb.group({
    shippingFee: new FormControl<number | null>(0, [Validators.required, Validators.min(0)]),
    freeShippingThreshold: new FormControl<number | null>(0, [Validators.required, Validators.min(0)]),
    bundleDiscounts: this.fb.array<TierGroup>([]),
    bankTransferDiscountPercent: new FormControl<number | null>(0, [Validators.min(0), Validators.max(50)]),
    bankTransfer: this.fb.group({ holder: [''], cbu: [''], alias: [''], bank: [''], cuit: [''] }),
    storefrontUrl: ['', Validators.pattern(/^https?:\/\/\S+$/i)],
    contactEmail: ['', Validators.email],
    contactPhone: [''],
    orderPrefix: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{2,6}$/)]],
  });

  get tiers(): FormArray<TierGroup> {
    return this.form.controls.bundleDiscounts;
  }

  constructor() {
    this.api.settings().subscribe({
      next: (t) => {
        this.fill(t.settings);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(apiErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  private tierGroup(minItems: number | null = null, percent: number | null = null): TierGroup {
    return this.fb.group({
      minItems: new FormControl<number | null>(minItems, [Validators.required, Validators.min(1)]),
      percent: new FormControl<number | null>(percent, [Validators.required, Validators.min(0), Validators.max(90)]),
    });
  }

  private fill(s: StoreSettings): void {
    this.settings.set(s);
    this.tiers.clear();
    [...(s.bundleDiscounts ?? [])]
      .sort((a, b) => a.minItems - b.minItems)
      .forEach((t) => this.tiers.push(this.tierGroup(t.minItems, t.percent)));
    this.form.patchValue({
      shippingFee: s.shippingFee,
      freeShippingThreshold: s.freeShippingThreshold,
      bankTransferDiscountPercent: s.bankTransferDiscountPercent,
      bankTransfer: {
        holder: s.bankTransfer?.holder ?? '',
        cbu: s.bankTransfer?.cbu ?? '',
        alias: s.bankTransfer?.alias ?? '',
        bank: s.bankTransfer?.bank ?? '',
        cuit: s.bankTransfer?.cuit ?? '',
      },
      storefrontUrl: s.storefrontUrl ?? '',
      contactEmail: s.contactEmail ?? '',
      contactPhone: s.contactPhone ?? '',
      orderPrefix: s.orderPrefix ?? '',
    });
  }

  addTier(): void {
    const last = this.tiers.at(this.tiers.length - 1)?.getRawValue();
    this.tiers.push(this.tierGroup((last?.minItems ?? 1) + 1, last?.percent ?? 5));
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revisá los valores: montos enteros, porcentajes en rango, email y URL válidos.');
      return;
    }
    const v = this.form.getRawValue();
    const bt = v.bankTransfer;
    const anyBank = [bt.holder, bt.cbu, bt.alias, bt.bank].some((x) => x.trim());
    const fullBank = [bt.holder, bt.cbu, bt.alias, bt.bank].every((x) => x.trim());
    if (anyBank && !fullBank) {
      this.error.set('Para ofrecer transferencia completá titular, CBU, alias y banco.');
      return;
    }
    const settings: Partial<StoreSettings> = {
      shippingFee: intOrNull(v.shippingFee) ?? 0,
      freeShippingThreshold: intOrNull(v.freeShippingThreshold) ?? 0,
      bundleDiscounts: v.bundleDiscounts
        .map((t) => ({ minItems: intOrNull(t.minItems) ?? 1, percent: intOrNull(t.percent) ?? 0 }))
        .sort((a, b) => a.minItems - b.minItems),
      bankTransferDiscountPercent: intOrNull(v.bankTransferDiscountPercent) ?? 0,
      bankTransfer: fullBank
        ? {
            holder: bt.holder.trim(),
            cbu: bt.cbu.trim(),
            alias: bt.alias.trim(),
            bank: bt.bank.trim(),
            ...(bt.cuit.trim() ? { cuit: bt.cuit.trim() } : {}),
          }
        : null,
      ...(v.storefrontUrl.trim() ? { storefrontUrl: v.storefrontUrl.trim() } : {}),
      contactEmail: v.contactEmail.trim() || null,
      contactPhone: v.contactPhone.trim() || null,
      orderPrefix: v.orderPrefix.trim().toUpperCase(),
    };
    this.saving.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.api.updateSettings(settings).subscribe({
      next: (t) => {
        this.fill(t.settings);
        this.saving.set(false);
        this.notice.set('Configuración guardada.');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err));
      },
    });
  }
}

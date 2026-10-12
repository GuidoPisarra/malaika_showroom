import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { AbstractControl, FormControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ShippingZone, StoreSettings } from '../../../domain/admin/admin.models';
import { AdminApiService } from '../../../infrastructure/http/admin-api.service';
import { apiErrorMessage } from '../../../infrastructure/http/api.config';
import { ArsCurrencyPipe } from '../../shared/pipes/ars-currency.pipe';
import { UI, intOrNull } from '../shared/admin-ui';

/** Las 24 jurisdicciones de Argentina. */
export const AR_PROVINCES = [
  'Ciudad Autónoma de Buenos Aires',
  'Buenos Aires',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
];

const POSTAL_RANGE = /^(\d{4})(?:\s*-\s*(\d{4}))?$/;
const MAX_ZONES = 50;

/** Separa "1425, 1000-1499" en códigos o rangos normalizados. */
function splitPostalCodes(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((t) => t.trim().replace(/\s*-\s*/, '-'))
    .filter(Boolean);
}

function postalCodesValidator(control: AbstractControl<string>): ValidationErrors | null {
  const bad = splitPostalCodes(control.value).filter((t) => {
    const m = t.match(POSTAL_RANGE);
    return !m || (m[2] !== undefined && Number(m[1]) > Number(m[2]));
  });
  if (bad.length) return { postalCodes: bad };
  return splitPostalCodes(control.value).length > 100 ? { tooMany: true } : null;
}

/** "Gran Buenos Aires" → "gran-buenos-aires" (id de la zona). */
function slugify(text: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36)
    .replace(/-+$/, '');
  return slug || 'zona';
}

@Component({
  selector: 'admin-shipping-zones',
  imports: [ReactiveFormsModule, ArsCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="${UI.card} p-5 space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
        <div class="min-w-0">
          <h3 class="font-sans text-sm font-semibold text-stone-900 flex items-center gap-2">
            <span class="material-symbols-outlined text-lg text-amber-700">map</span> Zonas de envío
          </h3>
          <p class="mt-1 max-w-xl text-xs text-stone-500">
            Cada zona tiene su costo, su mínimo para envío gratis y su demora. Para una dirección primero se busca una zona por código postal y, si
            ninguna coincide, por provincia: el código postal siempre gana. Si dos zonas coinciden, se usa la que está más arriba.
          </p>
        </div>
        @if (editingIndex() === null) {
          <button type="button" class="${UI.btnSecondary} shrink-0 py-1.5" (click)="openEditor(null)" [disabled]="zones().length >= ${MAX_ZONES} || saving()">
            <span class="material-symbols-outlined text-lg">add_location_alt</span> Nueva zona
          </button>
        }
      </div>

      @if (zones().length) {
        <ul class="divide-y divide-stone-100 rounded-xl border border-stone-200">
          @for (z of zones(); track z.id; let i = $index, first = $first, last = $last) {
            <li class="flex flex-wrap items-center gap-3 px-4 py-3" [class.bg-amber-50]="editingIndex() === i">
              <div class="min-w-0 flex-1">
                <p class="flex flex-wrap items-center gap-2 text-sm font-medium text-stone-900">
                  {{ z.name }}
                  <span class="font-mono text-[11px] font-normal text-stone-400">{{ z.id }}</span>
                </p>
                <p class="mt-0.5 text-xs text-stone-500">
                  @if (z.postalCodes.length) {
                    <span>CP {{ z.postalCodes.join(', ') }}</span>
                  }
                  @if (z.postalCodes.length && z.provinces.length) {
                    ·
                  }
                  @if (z.provinces.length) {
                    <span>{{ z.provinces.join(', ') }}</span>
                  }
                </p>
              </div>
              <div class="text-right text-xs text-stone-600">
                <p class="text-sm font-semibold text-stone-900">{{ z.fee | arsCurrency }}</p>
                <p>
                  @if (z.freeShippingThreshold === null) {
                    Gratis desde {{ generalThreshold() | arsCurrency }} (general)
                  } @else if (z.freeShippingThreshold === 0) {
                    Nunca gratis
                  } @else {
                    Gratis desde {{ z.freeShippingThreshold | arsCurrency }}
                  }
                </p>
                @if (z.eta) {
                  <p class="text-stone-400">{{ z.eta }}</p>
                }
              </div>
              <div class="flex items-center">
                <button type="button" class="${UI.btnIcon} disabled:opacity-30" [disabled]="first || saving() || editingIndex() !== null" (click)="move(i, -1)" aria-label="Subir zona">
                  <span class="material-symbols-outlined text-lg">arrow_upward</span>
                </button>
                <button type="button" class="${UI.btnIcon} disabled:opacity-30" [disabled]="last || saving() || editingIndex() !== null" (click)="move(i, 1)" aria-label="Bajar zona">
                  <span class="material-symbols-outlined text-lg">arrow_downward</span>
                </button>
                <button type="button" class="${UI.btnIcon}" [disabled]="saving()" (click)="openEditor(i)" [attr.aria-label]="'Editar zona ' + z.name">
                  <span class="material-symbols-outlined text-lg">edit</span>
                </button>
                <button type="button" class="${UI.btnIcon} hover:text-rose-700" [disabled]="saving()" (click)="remove(i)" [attr.aria-label]="'Eliminar zona ' + z.name">
                  <span class="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </li>
          }
        </ul>
      } @else if (editingIndex() === null) {
        <p class="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-500">
          Sin zonas: todos los envíos usan el costo general ({{ generalFee() | arsCurrency }}).
        </p>
      }

      @if (editingIndex() !== null) {
        <div [formGroup]="form" class="space-y-4 rounded-xl border border-amber-200 bg-amber-50/40 p-4" (keydown.enter)="onEnter($event)">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-semibold text-stone-900">{{ editingIndex() === -1 ? 'Nueva zona' : 'Editar zona' }}</h4>
            <button type="button" class="${UI.btnIcon}" (click)="closeEditor()" aria-label="Cerrar">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label for="zname" class="${UI.label}">Nombre *</label>
              <input id="zname" formControlName="name" class="${UI.input}" maxlength="80" placeholder="Ej.: Gran Buenos Aires" />
              @if (zoneInvalid('name')) {
                <p class="mt-1 text-xs text-rose-700">Poné un nombre para la zona.</p>
              }
            </div>
            <div class="sm:col-span-2">
              <label for="zcp" class="${UI.label}">Códigos postales</label>
              <input id="zcp" formControlName="postalCodes" class="${UI.input} font-mono" placeholder="1425, 1600-1999" />
              @if (form.controls.postalCodes.errors?.['postalCodes']; as bad) {
                <p class="mt-1 text-xs text-rose-700">No entendemos {{ bad.join(', ') }}. Usá 4 dígitos (1425) o un rango (1000-1499), separados por comas.</p>
              } @else if (form.controls.postalCodes.errors?.['tooMany']) {
                <p class="mt-1 text-xs text-rose-700">Hasta 100 códigos o rangos por zona.</p>
              } @else {
                <p class="mt-1 text-xs text-stone-500">Separados por comas. Un código (1425) o un rango (1000-1499). Sirve también con el CPA (C1425ABC).</p>
              }
            </div>
            <div class="sm:col-span-2">
              <p class="${UI.label}">Provincias ({{ selectedProvinces().length }})</p>
              <div class="flex flex-wrap gap-1.5">
                @for (p of provinceOptions(); track p) {
                  <button
                    type="button"
                    class="rounded-full border px-2.5 py-1 text-xs transition-colors"
                    [class]="selectedProvinces().includes(p) ? 'border-amber-400 bg-amber-100 text-amber-900 font-medium' : 'border-stone-200 bg-white text-stone-600 hover:border-amber-300'"
                    [attr.aria-pressed]="selectedProvinces().includes(p)"
                    (click)="toggleProvince(p)"
                  >
                    @if (selectedProvinces().includes(p)) {
                      <span class="material-symbols-outlined align-[-3px] text-sm">check</span>
                    }
                    {{ p }}
                  </button>
                }
              </div>
              <p class="mt-1 text-xs text-stone-500">Se usan solo si el código postal no coincide con ninguna zona.</p>
            </div>
            <div>
              <label for="zfee" class="${UI.label}">Costo de envío (ARS) *</label>
              <input id="zfee" type="number" min="0" step="1" formControlName="fee" class="${UI.input}" />
              @if (zoneInvalid('fee')) {
                <p class="mt-1 text-xs text-rose-700">Ingresá un monto entero en pesos.</p>
              }
            </div>
            <div>
              <label for="zfree" class="${UI.label}">Envío gratis desde (ARS)</label>
              <input id="zfree" type="number" min="0" step="1" formControlName="freeShippingThreshold" class="${UI.input}" [placeholder]="'General: ' + (generalThreshold() | arsCurrency)" />
              <p class="mt-1 text-xs text-stone-500">Vacío usa el mínimo general. Con 0 el envío a esta zona nunca es gratis.</p>
            </div>
            <div class="sm:col-span-2">
              <label for="zeta" class="${UI.label}">Demora estimada</label>
              <input id="zeta" formControlName="eta" class="${UI.input}" maxlength="80" placeholder="Ej.: 24 a 48 h hábiles" />
            </div>
          </div>
          @if (editorError()) {
            <div class="${UI.error}" role="alert">{{ editorError() }}</div>
          }
          <div class="flex gap-2">
            <button type="button" class="${UI.btnPrimary}" [disabled]="saving()" (click)="saveZone()">
              <span class="material-symbols-outlined text-lg">save</span> {{ saving() ? 'Guardando…' : 'Guardar zona' }}
            </button>
            <button type="button" class="${UI.btnSecondary}" (click)="closeEditor()">Cancelar</button>
          </div>
        </div>
      }

      <label class="flex items-start gap-3 rounded-xl bg-stone-50 px-4 py-3 text-sm">
        <input type="checkbox" class="mt-0.5 h-4 w-4 accent-amber-700" [checked]="shipsOutside()" [disabled]="saving()" (change)="setShipsOutside($any($event.target).checked)" />
        <span>
          Enviar también fuera de estas zonas con el costo general
          <span class="block text-xs text-stone-500">
            @if (shipsOutside()) {
              Las direcciones que no caen en ninguna zona pagan {{ generalFee() | arsCurrency }}.
            } @else {
              Si la dirección no cae en ninguna zona, el checkout avisa que no hacemos envíos ahí.
            }
          </span>
        </span>
      </label>

      @if (error()) {
        <div class="${UI.error}" role="alert">{{ error() }}</div>
      }
      @if (notice()) {
        <div class="${UI.success}">{{ notice() }}</div>
      }
    </section>
  `,
})
export class ShippingZonesCard {
  private api = inject(AdminApiService);
  private fb = inject(NonNullableFormBuilder);

  /** Configuración guardada (la carga el formulario de la tienda). */
  readonly settings = input.required<StoreSettings>();

  readonly zones = linkedSignal(() => this.settings().shippingZones ?? []);
  readonly shipsOutside = linkedSignal(() => this.settings().shipsOutsideZones !== false);
  readonly generalFee = computed(() => this.settings().shippingFee);
  readonly generalThreshold = computed(() => this.settings().freeShippingThreshold);

  /** null: editor cerrado; -1: zona nueva; otro: índice de la zona que se edita. */
  readonly editingIndex = signal<number | null>(null);
  readonly selectedProvinces = signal<string[]>([]);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly editorError = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  /** Las 24 jurisdicciones más las que ya tenga cargadas la zona con otro nombre. */
  readonly provinceOptions = computed(() => [...AR_PROVINCES, ...this.selectedProvinces().filter((p) => !AR_PROVINCES.includes(p))]);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    postalCodes: ['', postalCodesValidator],
    fee: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    freeShippingThreshold: new FormControl<number | null>(null, Validators.min(0)),
    eta: ['', Validators.maxLength(80)],
  });

  zoneInvalid(name: 'name' | 'fee'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  onEnter(event: Event): void {
    // Enter guarda la zona y no envía el formulario general de la tienda.
    if ((event.target as HTMLElement).tagName !== 'INPUT') return;
    event.preventDefault();
    this.saveZone();
  }

  openEditor(index: number | null): void {
    const zone = index === null ? null : this.zones()[index];
    this.form.reset({
      name: zone?.name ?? '',
      postalCodes: (zone?.postalCodes ?? []).join(', '),
      fee: zone?.fee ?? this.generalFee(),
      freeShippingThreshold: zone?.freeShippingThreshold ?? null,
      eta: zone?.eta ?? '',
    });
    this.selectedProvinces.set([...(zone?.provinces ?? [])]);
    this.editorError.set(null);
    this.notice.set(null);
    this.editingIndex.set(index ?? -1);
  }

  closeEditor(): void {
    this.editingIndex.set(null);
    this.editorError.set(null);
  }

  toggleProvince(p: string): void {
    this.selectedProvinces.update((list) => (list.includes(p) ? list.filter((x) => x !== p) : [...list, p]));
  }

  private uniqueId(name: string, skip: number): string {
    const taken = new Set(this.zones().filter((_, i) => i !== skip).map((z) => z.id));
    const base = slugify(name);
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    return id;
  }

  saveZone(): void {
    const index = this.editingIndex();
    if (index === null) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.editorError.set('Revisá los campos marcados.');
      return;
    }
    const v = this.form.getRawValue();
    const postalCodes = splitPostalCodes(v.postalCodes);
    const provinces = AR_PROVINCES.filter((p) => this.selectedProvinces().includes(p)).concat(
      this.selectedProvinces().filter((p) => !AR_PROVINCES.includes(p)),
    );
    if (!postalCodes.length && !provinces.length) {
      this.editorError.set('Indicá al menos un código postal o una provincia.');
      return;
    }
    const previous = index >= 0 ? this.zones()[index] : null;
    const zone: ShippingZone = {
      // Una zona existente conserva su id aunque cambie el nombre.
      id: previous?.id ?? this.uniqueId(v.name, -1),
      name: v.name.trim(),
      postalCodes,
      provinces,
      fee: intOrNull(v.fee) ?? 0,
      freeShippingThreshold: intOrNull(v.freeShippingThreshold),
      eta: v.eta.trim(),
    };
    const zones = index >= 0 ? this.zones().map((z, i) => (i === index ? zone : z)) : [...this.zones(), zone];
    this.persist({ shippingZones: zones }, previous ? `Zona “${zone.name}” actualizada.` : `Zona “${zone.name}” creada.`, true);
  }

  remove(index: number): void {
    const zone = this.zones()[index];
    if (!zone || !confirm(`¿Eliminar la zona “${zone.name}”?`)) return;
    if (this.editingIndex() === index) this.closeEditor();
    this.persist({ shippingZones: this.zones().filter((_, i) => i !== index) }, `Zona “${zone.name}” eliminada.`);
  }

  move(index: number, delta: number): void {
    const target = index + delta;
    const zones = [...this.zones()];
    if (target < 0 || target >= zones.length) return;
    [zones[index], zones[target]] = [zones[target], zones[index]];
    this.persist({ shippingZones: zones }, 'Orden de las zonas guardado.');
  }

  setShipsOutside(value: boolean): void {
    this.shipsOutside.set(value);
    this.persist(
      { shipsOutsideZones: value },
      value ? 'Ahora también enviás fuera de las zonas, con el costo general.' : 'Ahora solo enviás a las zonas cargadas.',
      false,
      () => this.shipsOutside.set(!value),
    );
  }

  private persist(partial: Partial<StoreSettings>, notice: string, fromEditor = false, onError?: () => void): void {
    this.saving.set(true);
    this.error.set(null);
    this.editorError.set(null);
    this.notice.set(null);
    this.api.updateSettings(partial).subscribe({
      next: (t) => {
        this.saving.set(false);
        this.zones.set(t.settings.shippingZones ?? []);
        this.shipsOutside.set(t.settings.shipsOutsideZones !== false);
        if (fromEditor) this.closeEditor();
        this.notice.set(notice);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        onError?.();
        (fromEditor ? this.editorError : this.error).set(apiErrorMessage(err));
      },
    });
  }
}

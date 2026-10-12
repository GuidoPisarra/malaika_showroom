import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AdminProduct, LookPreset, LookPresetInput, ShowroomZone } from '../../../domain/admin/admin.models';
import { AdminApiService } from '../../../infrastructure/http/admin-api.service';
import { apiErrorMessage } from '../../../infrastructure/http/api.config';
import { ArsCurrencyPipe } from '../../shared/pipes/ars-currency.pipe';
import { EmptyComponent, LoadingComponent, UI } from '../shared/admin-ui';

const MAX_ITEMS = 10;
const URL_PATTERN = /^https?:\/\/\S+$/i;

@Component({
  selector: 'admin-looks-page',
  imports: [ReactiveFormsModule, ArsCurrencyPipe, LoadingComponent, EmptyComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 class="${UI.h1}">Looks</h1>
        <p class="text-sm text-stone-500">Combinaciones sugeridas que aparecen en “Armá tu look”.</p>
      </div>
      @if (!formOpen()) {
        <button type="button" class="${UI.btnPrimary}" (click)="openForm(null)">
          <span class="material-symbols-outlined text-lg">add</span> Nuevo look
        </button>
      }
    </div>

    @if (error()) {
      <div class="${UI.error} mb-4">{{ error() }}</div>
    }

    @if (formOpen()) {
      <form [formGroup]="form" (ngSubmit)="save()" novalidate class="${UI.card} p-5 mb-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-xl font-semibold">{{ editing() ? 'Editar look' : 'Nuevo look' }}</h2>
          <button type="button" class="${UI.btnIcon}" (click)="closeForm()" aria-label="Cerrar formulario">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="grid gap-4 md:grid-cols-[7rem_1fr]">
          <div class="h-36 w-28 overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
            @if (validPreview()) {
              <img [src]="form.controls.imagePreview.value" alt="Vista previa del look" class="text-transparent h-full w-full object-cover" />
            } @else {
              <div class="flex h-full items-center justify-center text-stone-300"><span class="material-symbols-outlined text-3xl">image</span></div>
            }
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="lname" class="${UI.label}">Nombre *</label>
              <input id="lname" formControlName="name" class="${UI.input}" maxlength="120" />
            </div>
            <div>
              <label for="tag" class="${UI.label}">Etiqueta</label>
              <input id="tag" formControlName="tag" class="${UI.input}" maxlength="40" placeholder="Ej.: Edición Verano" />
            </div>
            <div class="sm:col-span-2">
              <label for="lsubtitle" class="${UI.label}">Bajada</label>
              <input id="lsubtitle" formControlName="subtitle" class="${UI.input}" maxlength="200" />
            </div>
            <div class="sm:col-span-2">
              <label for="imagePreview" class="${UI.label}">URL de la imagen *</label>
              <input id="imagePreview" type="url" formControlName="imagePreview" class="${UI.input}" placeholder="https://…" (input)="previewTick.set(previewTick() + 1)" />
            </div>
          </div>
        </div>

        <div>
          <p class="${UI.label}">Prendas del look ({{ selectedIds().length }}/${MAX_ITEMS}) *</p>
          <div class="flex flex-wrap gap-2 mb-3 min-h-8">
            @for (p of selectedProducts(); track p.id) {
              <span class="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 py-1 pl-1 pr-2 text-sm text-amber-900">
                <img [src]="p.image" alt="" class="text-transparent h-6 w-6 rounded-full object-cover" />
                {{ p.name }}
                <button type="button" class="rounded-full hover:bg-amber-100" (click)="toggle(p.id)" [attr.aria-label]="'Quitar ' + p.name">
                  <span class="material-symbols-outlined text-sm">close</span>
                </button>
              </span>
            } @empty {
              <span class="text-xs text-stone-400">Elegí prendas de la lista.</span>
            }
          </div>
          <input type="search" class="${UI.input} mb-2" placeholder="Filtrar productos…" [value]="pickerFilter()" (input)="pickerFilter.set($any($event.target).value)" aria-label="Filtrar productos" />
          <div class="grid max-h-72 gap-2 overflow-y-auto rounded-xl border border-stone-200 p-2 sm:grid-cols-2 lg:grid-cols-3">
            @for (p of pickerProducts(); track p.id) {
              <button
                type="button"
                class="flex items-center gap-2 rounded-lg border p-1.5 text-left text-sm transition"
                [class]="selectedIds().includes(p.id) ? 'border-amber-400 bg-amber-50' : 'border-transparent hover:bg-stone-50'"
                (click)="toggle(p.id)"
                [attr.aria-pressed]="selectedIds().includes(p.id)"
              >
                <img [src]="p.image" alt="" class="text-transparent h-10 w-8 shrink-0 rounded object-cover bg-stone-100" loading="lazy" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-medium">{{ p.name }}</span>
                  <span class="block text-xs text-stone-500">{{ p.category }} · {{ p.price | arsCurrency }}</span>
                </span>
                @if (selectedIds().includes(p.id)) {
                  <span class="material-symbols-outlined text-lg text-amber-700">check_circle</span>
                }
              </button>
            } @empty {
              <p class="p-3 text-sm text-stone-400">No hay productos que coincidan.</p>
            }
          </div>
        </div>

        @if (formError()) {
          <div class="${UI.error}" role="alert">{{ formError() }}</div>
        }
        <div class="flex gap-2">
          <button type="submit" class="${UI.btnPrimary}" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar look' }}</button>
          <button type="button" class="${UI.btnSecondary}" (click)="closeForm()">Cancelar</button>
        </div>
      </form>
    }

    @if (loading()) {
      <admin-loading text="Cargando looks…" />
    } @else {
      @if (!presets().length) {
        <div class="${UI.card}"><admin-empty icon="styler" text="Todavía no armaste looks." /></div>
      } @else {
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          @for (look of presets(); track look.id) {
            <article class="${UI.card} overflow-hidden flex">
              <img [src]="look.imagePreview" [alt]="look.name" class="text-transparent w-28 shrink-0 object-cover bg-stone-100" loading="lazy" />
              <div class="flex min-w-0 flex-1 flex-col p-4">
                @if (look.tag) {
                  <span class="mb-1 self-start rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">{{ look.tag }}</span>
                }
                <h3 class="font-display text-lg font-semibold leading-tight">{{ look.name }}</h3>
                @if (look.subtitle) {
                  <p class="mt-0.5 text-xs text-stone-500 line-clamp-2">{{ look.subtitle }}</p>
                }
                <p class="mt-2 text-xs text-stone-600">{{ look.itemIds.length }} prendas · {{ lookTotal(look) | arsCurrency }}</p>
                <div class="mt-auto flex gap-1 pt-3">
                  <button type="button" class="${UI.btnSecondary} px-3 py-1.5" (click)="openForm(look)">
                    <span class="material-symbols-outlined text-base">edit</span> Editar
                  </button>
                  <button type="button" class="${UI.btnIcon} hover:text-rose-700" (click)="remove(look)" [attr.aria-label]="'Eliminar ' + look.name">
                    <span class="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>
              </div>
            </article>
          }
        </div>
      }

      <section class="mt-10">
        <h2 class="font-display text-2xl font-semibold">Zonas del showroom</h2>
        <p class="mb-3 text-sm text-stone-500">Vista de solo lectura. La edición de zonas y hotspots llega en una próxima versión.</p>
        @if (!zones().length) {
          <div class="${UI.card}"><admin-empty icon="view_in_ar" text="No hay zonas configuradas." /></div>
        } @else {
          <div class="${UI.card} divide-y divide-stone-100">
            @for (z of zones(); track z.id) {
              <div class="flex items-center gap-4 p-4">
                <img [src]="z.panoramicImage" [alt]="z.name" class="text-transparent h-12 w-20 shrink-0 rounded-lg object-cover bg-stone-100" loading="lazy" />
                <div class="min-w-0 flex-1">
                  <p class="flex items-center gap-2 font-medium">
                    @if (z.accentColor) {
                      <span class="h-3 w-3 rounded-full" [style.background]="z.accentColor"></span>
                    }
                    {{ z.name }}
                  </p>
                  @if (z.ambianceTitle) {
                    <p class="truncate text-xs text-stone-500">{{ z.ambianceTitle }}</p>
                  }
                </div>
                <span class="whitespace-nowrap rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                  {{ z.hotspots.length }} {{ z.hotspots.length === 1 ? 'hotspot' : 'hotspots' }}
                </span>
              </div>
            }
          </div>
        }
      </section>
    }
  `,
})
export class LooksPage {
  private api = inject(AdminApiService);
  private fb = inject(NonNullableFormBuilder);

  readonly presets = signal<LookPreset[]>([]);
  readonly zones = signal<ShowroomZone[]>([]);
  readonly products = signal<AdminProduct[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly formOpen = signal(false);
  readonly editing = signal<LookPreset | null>(null);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly selectedIds = signal<string[]>([]);
  readonly pickerFilter = signal('');
  readonly previewTick = signal(0);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    subtitle: [''],
    tag: [''],
    imagePreview: ['', [Validators.required, Validators.pattern(URL_PATTERN)]],
  });

  private readonly productById = computed(() => new Map(this.products().map((p) => [p.id, p])));
  readonly selectedProducts = computed(() =>
    this.selectedIds()
      .map((id) => this.productById().get(id))
      .filter((p): p is AdminProduct => !!p),
  );
  readonly pickerProducts = computed(() => {
    const q = this.pickerFilter().trim().toLowerCase();
    return this.products().filter((p) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  });
  readonly validPreview = computed(() => {
    this.previewTick();
    return URL_PATTERN.test(this.form.controls.imagePreview.value);
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      presets: this.api.lookPresets(),
      zones: this.api.showroomZones(),
      products: this.api.products({ page: 1, pageSize: 100 }),
    }).subscribe({
      next: ({ presets, zones, products }) => {
        this.presets.set(presets);
        this.zones.set(zones);
        this.products.set(products.items);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(apiErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  lookTotal(look: LookPreset): number {
    const map = this.productById();
    return look.itemIds.reduce((sum, id) => sum + (map.get(id)?.price ?? 0), 0);
  }

  openForm(look: LookPreset | null): void {
    this.editing.set(look);
    this.formError.set(null);
    this.pickerFilter.set('');
    this.form.reset({
      name: look?.name ?? '',
      subtitle: look?.subtitle ?? '',
      tag: look?.tag ?? '',
      imagePreview: look?.imagePreview ?? '',
    });
    this.selectedIds.set([...(look?.itemIds ?? [])]);
    this.previewTick.update((n) => n + 1);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  toggle(id: string): void {
    this.selectedIds.update((ids) => {
      if (ids.includes(id)) return ids.filter((x) => x !== id);
      return ids.length >= MAX_ITEMS ? ids : [...ids, id];
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Completá el nombre y una URL de imagen válida.');
      return;
    }
    if (!this.selectedIds().length) {
      this.formError.set('Elegí al menos una prenda.');
      return;
    }
    const v = this.form.getRawValue();
    const editing = this.editing();
    const body: LookPresetInput = {
      name: v.name.trim(),
      subtitle: v.subtitle.trim(),
      tag: v.tag.trim(),
      imagePreview: v.imagePreview.trim(),
      itemIds: this.selectedIds(),
      position: editing?.position ?? this.presets().length,
    };
    this.saving.set(true);
    this.formError.set(null);
    (editing ? this.api.updateLookPreset(editing.id, body) : this.api.createLookPreset(body)).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.presets.update((list) => (editing ? list.map((l) => (l.id === saved.id ? saved : l)) : [...list, saved]));
        this.closeForm();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(err));
      },
    });
  }

  remove(look: LookPreset): void {
    if (!confirm(`¿Eliminar el look “${look.name}”?`)) return;
    this.error.set(null);
    this.api.deleteLookPreset(look.id).subscribe({
      next: () => this.presets.update((list) => list.filter((l) => l.id !== look.id)),
      error: (err: unknown) => this.error.set(apiErrorMessage(err)),
    });
  }
}

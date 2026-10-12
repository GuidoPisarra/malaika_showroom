import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminProduct, ArModelType, ProductInput, ProductSlot } from '../../../domain/admin/admin.models';
import { AdminApiService } from '../../../infrastructure/http/admin-api.service';
import { apiErrorMessage } from '../../../infrastructure/http/api.config';
import { LoadingComponent, UI, intOrNull } from '../shared/admin-ui';

type ColorGroup = FormGroup<{ name: FormControl<string>; hex: FormControl<string> }>;

const INVALID_MSG = 'Revisá los campos marcados.';
const URL_PATTERN = /^https?:\/\/\S+$/i;
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

const SLOTS: { value: ProductSlot; label: string }[] = [
  { value: 'top', label: 'Parte de arriba' },
  { value: 'bottom', label: 'Parte de abajo' },
  { value: 'dress', label: 'Vestido / enterito' },
  { value: 'shoes', label: 'Calzado' },
  { value: 'accessory', label: 'Accesorio' },
];

const AR_TYPES: { value: ArModelType | ''; label: string }[] = [
  { value: '', label: 'Sin exhibición AR' },
  { value: 'hanger', label: 'Percha' },
  { value: 'mannequin', label: 'Maniquí' },
  { value: 'display-stand', label: 'Exhibidor' },
];

@Component({
  selector: 'admin-product-form-page',
  imports: [ReactiveFormsModule, RouterLink, LoadingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6">
      <a routerLink="/admin/productos" class="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-amber-800">
        <span class="material-symbols-outlined text-base">arrow_back</span> Productos
      </a>
      <h1 class="${UI.h1} mt-1">{{ isNew() ? 'Nuevo producto' : (product()?.name ?? 'Editar producto') }}</h1>
    </div>

    @if (loading()) {
      <admin-loading text="Cargando producto…" />
    } @else if (loadError()) {
      <div class="${UI.error}">{{ loadError() }}</div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="save()" novalidate class="grid gap-6 xl:grid-cols-3">
        <div class="space-y-6 xl:col-span-2">
          <!-- Datos básicos -->
          <section class="${UI.card} p-5 space-y-4">
            <h2 class="font-sans text-sm font-semibold text-stone-900">Datos básicos</h2>
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label for="name" class="${UI.label}">Nombre *</label>
                <input id="name" formControlName="name" class="${UI.input}" maxlength="160" />
                @if (invalid('name')) {
                  <p class="mt-1 text-xs text-rose-700">Ingresá un nombre (mínimo 2 caracteres).</p>
                }
              </div>
              <div class="sm:col-span-2">
                <label for="subtitle" class="${UI.label}">Bajada</label>
                <input id="subtitle" formControlName="subtitle" class="${UI.input}" maxlength="200" placeholder="Ej.: Seda italiana con caída fluida" />
              </div>
              <div class="sm:col-span-2">
                <label for="description" class="${UI.label}">Descripción</label>
                <textarea id="description" rows="4" formControlName="description" class="${UI.input}" maxlength="5000"></textarea>
              </div>
              <div>
                <label for="sku" class="${UI.label}">SKU</label>
                <input id="sku" formControlName="sku" class="${UI.input} font-mono" maxlength="60" />
              </div>
              <div>
                <label for="category" class="${UI.label}">Categoría *</label>
                <input id="category" formControlName="category" class="${UI.input}" list="categories" maxlength="40" />
                <datalist id="categories">
                  @for (c of categories; track c) {
                    <option [value]="c"></option>
                  }
                </datalist>
                @if (invalid('category')) {
                  <p class="mt-1 text-xs text-rose-700">Indicá una categoría.</p>
                }
              </div>
              <div>
                <label for="slot" class="${UI.label}">Lugar en el maniquí</label>
                <select id="slot" formControlName="slot" class="${UI.input}">
                  @for (s of slots; track s.value) {
                    <option [value]="s.value">{{ s.label }}</option>
                  }
                </select>
              </div>
              <div>
                <label for="occasion" class="${UI.label}">Ocasión</label>
                <input id="occasion" formControlName="occasion" class="${UI.input}" list="occasions" maxlength="40" />
                <datalist id="occasions">
                  @for (o of occasions; track o) {
                    <option [value]="o"></option>
                  }
                </datalist>
              </div>
              <div class="sm:col-span-2">
                <label for="material" class="${UI.label}">Material</label>
                <input id="material" formControlName="material" class="${UI.input}" maxlength="200" />
              </div>
            </div>
          </section>

          <!-- Imágenes -->
          <section class="${UI.card} p-5 space-y-4">
            <h2 class="font-sans text-sm font-semibold text-stone-900">Imágenes</h2>
            <div class="flex gap-4">
              <div class="h-32 w-24 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                @if (imagePreview()) {
                  <img [src]="imagePreview()" alt="Vista previa" class="text-transparent h-full w-full object-cover" />
                } @else {
                  <div class="flex h-full items-center justify-center text-stone-300"><span class="material-symbols-outlined text-3xl">image</span></div>
                }
              </div>
              <div class="flex-1">
                <label for="image" class="${UI.label}">URL de la imagen principal *</label>
                <input id="image" type="url" formControlName="image" class="${UI.input}" placeholder="https://…" />
                @if (invalid('image')) {
                  <p class="mt-1 text-xs text-rose-700">Ingresá una URL válida (http o https).</p>
                }
              </div>
            </div>

            <div formArrayName="gallery" class="space-y-2">
              <p class="${UI.label}">Galería</p>
              @for (ctrl of gallery.controls; track ctrl; let i = $index) {
                <div class="flex items-center gap-2">
                  <img [src]="ctrl.value" alt="" class="text-transparent h-10 w-8 shrink-0 rounded bg-stone-100 object-cover" />
                  <input [formControlName]="i" type="url" class="${UI.input}" placeholder="https://…" [attr.aria-label]="'Imagen de galería ' + (i + 1)" />
                  <button type="button" class="${UI.btnIcon}" (click)="gallery.removeAt(i)" aria-label="Quitar imagen">
                    <span class="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
                @if (ctrl.touched && ctrl.invalid) {
                  <p class="text-xs text-rose-700">URL inválida.</p>
                }
              }
              <button type="button" class="${UI.btnSecondary} py-1.5" (click)="addGallery()" [disabled]="gallery.length >= 20">
                <span class="material-symbols-outlined text-lg">add_photo_alternate</span> Agregar imagen
              </button>
            </div>
          </section>

          <!-- Variantes -->
          <section class="${UI.card} p-5 space-y-5">
            <h2 class="font-sans text-sm font-semibold text-stone-900">Colores y talles</h2>
            <div formArrayName="colors" class="space-y-2">
              <p class="${UI.label}">Colores</p>
              @for (group of colors.controls; track group; let i = $index) {
                <div [formGroupName]="i" class="flex items-center gap-2">
                  <input type="color" [value]="group.controls.hex.value" (input)="setHex(group, $any($event.target).value)" class="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-stone-300 bg-white p-1" [attr.aria-label]="'Color ' + (i + 1)" />
                  <input formControlName="hex" class="${UI.input} w-28 font-mono uppercase" maxlength="7" aria-label="Código hex" />
                  <input formControlName="name" class="${UI.input}" placeholder="Nombre del color" maxlength="60" aria-label="Nombre del color" />
                  <button type="button" class="${UI.btnIcon}" (click)="colors.removeAt(i)" aria-label="Quitar color">
                    <span class="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
                @if (group.touched && group.invalid) {
                  <p class="text-xs text-rose-700">Cada color necesita nombre y un código hex (#RRGGBB).</p>
                }
              }
              <button type="button" class="${UI.btnSecondary} py-1.5" (click)="addColor()" [disabled]="colors.length >= 30">
                <span class="material-symbols-outlined text-lg">palette</span> Agregar color
              </button>
            </div>

            <div>
              <label for="size" class="${UI.label}">Talles</label>
              <div class="flex flex-wrap gap-2 mb-2">
                @for (s of sizes(); track s) {
                  <span class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 py-1 pl-3 pr-1 text-sm text-amber-900">
                    {{ s }}
                    <button type="button" class="rounded-full p-0.5 hover:bg-amber-100" (click)="removeSize(s)" [attr.aria-label]="'Quitar talle ' + s">
                      <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                  </span>
                } @empty {
                  <span class="text-xs text-stone-400">Sin talles cargados.</span>
                }
              </div>
              <div class="flex gap-2">
                <input id="size" #sizeInput class="${UI.input}" placeholder="Ej.: M, 38, Única" (keydown.enter)="$event.preventDefault(); addSize(sizeInput.value); sizeInput.value = ''" />
                <button type="button" class="${UI.btnSecondary}" (click)="addSize(sizeInput.value); sizeInput.value = ''">Agregar</button>
              </div>
              <div class="mt-2 flex flex-wrap gap-1">
                @for (s of suggestedSizes; track s) {
                  @if (!sizes().includes(s)) {
                    <button type="button" class="rounded-full border border-stone-200 px-2 py-0.5 text-xs text-stone-500 hover:border-amber-300 hover:text-amber-800" (click)="addSize(s)">+ {{ s }}</button>
                  }
                }
              </div>
            </div>
          </section>

          <!-- Detalles -->
          <section class="${UI.card} p-5 space-y-2" formArrayName="details">
            <h2 class="font-sans text-sm font-semibold text-stone-900">Detalles</h2>
            <p class="text-xs text-stone-500">Una característica por renglón (cuidados, composición, calce…).</p>
            @for (ctrl of details.controls; track ctrl; let i = $index) {
              <div class="flex items-center gap-2">
                <input [formControlName]="i" class="${UI.input}" [attr.aria-label]="'Detalle ' + (i + 1)" />
                <button type="button" class="${UI.btnIcon}" (click)="details.removeAt(i)" aria-label="Quitar detalle">
                  <span class="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            }
            <button type="button" class="${UI.btnSecondary} py-1.5" (click)="addDetail()" [disabled]="details.length >= 30">
              <span class="material-symbols-outlined text-lg">add</span> Agregar detalle
            </button>
          </section>
        </div>

        <div class="space-y-6">
          <!-- Precio y stock -->
          <section class="${UI.card} p-5 space-y-4">
            <h2 class="font-sans text-sm font-semibold text-stone-900">Precio y stock</h2>
            <div>
              <label for="price" class="${UI.label}">Precio (ARS) *</label>
              <input id="price" type="number" min="0" step="1" formControlName="price" class="${UI.input}" />
              @if (invalid('price')) {
                <p class="mt-1 text-xs text-rose-700">Ingresá un precio entero en pesos.</p>
              }
            </div>
            <div>
              <label for="originalPrice" class="${UI.label}">Precio anterior (tachado)</label>
              <input id="originalPrice" type="number" min="0" step="1" formControlName="originalPrice" class="${UI.input}" placeholder="Opcional" />
            </div>
            @if (isNew()) {
              <div>
                <label for="stock" class="${UI.label}">Stock inicial</label>
                <input id="stock" type="number" min="0" step="1" formControlName="stock" class="${UI.input}" />
              </div>
            } @else {
              <p class="rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-600">
                Stock actual: <strong>{{ product()?.stock }}</strong>. Ajustalo desde el listado de productos.
              </p>
            }
          </section>

          <!-- Visibilidad -->
          <section class="${UI.card} p-5 space-y-3">
            <h2 class="font-sans text-sm font-semibold text-stone-900">Visibilidad</h2>
            <label class="flex items-center gap-3 text-sm">
              <input type="checkbox" formControlName="active" class="h-4 w-4 accent-amber-700" /> Activo (visible en la tienda)
            </label>
            <label class="flex items-center gap-3 text-sm">
              <input type="checkbox" formControlName="isNew" class="h-4 w-4 accent-amber-700" /> Marcar como novedad
            </label>
            <label class="flex items-center gap-3 text-sm">
              <input type="checkbox" formControlName="isTrending" class="h-4 w-4 accent-amber-700" /> Marcar como tendencia
            </label>
          </section>

          <!-- AR -->
          <section class="${UI.card} p-5 space-y-4">
            <h2 class="font-sans text-sm font-semibold text-stone-900">Showroom AR</h2>
            <div>
              <label for="arModelType" class="${UI.label}">Exhibición</label>
              <select id="arModelType" formControlName="arModelType" class="${UI.input}">
                @for (t of arTypes; track t.value) {
                  <option [value]="t.value">{{ t.label }}</option>
                }
              </select>
            </div>
            <div>
              <label for="arScale" class="${UI.label}">Escala (0,1 a 5)</label>
              <input id="arScale" type="number" min="0.1" max="5" step="0.1" formControlName="arScale" class="${UI.input}" placeholder="1" />
              @if (invalid('arScale')) {
                <p class="mt-1 text-xs text-rose-700">La escala va de 0,1 a 5.</p>
              }
            </div>
          </section>

          @if (error()) {
            <div class="${UI.error}" role="alert">{{ error() }}</div>
          }
          @if (notice()) {
            <div class="${UI.success}">{{ notice() }}</div>
          }

          <div class="flex flex-col gap-2">
            <button type="submit" class="${UI.btnPrimary} py-3" [disabled]="saving()">
              <span class="material-symbols-outlined text-lg">save</span>
              {{ saving() ? 'Guardando…' : isNew() ? 'Crear producto' : 'Guardar cambios' }}
            </button>
            @if (!isNew() && product()?.active) {
              <button type="button" class="${UI.btnDanger}" [disabled]="saving()" (click)="deactivate()">
                <span class="material-symbols-outlined text-lg">visibility_off</span> Dar de baja
              </button>
            }
          </div>
        </div>
      </form>
    }
  `,
})
export class ProductFormPage {
  private api = inject(AdminApiService);
  private router = inject(Router);
  private fb = inject(NonNullableFormBuilder);

  /** Parámetro :id de la ruta (no existe en /productos/nuevo). */
  readonly id = input<string>();
  readonly isNew = computed(() => !this.id());

  readonly slots = SLOTS;
  readonly arTypes = AR_TYPES;
  readonly categories = ['vestidos', 'tops', 'pantalones', 'faldas', 'calzado', 'accesorios', 'joyeria'];
  readonly occasions = ['casual', 'oficina', 'cocktail', 'fiesta', 'noche'];
  readonly suggestedSizes = ['XS', 'S', 'M', 'L', 'XL', '36', '37', '38', '39', '40', 'Única'];

  readonly product = signal<AdminProduct | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
    subtitle: [''],
    description: [''],
    sku: [''],
    price: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    originalPrice: new FormControl<number | null>(null, Validators.min(0)),
    category: ['', [Validators.required, Validators.maxLength(40)]],
    slot: ['accessory' as ProductSlot],
    image: ['', [Validators.required, Validators.pattern(URL_PATTERN)]],
    gallery: this.fb.array<FormControl<string>>([]),
    colors: this.fb.array<ColorGroup>([]),
    sizes: [[] as string[]],
    material: [''],
    occasion: ['casual'],
    isNew: [false],
    isTrending: [false],
    details: this.fb.array<FormControl<string>>([]),
    stock: new FormControl<number | null>(0, Validators.min(0)),
    arModelType: ['' as ArModelType | ''],
    arScale: new FormControl<number | null>(null, [Validators.min(0.1), Validators.max(5)]),
    active: [true],
  });

  private readonly imageValue = toSignal(this.form.controls.image.valueChanges, { initialValue: '' });
  readonly imagePreview = computed(() => (URL_PATTERN.test(this.imageValue() ?? '') ? this.imageValue() : ''));
  readonly sizes = toSignal(this.form.controls.sizes.valueChanges, { initialValue: [] as string[] });

  get gallery(): FormArray<FormControl<string>> {
    return this.form.controls.gallery;
  }
  get colors(): FormArray<ColorGroup> {
    return this.form.controls.colors;
  }
  get details(): FormArray<FormControl<string>> {
    return this.form.controls.details;
  }

  constructor() {
    this.form.statusChanges.pipe(takeUntilDestroyed()).subscribe((status) => {
      if (status === 'VALID' && this.error() === INVALID_MSG) this.error.set(null);
    });
    effect(() => {
      const id = this.id();
      if (id) this.load(id);
    });
  }

  private colorGroup(name = '', hex = '#C8A27A'): ColorGroup {
    return this.fb.group({
      name: [name, [Validators.required, Validators.maxLength(60)]],
      hex: [hex, [Validators.required, Validators.pattern(HEX_PATTERN)]],
    });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.product(id).subscribe({
      next: (p) => {
        this.product.set(p);
        this.fill(p);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loadError.set(apiErrorMessage(err, 'No encontramos el producto.'));
        this.loading.set(false);
      },
    });
  }

  private fill(p: AdminProduct): void {
    this.gallery.clear();
    (p.gallery ?? []).forEach((url) => this.gallery.push(this.fb.control(url, Validators.pattern(URL_PATTERN))));
    this.colors.clear();
    (p.colors ?? []).forEach((c) => this.colors.push(this.colorGroup(c.name, (c.hex ?? '').toUpperCase())));
    this.details.clear();
    (p.details ?? []).forEach((d) => this.details.push(this.fb.control(d)));
    this.form.patchValue({
      name: p.name,
      subtitle: p.subtitle ?? '',
      description: p.description ?? '',
      sku: p.sku ?? '',
      price: p.price,
      originalPrice: p.originalPrice ?? null,
      category: p.category,
      slot: p.slot ?? 'accessory',
      image: p.image,
      sizes: [...(p.sizes ?? [])],
      material: p.material ?? '',
      occasion: p.occasion ?? '',
      isNew: p.isNew,
      isTrending: p.isTrending,
      stock: p.stock,
      arModelType: p.arModelType ?? '',
      arScale: p.arScale ?? null,
      active: p.active,
    });
    this.form.markAsPristine();
  }

  invalid(name: 'name' | 'category' | 'image' | 'price' | 'arScale'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  addGallery(): void {
    this.gallery.push(this.fb.control('', Validators.pattern(URL_PATTERN)));
  }

  addColor(): void {
    this.colors.push(this.colorGroup());
  }

  setHex(group: ColorGroup, hex: string): void {
    group.controls.hex.setValue(hex.toUpperCase());
    group.controls.hex.markAsDirty();
  }

  addDetail(): void {
    this.details.push(this.fb.control(''));
  }

  addSize(raw: string): void {
    const size = raw.trim();
    const current = this.form.controls.sizes.value;
    if (!size || current.includes(size) || current.length >= 30) return;
    this.form.controls.sizes.setValue([...current, size]);
  }

  removeSize(size: string): void {
    this.form.controls.sizes.setValue(this.form.controls.sizes.value.filter((s) => s !== size));
  }

  private payload(): ProductInput {
    const v = this.form.getRawValue();
    const arScale = v.arScale === null || (v.arScale as unknown) === '' ? null : Number(v.arScale);
    const body: ProductInput = {
      name: v.name.trim(),
      subtitle: v.subtitle.trim(),
      description: v.description.trim(),
      sku: v.sku.trim() || null,
      price: intOrNull(v.price) ?? 0,
      originalPrice: intOrNull(v.originalPrice),
      category: v.category.trim(),
      slot: v.slot,
      image: v.image.trim(),
      gallery: v.gallery.map((g) => g.trim()).filter(Boolean),
      colors: v.colors.map((c) => ({ name: c.name.trim(), hex: c.hex.toUpperCase() })),
      sizes: v.sizes,
      material: v.material.trim(),
      occasion: v.occasion.trim(),
      isNew: v.isNew,
      isTrending: v.isTrending,
      details: v.details.map((d) => d.trim()).filter(Boolean),
      arModelType: v.arModelType || null,
      arScale,
      active: v.active,
    };
    if (this.isNew()) body.stock = intOrNull(v.stock) ?? 0;
    return body;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(INVALID_MSG);
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.notice.set(null);
    const body = this.payload();
    const id = this.id();
    const request = id ? this.api.updateProduct(id, body) : this.api.createProduct(body);
    request.subscribe({
      next: (p) => {
        this.saving.set(false);
        if (!id) {
          void this.router.navigate(['/admin/productos', p.id]);
          return;
        }
        this.product.set(p);
        this.fill(p);
        this.notice.set('Cambios guardados.');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err));
      },
    });
  }

  deactivate(): void {
    const p = this.product();
    if (!p || !confirm(`¿Dar de baja “${p.name}”? Deja de mostrarse en la tienda; podés reactivarlo después.`)) return;
    this.saving.set(true);
    this.error.set(null);
    this.api.deleteProduct(p.id).subscribe({
      next: () => {
        this.saving.set(false);
        void this.router.navigate(['/admin/productos']);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err));
      },
    });
  }
}

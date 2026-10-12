import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { AdminProduct, ArModelType, ProductInput, ProductSlot, VariantStock } from '../../../domain/admin/admin.models';
import { AdminApiService } from '../../../infrastructure/http/admin-api.service';
import { apiErrorMessage } from '../../../infrastructure/http/api.config';
import { LoadingComponent, UI, intOrNull } from '../shared/admin-ui';
import { ImageUploadComponent } from '../shared/image-upload.component';
import { GarmentShape, GarmentTexture, ProductCategory } from '../../../domain/catalog/models/product.model';
import {
  SHAPES_BY_SLOT,
  SHAPE_LABELS,
  TEXTURE_LABELS,
  resolveSilhouette,
} from '../../../domain/look-builder/services/garment-silhouette';
import { MannequinFigureComponent } from '../../components/mannequin-studio/mannequin-figure.component';
import { DressableItem } from '../../components/mannequin-studio/mannequin-garments';

type ColorGroup = FormGroup<{ name: FormControl<string>; hex: FormControl<string> }>;
type StockMode = 'general' | 'variants';

/** Clave de una celda de la grilla de stock (talle + color). */
const cellKey = (size: string, color: string) => `${size}\u0000${color}`;

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
  imports: [ReactiveFormsModule, RouterLink, LoadingComponent, ImageUploadComponent, MannequinFigureComponent],
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
              <div class="flex-1 space-y-3">
                <div>
                  <p class="${UI.label}">Imagen principal *</p>
                  <admin-image-upload folder="products" [label]="imagePreview() ? 'Reemplazar imagen principal' : 'Subir imagen principal'" (uploaded)="setImage($event)" />
                </div>
                <div>
                  <label for="image" class="text-xs text-stone-500">o pegá la URL de una imagen</label>
                  <input id="image" type="url" formControlName="image" class="${UI.input} mt-1" placeholder="https://…" />
                  @if (invalid('image')) {
                    <p class="mt-1 text-xs text-rose-700">Subí una imagen o ingresá una URL válida (http o https).</p>
                  }
                </div>
              </div>
            </div>

            <div formArrayName="gallery" class="space-y-2">
              <p class="${UI.label}">Galería ({{ gallery.length }}/20)</p>
              @for (ctrl of gallery.controls; track ctrl; let i = $index, first = $first, last = $last) {
                <div class="flex items-center gap-2">
                  <img [src]="ctrl.value" alt="" class="text-transparent h-12 w-10 shrink-0 rounded bg-stone-100 object-cover" />
                  <input [formControlName]="i" type="url" class="${UI.input}" placeholder="https://…" [attr.aria-label]="'Imagen de galería ' + (i + 1)" />
                  <button type="button" class="${UI.btnIcon} disabled:opacity-30" (click)="moveGallery(i, -1)" [disabled]="first" aria-label="Subir en el orden">
                    <span class="material-symbols-outlined text-lg">arrow_upward</span>
                  </button>
                  <button type="button" class="${UI.btnIcon} disabled:opacity-30" (click)="moveGallery(i, 1)" [disabled]="last" aria-label="Bajar en el orden">
                    <span class="material-symbols-outlined text-lg">arrow_downward</span>
                  </button>
                  <button type="button" class="${UI.btnIcon}" (click)="gallery.removeAt(i); gallery.markAsDirty()" aria-label="Quitar imagen">
                    <span class="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
                @if (ctrl.touched && ctrl.invalid) {
                  <p class="text-xs text-rose-700">URL inválida.</p>
                }
              }
              @if (gallery.length < 20) {
                <admin-image-upload folder="products" [multiple]="true" label="Subir imágenes a la galería" (uploaded)="addGallery($event)" />
              }
              <button type="button" class="${UI.btnSecondary} py-1.5" (click)="addGallery()" [disabled]="gallery.length >= 20">
                <span class="material-symbols-outlined text-lg">link</span> Agregar por URL
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

          <!-- Stock -->
          <section id="stock" class="${UI.card} p-5 space-y-4 scroll-mt-6">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h2 class="font-sans text-sm font-semibold text-stone-900">Stock</h2>
              <div class="inline-flex rounded-xl border border-stone-200 bg-white p-1 text-sm" role="radiogroup" aria-label="Cómo controlar el stock">
                <button type="button" role="radio" class="rounded-lg px-3 py-1.5" [class]="stockMode() === 'general' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'" [attr.aria-checked]="stockMode() === 'general'" (click)="setStockMode('general')">
                  Stock general
                </button>
                <button
                  type="button"
                  role="radio"
                  class="rounded-lg px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                  [class]="stockMode() === 'variants' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'"
                  [attr.aria-checked]="stockMode() === 'variants'"
                  [disabled]="!hasAxes()"
                  (click)="setStockMode('variants')"
                >
                  Por talle y color
                </button>
              </div>
            </div>

            @if (stockMode() === 'general') {
              <div class="max-w-xs">
                <label for="stock" class="${UI.label}">{{ isNew() ? 'Stock inicial' : 'Unidades disponibles' }}</label>
                <input id="stock" type="number" min="0" step="1" formControlName="stock" class="${UI.input}" />
                @if (form.controls.stock.invalid && form.controls.stock.touched) {
                  <p class="mt-1 text-xs text-rose-700">Ingresá un número entero mayor o igual a 0.</p>
                }
              </div>
              <p class="text-xs text-stone-500">
                Un solo número para todas las variantes.
                @if (hasAxes()) {
                  Si querés saber cuántas unidades quedan de cada talle y color, elegí “Por talle y color”.
                } @else {
                  Para controlar el stock por variante, primero cargá talles o colores.
                }
              </p>
            } @else {
              <p class="text-xs text-stone-500">
                Cargá las unidades de cada combinación. El stock del producto es la suma; las combinaciones en 0 no se pueden comprar en la tienda.
              </p>
              @if (axesChanged()) {
                <p class="flex items-start gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <span class="material-symbols-outlined text-base">info</span>
                  Cambiaste talles o colores: la grilla ya los muestra y se guardan juntos al tocar “Guardar”. Las combinaciones que quitaste se borran.
                </p>
              }
              <div class="overflow-x-auto rounded-xl border border-stone-200">
                <table class="min-w-full text-sm">
                  <thead class="bg-stone-50/80">
                    <tr>
                      <th class="${UI.th} whitespace-nowrap">Talle / color</th>
                      @for (c of colKeys(); track c) {
                        <th class="${UI.th} text-center whitespace-nowrap">
                          @if (c) {
                            <span class="inline-flex items-center gap-1.5">
                              <span class="h-3 w-3 rounded-full border border-stone-300" [style.background]="colorHex(c)"></span>{{ c }}
                            </span>
                          } @else {
                            Sin color
                          }
                        </th>
                      }
                      <th class="${UI.th} text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-stone-100">
                    @for (s of rowKeys(); track s) {
                      <tr>
                        <th scope="row" class="px-4 py-2 text-left text-sm font-semibold text-stone-800 whitespace-nowrap">{{ s || 'Talle único' }}</th>
                        @for (c of colKeys(); track c) {
                          <td class="px-2 py-1.5 text-center">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              inputmode="numeric"
                              class="w-20 rounded-lg border px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                              [class]="!cell(s, c) ? 'border-rose-200 bg-rose-50 text-rose-700 focus:border-rose-400' : 'border-stone-300 bg-white text-stone-900 focus:border-amber-700'"
                              [value]="cell(s, c)"
                              (input)="setCell(s, c, $any($event.target).value)"
                              [attr.aria-label]="'Stock ' + (s || 'talle único') + (c ? ' ' + c : '')"
                            />
                          </td>
                        }
                        <td class="px-4 py-2 text-right font-medium tabular-nums" [class.text-rose-700]="rowSum(s) === 0">{{ rowSum(s) }}</td>
                      </tr>
                    }
                  </tbody>
                  <tfoot class="border-t border-stone-200 bg-stone-50/80">
                    <tr>
                      <th scope="row" class="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-500">Total</th>
                      @for (c of colKeys(); track c) {
                        <td class="px-2 py-2 text-center font-medium tabular-nums" [class.text-rose-700]="colSum(c) === 0">{{ colSum(c) }}</td>
                      }
                      <td class="px-4 py-2 text-right text-base font-semibold tabular-nums text-stone-900">{{ gridTotal() }}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p class="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                <span class="inline-flex items-center gap-1.5"><span class="h-3 w-3 rounded border border-rose-200 bg-rose-50"></span> Sin stock</span>
                @if (outOfStockCells()) {
                  <span class="text-rose-700">{{ outOfStockCells() }} {{ outOfStockCells() === 1 ? 'combinación agotada' : 'combinaciones agotadas' }}</span>
                }
              </p>
            }
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
            <h2 class="font-sans text-sm font-semibold text-stone-900">Precio</h2>
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
            <p class="rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-600">
              Stock: <strong>{{ stockMode() === 'variants' ? gridTotal() : (form.controls.stock.value ?? 0) }}</strong>
              {{ stockMode() === 'variants' ? '(suma por talle y color)' : '(general)' }}.
              <a href="#stock" class="text-amber-800 underline-offset-2 hover:underline" (click)="$event.preventDefault(); scrollToStock()">Editar</a>
            </p>
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

          <!-- Maniquí -->
          <section class="${UI.card} p-5 space-y-4">
            <div>
              <h2 class="font-sans text-sm font-semibold text-stone-900">Cómo se ve en el maniquí</h2>
              <p class="mt-1 text-xs text-stone-500">Se usa en el probador de la tienda. Si no elegís nada, se arma con la categoría y el primer color.</p>
            </div>
            <div class="mx-auto w-36 aspect-[1/2] rounded-xl bg-stone-50 border border-stone-100">
              <app-mannequin-figure class="block w-full h-full" [slots]="mannequinPreview()" />
            </div>
            <div>
              <label for="silhouetteShape" class="${UI.label}">Forma</label>
              <select id="silhouetteShape" formControlName="silhouetteShape" class="${UI.input}">
                <option value="">Automática ({{ shapeLabels[autoShape()] }})</option>
                @for (shape of shapeOptions(); track shape) {
                  <option [value]="shape">{{ shapeLabels[shape] }}</option>
                }
              </select>
            </div>
            <div>
              <label for="silhouetteColor" class="${UI.label}">Color en el maniquí</label>
              <div class="flex items-center gap-2">
                <input
                  type="color"
                  [value]="previewColor()"
                  (input)="form.controls.silhouetteColor.setValue($any($event.target).value.toUpperCase())"
                  class="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-stone-300 bg-white p-1"
                  aria-label="Elegir color en el maniquí"
                />
                <input id="silhouetteColor" formControlName="silhouetteColor" class="${UI.input} font-mono uppercase" maxlength="7" placeholder="Primer color" />
              </div>
              @if (invalid('silhouetteColor')) {
                <p class="mt-1 text-xs text-rose-700">Usá un código hex (#RRGGBB) o dejalo vacío.</p>
              }
            </div>
            <div>
              <label for="silhouetteTexture" class="${UI.label}">Tela</label>
              <select id="silhouetteTexture" formControlName="silhouetteTexture" class="${UI.input}">
                @for (t of textureOptions; track t) {
                  <option [value]="t">{{ textureLabels[t] }}</option>
                }
              </select>
            </div>
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
  private route = inject(ActivatedRoute);
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
    silhouetteShape: ['' as GarmentShape | ''],
    silhouetteColor: ['', Validators.pattern(HEX_PATTERN)],
    silhouetteTexture: ['solid' as GarmentTexture],
    arModelType: ['' as ArModelType | ''],
    arScale: new FormControl<number | null>(null, [Validators.min(0.1), Validators.max(5)]),
    active: [true],
  });

  private readonly imageValue = toSignal(this.form.controls.image.valueChanges, { initialValue: '' });
  readonly imagePreview = computed(() => (URL_PATTERN.test(this.imageValue() ?? '') ? this.imageValue() : ''));
  readonly sizes = toSignal(this.form.controls.sizes.valueChanges, { initialValue: [] as string[] });
  private readonly colorsValue = toSignal(this.form.controls.colors.valueChanges, { initialValue: [] as Partial<{ name: string; hex: string }>[] });

  // ---------- Maniquí ----------
  readonly shapeLabels = SHAPE_LABELS;
  readonly textureLabels = TEXTURE_LABELS;
  readonly textureOptions = Object.keys(TEXTURE_LABELS) as GarmentTexture[];
  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  private readonly slotValue = computed(() => this.formValue().slot ?? 'accessory');
  readonly shapeOptions = computed(() => SHAPES_BY_SLOT[this.slotValue()]);

  /** Lo que se guarda y se dibuja: lo elegido o, si falta, lo que arma la tienda sola. */
  private readonly dressable = computed<DressableItem>(() => {
    const v = this.formValue();
    const color = (v.silhouetteColor ?? '').trim();
    return {
      slot: v.slot ?? 'accessory',
      category: (v.category ?? '').trim() as ProductCategory,
      colors: (v.colors ?? []).map((c) => ({ name: c.name ?? '', hex: c.hex ?? '' })),
      silhouette: {
        svgType: (v.silhouetteShape || undefined) as GarmentShape,
        colorHex: HEX_PATTERN.test(color) ? color : '',
        texturePattern: v.silhouetteTexture ?? 'solid',
      },
    };
  });
  readonly autoShape = computed(() => resolveSilhouette({ ...this.dressable(), silhouette: null }).svgType);
  readonly previewColor = computed(() => resolveSilhouette(this.dressable()).colorHex);
  readonly mannequinPreview = computed(() => ({ [this.slotValue()]: this.dressable() }));

  // ---------- Stock ----------
  readonly stockMode = signal<StockMode>('general');
  /** Unidades por combinación; null = celda vacía (cuenta como 0). */
  readonly cells = signal<Record<string, number | null>>({});
  /** Colores con nombre, sin repetir, en el orden del formulario. */
  readonly colorNames = computed(() => [...new Set(this.colorsValue().map((c) => (c.name ?? '').trim()).filter(Boolean))]);
  readonly hasAxes = computed(() => this.sizes().length > 0 || this.colorNames().length > 0);
  readonly rowKeys = computed(() => (this.sizes().length ? this.sizes() : ['']));
  readonly colKeys = computed(() => (this.colorNames().length ? this.colorNames() : ['']));
  readonly gridTotal = computed(() => this.rowKeys().reduce((sum, s) => sum + this.rowSum(s), 0));
  readonly outOfStockCells = computed(() => this.rowKeys().reduce((n, s) => n + this.colKeys().filter((c) => !this.cell(s, c)).length, 0));
  /** true si los talles o colores del formulario difieren de los guardados. */
  readonly axesChanged = computed(() => {
    const p = this.product();
    if (!p) return false;
    const saved = (p.colors ?? []).map((c) => c.name);
    return this.sizes().join('|') !== (p.sizes ?? []).join('|') || this.colorNames().join('|') !== saved.join('|');
  });

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
    const state = this.router.currentNavigation()?.extras.state as { notice?: string; error?: string } | undefined;
    if (state?.notice) this.notice.set(state.notice);
    if (state?.error) this.error.set(state.error);
    this.form.statusChanges.pipe(takeUntilDestroyed()).subscribe((status) => {
      if (status === 'VALID' && this.error() === INVALID_MSG) this.error.set(null);
    });
    // Al cambiar el lugar en el maniquí, una forma que ya no corresponde vuelve a automática.
    this.form.controls.slot.valueChanges.pipe(takeUntilDestroyed()).subscribe((slot) => {
      const shape = this.form.controls.silhouetteShape.value;
      if (shape && !SHAPES_BY_SLOT[slot].includes(shape)) this.form.controls.silhouetteShape.setValue('');
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
        // Desde el listado se llega con #stock para editar la grilla.
        if (this.route.snapshot.fragment === 'stock') setTimeout(() => this.scrollToStock());
      },
      error: (err: unknown) => {
        this.loadError.set(apiErrorMessage(err, 'No encontramos el producto.'));
        this.loading.set(false);
      },
    });
  }

  private fill(p: AdminProduct): void {
    const silhouette = p.silhouette as Partial<{ svgType: GarmentShape; colorHex: string; texturePattern: GarmentTexture }> | undefined;
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
      stock: p.variantStock ? 0 : p.stock,
      silhouetteShape: silhouette?.svgType && SHAPES_BY_SLOT[p.slot ?? 'accessory'].includes(silhouette.svgType) ? silhouette.svgType : '',
      silhouetteColor: typeof silhouette?.colorHex === 'string' && HEX_PATTERN.test(silhouette.colorHex) ? silhouette.colorHex.toUpperCase() : '',
      silhouetteTexture: silhouette?.texturePattern && silhouette.texturePattern in TEXTURE_LABELS ? silhouette.texturePattern : 'solid',
      arModelType: p.arModelType ?? '',
      arScale: p.arScale ?? null,
      active: p.active,
    });
    this.stockMode.set(p.variantStock ? 'variants' : 'general');
    const cells: Record<string, number | null> = {};
    (p.variants ?? []).forEach((v) => (cells[cellKey(v.size, v.color)] = v.stock));
    this.cells.set(cells);
    this.form.markAsPristine();
  }

  invalid(name: 'name' | 'category' | 'image' | 'price' | 'arScale' | 'silhouetteColor'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  addGallery(url = ''): void {
    if (this.gallery.length >= 20) return;
    this.gallery.push(this.fb.control(url, Validators.pattern(URL_PATTERN)));
    if (url) this.gallery.markAsDirty();
  }

  moveGallery(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= this.gallery.length) return;
    const ctrl = this.gallery.at(index);
    this.gallery.removeAt(index);
    this.gallery.insert(target, ctrl);
    this.gallery.markAsDirty();
  }

  setImage(url: string): void {
    this.form.controls.image.setValue(url);
    this.form.controls.image.markAsDirty();
  }

  cell(size: string, color: string): number | null {
    return this.cells()[cellKey(size, color)] ?? null;
  }

  setCell(size: string, color: string, raw: string): void {
    const n = raw === '' ? null : Math.max(0, Math.round(Number(raw)));
    this.cells.update((cells) => ({ ...cells, [cellKey(size, color)]: n === null || Number.isFinite(n) ? n : null }));
  }

  rowSum(size: string): number {
    return this.colKeys().reduce((sum, c) => sum + (this.cell(size, c) ?? 0), 0);
  }

  colSum(color: string): number {
    return this.rowKeys().reduce((sum, s) => sum + (this.cell(s, color) ?? 0), 0);
  }

  colorHex(name: string): string {
    return this.colorsValue().find((c) => (c.name ?? '').trim() === name)?.hex ?? '#E7E5E4';
  }

  setStockMode(mode: StockMode): void {
    if (mode === this.stockMode() || (mode === 'variants' && !this.hasAxes())) return;
    if (mode === 'general') {
      // Al volver al stock general se propone la suma de la grilla.
      this.form.controls.stock.setValue(this.gridTotal());
    } else if (!Object.keys(this.cells()).length && this.rowKeys().length * this.colKeys().length === 1) {
      this.setCell(this.rowKeys()[0], this.colKeys()[0], String(this.form.controls.stock.value ?? 0));
    }
    this.stockMode.set(mode);
    this.form.markAsDirty();
  }

  scrollToStock(): void {
    document.getElementById('stock')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Grilla para PUT /stock con los talles y colores que quedaron guardados en el producto. */
  private variantsFor(p: AdminProduct): VariantStock[] {
    const sizes = p.sizes?.length ? p.sizes : [''];
    const colors = p.colors?.length ? p.colors.map((c) => c.name) : [''];
    return sizes.flatMap((size) => colors.map((color) => ({ size, color, stock: this.cell(size, color) ?? 0 })));
  }

  /** Guarda el stock después del producto; null si no hay nada que cambiar. */
  private stockRequest(p: AdminProduct): Observable<AdminProduct> | null {
    if (this.stockMode() === 'variants') return this.api.setStock(p.id, { variants: this.variantsFor(p) });
    const stock = intOrNull(this.form.controls.stock.value) ?? 0;
    if (!p.variantStock && p.stock === stock) return null;
    return this.api.setStock(p.id, { stock });
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
      silhouette: resolveSilhouette(this.dressable()),
      arModelType: v.arModelType || null,
      arScale,
      active: v.active,
    };
    if (this.isNew()) body.stock = this.stockMode() === 'general' ? (intOrNull(v.stock) ?? 0) : 0;
    return body;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(INVALID_MSG);
      return;
    }
    if (this.stockMode() === 'variants' && !this.hasAxes()) {
      this.error.set('Para controlar el stock por talle y color cargá al menos un talle o un color.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.notice.set(null);
    const body = this.payload();
    const id = this.id();
    const request = id ? this.api.updateProduct(id, body) : this.api.createProduct(body);
    // Primero el producto (talles y colores nuevos), después el stock con esa grilla.
    let saved: AdminProduct | null = null;
    request
      .pipe(
        switchMap((p) => {
          saved = p;
          return this.stockRequest(p) ?? of(p);
        }),
      )
      .subscribe({
        next: (p) => this.afterSave(p, id ? 'Cambios guardados.' : 'Producto creado.'),
        error: (err: unknown) => {
          if (!saved) {
            this.saving.set(false);
            this.error.set(apiErrorMessage(err));
            return;
          }
          this.afterSave(saved, null, `Guardamos el producto, pero no el stock: ${apiErrorMessage(err)}`);
        },
      });
  }

  private afterSave(p: AdminProduct, notice: string | null, error: string | null = null): void {
    this.saving.set(false);
    if (!this.id()) {
      void this.router.navigate(['/admin/productos', p.id], { state: { notice, error } });
      return;
    }
    // Si falló el stock se conserva la grilla que estaba editando.
    const cells = this.cells();
    const mode = this.stockMode();
    const stock = this.form.controls.stock.value;
    this.product.set(p);
    this.fill(p);
    if (error) {
      this.cells.set(cells);
      this.stockMode.set(mode);
      this.form.controls.stock.setValue(stock);
    }
    this.notice.set(notice);
    this.error.set(error);
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

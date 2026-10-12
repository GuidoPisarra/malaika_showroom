import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UploadFolder } from '../../../domain/admin/admin.models';
import { AdminApiService } from '../../../infrastructure/http/admin-api.service';
import { apiErrorMessage } from '../../../infrastructure/http/api.config';

/** Tamaño máximo que acepta la API (UPLOAD_MAX_MB). */
const MAX_MB = 15;

/**
 * Zona para subir imágenes: clic para elegir o arrastrar y soltar. Sube cada
 * archivo a la API (que lo convierte a WebP) y emite la URL pública.
 * La URL manual sigue en el formulario que lo usa.
 */
@Component({
  selector: 'admin-image-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label
      class="group relative flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 text-sm transition-colors"
      [class]="
        (compact() ? 'py-2.5 ' : 'py-4 ') +
        (dragging() ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-stone-300 bg-stone-50/60 text-stone-600 hover:border-amber-400 hover:bg-amber-50/40')
      "
      [class.pointer-events-none]="uploading()"
      [class.opacity-70]="uploading()"
      (dragenter)="onDragOver($event)"
      (dragover)="onDragOver($event)"
      (dragleave)="dragging.set(false)"
      (drop)="onDrop($event)"
    >
      <input #file type="file" accept="image/*" class="sr-only" [multiple]="multiple()" (change)="onPick(file)" [attr.aria-label]="label()" />
      @if (uploading()) {
        <span class="material-symbols-outlined animate-spin text-2xl text-amber-700">progress_activity</span>
        <span class="font-medium">Subiendo {{ pending() > 1 ? pending() + ' imágenes' : 'imagen' }}…</span>
      } @else {
        <span class="material-symbols-outlined text-2xl text-stone-400 group-hover:text-amber-700">{{ dragging() ? 'download' : 'cloud_upload' }}</span>
        <span class="min-w-0">
          <span class="block font-medium text-stone-800">{{ label() }}</span>
          @if (!compact()) {
            <span class="block text-xs text-stone-500">Arrastrá {{ multiple() ? 'una o varias imágenes' : 'una imagen' }} o hacé clic para elegir. JPG, PNG o WebP hasta ${MAX_MB} MB.</span>
          }
        </span>
      }
    </label>
    @if (error()) {
      <p class="mt-1.5 flex items-start gap-1 text-xs text-rose-700" role="alert">
        <span class="material-symbols-outlined text-sm">error</span>{{ error() }}
      </p>
    }
  `,
})
export class ImageUploadComponent {
  private api = inject(AdminApiService);
  private destroyRef = inject(DestroyRef);

  /** Carpeta de destino (define el tamaño máximo con que se guarda). */
  readonly folder = input<UploadFolder>('products');
  readonly multiple = input(false);
  readonly compact = input(false);
  readonly label = input('Subir imagen');
  /** URL de cada imagen subida, en el orden en que terminan. */
  readonly uploaded = output<string>();

  readonly dragging = signal(false);
  readonly pending = signal(0);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.dragging.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.upload(Array.from(event.dataTransfer?.files ?? []));
  }

  onPick(input: HTMLInputElement): void {
    this.upload(Array.from(input.files ?? []));
    input.value = '';
  }

  private upload(files: File[]): void {
    if (!files.length || this.uploading()) return;
    const list = this.multiple() ? files : files.slice(0, 1);
    const images = list.filter((f) => !f.type || f.type.startsWith('image/'));
    if (!images.length) {
      this.error.set('El archivo no es una imagen. Elegí un JPG, PNG o WebP.');
      return;
    }
    const tooBig = images.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooBig) {
      this.error.set(`“${tooBig.name}” pesa más de ${MAX_MB} MB.`);
      return;
    }
    this.error.set(images.length < list.length ? 'Algunos archivos no eran imágenes y se omitieron.' : null);
    this.uploading.set(true);
    this.pending.set(images.length);
    this.next(images);
  }

  /** Sube de a una para respetar el orden elegido. */
  private next(queue: File[]): void {
    const [file, ...rest] = queue;
    if (!file) {
      this.uploading.set(false);
      return;
    }
    this.api
      .uploadImage(file, this.folder())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (img) => {
          this.uploaded.emit(img.url);
          this.pending.set(rest.length);
          this.next(rest);
        },
        error: (err: unknown) => {
          this.error.set(apiErrorMessage(err, 'No pudimos subir la imagen, intentá de nuevo.'));
          this.uploading.set(false);
          this.pending.set(0);
        },
      });
  }
}

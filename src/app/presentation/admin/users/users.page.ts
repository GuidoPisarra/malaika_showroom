import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AdminUser } from '../../../domain/admin/admin.models';
import { AdminApiService } from '../../../infrastructure/http/admin-api.service';
import { apiErrorMessage } from '../../../infrastructure/http/api.config';
import { EmptyComponent, LoadingComponent, PaginationComponent, UI } from '../shared/admin-ui';

type RoleFilter = '' | 'CUSTOMER' | 'ADMIN';
const PAGE_SIZE = 25;
const ROLE_LABELS: Partial<Record<string, string>> = { CUSTOMER: 'Clienta', ADMIN: 'Admin', SUPERADMIN: 'Superadmin' };

@Component({
  selector: 'admin-users-page',
  imports: [ReactiveFormsModule, PaginationComponent, LoadingComponent, EmptyComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 class="${UI.h1}">Usuarios</h1>
        <p class="text-sm text-stone-500">Clientas registradas y cuentas con acceso al panel.</p>
      </div>
      @if (!formOpen()) {
        <button type="button" class="${UI.btnPrimary}" (click)="openForm()">
          <span class="material-symbols-outlined text-lg">person_add</span> Nuevo admin
        </button>
      }
    </div>

    @if (formOpen()) {
      <form [formGroup]="form" (ngSubmit)="create()" novalidate class="${UI.card} p-5 mb-6 space-y-4 max-w-2xl">
        <div class="flex items-center justify-between">
          <h2 class="font-display text-xl font-semibold">Nueva cuenta de administración</h2>
          <button type="button" class="${UI.btnIcon}" (click)="formOpen.set(false)" aria-label="Cerrar formulario">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label for="uname" class="${UI.label}">Nombre *</label>
            <input id="uname" formControlName="name" class="${UI.input}" maxlength="120" />
          </div>
          <div>
            <label for="uemail" class="${UI.label}">Email *</label>
            <input id="uemail" type="email" formControlName="email" class="${UI.input}" autocomplete="off" />
          </div>
          <div>
            <label for="upassword" class="${UI.label}">Contraseña inicial *</label>
            <input id="upassword" type="password" formControlName="password" class="${UI.input}" autocomplete="new-password" />
            <p class="mt-1 text-xs text-stone-500">Mínimo 8 caracteres. Compartila por un canal seguro.</p>
          </div>
        </div>
        @if (formError()) {
          <div class="${UI.error}" role="alert">{{ formError() }}</div>
        }
        <div class="flex gap-2">
          <button type="submit" class="${UI.btnPrimary}" [disabled]="saving()">{{ saving() ? 'Creando…' : 'Crear admin' }}</button>
          <button type="button" class="${UI.btnSecondary}" (click)="formOpen.set(false)">Cancelar</button>
        </div>
      </form>
    }
    @if (notice()) {
      <div class="${UI.success} mb-4">{{ notice() }}</div>
    }

    <div class="mb-4 inline-flex rounded-xl border border-stone-200 bg-white p-1 text-sm">
      @for (r of roles; track r.value) {
        <button type="button" class="rounded-lg px-3 py-1.5" [class]="role() === r.value ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'" (click)="setRole(r.value)">
          {{ r.label }}
        </button>
      }
    </div>

    @if (error()) {
      <div class="${UI.error} mb-4">{{ error() }}</div>
    }

    <div class="${UI.card} overflow-hidden">
      @if (loading() && !users().length) {
        <admin-loading text="Cargando usuarios…" />
      } @else if (!users().length) {
        <admin-empty icon="group" text="No hay usuarios para mostrar." />
      } @else {
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-stone-100">
            <thead class="bg-stone-50/80">
              <tr>
                <th class="${UI.th}">Nombre</th>
                <th class="${UI.th}">Email</th>
                <th class="${UI.th} hidden sm:table-cell">Teléfono</th>
                <th class="${UI.th}">Rol</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-stone-100" [class.opacity-60]="loading()">
              @for (u of users(); track u.id) {
                <tr>
                  <td class="${UI.td} font-medium text-stone-900">{{ u.name }}</td>
                  <td class="${UI.td}">{{ u.email }}</td>
                  <td class="${UI.td} hidden sm:table-cell">{{ u.phone || '—' }}</td>
                  <td class="${UI.td}">
                    <span
                      class="rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                      [class]="u.role === 'CUSTOMER' ? 'border-stone-200 bg-stone-50 text-stone-600' : 'border-amber-200 bg-amber-50 text-amber-800'"
                    >{{ roleLabels[u.role] ?? u.role }}</span>
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
export class UsersPage {
  private api = inject(AdminApiService);
  private fb = inject(NonNullableFormBuilder);
  private destroyRef = inject(DestroyRef);

  readonly roles: { value: RoleFilter; label: string }[] = [
    { value: '', label: 'Todos' },
    { value: 'CUSTOMER', label: 'Clientas' },
    { value: 'ADMIN', label: 'Admins' },
  ];
  readonly roleLabels = ROLE_LABELS;
  readonly pageSize = PAGE_SIZE;

  readonly users = signal<AdminUser[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly role = signal<RoleFilter>('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly formOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
  });

  private request?: Subscription;

  constructor() {
    this.load();
  }

  load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.request = this.api
      .users({ role: this.role(), page: this.page(), pageSize: PAGE_SIZE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.users.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(apiErrorMessage(err));
          this.loading.set(false);
        },
      });
  }

  setRole(role: RoleFilter): void {
    this.role.set(role);
    this.page.set(1);
    this.load();
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  openForm(): void {
    this.form.reset();
    this.formError.set(null);
    this.notice.set(null);
    this.formOpen.set(true);
  }

  create(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Completá nombre, un email válido y una contraseña de al menos 8 caracteres.');
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.formError.set(null);
    this.api.createAdmin({ name: v.name.trim(), email: v.email.trim(), password: v.password }).subscribe({
      next: (u) => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.notice.set(`Listo: ${u.email ?? v.email} ya puede ingresar al panel.`);
        this.load();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.formError.set(apiErrorMessage(err));
      },
    });
  }
}

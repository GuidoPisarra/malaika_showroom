import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthSessionService } from '../../../infrastructure/auth/auth-session.service';
import { apiErrorMessage } from '../../../infrastructure/http/api.config';
import { UI } from '../shared/admin-ui';

@Component({
  selector: 'admin-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-10">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900 text-amber-200">
            <span class="material-symbols-outlined text-3xl">storefront</span>
          </div>
          <h1 class="${UI.h1}">Panel del comercio</h1>
          <p class="mt-1 text-sm text-stone-500">Ingresá con tu cuenta de administración.</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="${UI.card} p-6 sm:p-8 space-y-5" novalidate>
          @if (expired) {
            <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Tu sesión venció o no tiene permisos. Ingresá de nuevo.
            </div>
          }
          @if (error()) {
            <div class="${UI.error}" role="alert">{{ error() }}</div>
          }
          <div>
            <label for="email" class="${UI.label}">Email</label>
            <input id="email" type="email" autocomplete="username" formControlName="email" class="${UI.input}" placeholder="admin@tutienda.com" />
            @if (form.controls.email.touched && form.controls.email.invalid) {
              <p class="mt-1 text-xs text-rose-700">Ingresá un email válido.</p>
            }
          </div>
          <div>
            <label for="password" class="${UI.label}">Contraseña</label>
            <input id="password" type="password" autocomplete="current-password" formControlName="password" class="${UI.input}" />
            @if (form.controls.password.touched && form.controls.password.invalid) {
              <p class="mt-1 text-xs text-rose-700">Ingresá tu contraseña.</p>
            }
          </div>
          <button type="submit" class="${UI.btnPrimary} w-full py-3" [disabled]="loading()">
            @if (loading()) {
              <span class="material-symbols-outlined animate-spin text-lg">progress_activity</span> Ingresando…
            } @else {
              Ingresar
            }
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-stone-500">
          <a routerLink="/" class="inline-flex items-center gap-1 hover:text-amber-800">
            <span class="material-symbols-outlined text-base">arrow_back</span> Volver a la tienda
          </a>
        </p>
      </div>
    </main>
  `,
})
export class AdminLoginPage {
  private fb = inject(NonNullableFormBuilder);
  private auth = inject(AuthSessionService);
  private router = inject(Router);

  readonly expired = inject(ActivatedRoute).snapshot.queryParamMap.has('expired');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(email.trim(), password).subscribe({
      next: (user) => {
        this.loading.set(false);
        if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
          this.auth.logout();
          this.error.set('Esta cuenta no tiene acceso al panel');
          return;
        }
        void this.router.navigateByUrl('/admin');
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'No pudimos iniciar sesión.'));
      },
    });
  }
}

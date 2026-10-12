import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { catchError, filter, map, of } from 'rxjs';
import { AuthSessionService } from '../../../infrastructure/auth/auth-session.service';
import { AdminApiService } from '../../../infrastructure/http/admin-api.service';

interface NavLink {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
}

@Component({
  selector: 'admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-stone-50 text-stone-900 lg:flex">
      <!-- Barra superior (mobile) -->
      <header class="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <button type="button" class="rounded-lg p-1.5 text-stone-700 hover:bg-stone-100" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()" aria-label="Abrir menú">
          <span class="material-symbols-outlined">{{ menuOpen() ? 'close' : 'menu' }}</span>
        </button>
        <span class="font-display text-lg font-semibold truncate">{{ storeName() }}</span>
        <span class="w-9"></span>
      </header>

      <!-- Sidebar -->
      <aside
        class="fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-stone-200 bg-white transition-transform lg:sticky lg:top-0 lg:flex lg:h-screen lg:translate-x-0"
        [class.flex]="menuOpen()"
        [class.hidden]="!menuOpen()"
      >
        <div class="border-b border-stone-100 px-5 py-5">
          <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700">Panel del comercio</p>
          <p class="font-display text-xl font-semibold leading-tight text-stone-900 mt-0.5">{{ storeName() }}</p>
        </div>

        <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-0.5" aria-label="Secciones del panel">
          @for (link of links; track link.path) {
            <a
              [routerLink]="link.path"
              routerLinkActive="bg-amber-50 text-amber-900 font-semibold"
              [routerLinkActiveOptions]="{ exact: !!link.exact }"
              class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900"
              (click)="menuOpen.set(false)"
            >
              <span class="material-symbols-outlined text-xl">{{ link.icon }}</span>
              {{ link.label }}
            </a>
          }
          <a routerLink="/" class="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-stone-600 hover:bg-stone-50 hover:text-amber-800">
            <span class="material-symbols-outlined text-xl">open_in_new</span>
            Ver tienda
          </a>
        </nav>

        <div class="border-t border-stone-100 px-4 py-4">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-900 text-sm font-semibold text-amber-200">
              {{ initial() }}
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{{ auth.user()?.name }}</p>
              <p class="truncate text-xs text-stone-500">{{ auth.user()?.email }}</p>
            </div>
          </div>
          <button type="button" class="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700" (click)="logout()">
            <span class="material-symbols-outlined text-lg">logout</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      @if (menuOpen()) {
        <button type="button" class="fixed inset-0 z-30 bg-stone-950/40 lg:hidden" aria-label="Cerrar menú" (click)="menuOpen.set(false)"></button>
      }

      <main class="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminLayoutComponent {
  readonly auth = inject(AuthSessionService);
  private api = inject(AdminApiService);
  private router = inject(Router);

  readonly menuOpen = signal(false);
  readonly storeName = toSignal(
    this.api.store().pipe(
      map((s) => s.name),
      catchError(() => of('Mi tienda')),
    ),
    { initialValue: '…' },
  );

  readonly links: NavLink[] = [
    { path: '/admin', label: 'Inicio', icon: 'dashboard', exact: true },
    { path: '/admin/pedidos', label: 'Pedidos', icon: 'receipt_long' },
    { path: '/admin/productos', label: 'Productos', icon: 'checkroom' },
    { path: '/admin/cupones', label: 'Cupones', icon: 'sell' },
    { path: '/admin/looks', label: 'Looks', icon: 'styler' },
    { path: '/admin/configuracion', label: 'Configuración', icon: 'settings' },
    { path: '/admin/usuarios', label: 'Usuarios', icon: 'group' },
  ];

  constructor() {
    // Cierra el menú mobile al navegar.
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuOpen.set(false));
  }

  initial(): string {
    return (this.auth.user()?.name ?? '?').trim().charAt(0).toUpperCase();
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/admin/login');
  }
}

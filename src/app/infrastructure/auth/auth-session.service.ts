import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, map, shareReplay, tap } from 'rxjs';
import { API_BASE_URL } from '../http/api.config';
import { LocalStorageService } from '../persistence/local-storage.service';

export type UserRole = 'CUSTOMER' | 'ADMIN' | 'SUPERADMIN';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string | null;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

const STORAGE_KEY = 'mlk_session';

/** Sesión de la clienta o del admin del comercio (JWT + refresh token). */
@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private http = inject(HttpClient);
  private api = inject(API_BASE_URL);
  private storage = inject(LocalStorageService);

  readonly session = signal<Session | null>(this.storage.getItem<Session | null>(STORAGE_KEY, null));
  readonly user = computed(() => this.session()?.user ?? null);
  readonly isLoggedIn = computed(() => this.session() !== null);
  readonly isAdmin = computed(() => ['ADMIN', 'SUPERADMIN'].includes(this.user()?.role ?? ''));

  private refreshing$: Observable<Session> | null = null;

  login(email: string, password: string): Observable<SessionUser> {
    return this.http
      .post<Session>(`${this.api}/auth/login`, { email, password })
      .pipe(tap((s) => this.store(s)), map((s) => s.user));
  }

  register(data: { name: string; email: string; password: string; phone?: string }): Observable<SessionUser> {
    return this.http
      .post<Session>(`${this.api}/auth/register`, data)
      .pipe(tap((s) => this.store(s)), map((s) => s.user));
  }

  logout(): void {
    const refreshToken = this.session()?.refreshToken;
    this.store(null);
    if (refreshToken) this.http.post(`${this.api}/auth/logout`, { refreshToken }).subscribe({ error: () => undefined });
  }

  /** Renueva el access token. Si hay varios requests esperando, comparten la misma renovación. */
  refresh(): Observable<Session> {
    const refreshToken = this.session()?.refreshToken;
    if (!this.refreshing$) {
      this.refreshing$ = this.http.post<Session>(`${this.api}/auth/refresh`, { refreshToken }).pipe(
        tap({ next: (s) => this.store(s), error: () => this.store(null) }),
        finalize(() => (this.refreshing$ = null)),
        shareReplay(1),
      );
    }
    return this.refreshing$;
  }

  private store(session: Session | null): void {
    this.session.set(session);
    if (session) this.storage.setItem(STORAGE_KEY, session);
    else this.storage.removeItem(STORAGE_KEY);
  }
}

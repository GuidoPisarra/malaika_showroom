import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { FALLBACK_STORE_SETTINGS, StoreInfo } from '../domain/store/store-settings.model';
import { API_BASE_URL } from '../infrastructure/http/api.config';

/** Datos y reglas del comercio que se está mostrando. */
@Injectable({ providedIn: 'root' })
export class StoreFacade {
  private http = inject(HttpClient);
  private api = inject(API_BASE_URL);

  readonly store = signal<StoreInfo | null>(null);
  readonly settings = computed(() => this.store()?.settings ?? FALLBACK_STORE_SETTINGS);
  readonly name = computed(() => this.store()?.name ?? 'Malaika');

  constructor() {
    this.http.get<StoreInfo>(`${this.api}/store`).subscribe({
      next: (store) => this.store.set(store),
      error: () => undefined,
    });
  }
}

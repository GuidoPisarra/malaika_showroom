import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { ShippingQuote } from '../domain/store/store-settings.model';
import { API_BASE_URL } from '../infrastructure/http/api.config';
import { StoreFacade } from './store.facade';

interface Destination {
  postalCode: string;
  province: string;
}

/** Al menos 4 dígitos: "1425" o "C1425ABC". */
const hasPostalCode = (cp: string) => /\d{4}/.test(cp);

/** Costo de envío según la zona de la dirección (GET /api/shipping/quote). */
@Injectable({ providedIn: 'root' })
export class ShippingFacade {
  private http = inject(HttpClient);
  private api = inject(API_BASE_URL);
  private store = inject(StoreFacade);

  /** Cotización para la dirección cargada en el checkout; null hasta tener código postal. */
  readonly quote = signal<ShippingQuote | null>(null);
  readonly isQuoting = signal(false);
  /** El comercio cobra distinto según la zona: el envío se conoce recién con el código postal. */
  readonly hasZones = computed(() => this.store.settings().shippingZones.length > 0);
  /** Envío más barato del comercio, para mostrar "desde" antes de saber la dirección. */
  readonly cheapestFee = computed(() => {
    const s = this.store.settings();
    const fees = s.shippingZones.map((z) => z.fee);
    if (s.shipsOutsideZones || !fees.length) fees.push(s.shippingFee);
    return Math.min(...fees);
  });

  private readonly destination$ = new Subject<Destination>();

  constructor() {
    this.destination$
      .pipe(
        debounceTime(350),
        distinctUntilChanged((a, b) => a.postalCode === b.postalCode && a.province === b.province),
        switchMap((d) => {
          if (!hasPostalCode(d.postalCode)) return of(null);
          this.isQuoting.set(true);
          const params = new HttpParams().set('postalCode', d.postalCode).set('province', d.province);
          return this.http.get<ShippingQuote>(`${this.api}/shipping/quote`, { params }).pipe(catchError(() => of(null)));
        }),
      )
      .subscribe((quote) => {
        this.quote.set(quote);
        this.isQuoting.set(false);
      });
  }

  /** Pide la cotización cuando cambia la dirección (con una pequeña espera mientras se tipea). */
  updateDestination(postalCode: string, province: string): void {
    const cp = postalCode.trim();
    if (!hasPostalCode(cp)) this.quote.set(null);
    this.destination$.next({ postalCode: cp, province: province.trim() });
  }
}

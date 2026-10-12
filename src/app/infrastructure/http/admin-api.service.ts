import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MonoTypeOperatorFunction, Observable, catchError, throwError } from 'rxjs';
import {
  AdminOrder,
  AdminProduct,
  AdminUser,
  Coupon,
  CouponInput,
  CreateAdminInput,
  Dashboard,
  LookPreset,
  LookPresetInput,
  OrderListParams,
  OrderStatusChange,
  Page,
  PageParams,
  PaymentSettings,
  PaymentSettingsInput,
  ProductInput,
  PublicStore,
  ShowroomZone,
  StoreSettings,
  TenantAdminView,
} from '../../domain/admin/admin.models';
import { AuthSessionService } from '../auth/auth-session.service';
import { API_BASE_URL } from './api.config';

function toParams(query: object): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
  }
  return params;
}

/** Cliente tipado de los endpoints /admin/* del panel del comercio. */
@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private http = inject(HttpClient);
  private api = inject(API_BASE_URL);
  private auth = inject(AuthSessionService);
  private router = inject(Router);

  private get admin(): string {
    return `${this.api}/admin`;
  }

  /** Si la sesión venció o no tiene permisos, vuelve al login del panel. */
  private authGuard<T>(): MonoTypeOperatorFunction<T> {
    return catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        if (this.auth.session()) this.auth.logout();
        void this.router.navigate(['/admin/login'], { queryParams: { expired: 1 } });
      }
      return throwError(() => err);
    });
  }

  private get<T>(path: string, query: object = {}): Observable<T> {
    return this.http.get<T>(`${this.admin}${path}`, { params: toParams(query) }).pipe(this.authGuard<T>());
  }

  private send<T>(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Observable<T> {
    return this.http.request<T>(method, `${this.admin}${path}`, { body }).pipe(this.authGuard<T>());
  }

  // Comercio (público)
  store(): Observable<PublicStore> {
    return this.http.get<PublicStore>(`${this.api}/store`);
  }

  // Tablero
  dashboard(): Observable<Dashboard> {
    return this.get('/dashboard');
  }

  // Pedidos
  orders(query: OrderListParams): Observable<Page<AdminOrder>> {
    return this.get('/orders', query);
  }

  order(id: string): Observable<AdminOrder> {
    return this.get(`/orders/${encodeURIComponent(id)}`);
  }

  updateOrderStatus(id: string, change: OrderStatusChange): Observable<AdminOrder> {
    return this.send('PATCH', `/orders/${encodeURIComponent(id)}/status`, change);
  }

  // Productos
  products(query: PageParams): Observable<Page<AdminProduct>> {
    return this.get('/products', query);
  }

  product(id: string): Observable<AdminProduct> {
    return this.get(`/products/${encodeURIComponent(id)}`);
  }

  createProduct(input: ProductInput): Observable<AdminProduct> {
    return this.send('POST', '/products', input);
  }

  updateProduct(id: string, input: Partial<ProductInput>): Observable<AdminProduct> {
    return this.send('PATCH', `/products/${encodeURIComponent(id)}`, input);
  }

  deleteProduct(id: string): Observable<unknown> {
    return this.send('DELETE', `/products/${encodeURIComponent(id)}`);
  }

  setStock(id: string, stock: number): Observable<AdminProduct> {
    return this.send('PUT', `/products/${encodeURIComponent(id)}/stock`, { stock });
  }

  // Looks
  lookPresets(): Observable<LookPreset[]> {
    return this.get('/look-presets');
  }

  createLookPreset(input: LookPresetInput): Observable<LookPreset> {
    return this.send('POST', '/look-presets', input);
  }

  updateLookPreset(id: string, input: LookPresetInput): Observable<LookPreset> {
    return this.send('PUT', `/look-presets/${encodeURIComponent(id)}`, input);
  }

  deleteLookPreset(id: string): Observable<unknown> {
    return this.send('DELETE', `/look-presets/${encodeURIComponent(id)}`);
  }

  showroomZones(): Observable<ShowroomZone[]> {
    return this.get('/showroom-zones');
  }

  // Cupones
  coupons(): Observable<Coupon[]> {
    return this.get('/coupons');
  }

  createCoupon(input: CouponInput): Observable<Coupon> {
    return this.send('POST', '/coupons', input);
  }

  updateCoupon(id: string, input: CouponInput): Observable<Coupon> {
    return this.send('PATCH', `/coupons/${encodeURIComponent(id)}`, input);
  }

  deleteCoupon(id: string): Observable<unknown> {
    return this.send('DELETE', `/coupons/${encodeURIComponent(id)}`);
  }

  // Configuración
  settings(): Observable<TenantAdminView> {
    return this.get('/settings');
  }

  updateSettings(settings: Partial<StoreSettings>): Observable<TenantAdminView> {
    return this.send('PATCH', '/settings', settings);
  }

  paymentSettings(): Observable<PaymentSettings> {
    return this.get('/payment-settings');
  }

  updatePaymentSettings(input: PaymentSettingsInput): Observable<PaymentSettings> {
    return this.send('PUT', '/payment-settings', input);
  }

  // Usuarios
  users(query: PageParams & { role?: 'CUSTOMER' | 'ADMIN' | '' }): Observable<Page<AdminUser>> {
    return this.get('/users', query);
  }

  createAdmin(input: CreateAdminInput): Observable<AdminUser> {
    return this.send('POST', '/users', input);
  }
}

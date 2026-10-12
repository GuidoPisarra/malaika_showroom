import { Injectable, inject, signal } from '@angular/core';
import { Order } from '../domain/checkout/models/order.model';
import { AuthSessionService } from '../infrastructure/auth/auth-session.service';
import { apiErrorMessage } from '../infrastructure/http/api.config';
import { OrdersApiService } from '../infrastructure/http/orders-api.service';

export type AccountView = 'login' | 'register' | 'account' | 'track';

/** Cuenta de la clienta: ingreso, registro, sus pedidos y seguimiento de compras como invitada. */
@Injectable({ providedIn: 'root' })
export class AccountFacade {
  private auth = inject(AuthSessionService);
  private ordersApi = inject(OrdersApiService);

  readonly isOpen = signal(false);
  readonly view = signal<AccountView>('login');
  readonly isBusy = signal(false);
  readonly error = signal<string | null>(null);
  readonly orders = signal<Order[]>([]);
  readonly trackedOrder = signal<Order | null>(null);

  readonly user = this.auth.user;

  open(view?: AccountView): void {
    this.error.set(null);
    this.view.set(view ?? (this.auth.isLoggedIn() ? 'account' : 'login'));
    this.isOpen.set(true);
    if (this.view() === 'account') this.loadOrders();
  }

  close(): void {
    this.isOpen.set(false);
  }

  setView(view: AccountView): void {
    this.error.set(null);
    this.view.set(view);
  }

  login(email: string, password: string): void {
    this.run(this.auth.login(email, password), () => this.afterLogin());
  }

  register(name: string, email: string, password: string): void {
    this.run(this.auth.register({ name, email, password }), () => this.afterLogin());
  }

  logout(): void {
    this.auth.logout();
    this.orders.set([]);
    this.view.set('login');
  }

  track(orderNumber: string, email: string): void {
    this.trackedOrder.set(null);
    this.run(this.ordersApi.track(orderNumber.trim(), email.trim()), (order) => this.trackedOrder.set(order), 'No encontramos un pedido con esos datos.');
  }

  private afterLogin(): void {
    this.view.set('account');
    this.loadOrders();
  }

  private loadOrders(): void {
    this.ordersApi.mine().subscribe({ next: (orders) => this.orders.set(orders), error: () => undefined });
  }

  private run<T>(obs: import('rxjs').Observable<T>, onSuccess: (value: T) => void, fallback?: string): void {
    this.error.set(null);
    this.isBusy.set(true);
    obs.subscribe({
      next: (value) => {
        this.isBusy.set(false);
        onSuccess(value);
      },
      error: (err) => {
        this.isBusy.set(false);
        this.error.set(apiErrorMessage(err, fallback));
      },
    });
  }
}

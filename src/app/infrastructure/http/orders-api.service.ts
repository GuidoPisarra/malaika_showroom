import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CartItem } from '../../domain/cart/models/cart-item.model';
import { CreateOrderResponse, Order, PaymentMethodType, ShippingData } from '../../domain/checkout/models/order.model';
import { API_BASE_URL } from './api.config';

/** Pedidos contra orders-service (a través del gateway). */
@Injectable({ providedIn: 'root' })
export class OrdersApiService {
  private http = inject(HttpClient);
  private api = inject(API_BASE_URL);

  /** El servidor recalcula precios, descuentos y envío; del carrito solo viajan productos y cantidades. */
  create(input: {
    customer: ShippingData;
    items: CartItem[];
    couponCode: string | null;
    paymentMethod: PaymentMethodType;
  }): Observable<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>(`${this.api}/orders`, {
      customer: input.customer,
      items: input.items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        size: i.selectedSize,
        color: i.selectedColor.name,
      })),
      couponCode: input.couponCode ?? undefined,
      paymentMethod: input.paymentMethod,
    });
  }

  track(orderNumber: string, email: string): Observable<Order> {
    return this.http.get<Order>(`${this.api}/orders/track/${encodeURIComponent(orderNumber)}`, {
      params: { email },
    });
  }

  mine(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.api}/me/orders`);
  }
}

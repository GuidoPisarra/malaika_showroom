import { Injectable } from '@angular/core';
import { ShippingData } from '../models/order.model';

@Injectable({
  providedIn: 'root',
})
export class PaymentValidatorDomainService {
  validateShipping(shipping: ShippingData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!shipping.fullName.trim() || shipping.fullName.trim().length < 3) {
      errors.push('Ingresá tu nombre completo.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shipping.email)) {
      errors.push('Ingresá un correo electrónico válido.');
    }

    if (!shipping.phone || shipping.phone.replace(/\D/g, '').length < 8) {
      errors.push('Ingresá un teléfono de contacto válido.');
    }

    if (!shipping.address.trim() || shipping.address.trim().length < 5) {
      errors.push('Ingresá tu dirección y número de entrega.');
    }

    if (!shipping.city.trim()) {
      errors.push('Ingresá tu ciudad.');
    }

    if (!shipping.postalCode.trim()) {
      errors.push('Ingresá tu código postal.');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

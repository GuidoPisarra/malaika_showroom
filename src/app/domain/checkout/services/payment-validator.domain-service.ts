import { Injectable } from '@angular/core';
import { CreditCardData, ShippingData } from '../models/order.model';

@Injectable({
  providedIn: 'root',
})
export class PaymentValidatorDomainService {
  detectCardBrand(number: string): 'visa' | 'mastercard' | 'amex' | 'generic' {
    const sanitized = number.replace(/\D/g, '');
    if (/^4/.test(sanitized)) return 'visa';
    if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(sanitized)) return 'mastercard';
    if (/^3[47]/.test(sanitized)) return 'amex';
    return 'generic';
  }

  validateCard(card: CreditCardData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const sanitizedNumber = card.cardNumber.replace(/\s+/g, '');

    if (sanitizedNumber.length < 13 || sanitizedNumber.length > 19) {
      errors.push('El número de tarjeta debe tener entre 13 y 19 dígitos.');
    } else if (!this.luhnCheck(sanitizedNumber)) {
      errors.push('El número de tarjeta no es válido (algoritmo Luhn).');
    }

    if (!card.cardHolder.trim() || card.cardHolder.trim().length < 3) {
      errors.push('Ingresa el nombre del titular tal como figura en la tarjeta.');
    }

    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    const expYear = parseInt(card.expiryYear, 10);
    const expMonth = parseInt(card.expiryMonth, 10);

    if (isNaN(expYear) || isNaN(expMonth) || expMonth < 1 || expMonth > 12) {
      errors.push('Fecha de vencimiento inválida.');
    } else if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      errors.push('La tarjeta ingresada se encuentra vencida.');
    }

    const expectedCvvLength = card.cardBrand === 'amex' ? 4 : 3;
    if (card.cvv.length !== expectedCvvLength) {
      errors.push(`El código de seguridad (CVV) debe tener ${expectedCvvLength} dígitos.`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateShipping(shipping: ShippingData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!shipping.fullName.trim() || shipping.fullName.trim().length < 3) {
      errors.push('Ingresa tu nombre completo.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shipping.email)) {
      errors.push('Ingresa un correo electrónico válido.');
    }

    if (!shipping.phone || shipping.phone.replace(/\D/g, '').length < 8) {
      errors.push('Ingresa un teléfono de contacto válido.');
    }

    if (!shipping.address.trim() || shipping.address.trim().length < 5) {
      errors.push('Ingresa tu dirección y número de entrega.');
    }

    if (!shipping.city.trim()) {
      errors.push('Ingresa tu ciudad.');
    }

    if (!shipping.postalCode.trim()) {
      errors.push('Ingresa tu código postal.');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private luhnCheck(numStr: string): boolean {
    let sum = 0;
    let shouldDouble = false;

    for (let i = numStr.length - 1; i >= 0; i--) {
      let digit = parseInt(numStr.charAt(i), 10);
      if (isNaN(digit)) return false;

      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }
}

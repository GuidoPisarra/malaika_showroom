import { calculateTotals } from './pricing.js';
import { DEFAULT_STORE_SETTINGS, StoreSettings } from './tenant.js';

const malaika: StoreSettings = {
  ...DEFAULT_STORE_SETTINGS,
  shippingFee: 15000,
  freeShippingThreshold: 150000,
  bundleDiscounts: [
    { minItems: 2, percent: 5 },
    { minItems: 3, percent: 15 },
  ],
  bankTransferDiscountPercent: 5,
};

describe('calculateTotals', () => {
  it('cobra envío debajo del umbral y no aplica descuentos con una prenda', () => {
    const t = calculateTotals([{ unitPrice: 50000, quantity: 1 }], malaika, null, 'MERCADO_PAGO');
    expect(t).toMatchObject({ subtotal: 50000, bundleDiscount: 0, shipping: 15000, total: 65000, freeShippingRemaining: 100000 });
  });

  it('aplica el mejor escalón de descuento por cantidad', () => {
    const t = calculateTotals([{ unitPrice: 100000, quantity: 3 }], malaika, null, 'MERCADO_PAGO');
    expect(t.bundleDiscount).toBe(45000);
    expect(t.shipping).toBe(0);
    expect(t.total).toBe(255000);
  });

  it('aplica el cupón porcentual sobre el subtotal ya bonificado', () => {
    const t = calculateTotals(
      [{ unitPrice: 185000, quantity: 2 }, { unitPrice: 175000, quantity: 1 }],
      malaika,
      { code: 'VIP20', percent: 20, fixedAmount: null },
      'MERCADO_PAGO',
    );
    expect(t).toMatchObject({ subtotal: 545000, bundleDiscount: 81750, couponDiscount: 92650, total: 370600 });
  });

  it('el cupón de monto fijo nunca deja el total negativo', () => {
    const t = calculateTotals([{ unitPrice: 10000, quantity: 1 }], malaika, { code: 'X', percent: null, fixedAmount: 20000 }, null);
    expect(t.couponDiscount).toBe(10000);
    expect(t.total).toBe(15000);
  });

  it('descuenta el porcentaje por transferencia sobre el total con envío', () => {
    const t = calculateTotals([{ unitPrice: 160000, quantity: 1 }], malaika, null, 'BANK_TRANSFER');
    expect(t.paymentDiscount).toBe(8000);
    expect(t.total).toBe(152000);
  });
});

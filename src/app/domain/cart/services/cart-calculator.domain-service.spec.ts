import { CartItem } from '../models/cart-item.model';
import { FALLBACK_STORE_SETTINGS } from '../../store/store-settings.model';
import { CartCalculatorDomainService } from './cart-calculator.domain-service';

const item = (price: number, quantity = 1) =>
  ({ id: 'x', product: { price }, quantity, selectedSize: 'M', selectedColor: { name: 'Negro', hex: '#000' } }) as unknown as CartItem;

const settings = { ...FALLBACK_STORE_SETTINGS, bundleDiscounts: [], shippingFee: 15000, freeShippingThreshold: 150000 };
const quote = (fee: number, freeShippingThreshold: number) => ({
  available: true,
  zoneId: 'z',
  zoneName: 'Zona',
  fee,
  freeShippingThreshold,
  eta: null,
});

describe('CartCalculatorDomainService', () => {
  const calc = new CartCalculatorDomainService();

  it('sin dirección usa el envío general del comercio', () => {
    expect(calc.calculateSummary([item(50000)], null, settings)).toMatchObject({ shipping: 15000, total: 65000 });
  });

  it('con zona usa su costo y su mínimo para envío gratis', () => {
    expect(calc.calculateSummary([item(50000)], null, settings, quote(6000, 100000))).toMatchObject({ shipping: 6000, total: 56000 });
    expect(calc.calculateSummary([item(120000)], null, settings, quote(6000, 100000)).shipping).toBe(0);
  });

  it('con mínimo 0 en la zona el envío nunca es gratis', () => {
    const summary = calc.calculateSummary([item(900000)], null, settings, quote(12000, 0));
    expect(summary).toMatchObject({ shipping: 12000, freeShippingAvailable: false, freeShippingRemaining: 0 });
  });
});

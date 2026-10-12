import { calculateTotals } from './pricing.js';
import { normalizePostalCode, resolveShipping } from './shipping.js';
import { DEFAULT_STORE_SETTINGS, StoreSettings } from './tenant.js';

const settings: StoreSettings = {
  ...DEFAULT_STORE_SETTINGS,
  shippingFee: 15000,
  freeShippingThreshold: 150000,
  shippingZones: [
    { id: 'caba', name: 'CABA', postalCodes: ['1000-1499'], provinces: ['CABA'], fee: 6000, freeShippingThreshold: 100000, eta: '24 h' },
    { id: 'gba', name: 'GBA', postalCodes: ['1600-1899'], provinces: [], fee: 9000, freeShippingThreshold: null, eta: '' },
    { id: 'cba', name: 'Córdoba', postalCodes: [], provinces: ['Córdoba'], fee: 12000, freeShippingThreshold: 0, eta: '' },
  ],
};

describe('normalizePostalCode', () => {
  it('acepta el formato viejo y el CPA', () => {
    expect(normalizePostalCode('1425')).toBe(1425);
    expect(normalizePostalCode('C1425ABC')).toBe(1425);
    expect(normalizePostalCode(' c1425abc ')).toBe(1425);
    expect(normalizePostalCode('14')).toBeNull();
    expect(normalizePostalCode('')).toBeNull();
  });
});

describe('resolveShipping', () => {
  it('elige la zona por código postal antes que por provincia', () => {
    expect(resolveShipping(settings, { postalCode: 'C1425ABC', provinceState: 'Córdoba' })).toMatchObject({
      zoneId: 'caba',
      fee: 6000,
      freeShippingThreshold: 100000,
      eta: '24 h',
    });
  });

  it('usa la provincia sin importar tildes ni mayúsculas', () => {
    expect(resolveShipping(settings, { postalCode: '5000', provinceState: 'cordoba ' }).zoneId).toBe('cba');
  });

  it('una zona sin umbral propio usa el del comercio', () => {
    expect(resolveShipping(settings, { postalCode: '1708' })).toMatchObject({ zoneId: 'gba', freeShippingThreshold: 150000 });
  });

  it('fuera de las zonas cobra el costo general, o no envía si el comercio lo pide', () => {
    expect(resolveShipping(settings, { postalCode: '9410' })).toMatchObject({ available: true, zoneId: null, fee: 15000 });
    expect(resolveShipping({ ...settings, shipsOutsideZones: false }, { postalCode: '9410' }).available).toBe(false);
  });

  it('sin zonas configuradas siempre hay envío', () => {
    expect(resolveShipping({ ...DEFAULT_STORE_SETTINGS, shipsOutsideZones: false }, { postalCode: '9410' }).available).toBe(true);
  });
});

describe('calculateTotals con zona de envío', () => {
  it('aplica el costo y el umbral de la zona', () => {
    const caba = resolveShipping(settings, { postalCode: '1425' });
    expect(calculateTotals([{ unitPrice: 50000, quantity: 1 }], settings, null, null, caba)).toMatchObject({ shipping: 6000, total: 56000 });
    expect(calculateTotals([{ unitPrice: 110000, quantity: 1 }], settings, null, null, caba).shipping).toBe(0);
  });

  it('con umbral 0 el envío nunca es gratis', () => {
    const cba = resolveShipping(settings, { provinceState: 'Córdoba' });
    const t = calculateTotals([{ unitPrice: 900000, quantity: 1 }], settings, null, null, cba);
    expect(t).toMatchObject({ shipping: 12000, freeShippingRemaining: 0 });
  });
});

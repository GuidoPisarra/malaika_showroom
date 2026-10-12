import { variantCombinations, variantKey } from './variants.js';

const dress = { sizes: ['S', 'M'], colors: [{ name: 'Negro', hex: '#000' }, { name: 'Rojo', hex: '#f00' }] };
const bag = { sizes: [], colors: [{ name: 'Dorado', hex: '#d4af37' }] };

describe('variantes', () => {
  it('arma todas las combinaciones de talle y color', () => {
    expect(variantCombinations(dress)).toHaveLength(4);
    expect(variantCombinations(bag)).toEqual([{ size: '', color: 'Dorado' }]);
    expect(variantCombinations({ sizes: [], colors: [] })).toEqual([{ size: '', color: '' }]);
  });

  it('ignora el talle de un producto sin talles', () => {
    expect(variantKey(bag, 'U', 'Dorado')).toEqual({ size: '', color: 'Dorado' });
    expect(variantKey(dress, 'M', 'Rojo')).toEqual({ size: 'M', color: 'Rojo' });
  });
});

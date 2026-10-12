import { Product } from '../../catalog/models/product.model';
import { placeOnMannequin } from './look.model';

const p = (id: string, slot: Product['slot']) => ({ id, slot }) as Product;

describe('placeOnMannequin', () => {
  it('el abrigo convive con la blusa y con el vestido', () => {
    let slots = placeOnMannequin({}, p('blusa', 'top'));
    slots = placeOnMannequin(slots, p('chaleco', 'outer'));
    expect(slots.top?.id).toBe('blusa');
    expect(slots.outer?.id).toBe('chaleco');
    slots = placeOnMannequin(slots, p('vestido', 'dress'));
    expect(slots.top).toBeUndefined();
    expect(slots.outer?.id).toBe('chaleco');
  });

  it('una parte de arriba saca el vestido', () => {
    const slots = placeOnMannequin({ dress: p('vestido', 'dress') }, p('falda', 'bottom'));
    expect(slots.dress).toBeUndefined();
    expect(slots.bottom?.id).toBe('falda');
  });
});

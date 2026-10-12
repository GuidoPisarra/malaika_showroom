import { Injectable } from '@angular/core';
import { MannequinSlots, LookCompatibilityScore } from '../models/look.model';
import { Product } from '../../catalog/models/product.model';

@Injectable({
  providedIn: 'root',
})
export class LookStylistDomainService {
  /**
   * Evaluates the harmony of selected items on the mannequin
   */
  calculateHarmony(slots: MannequinSlots): LookCompatibilityScore {
    const items = this.getActiveItems(slots);

    if (items.length === 0) {
      return {
        score: 0,
        title: 'Maniquí Listo para Crear',
        paletteDescription: 'Selecciona prendas de la pasarela para comenzar tu look.',
        vibe: 'Minimalista Sofisticado',
        tips: ['Elige primero una prenda principal: un Vestido de Seda o un Top & Pantalón.'],
      };
    }

    if (items.length === 1) {
      return {
        score: 45,
        title: 'Base del Look Definida',
        paletteDescription: `Has seleccionado ${items[0].name}. Añade complementos para equilibrar.`,
        vibe: 'Minimalista Sofisticado',
        tips: ['Combina con calzado de taco fino o mules en tonos neutros o metalizados.'],
      };
    }

    // Check occasions consistency
    const occasions = items.map((i) => i.occasion);
    const uniqueOccasions = new Set(occasions);
    let baseScore = 75;

    // Bonus for harmonized occasions
    if (uniqueOccasions.size === 1) {
      baseScore += 15;
    } else if (uniqueOccasions.has('fiesta') && uniqueOccasions.has('casual')) {
      baseScore -= 5;
    }

    // Check slots completion
    const hasMainBody = slots.dress || (slots.top && slots.bottom);
    if (hasMainBody) baseScore += 10;
    if (slots.shoes) baseScore += 5;
    if (slots.accessory) baseScore += 5;

    const finalScore = Math.min(99, Math.max(50, baseScore));

    // Determine aesthetic vibe
    let vibe: LookCompatibilityScore['vibe'] = 'Lujo Relajado';
    if (items.some((i) => i.occasion === 'fiesta' || i.occasion === 'noche')) {
      vibe = 'Elegancia Nocturna';
    } else if (items.some((i) => i.category === 'joyeria' && i.price > 80)) {
      vibe = 'Monocromático Glam';
    } else if (items.some((i) => i.material.toLowerCase().includes('lino'))) {
      vibe = 'Boho Chic';
    }

    return {
      score: finalScore,
      title: finalScore >= 90 ? 'Armonía Exquisita' : finalScore >= 75 ? 'Excelente Combinación' : 'Look en Tendencia',
      paletteDescription: `Paleta refinada con texturas de ${items.map((i) => i.material).join(', ')}.`,
      vibe,
      tips: [
        'Las tonalidades champagne y doradas realzan la luminosidad del conjunto.',
        'Tip Malaika: Lleva el cabello recogido para destacar la caída y el escote.',
      ],
    };
  }

  getActiveItems(slots: MannequinSlots): Product[] {
    const list: Product[] = [];
    if (slots.dress) list.push(slots.dress);
    if (slots.top) list.push(slots.top);
    if (slots.outer) list.push(slots.outer);
    if (slots.bottom) list.push(slots.bottom);
    if (slots.shoes) list.push(slots.shoes);
    if (slots.accessory) list.push(slots.accessory);
    return list;
  }
}

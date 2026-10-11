import { Injectable, computed, inject, signal } from '@angular/core';
import { Product } from '../domain/catalog/models/product.model';
import { MannequinSlots, LookPreset, SavedLook } from '../domain/look-builder/models/look.model';
import { LookStylistDomainService } from '../domain/look-builder/services/look-stylist.domain-service';
import { LocalStorageService } from '../infrastructure/persistence/local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class LookBuilderFacade {
  private stylist = inject(LookStylistDomainService);
  private storage = inject(LocalStorageService);

  // Equipped slots on the mannequin
  readonly slots = signal<MannequinSlots>({
    dress: undefined,
    top: undefined,
    bottom: undefined,
    shoes: undefined,
    accessory: undefined,
  });

  // Active filter within the mannequin selector tabs: 'all' | 'top' | 'bottom' | 'dress' | 'shoes' | 'accessory'
  readonly activeSlotSelector = signal<'dress' | 'top' | 'bottom' | 'shoes' | 'accessory'>('dress');

  // Notification / toast when item is equipped
  readonly lastEquippedNotification = signal<string | null>(null);

  // Active items list
  readonly equippedItems = computed(() => {
    return this.stylist.getActiveItems(this.slots());
  });

  // Equipped items count
  readonly equippedCount = computed(() => this.equippedItems().length);

  // Total price of the look
  readonly rawTotalPrice = computed(() => {
    return this.equippedItems().reduce((sum, item) => sum + item.price, 0);
  });

  // Bundle discount rate
  readonly discountRate = computed(() => {
    return this.stylist.calculateBundleDiscount(this.equippedCount());
  });

  // Bundle discount amount
  readonly bundleDiscountAmount = computed(() => {
    return Math.round(this.rawTotalPrice() * this.discountRate() * 100) / 100;
  });

  // Final look total price
  readonly finalLookPrice = computed(() => {
    return Math.max(0, this.rawTotalPrice() - this.bundleDiscountAmount());
  });

  // Styling Harmony Evaluation
  readonly harmony = computed(() => {
    return this.stylist.calculateHarmony(this.slots());
  });

  // Presets
  readonly presets: LookPreset[] = [
    {
      id: 'preset-gala',
      name: 'Noche de Gala Champagne',
      subtitle: 'Seda pura, stilettos dorados y choker de alta joyería',
      tag: 'Más Elogiado',
      imagePreview: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=400&q=80',
      itemIds: ['prod-v1', 'prod-s1', 'prod-j1', 'prod-a1'],
    },
    {
      id: 'preset-sastre',
      name: 'Poder Femenino Ejecutivo',
      subtitle: 'Blazer esmoquin, palazzo plisado y mules estructuradas',
      tag: 'Look Editorial',
      imagePreview: 'https://images.unsplash.com/photo-1548624149-f9b1859aa9d0?auto=format&fit=crop&w=400&q=80',
      itemIds: ['prod-t2', 'prod-t3', 'prod-p1', 'prod-s2', 'prod-a1'],
    },
    {
      id: 'preset-riviera',
      name: 'Lujo Relajado Riviera',
      subtitle: 'Lino francés, sombrero toquilla y detalles artesanales',
      tag: 'Edición Verano',
      imagePreview: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=400&q=80',
      itemIds: ['prod-v3', 'prod-s2', 'prod-a2', 'prod-j2'],
    },
  ];

  // Saved looks in local storage
  readonly savedLooks = signal<SavedLook[]>([]);

  constructor() {
    this.loadSavedLooks();
    // Pre-populate with default chic look
    this.slots.set({
      dress: undefined,
      top: undefined,
      bottom: undefined,
      shoes: undefined,
      accessory: undefined,
    });
  }

  private loadSavedLooks(): void {
    const saved = this.storage.getItem<SavedLook[]>('mlk_saved_looks', []);
    this.savedLooks.set(saved);
  }

  equipItem(product: Product): void {
    this.slots.update((current) => {
      const next = { ...current };

      if (product.slot === 'dress') {
        next.dress = product;
        next.top = undefined;
        next.bottom = undefined;
      } else if (product.slot === 'top') {
        next.top = product;
        next.dress = undefined;
      } else if (product.slot === 'bottom') {
        next.bottom = product;
        next.dress = undefined;
      } else if (product.slot === 'shoes') {
        next.shoes = product;
      } else if (product.slot === 'accessory') {
        next.accessory = product;
      }

      return next;
    });

    this.showNotification(`"${product.name}" colocado en el maniquí.`);
  }

  unequipSlot(slot: keyof MannequinSlots): void {
    this.slots.update((current) => ({
      ...current,
      [slot]: undefined,
    }));
  }

  clearMannequin(): void {
    this.slots.set({
      dress: undefined,
      top: undefined,
      bottom: undefined,
      shoes: undefined,
      accessory: undefined,
    });
    this.showNotification('Maniquí reiniciado.');
  }

  applyPreset(preset: LookPreset, allProducts: Product[]): void {
    const nextSlots: MannequinSlots = {};

    preset.itemIds.forEach((id) => {
      const prod = allProducts.find((p) => p.id === id);
      if (!prod) return;

      if (prod.slot === 'dress') {
        nextSlots.dress = prod;
        nextSlots.top = undefined;
        nextSlots.bottom = undefined;
      } else if (prod.slot === 'top') {
        nextSlots.top = prod;
        nextSlots.dress = undefined;
      } else if (prod.slot === 'bottom') {
        nextSlots.bottom = prod;
        nextSlots.dress = undefined;
      } else if (prod.slot === 'shoes') {
        nextSlots.shoes = prod;
      } else if (prod.slot === 'accessory') {
        nextSlots.accessory = prod;
      }
    });

    this.slots.set(nextSlots);
    this.showNotification(`Look "${preset.name}" aplicado al maniquí.`);
  }

  saveCurrentLook(name?: string): void {
    const items = this.equippedItems();
    if (items.length === 0) return;

    const lookName = name || `Look Malaika ${this.savedLooks().length + 1}`;
    const newLook: SavedLook = {
      id: 'look-' + Date.now(),
      name: lookName,
      createdAt: new Date().toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
      items: [...items],
      totalPrice: this.finalLookPrice(),
    };

    const updated = [newLook, ...this.savedLooks()].slice(0, 10);
    this.savedLooks.set(updated);
    this.storage.setItem('mlk_saved_looks', updated);
    this.showNotification(`"${lookName}" guardado en tu colección de looks.`);
  }

  setSlotSelector(slot: 'dress' | 'top' | 'bottom' | 'shoes' | 'accessory'): void {
    this.activeSlotSelector.set(slot);
  }

  private showNotification(msg: string): void {
    this.lastEquippedNotification.set(msg);
    setTimeout(() => {
      if (this.lastEquippedNotification() === msg) {
        this.lastEquippedNotification.set(null);
      }
    }, 2800);
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Product } from '../domain/catalog/models/product.model';
import { MannequinSlots, LookPreset, SavedLook } from '../domain/look-builder/models/look.model';
import { LookStylistDomainService } from '../domain/look-builder/services/look-stylist.domain-service';
import { AuthSessionService } from '../infrastructure/auth/auth-session.service';
import { API_BASE_URL } from '../infrastructure/http/api.config';
import { LocalStorageService } from '../infrastructure/persistence/local-storage.service';
import { CartCalculatorDomainService } from '../domain/cart/services/cart-calculator.domain-service';
import { CatalogFacade } from './catalog.facade';
import { StoreFacade } from './store.facade';

/** Look guardado tal como lo devuelve la API (/me/looks). */
interface ApiSavedLook {
  id: string;
  name: string;
  itemIds: string[];
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class LookBuilderFacade {
  private stylist = inject(LookStylistDomainService);
  private storage = inject(LocalStorageService);
  private http = inject(HttpClient);
  private api = inject(API_BASE_URL);
  private auth = inject(AuthSessionService);
  private catalog = inject(CatalogFacade);
  private store = inject(StoreFacade);
  private calculator = inject(CartCalculatorDomainService);

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
    return this.calculator.bundlePercent(this.equippedCount(), this.store.settings()) / 100;
  });

  // Bundle discount amount
  readonly bundleDiscountAmount = computed(() => {
    return Math.round(this.rawTotalPrice() * this.discountRate());
  });

  // Final look total price
  readonly finalLookPrice = computed(() => {
    return Math.max(0, this.rawTotalPrice() - this.bundleDiscountAmount());
  });

  // Styling Harmony Evaluation
  readonly harmony = computed(() => {
    return this.stylist.calculateHarmony(this.slots());
  });

  // Looks armados por el comercio (se cargan desde la API)
  readonly presets = signal<LookPreset[]>([]);

  // Looks guardados: en la cuenta de la clienta si inició sesión, si no en este navegador
  readonly savedLooks = signal<SavedLook[]>([]);

  constructor() {
    this.http.get<LookPreset[]>(`${this.api}/look-presets`).subscribe({
      next: (presets) => this.presets.set(presets),
      error: () => undefined,
    });
    // Recarga los looks guardados al iniciar o cerrar sesión y cuando llega el catálogo.
    effect(() => {
      this.auth.isLoggedIn();
      this.catalog.allProducts();
      untracked(() => this.loadSavedLooks());
    });
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
    if (!this.auth.isLoggedIn()) {
      this.savedLooks.set(this.storage.getItem<SavedLook[]>('mlk_saved_looks', []));
      return;
    }
    this.http.get<ApiSavedLook[]>(`${this.api}/me/looks`).subscribe({
      next: (looks) => this.savedLooks.set(looks.map((l) => this.fromApi(l))),
      error: () => undefined,
    });
  }

  private fromApi(look: ApiSavedLook): SavedLook {
    const byId = new Map(this.catalog.allProducts().map((p) => [p.id, p]));
    const items = look.itemIds.map((id) => byId.get(id)).filter((p): p is Product => !!p);
    return {
      id: look.id,
      name: look.name,
      createdAt: new Date(look.createdAt).toLocaleDateString('es-AR', { month: 'short', day: 'numeric' }),
      items,
      totalPrice: items.reduce((sum, p) => sum + p.price, 0),
    };
  }

  deleteSavedLook(id: string): void {
    if (this.auth.isLoggedIn()) {
      this.http.delete(`${this.api}/me/looks/${id}`).subscribe(() => this.loadSavedLooks());
      return;
    }
    const updated = this.savedLooks().filter((l) => l.id !== id);
    this.savedLooks.set(updated);
    this.storage.setItem('mlk_saved_looks', updated);
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

    const lookName = name || `Mi look ${this.savedLooks().length + 1}`;
    const newLook: SavedLook = {
      id: 'look-' + Date.now(),
      name: lookName,
      createdAt: new Date().toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
      items: [...items],
      totalPrice: this.finalLookPrice(),
    };

    if (this.auth.isLoggedIn()) {
      this.http
        .post<ApiSavedLook>(`${this.api}/me/looks`, { name: lookName, itemIds: items.map((p) => p.id) })
        .subscribe({
          next: (look) => {
            this.savedLooks.update((current) => [this.fromApi(look), ...current]);
            this.showNotification(`"${lookName}" guardado en tu cuenta.`);
          },
          error: () => this.showNotification('No pudimos guardar el look, intentá de nuevo.'),
        });
      return;
    }

    const updated = [newLook, ...this.savedLooks()].slice(0, 10);
    this.savedLooks.set(updated);
    this.storage.setItem('mlk_saved_looks', updated);
    this.showNotification(`"${lookName}" guardado en este navegador. Creá tu cuenta para no perderlo.`);
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

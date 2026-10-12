import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { AdminApiService } from '../../../infrastructure/http/admin-api.service';
import { UI } from '../shared/admin-ui';
import { EmailSettingsCard } from './email-settings.card';
import { PaymentSettingsCard } from './payment-settings.card';
import { StoreSettingsForm } from './store-settings.form';

type Tab = 'store' | 'payments' | 'emails';

@Component({
  selector: 'admin-settings-page',
  imports: [StoreSettingsForm, PaymentSettingsCard, EmailSettingsCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6">
      <h1 class="${UI.h1}">Configuración</h1>
      <p class="text-sm text-stone-500">Reglas comerciales de la tienda, cobros con Mercado Pago y emails a las clientas.</p>
    </div>

    <div class="mb-6 inline-flex rounded-xl border border-stone-200 bg-white p-1 text-sm" role="tablist">
      <button type="button" role="tab" class="rounded-lg px-4 py-2" [class]="tab() === 'store' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'" [attr.aria-selected]="tab() === 'store'" (click)="tab.set('store')">
        Tienda
      </button>
      <button type="button" role="tab" class="rounded-lg px-4 py-2" [class]="tab() === 'payments' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'" [attr.aria-selected]="tab() === 'payments'" (click)="tab.set('payments')">
        Mercado Pago
      </button>
      <button type="button" role="tab" class="rounded-lg px-4 py-2" [class]="tab() === 'emails' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'" [attr.aria-selected]="tab() === 'emails'" (click)="tab.set('emails')">
        Emails
      </button>
    </div>

    <div class="max-w-3xl">
      @if (tab() === 'store') {
        <admin-store-settings-form />
      } @else if (tab() === 'payments') {
        <admin-payment-settings-card [slug]="slug()" />
      } @else {
        <admin-email-settings-card />
      }
    </div>
  `,
})
export class SettingsPage {
  readonly tab = signal<Tab>('store');
  readonly slug = toSignal(
    inject(AdminApiService)
      .store()
      .pipe(
        map((s) => s.slug),
        catchError(() => of('')),
      ),
    { initialValue: '' },
  );
}

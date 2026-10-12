import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaymentSettings, PaymentSettingsInput } from '../../../domain/admin/admin.models';
import { AdminApiService } from '../../../infrastructure/http/admin-api.service';
import { apiErrorMessage } from '../../../infrastructure/http/api.config';
import { LoadingComponent, UI } from '../shared/admin-ui';

@Component({
  selector: 'admin-payment-settings-card',
  imports: [FormsModule, DatePipe, LoadingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <admin-loading text="Cargando credenciales…" />
    } @else {
      <form class="space-y-5" (ngSubmit)="save()" autocomplete="off">
        <div class="${UI.card} p-5 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span
              class="flex h-10 w-10 items-center justify-center rounded-full"
              [class]="current()?.mercadoPagoConfigured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
            >
              <span class="material-symbols-outlined">{{ current()?.mercadoPagoConfigured ? 'verified' : 'warning' }}</span>
            </span>
            <div>
              <p class="font-semibold">{{ current()?.mercadoPagoConfigured ? 'Mercado Pago está conectado' : 'Mercado Pago no está configurado' }}</p>
              <p class="text-xs text-stone-500">
                @if (current()?.updatedAt) {
                  Última actualización: {{ current()!.updatedAt | date: 'dd/MM/yyyy HH:mm' }}
                } @else {
                  Cargá tu access token para cobrar con tarjeta, débito y dinero en cuenta.
                }
              </p>
            </div>
          </div>
        </div>

        <div class="${UI.card} p-5 space-y-4">
          <div>
            <label for="mpAccessToken" class="${UI.label}">Access token</label>
            <input id="mpAccessToken" name="mpAccessToken" type="password" class="${UI.input} font-mono" [(ngModel)]="accessToken" [placeholder]="current()?.mpAccessToken ? 'Guardado: ' + current()!.mpAccessToken : 'APP_USR-…'" autocomplete="new-password" />
            <p class="mt-1 text-xs text-stone-500">Empieza con APP_USR- (producción) o TEST- (pruebas). Dejalo vacío para no cambiarlo.</p>
          </div>
          <div>
            <label for="mpPublicKey" class="${UI.label}">Public key</label>
            <input id="mpPublicKey" name="mpPublicKey" class="${UI.input} font-mono" [(ngModel)]="publicKey" [placeholder]="current()?.mpPublicKey ? 'Guardada: ' + current()!.mpPublicKey : 'APP_USR-…'" />
          </div>
          <div>
            <label for="mpWebhookSecret" class="${UI.label}">Clave secreta del webhook</label>
            <input id="mpWebhookSecret" name="mpWebhookSecret" type="password" class="${UI.input} font-mono" [(ngModel)]="webhookSecret" [placeholder]="current()?.mpWebhookSecret ? 'Guardada: ' + current()!.mpWebhookSecret : 'Opcional, recomendada'" autocomplete="new-password" />
          </div>

          @if (error()) {
            <div class="${UI.error}" role="alert">{{ error() }}</div>
          }
          @if (notice()) {
            <div class="${UI.success}">{{ notice() }}</div>
          }
          <div class="flex flex-wrap gap-2">
            <button type="submit" class="${UI.btnPrimary}" [disabled]="saving() || !hasChanges()">
              <span class="material-symbols-outlined text-lg">key</span> {{ saving() ? 'Guardando…' : 'Guardar credenciales' }}
            </button>
            @if (current()?.mercadoPagoConfigured) {
              <button type="button" class="${UI.btnDanger}" [disabled]="saving()" (click)="disconnect()">Desconectar Mercado Pago</button>
            }
          </div>
        </div>

        <div class="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-sm text-stone-700 space-y-2">
          <p class="font-semibold text-stone-900 flex items-center gap-2"><span class="material-symbols-outlined text-lg text-amber-700">help</span> ¿Dónde consigo estos datos?</p>
          <ol class="list-decimal space-y-1 pl-5">
            <li>Entrá a <a href="https://www.mercadopago.com.ar/developers/panel/app" target="_blank" rel="noopener" class="font-medium text-amber-800 underline">Mercado Pago Developers → Tus integraciones</a> y creá una aplicación (o abrí la que ya tenés).</li>
            <li>En <strong>Credenciales de producción</strong> copiá el <em>Access token</em> y la <em>Public key</em>. Para probar usá las credenciales de prueba (empiezan con TEST-).</li>
            <li>En <strong>Webhooks → Configurar notificaciones</strong> pegá esta URL, marcá el evento <em>Pagos</em> y guardá. Copiá la <em>clave secreta</em> que te muestra y pegala acá arriba.</li>
          </ol>
          <div class="mt-2">
            <p class="text-xs text-stone-500">URL del webhook de tu tienda:</p>
            <div class="mt-1 flex items-center gap-2">
              <code class="flex-1 truncate rounded-lg bg-white px-3 py-2 font-mono text-xs border border-amber-200">{{ webhookUrl() }}</code>
              <button type="button" class="${UI.btnSecondary} py-1.5" (click)="copy()">
                <span class="material-symbols-outlined text-base">content_copy</span> {{ copied() ? 'Copiada' : 'Copiar' }}
              </button>
            </div>
            <p class="mt-1 text-xs text-stone-500">Mercado Pago solo notifica a direcciones https: si la URL empieza con http, falta configurar PUBLIC_API_URL en el servidor.</p>
          </div>
        </div>
      </form>
    }
  `,
})
export class PaymentSettingsCard {
  private api = inject(AdminApiService);

  readonly slug = input<string>('');

  readonly current = signal<PaymentSettings | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly copied = signal(false);
  readonly webhookUrl = computed(() => {
    const fromServer = this.current()?.webhookUrl;
    if (fromServer) return fromServer;
    const origin = typeof location !== 'undefined' ? location.origin : '';
    return `${origin}/api/webhooks/mercadopago/${this.slug() || '{slug}'}`;
  });

  accessToken = '';
  publicKey = '';
  webhookSecret = '';

  constructor() {
    this.api.paymentSettings().subscribe({
      next: (s) => {
        this.current.set(s);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(apiErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  hasChanges(): boolean {
    return !!(this.accessToken.trim() || this.publicKey.trim() || this.webhookSecret.trim());
  }

  save(): void {
    const body: PaymentSettingsInput = {};
    if (this.accessToken.trim()) body.mpAccessToken = this.accessToken.trim();
    if (this.publicKey.trim()) body.mpPublicKey = this.publicKey.trim();
    if (this.webhookSecret.trim()) body.mpWebhookSecret = this.webhookSecret.trim();
    if (!Object.keys(body).length) return;
    if (body.mpAccessToken && !/^(APP_USR|TEST)-/.test(body.mpAccessToken)) {
      this.error.set('El access token de Mercado Pago debe empezar con APP_USR- o TEST-');
      return;
    }
    this.send(body, 'Credenciales guardadas.');
  }

  disconnect(): void {
    if (!confirm('¿Desconectar Mercado Pago? La tienda deja de ofrecer ese medio de pago hasta que cargues un access token nuevo.')) return;
    this.send({ mpAccessToken: null, mpPublicKey: null, mpWebhookSecret: null }, 'Mercado Pago quedó desconectado.');
  }

  private send(body: PaymentSettingsInput, message: string): void {
    this.saving.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.api.updatePaymentSettings(body).subscribe({
      next: (s) => {
        this.current.set(s);
        this.accessToken = '';
        this.publicKey = '';
        this.webhookSecret = '';
        this.saving.set(false);
        this.notice.set(message);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err));
      },
    });
  }

  copy(): void {
    void navigator.clipboard?.writeText(this.webhookUrl()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }
}

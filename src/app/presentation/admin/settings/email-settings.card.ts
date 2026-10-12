import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import {
  EMAIL_TYPE_LABELS,
  EmailPreview,
  EmailSettings,
  EmailType,
  TenantAdminView,
  TestEmailResult,
} from '../../../domain/admin/admin.models';
import { AdminApiService } from '../../../infrastructure/http/admin-api.service';
import { apiErrorMessage } from '../../../infrastructure/http/api.config';
import { ImageUploadComponent } from '../shared/image-upload.component';
import { LoadingComponent, UI } from '../shared/admin-ui';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX = /^#[0-9a-f]{6}$/i;
const HTTP_URL = /^https?:\/\/\S+$/i;
const MAX_RECIPIENTS = 10;
const DEFAULT_ACCENT = '#1C1917';

/** Separa "a@x.com, b@y.com" (o una por línea) en direcciones. */
function splitEmails(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[,;\s]+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

@Component({
  selector: 'admin-email-settings-card',
  imports: [FormsModule, LoadingComponent, ImageUploadComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <admin-loading text="Cargando emails…" />
    } @else {
      <form class="space-y-5" (ngSubmit)="save()" novalidate>
        <label class="${UI.card} flex items-start gap-3 p-5 text-sm cursor-pointer">
          <input type="checkbox" name="enabled" class="mt-0.5 h-4 w-4 accent-amber-700" [(ngModel)]="enabled" />
          <span>
            <span class="block font-semibold text-stone-900">Mandar emails a las clientas</span>
            <span class="block text-xs text-stone-500">
              @if (enabled) {
                Confirmación del pedido, pago, envío, entrega y cancelación, más la bienvenida al crear la cuenta.
              } @else {
                Las clientas no reciben ningún email. Los avisos de pedidos nuevos al comercio siguen funcionando.
              }
            </span>
          </span>
        </label>

        <section class="${UI.card} p-5 space-y-4">
          <h3 class="font-sans text-sm font-semibold text-stone-900 flex items-center gap-2">
            <span class="material-symbols-outlined text-lg text-amber-700">forward_to_inbox</span> Remitente
          </h3>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label for="senderName" class="${UI.label}">Nombre del remitente</label>
              <input id="senderName" name="senderName" class="${UI.input}" maxlength="80" [(ngModel)]="senderName" [placeholder]="storeName()" />
              <p class="mt-1 text-xs text-stone-500">Es lo que ve la clienta en su bandeja de entrada. Si lo dejás vacío, usamos el nombre de la tienda.</p>
            </div>
            <div>
              <label for="fromAddress" class="${UI.label}">Dirección de envío</label>
              <input id="fromAddress" name="fromAddress" type="email" class="${UI.input}" maxlength="120" [(ngModel)]="fromAddress" placeholder="hola@mitienda.com" />
              <p class="mt-1 text-xs text-stone-500">
                Solo se usa si el dominio es uno de los de tu tienda
                @if (domains().length) {
                  ({{ domains().join(', ') }})
                }
                y está verificado en el proveedor de email. Si no, mandamos desde la dirección de la plataforma con tu nombre.
              </p>
            </div>
            <div>
              <label for="replyTo" class="${UI.label}">Responder a</label>
              <input id="replyTo" name="replyTo" type="email" class="${UI.input}" maxlength="120" [(ngModel)]="replyTo" [placeholder]="contactEmail() ?? 'consultas@mitienda.com'" />
              <p class="mt-1 text-xs text-stone-500">Adónde llegan las respuestas de las clientas. Vacío: el email de contacto.</p>
            </div>
          </div>
        </section>

        <section class="${UI.card} p-5 space-y-4">
          <h3 class="font-sans text-sm font-semibold text-stone-900 flex items-center gap-2">
            <span class="material-symbols-outlined text-lg text-amber-700">palette</span> Marca
          </h3>
          <div>
            <span class="${UI.label}">Logo</span>
            <div class="flex flex-wrap items-center gap-3">
              @if (logoUrl.trim()) {
                <img [src]="logoUrl.trim()" alt="Logo de los emails" class="h-14 max-w-40 rounded-lg border border-stone-200 bg-white object-contain p-1" />
              }
              <div class="min-w-56 flex-1">
                <admin-image-upload folder="brand" [compact]="true" [label]="logoUrl.trim() ? 'Cambiar logo' : 'Subir logo'" (uploaded)="logoUrl = $event" />
              </div>
              @if (logoUrl.trim()) {
                <button type="button" class="${UI.btnIcon}" (click)="logoUrl = ''" aria-label="Quitar logo">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              }
            </div>
            <input id="logoUrl" name="logoUrl" type="url" class="${UI.input} mt-2" [(ngModel)]="logoUrl" placeholder="O pegá la URL: https://…" aria-label="URL del logo" />
            <p class="mt-1 text-xs text-stone-500">Sin logo, el encabezado muestra el nombre de la tienda.</p>
          </div>
          <div>
            <label for="accentColor" class="${UI.label}">Color de acento</label>
            <div class="flex items-center gap-2">
              <input type="color" name="accentPicker" [value]="pickerValue()" (input)="accentColor = $any($event.target).value" class="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-stone-300 bg-white p-1" aria-label="Elegir color de acento" />
              <input id="accentColor" name="accentColor" class="${UI.input} w-32 font-mono uppercase" maxlength="7" [(ngModel)]="accentColor" placeholder="${DEFAULT_ACCENT}" />
            </div>
            <p class="mt-1 text-xs text-stone-500">Botones, líneas y detalles de los emails.</p>
          </div>
        </section>

        <section class="${UI.card} p-5 space-y-4">
          <h3 class="font-sans text-sm font-semibold text-stone-900 flex items-center gap-2">
            <span class="material-symbols-outlined text-lg text-amber-700">notifications</span> Avisos al comercio
          </h3>
          <label class="flex items-start gap-3 rounded-xl bg-stone-50 px-4 py-3 text-sm">
            <input type="checkbox" name="notifyAdminOnOrder" class="mt-0.5 h-4 w-4 accent-amber-700" [(ngModel)]="notifyAdminOnOrder" />
            <span>
              Avisarme por email cada vez que entra un pedido
              <span class="block text-xs text-stone-500">Llega con el detalle del pedido y un link al panel.</span>
            </span>
          </label>
          <div>
            <label for="adminRecipients" class="${UI.label}">Destinatarios de los avisos</label>
            <textarea id="adminRecipients" name="adminRecipients" rows="2" class="${UI.input}" [(ngModel)]="recipients" placeholder="ventas@mitienda.com, duena@mitienda.com"></textarea>
            <p class="mt-1 text-xs text-stone-500">
              Separalos con coma o uno por línea, hasta ${MAX_RECIPIENTS}.
              @if (contactEmail()) {
                Si lo dejás vacío, avisamos a {{ contactEmail() }} (email de contacto).
              } @else {
                Si lo dejás vacío, avisamos al email de contacto de la pestaña Tienda (todavía no cargaste uno).
              }
            </p>
          </div>
        </section>

        @if (error()) {
          <div class="${UI.error}" role="alert">{{ error() }}</div>
        }
        @if (notice()) {
          <div class="${UI.success}">{{ notice() }}</div>
        }
        <button type="submit" class="${UI.btnPrimary}" [disabled]="saving()">
          <span class="material-symbols-outlined text-lg">save</span> {{ saving() ? 'Guardando…' : 'Guardar emails' }}
        </button>
      </form>

      <section class="${UI.card} mt-6 p-5 space-y-4">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <h3 class="font-sans text-sm font-semibold text-stone-900 flex items-center gap-2">
            <span class="material-symbols-outlined text-lg text-amber-700">preview</span> Vista previa
          </h3>
          <div class="w-full sm:w-72">
            <label for="previewType" class="sr-only">Tipo de email</label>
            <select id="previewType" class="${UI.input}" [value]="previewType()" (change)="selectPreview($any($event.target).value)">
              @for (t of types; track t) {
                <option [value]="t">{{ typeLabels[t] }}</option>
              }
            </select>
          </div>
        </div>
        @if (previewError()) {
          <div class="${UI.error}" role="alert">{{ previewError() }}</div>
        } @else if (preview(); as p) {
          <dl class="space-y-1 text-sm">
            <div class="flex gap-2"><dt class="w-16 shrink-0 text-stone-500">De:</dt><dd class="min-w-0 break-all font-medium">{{ p.from }}</dd></div>
            <div class="flex gap-2"><dt class="w-16 shrink-0 text-stone-500">Asunto:</dt><dd class="min-w-0 font-medium">{{ p.subject }}</dd></div>
          </dl>
        }
        <div class="relative overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
          @if (previewHtml(); as html) {
            <iframe sandbox="" [srcdoc]="html" title="Vista previa del email" class="block h-[640px] w-full bg-white" [class.opacity-50]="previewLoading()"></iframe>
          } @else if (previewLoading()) {
            <admin-loading text="Armando la vista previa…" />
          }
        </div>
        <p class="text-xs text-stone-500">Usa un pedido de ejemplo con tu marca guardada. Guardá los cambios para verlos acá.</p>
      </section>

      <section class="${UI.card} mt-6 p-5 space-y-3">
        <h3 class="font-sans text-sm font-semibold text-stone-900 flex items-center gap-2">
          <span class="material-symbols-outlined text-lg text-amber-700">send</span> Mandar email de prueba
        </h3>
        <form class="flex flex-wrap gap-2" (ngSubmit)="sendTest()" novalidate>
          <label for="testTo" class="sr-only">Email de destino</label>
          <input id="testTo" name="testTo" type="email" class="${UI.input} min-w-56 flex-1" [(ngModel)]="testTo" placeholder="tu@email.com" />
          <button type="submit" class="${UI.btnSecondary}" [disabled]="testing() || !testTo.trim()">
            <span class="material-symbols-outlined text-lg">send</span> {{ testing() ? 'Mandando…' : 'Mandar prueba' }}
          </button>
        </form>
        @if (testResult(); as r) {
          @if (r.status === 'SENT') {
            <div class="${UI.success}">Listo, mandamos la prueba desde {{ r.from }}. Revisá la bandeja de entrada (y el spam).</div>
          } @else {
            <div class="${UI.error}" role="alert">
              No se pudo mandar{{ r.status === 'SKIPPED' ? ' (no enviado)' : '' }}: {{ r.error || 'el proveedor de email no respondió.' }}
            </div>
          }
        }
        @if (testError()) {
          <div class="${UI.error}" role="alert">{{ testError() }}</div>
        }
      </section>
    }
  `,
})
export class EmailSettingsCard {
  private api = inject(AdminApiService);
  private sanitizer = inject(DomSanitizer);

  readonly types = Object.keys(EMAIL_TYPE_LABELS) as EmailType[];
  readonly typeLabels = EMAIL_TYPE_LABELS;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly tenant = signal<TenantAdminView | null>(null);
  readonly storeName = computed(() => this.tenant()?.name ?? 'Nombre de la tienda');
  readonly domains = computed(() => this.tenant()?.domains ?? []);
  readonly contactEmail = computed(() => this.tenant()?.settings.contactEmail ?? null);

  readonly previewType = signal<EmailType>('order-paid');
  readonly preview = signal<EmailPreview | null>(null);
  readonly previewLoading = signal(false);
  readonly previewError = signal<string | null>(null);
  /** El HTML viene de nuestra API; el iframe sin permisos (sandbox="") no ejecuta scripts. */
  readonly previewHtml = computed<SafeHtml | null>(() => {
    const p = this.preview();
    return p ? this.sanitizer.bypassSecurityTrustHtml(p.html) : null;
  });

  readonly testing = signal(false);
  readonly testResult = signal<TestEmailResult | null>(null);
  readonly testError = signal<string | null>(null);

  enabled = true;
  senderName = '';
  fromAddress = '';
  replyTo = '';
  logoUrl = '';
  accentColor = DEFAULT_ACCENT;
  recipients = '';
  notifyAdminOnOrder = true;
  testTo = '';

  private previewRequest?: Subscription;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.previewRequest?.unsubscribe());
    this.api.settings().subscribe({
      next: (t) => {
        this.fill(t);
        this.loading.set(false);
        this.loadPreview();
      },
      error: (err: unknown) => {
        this.error.set(apiErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  /** El selector nativo solo acepta #rrggbb completo. */
  pickerValue(): string {
    return HEX.test(this.accentColor.trim()) ? this.accentColor.trim().toLowerCase() : DEFAULT_ACCENT.toLowerCase();
  }

  private fill(t: TenantAdminView): void {
    this.tenant.set(t);
    const e = t.settings.emails;
    if (!this.testTo) this.testTo = t.settings.contactEmail ?? '';
    if (!e) return;
    this.enabled = e.enabled;
    this.senderName = e.senderName ?? '';
    this.fromAddress = e.fromAddress ?? '';
    this.replyTo = e.replyTo ?? '';
    this.logoUrl = e.logoUrl ?? '';
    this.accentColor = (e.accentColor || DEFAULT_ACCENT).toUpperCase();
    this.recipients = (e.adminRecipients ?? []).join(', ');
    this.notifyAdminOnOrder = e.notifyAdminOnOrder;
  }

  save(): void {
    const fromAddress = this.fromAddress.trim().toLowerCase();
    const replyTo = this.replyTo.trim().toLowerCase();
    const logoUrl = this.logoUrl.trim();
    const accentColor = this.accentColor.trim();
    const adminRecipients = splitEmails(this.recipients);
    const problem =
      (fromAddress && !EMAIL.test(fromAddress) && 'La dirección de envío no es un email válido.') ||
      (replyTo && !EMAIL.test(replyTo) && 'La dirección para responder no es un email válido.') ||
      (logoUrl && !HTTP_URL.test(logoUrl) && 'La URL del logo tiene que empezar con http:// o https://.') ||
      (!HEX.test(accentColor) && 'El color de acento tiene que ser un hex como #1C1917.') ||
      (adminRecipients.length > MAX_RECIPIENTS && `Podés cargar hasta ${MAX_RECIPIENTS} destinatarios.`) ||
      (adminRecipients.some((r) => !EMAIL.test(r)) &&
        `Revisá los destinatarios: ${adminRecipients.filter((r) => !EMAIL.test(r)).join(', ')} no parece un email.`);
    if (problem) {
      this.error.set(problem);
      this.notice.set(null);
      return;
    }
    const emails: EmailSettings = {
      enabled: this.enabled,
      senderName: this.senderName.trim() || null,
      fromAddress: fromAddress || null,
      replyTo: replyTo || null,
      logoUrl: logoUrl || null,
      accentColor: accentColor.toUpperCase(),
      adminRecipients,
      notifyAdminOnOrder: this.notifyAdminOnOrder,
    };
    this.saving.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.api.updateSettings({ emails }).subscribe({
      next: (t) => {
        this.fill(t);
        this.saving.set(false);
        this.notice.set('Emails guardados.');
        this.loadPreview();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err));
      },
    });
  }

  selectPreview(type: EmailType): void {
    this.previewType.set(type);
    this.loadPreview();
  }

  private loadPreview(): void {
    this.previewRequest?.unsubscribe();
    this.previewLoading.set(true);
    this.previewError.set(null);
    this.previewRequest = this.api.emailPreview(this.previewType()).subscribe({
      next: (p) => {
        this.preview.set(p);
        this.previewLoading.set(false);
      },
      error: (err: unknown) => {
        this.previewError.set(apiErrorMessage(err, 'No pudimos armar la vista previa.'));
        this.previewLoading.set(false);
      },
    });
  }

  sendTest(): void {
    const to = this.testTo.trim();
    if (!EMAIL.test(to)) {
      this.testResult.set(null);
      this.testError.set('Escribí un email válido para mandar la prueba.');
      return;
    }
    this.testing.set(true);
    this.testResult.set(null);
    this.testError.set(null);
    this.api.sendTestEmail(to).subscribe({
      next: (r) => {
        this.testResult.set(r);
        this.testing.set(false);
      },
      error: (err: unknown) => {
        this.testError.set(apiErrorMessage(err));
        this.testing.set(false);
      },
    });
  }
}

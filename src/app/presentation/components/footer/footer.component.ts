import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-footer',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="bg-stone-950 text-stone-300 pt-16 pb-12 border-t border-stone-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          <!-- Brand Column -->
          <div class="lg:col-span-2 space-y-4">
            <div class="flex items-center">
              <img
                src="assets/brand/malaika-logo-white.png"
                alt="Malaika Showroom"
                class="h-8 w-auto opacity-95"
              />
            </div>
            <p class="text-xs text-stone-400 font-light leading-relaxed max-w-sm">
              Maison de diseño y curaduría de indumentaria femenina de autor. Tejidos nobles, siluetas atemporales y tecnología interactiva de probador en realidad aumentada.
            </p>

            <div class="space-y-1.5 text-xs text-stone-400 font-light">
              <p class="flex items-center gap-2">
                <span class="material-symbols-outlined text-sm text-amber-400">location_on</span>
                <span>Tres Arroyos, Buenos Aires</span>
              </p>
              <p class="flex items-center gap-2">
                <span class="material-symbols-outlined text-sm text-amber-400">schedule</span>
                <span>Lun a Sáb: 10:00 a 20:00 hs • Citas privadas personalizadas</span>
              </p>
              <p class="flex items-center gap-2">
                <a href="https://wa.me/5492983527822" target="_blank" rel="noopener noreferrer" class="hover:text-amber-300 transition-colors flex items-center gap-2">
                  <span class="material-symbols-outlined text-sm text-amber-400">phone</span>
                  <span>WhatsApp: 2983 52-7822</span>
                </a>
              </p>
              <p class="flex items-center gap-2">
                <a href="mailto:malaikatresarroyos@gmail.com" class="hover:text-amber-300 transition-colors flex items-center gap-2">
                  <span class="material-symbols-outlined text-sm text-amber-400">mail</span>
                  <span>malaikatresarroyos@gmail.com</span>
                </a>
              </p>
            </div>
          </div>

          <!-- Fast Links -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-widest text-amber-200">
              Experiencia
            </h4>
            <ul class="space-y-2 text-xs text-stone-400">
              <li><a href="#catalogo" class="hover:text-amber-300 transition-colors">Colección Atelier 2026</a></li>
              <li><a href="#maniqui-studio" class="hover:text-amber-300 transition-colors">Maniquí Virtual de Estilismo</a></li>
              <li><a href="#showroom-ar" class="hover:text-amber-300 transition-colors">Showroom Realidad Aumentada</a></li>
              <li><a href="#catalogo" class="hover:text-amber-300 transition-colors">Prendas con Seda & Lino</a></li>
              <li><a href="#catalogo" class="hover:text-amber-300 transition-colors">Calzado & Accesorios</a></li>
            </ul>
          </div>

          <!-- Customer Service -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-widest text-amber-200">
              Servicio al Cliente
            </h4>
            <ul class="space-y-2 text-xs text-stone-400">
              <li><span class="hover:text-stone-300 cursor-pointer">Guía de Talles y Medidas</span></li>
              <li><span class="hover:text-stone-300 cursor-pointer">Envíos Asegurados a todo el País</span></li>
              <li><span class="hover:text-stone-300 cursor-pointer">Cambios sin Cargo (30 días)</span></li>
              <li><span class="hover:text-stone-300 cursor-pointer">Cuidado de Prendas de Seda</span></li>
              <li><span class="hover:text-stone-300 cursor-pointer">Asesoría de Imagen Personalizada</span></li>
            </ul>
          </div>

          <!-- Newsletter Private Club -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-widest text-amber-200">
              Le Club Malaika
            </h4>
            <p class="text-xs text-stone-400 font-light">
              Recibe invitaciones a nuestras ventas privadas, desfiles de temporada y un 10% de bienvenida.
            </p>
            @if (isSubscribed()) {
              <div class="p-3 bg-stone-900 border border-amber-500/40 rounded-xl text-xs text-amber-300">
                ¡Gracias por unirte a nuestro Club Privado!
              </div>
            } @else {
              <form (submit)="subscribe($event)" class="space-y-2">
                <input
                  type="email"
                  [(ngModel)]="newsletterEmail"
                  name="email"
                  placeholder="Tu correo electrónico"
                  required
                  class="w-full px-3.5 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-400 placeholder:text-stone-500"
                />
                <button
                  type="submit"
                  class="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                >
                  Unirse al Club
                </button>
              </form>
            }
          </div>
        </div>

        <!-- Bottom Copyright & Security Badges -->
        <div class="pt-8 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <p>© 2026 Malaika Showroom. Tres Arroyos, Buenos Aires. Todos los derechos reservados.</p>

          <div class="flex items-center gap-4 text-stone-400">
            <span class="flex items-center gap-1 text-[11px]">
              <span class="material-symbols-outlined text-sm text-emerald-500">lock</span>
              <span>Checkout Encriptado SSL</span>
            </span>
            <span>•</span>
            <span class="text-[11px]">Visa • Mastercard • AMEX • Mercado Pago</span>
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  newsletterEmail = '';
  readonly isSubscribed = signal<boolean>(false);

  subscribe(event: Event): void {
    event.preventDefault();
    if (this.newsletterEmail.includes('@')) {
      this.isSubscribed.set(true);
    }
  }
}

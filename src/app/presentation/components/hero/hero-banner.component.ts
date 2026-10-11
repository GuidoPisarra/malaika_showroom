import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-hero-banner',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="relative overflow-hidden bg-gradient-to-b from-[#F5EFE6] via-[#FAF8F5] to-[#FAF8F5] pt-8 pb-16 sm:pt-12 sm:pb-24 border-b border-stone-200/60">
      <!-- Background subtle architectural texture -->
      <div class="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px]"></div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          <!-- Left Column: Manifesto & Actions -->
          <div class="lg:col-span-7 text-center lg:text-left space-y-6 sm:space-y-8">
            <!-- Badge -->
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100/80 border border-amber-300/50 text-amber-900 text-xs font-semibold tracking-wider uppercase">
              <span class="w-2 h-2 rounded-full bg-amber-600"></span>
              <span>Colección Resort & Gala 2026</span>
            </div>

            <!-- Main Heading -->
            <h1 class="font-display text-4xl sm:text-5xl lg:text-6xl text-stone-900 leading-[1.1] font-medium tracking-tight">
              Elegancia atemporal que <span class="italic font-serif text-amber-900">acaricia</span> tu presencia.
            </h1>

            <!-- Subtitle -->
            <p class="text-base sm:text-lg text-stone-600 font-light max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Descubre piezas exclusivas confeccionadas en sedas puras, linos europeos y orfebrería de autor. Experimenta la moda con nuestro <strong>Maniquí Virtual Interactivo</strong> y adéntrate en el showroom en <strong>Realidad Aumentada</strong> desde tu dispositivo.
            </p>

            <!-- CTA Action Buttons -->
            <div class="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-2">
              <a
                id="hero-cta-catalogo"
                href="#catalogo"
                class="w-full sm:w-auto px-7 py-3.5 bg-stone-900 hover:bg-stone-800 text-amber-100 text-sm font-semibold tracking-wider uppercase rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <span>Explorar Catálogo</span>
                <span class="material-symbols-outlined text-base">arrow_forward</span>
              </a>

              <a
                id="hero-cta-maniqui"
                href="#maniqui-studio"
                class="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-stone-50 border border-stone-300 text-stone-900 text-sm font-semibold tracking-wider uppercase rounded-full transition-all duration-300 flex items-center justify-center gap-2 shadow-sm"
              >
                <span class="material-symbols-outlined text-amber-700 text-base">accessibility_new</span>
                <span>Armar Look en Maniquí</span>
              </a>

              <a
                id="hero-cta-ar"
                href="#showroom-ar"
                class="w-full sm:w-auto px-5 py-3 text-stone-700 hover:text-amber-800 text-sm font-medium tracking-wide flex items-center justify-center gap-1.5 transition-colors"
              >
                <span class="material-symbols-outlined text-amber-700 text-base">view_in_ar</span>
                <span>Recorrer en AR 360°</span>
              </a>
            </div>

            <!-- Value Props Badges -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-stone-200/80">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                  <span class="material-symbols-outlined text-lg">credit_card</span>
                </div>
                <div class="text-left">
                  <p class="text-xs font-semibold text-stone-800">3 Cuotas Sin Interés</p>
                  <p class="text-[11px] text-stone-500">Con todas las tarjetas</p>
                </div>
              </div>

              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                  <span class="material-symbols-outlined text-lg">verified_user</span>
                </div>
                <div class="text-left">
                  <p class="text-xs font-semibold text-stone-800">Pasarela Segura</p>
                  <p class="text-[11px] text-stone-500">Encriptación SSL 256-bit</p>
                </div>
              </div>

              <div class="col-span-2 sm:col-span-1 flex items-center justify-center sm:justify-start gap-2.5">
                <div class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                  <span class="material-symbols-outlined text-lg">local_shipping</span>
                </div>
                <div class="text-left">
                  <p class="text-xs font-semibold text-stone-800">Envío Gratis</p>
                  <p class="text-[11px] text-stone-500">En compras desde $150.000</p>
                </div>
              </div>
            </div>

          </div>

          <!-- Right Column: Editorial Visual Showcase -->
          <div class="lg:col-span-5 relative">
            <div class="relative mx-auto max-w-sm sm:max-w-md lg:max-w-none">
              
              <!-- Luxury Floating Badge -->
              <div class="absolute -top-4 -left-4 z-20 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-stone-200/80 text-left animate-float-slow">
                <span class="text-[10px] uppercase tracking-widest text-amber-700 font-bold block">Lookbook 2026</span>
                <span class="font-serif text-sm font-semibold text-stone-900 block">Seda Mulberry Italiana</span>
                <span class="text-[10px] text-stone-500 block">Corte al Bies & Drapeados</span>
              </div>

              <!-- Main Hero Image Frame -->
              <div class="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white aspect-[3/4] bg-stone-200">
                <img
                  src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85"
                  alt="Malaika Showroom Colección Alta Costura"
                  class="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-700 ease-out"
                />
                
                <!-- Bottom Gradient & Quick Interactive Indicator -->
                <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/80 via-stone-900/30 to-transparent p-6 text-white text-left">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-xs tracking-widest uppercase text-amber-300 font-semibold">Pieza Ícono</p>
                      <p class="font-serif text-xl font-medium">Vestido Midi Champagne</p>
                    </div>
                    <a
                      href="#maniqui-studio"
                      class="bg-white/20 hover:bg-white/40 backdrop-blur-md p-2.5 rounded-full text-white transition-colors"
                      title="Probar en Maniquí"
                    >
                      <span class="material-symbols-outlined text-xl">styler</span>
                    </a>
                  </div>
                </div>
              </div>

              <!-- Secondary Floating Accent Card -->
              <div class="absolute -bottom-5 -right-4 z-20 bg-stone-900 text-stone-100 px-4 py-3 rounded-2xl shadow-xl border border-amber-400/30 text-left">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-amber-400 text-xl">view_in_ar</span>
                  <div>
                    <p class="text-[10px] uppercase tracking-wider text-amber-300 font-bold">Showroom 3D & AR</p>
                    <p class="text-xs text-stone-300">Pruébalo en tu propio espacio</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  `,
})
export class HeroBannerComponent {}

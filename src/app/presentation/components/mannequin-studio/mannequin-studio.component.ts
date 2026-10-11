import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LookBuilderFacade } from '../../../application/look-builder.facade';
import { CatalogFacade } from '../../../application/catalog.facade';
import { CartFacade } from '../../../application/cart.facade';
import { Product } from '../../../domain/catalog/models/product.model';
import { LookPreset } from '../../../domain/look-builder/models/look.model';
import { ArsCurrencyPipe } from '../../shared/pipes/ars-currency.pipe';

export interface SilhouetteSkinTone {
  id: 'arena' | 'porcelain' | 'caramel' | 'ebony';
  label: string;
  fill: string;
  shadow: string;
  stroke: string;
  hair: string;
  accent: string;
  previewHex: string;
}

export const SILHOUETTE_SKIN_TONES: SilhouetteSkinTone[] = [
  {
    id: 'arena',
    label: 'Arena Boutique (Foto)',
    fill: '#D8C7B3',
    shadow: '#BFAEA0',
    stroke: '#9E8B79',
    hair: '#382D26',
    accent: '#D4AF37',
    previewHex: '#D8C7B3',
  },
  {
    id: 'porcelain',
    label: 'Porcelana',
    fill: '#F5EBE1',
    shadow: '#DECEBD',
    stroke: '#C6B09B',
    hair: '#29211C',
    accent: '#D4AF37',
    previewHex: '#F5EBE1',
  },
  {
    id: 'caramel',
    label: 'Caramelo',
    fill: '#D8A881',
    shadow: '#B7825A',
    stroke: '#9A633B',
    hair: '#1D1613',
    accent: '#E5C07B',
    previewHex: '#D8A881',
  },
  {
    id: 'ebony',
    label: 'Ébano',
    fill: '#8D5C43',
    shadow: '#6E3F28',
    stroke: '#542E1B',
    hair: '#120D0C',
    accent: '#E5C07B',
    previewHex: '#8D5C43',
  },
];

@Component({
  selector: 'app-mannequin-studio',
  imports: [CommonModule, ArsCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section id="maniqui-studio" class="py-16 sm:py-24 bg-[#F5EFE6] border-y border-stone-200/80 relative overflow-hidden">
      <!-- Background subtle accent glow -->
      <div class="absolute top-0 right-0 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute bottom-0 left-0 w-96 h-96 bg-stone-300/20 rounded-full blur-3xl pointer-events-none"></div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <!-- Section Header -->
        <div class="text-center max-w-3xl mx-auto space-y-3 mb-10 sm:mb-14">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-900 text-amber-200 text-xs font-semibold tracking-widest uppercase">
            <span class="material-symbols-outlined text-sm">styler</span>
            <span>Virtual Fitting Room</span>
          </div>
          <h2 class="font-display text-3xl sm:text-4xl lg:text-5xl text-stone-900 font-medium tracking-tight">
            Probador Virtual con Silueta de Modelo
          </h2>
          <p class="text-sm sm:text-base text-stone-600 font-light max-w-xl mx-auto">
            Visualiza cómo lucen vestidos, palazzos, blusas y calzado sobre una silueta femenina estilizada con brazos y piernas completas para apreciar cada caída y longitud.
          </p>

          <!-- Toast Notification for equipped item -->
          @if (lookBuilderFacade.lastEquippedNotification(); as notification) {
            <div class="inline-block mt-2 px-4 py-1.5 bg-stone-900 text-amber-200 text-xs font-medium rounded-full shadow-md animate-fadeIn">
              {{ notification }}
            </div>
          }
        </div>

        <!-- Preset Looks Pills -->
        <div class="flex items-center justify-center gap-2 sm:gap-3 flex-wrap mb-8">
          <span class="text-xs uppercase tracking-wider text-stone-500 font-semibold mr-1">
            Inspiraciones:
          </span>
          @for (preset of lookBuilderFacade.presets; track preset.id) {
            <button
              type="button"
              (click)="applyPreset(preset)"
              class="px-4 py-1.5 bg-white hover:bg-amber-50 border border-stone-300 hover:border-amber-400 text-stone-800 text-xs font-medium rounded-full shadow-xs transition-all duration-200 flex items-center gap-1.5"
            >
              <span class="w-2 h-2 rounded-full bg-amber-600"></span>
              <span>{{ preset.name }}</span>
              <span class="text-[10px] text-stone-400 hidden sm:inline">({{ preset.tag }})</span>
            </button>
          }
          <button
            type="button"
            (click)="lookBuilderFacade.clearMannequin()"
            class="px-3 py-1.5 text-stone-500 hover:text-stone-800 text-xs font-medium transition-colors cursor-pointer"
            title="Limpiar probador"
          >
            Reiniciar
          </button>
        </div>

        <!-- Main Studio Grid: Mannequin Stage & Wardrobe Rack Selector -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <!-- Column 1: The Interactive Visual Mannequin Stage (5 cols) -->
          <div class="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-200/90 relative flex flex-col items-center">
            
            <!-- Mannequin Header: Style Diagnostic Pill & Render Mode Selector -->
            <div class="w-full flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <span class="text-[10px] uppercase font-bold tracking-widest text-amber-800 block">
                  Diagnóstico de Estilo
                </span>
                <span class="font-serif text-base font-semibold text-stone-900">
                  {{ lookBuilderFacade.harmony().vibe }}
                </span>
              </div>
              <!-- Harmony Score Meter -->
              <div class="text-right">
                <span class="text-[10px] uppercase text-stone-400 tracking-wider block">Armonía</span>
                <span class="text-sm font-bold font-mono text-amber-700">
                  {{ lookBuilderFacade.harmony().score }}%
                </span>
              </div>
            </div>

            <!-- Avatar Model Selector & Skin Tone Bar -->
            <div class="w-full flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-stone-100 text-xs gap-2">
              <!-- Figure Model Toggle -->
              <div class="inline-flex p-0.5 rounded-lg bg-stone-100 border border-stone-200 shrink-0">
                <button
                  type="button"
                  (click)="setAvatarModel('female-model')"
                  class="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                  [class.bg-white]="avatarModel() === 'female-model'"
                  [class.text-amber-900]="avatarModel() === 'female-model'"
                  [class.shadow-xs]="avatarModel() === 'female-model'"
                  [class.text-stone-500]="avatarModel() !== 'female-model'"
                  title="Silueta femenina de modelo completa con brazos y piernas"
                >
                  <span class="material-symbols-outlined text-xs text-amber-700">accessibility_new</span>
                  Silueta Mujer
                </button>
                <button
                  type="button"
                  (click)="setAvatarModel('tailor-dummy')"
                  class="px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                  [class.bg-white]="avatarModel() === 'tailor-dummy'"
                  [class.text-amber-900]="avatarModel() === 'tailor-dummy'"
                  [class.shadow-xs]="avatarModel() === 'tailor-dummy'"
                  [class.text-stone-500]="avatarModel() !== 'tailor-dummy'"
                  title="Maniquí clásico de sastrería"
                >
                  <span class="material-symbols-outlined text-xs">checkroom</span>
                  Maniquí
                </button>
              </div>

              <!-- Skin Tone Swatches (for female model) -->
              @if (avatarModel() === 'female-model') {
                <div class="flex items-center gap-1.5 self-end sm:self-auto">
                  <span class="text-[10px] text-stone-400 uppercase tracking-wider font-medium mr-0.5">Piel:</span>
                  @for (tone of skinTones; track tone.id) {
                    <button
                      type="button"
                      (click)="setSkinTone(tone.id)"
                      class="w-5 h-5 rounded-full border transition-transform cursor-pointer"
                      [style.backgroundColor]="tone.previewHex"
                      [class.ring-2]="selectedSkinToneId() === tone.id"
                      [class.ring-amber-700]="selectedSkinToneId() === tone.id"
                      [class.scale-110]="selectedSkinToneId() === tone.id"
                      [class.border-stone-300]="selectedSkinToneId() !== tone.id"
                      [title]="tone.label"
                    ></button>
                  }
                </div>
              }
            </div>

            <!-- Mannequin Render Mode Toggle: Prenda Real vs Silueta Costura -->
            <div class="w-full flex items-center justify-between py-2 border-b border-stone-100 text-xs">
              <span class="text-[11px] font-medium text-stone-500 flex items-center gap-1">
                <span class="material-symbols-outlined text-xs text-amber-700">texture</span>
                Textura prenda:
              </span>
              <div class="inline-flex p-0.5 rounded-lg bg-stone-100 border border-stone-200">
                <button
                  type="button"
                  (click)="setRenderMode('photo')"
                  class="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                  [class.bg-white]="mannequinRenderMode() === 'photo'"
                  [class.text-amber-900]="mannequinRenderMode() === 'photo'"
                  [class.shadow-xs]="mannequinRenderMode() === 'photo'"
                  [class.text-stone-500]="mannequinRenderMode() !== 'photo'"
                  title="Ver la prenda real con su textura fotográfica sobre el maniquí"
                >
                  <span class="material-symbols-outlined text-xs text-amber-600">photo_camera</span>
                  Prenda Real
                </button>
                <button
                  type="button"
                  (click)="setRenderMode('couture')"
                  class="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                  [class.bg-white]="mannequinRenderMode() === 'couture'"
                  [class.text-amber-900]="mannequinRenderMode() === 'couture'"
                  [class.shadow-xs]="mannequinRenderMode() === 'couture'"
                  [class.text-stone-500]="mannequinRenderMode() !== 'couture'"
                  title="Ver la silueta clásica de sastrería"
                >
                  <span class="material-symbols-outlined text-xs">draw</span>
                  Boceto
                </button>
              </div>
            </div>

            <!-- Visual SVG Couture Mannequin Avatar Stage -->
            <div class="relative w-full max-w-[280px] sm:max-w-[320px] aspect-[1/2] my-4 flex items-center justify-center">
              
              <!-- Subtle Pedestal Shadow -->
              <div class="absolute bottom-2 inset-x-8 h-4 bg-stone-900/10 rounded-full blur-md"></div>

              <!-- SVG Couture Silhouette with dynamic garments -->
              <svg
                viewBox="0 0 240 480"
                class="w-full h-full drop-shadow-md select-none"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <!-- Definitions: Shading Gradients & Garment Clipping Paths -->
                <defs>
                  <!-- 3D Anatomical Garment Shading Gradient -->
                  <linearGradient id="mannequin-shading-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#000000" stop-opacity="0.25" />
                    <stop offset="20%" stop-color="#000000" stop-opacity="0.04" />
                    <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.25" />
                    <stop offset="80%" stop-color="#000000" stop-opacity="0.04" />
                    <stop offset="100%" stop-color="#000000" stop-opacity="0.28" />
                  </linearGradient>

                  <!-- Luxury Atelier Sculptural Lighting Gradient for Mannequin Flesh / Satin Surface -->
                  <linearGradient id="mannequin-sculpture-shading" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#000000" stop-opacity="0.14" />
                    <stop offset="18%" stop-color="#FFFFFF" stop-opacity="0.10" />
                    <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.20" />
                    <stop offset="82%" stop-color="#000000" stop-opacity="0.02" />
                    <stop offset="100%" stop-color="#000000" stop-opacity="0.18" />
                  </linearGradient>

                  <!-- Head Porcelain Radial Highlight -->
                  <radialGradient id="mannequin-head-highlight" cx="42%" cy="38%" r="56%">
                    <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.45" />
                    <stop offset="55%" stop-color="#FFFFFF" stop-opacity="0.10" />
                    <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.0" />
                  </radialGradient>

                  <!-- Soft Ambient Occlusion for Torso & Arm Hollows -->
                  <radialGradient id="mannequin-torso-depth" cx="50%" cy="40%" r="50%">
                    <stop offset="60%" stop-color="#000000" stop-opacity="0.0" />
                    <stop offset="100%" stop-color="#000000" stop-opacity="0.12" />
                  </radialGradient>

                  <!-- Dress Contour Clip Path (leaves model calves & heels visible below Y:362) -->
                  <clipPath id="mannequin-dress-clip">
                    <path d="M100 94 C108 92, 132 92, 140 94 C150 114, 152 142, 146 172 C140 184, 136 192, 140 216 C146 248, 160 305, 164 362 C165 378, 142 382, 120 382 C98 382, 75 378, 76 362 C80 305, 94 248, 100 216 C104 192, 100 184, 94 172 C88 142, 90 114, 100 94 Z" />
                  </clipPath>

                  <!-- Blazer Contour Clip Path (sleeves align with symmetrical frontal arms) -->
                  <clipPath id="mannequin-blazer-clip">
                    <path d="M82 98 C96 92, 144 92, 158 98 C166 118, 168 168, 163 218 L152 218 C148 180, 146 148, 142 138 L138 215 L102 215 L98 138 C94 148, 92 180, 88 218 L77 218 C72 168, 74 118, 82 98 Z" />
                  </clipPath>

                  <!-- Top / Blouse Contour Clip Path -->
                  <clipPath id="mannequin-top-clip">
                    <path d="M98 94 C108 92, 132 92, 142 94 C152 114, 150 146, 144 174 C138 184, 134 186, 120 186 C106 186, 102 184, 96 174 C90 146, 88 114, 98 94 Z" />
                  </clipPath>

                  <!-- Palazzo Pants Clip Path: covers full legs down to the ankles and shoes (Y: 438) -->
                  <clipPath id="mannequin-pants-clip">
                    <path d="M96 182 L144 182 C152 218, 158 248, 158 262 L164 438 L124 438 L120 260 L116 260 L76 438 L82 262 C82 248, 88 218, 96 182 Z" />
                  </clipPath>

                  <!-- Skirt Clip Path (leaves sculpted calves visible below Y:348) -->
                  <clipPath id="mannequin-skirt-clip">
                    <path d="M96 182 L144 182 C152 224, 158 278, 162 348 C140 354, 100 354, 78 348 C82 278, 88 224, 96 182 Z" />
                  </clipPath>

                  <!-- Handbag Clip Path (natural carry in hand) -->
                  <clipPath id="mannequin-bag-clip">
                    <rect x="-10" y="8" width="30" height="22" rx="4" />
                  </clipPath>
                </defs>

                <!-- BASE AVATAR ANATOMY: FEMALE MODEL (Default) vs TAILOR DUMMY -->
                @if (avatarModel() === 'female-model') {
                  <!-- === BOUTIQUE FIBERGLASS FEMALE MANNEQUIN (REAL CUTOUT - SMOOTH MINIMALIST FINISH) === -->
                  <g id=female-model-silhouette>
                    <!-- Studio Floor Shadows (Occlusion under Contrapposto Feet) -->
                    <ellipse cx=120 cy=458 rx=55 ry=8 fill=#1C1917 fill-opacity=0.10 />
                    <ellipse cx=106 cy=456 rx=16 ry=4 fill=#1C1917 fill-opacity=0.16 />
                    <ellipse cx=132 cy=455 rx=14 ry=3.5 fill=#1C1917 fill-opacity=0.14 />

                    <!-- Real Boutique Mannequin High-Resolution Cutout (Transparent Background, Smooth Clean Finish) -->
                    <image
                      href="assets/mannequin/boutique_mannequin_clean.png?v=clean2"
                      x="35.7"
                      y="14"
                      width="168.6"
                      height="446"
                      preserveAspectRatio="xMidYMid meet"
                      [style.filter]="mannequinFilter()"
                      class="transition-all duration-300"
                    />
                  </g>
                } @else {
                  <!-- === CLASSICAL TAILOR DUMMY STAND & FORM === -->
                  <g id="tailor-dummy-stand">
                    <!-- Base & Pole -->
                    <circle cx="120" cy="460" r="30" fill="#D5C7B8" stroke="#B39F8A" stroke-width="2" />
                    <rect x="117" y="380" width="6" height="80" rx="3" fill="#B39F8A" />
                    <!-- Head Finial -->
                    <ellipse cx="120" cy="38" rx="16" ry="22" fill="#E8DEC8" stroke="#D0C2A9" stroke-width="1.5" />
                    <circle cx="120" cy="14" r="5" fill="#C5A880" />
                    <!-- Neck -->
                    <path d="M113 58 L127 58 L129 78 L111 78 Z" fill="#E8DEC8" stroke="#D0C2A9" stroke-width="1.5" />
                    <!-- Torso -->
                    <path
                      d="M90 85 C95 80, 145 80, 150 85 C158 92, 160 115, 152 135 C146 150, 138 165, 134 185 C130 200, 146 220, 148 245 C150 270, 140 280, 120 280 C100 280, 90 270, 92 245 C94 220, 110 200, 106 185 C102 165, 94 150, 88 135 C80 115, 82 92, 90 85 Z"
                      fill="#EDE3D1"
                      stroke="#D0C2A9"
                      stroke-width="1.5"
                    />
                    <!-- Wooden Leg Pillars -->
                    <path d="M108 280 L106 400" stroke="#B39F8A" stroke-width="4" stroke-linecap="round" />
                    <path d="M132 280 L134 400" stroke="#B39F8A" stroke-width="4" stroke-linecap="round" />
                  </g>
                }

                <!-- GARMENT LAYER 1: DRESS (If equipped) -->
                @if (lookBuilderFacade.slots().dress; as dress) {
                  <g class="transition-all duration-500 ease-out">
                    <!-- Base fabric color layer -->
                    <path
                      d="M100 94 C108 92, 132 92, 140 94 C150 114, 152 142, 146 172 C140 184, 136 192, 140 216 C146 248, 160 305, 164 362 C165 378, 142 382, 120 382 C98 382, 75 378, 76 362 C80 305, 94 248, 100 216 C104 192, 100 184, 94 172 C88 142, 90 114, 100 94 Z"
                      [attr.fill]="dress.silhouette.colorHex"
                      stroke="#332B25"
                      stroke-width="1"
                    />

                    <!-- Real Photographic Dress Texture fitted to the female silhouette -->
                    @if (mannequinRenderMode() === 'photo') {
                      <image
                        [attr.href]="dress.image"
                        x="72"
                        y="92"
                        width="96"
                        height="295"
                        preserveAspectRatio="xMidYMid slice"
                        clip-path="url(#mannequin-dress-clip)"
                      />
                    }

                    <!-- 3D Curvature & Silk Lighting Wrap -->
                    <path
                      d="M100 94 C108 92, 132 92, 140 94 C150 114, 152 142, 146 172 C140 184, 136 192, 140 216 C146 248, 160 305, 164 362 C165 378, 142 382, 120 382 C98 382, 75 378, 76 362 C80 305, 94 248, 100 216 C104 192, 100 184, 94 172 C88 142, 90 114, 100 94 Z"
                      fill="url(#mannequin-shading-gradient)"
                      stroke="#332B25"
                      stroke-width="1.2"
                    />

                    <!-- Drapery, waistline and fold reflections -->
                    <path d="M120 96 Q122 170 115 250 Q110 320 108 380" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="1.6" fill="none" />
                    <path d="M135 150 Q142 260 148 365" stroke="#000000" stroke-opacity="0.25" stroke-width="1.4" fill="none" />
                    <path d="M106 182 Q120 190 134 182" stroke="#000000" stroke-opacity="0.3" stroke-width="1.5" fill="none" />
                  </g>
                }

                <!-- GARMENT LAYER 2: TOP / BLOUSE / BLAZER (If equipped and no dress) -->
                @if (lookBuilderFacade.slots().top; as top) {
                  <g class="transition-all duration-500 ease-out">
                    @if (top.silhouette.svgType === 'blazer') {
                      <!-- Base Blazer on model shoulders and symmetrical arms -->
                      <path
                        d="M82 98 C96 92, 144 92, 158 98 C166 118, 168 168, 163 218 L152 218 C148 180, 146 148, 142 138 L138 215 L102 215 L98 138 C94 148, 92 180, 88 218 L77 218 C72 168, 74 118, 82 98 Z"
                        [attr.fill]="top.silhouette.colorHex"
                        stroke="#332B25"
                        stroke-width="1.2"
                      />
                      <!-- Real photo texture -->
                      @if (mannequinRenderMode() === 'photo') {
                        <image
                          [attr.href]="top.image"
                          x="70"
                          y="92"
                          width="100"
                          height="132"
                          preserveAspectRatio="xMidYMid slice"
                          clip-path="url(#mannequin-blazer-clip)"
                        />
                      }
                      <path
                        d="M82 98 C96 92, 144 92, 158 98 C166 118, 168 168, 163 218 L152 218 C148 180, 146 148, 142 138 L138 215 L102 215 L98 138 C94 148, 92 180, 88 218 L77 218 C72 168, 74 118, 82 98 Z"
                        fill="url(#mannequin-shading-gradient)"
                        stroke="#332B25"
                        stroke-width="1.2"
                      />
                      <!-- Lapels & Buttons -->
                      <path d="M102 96 L120 170 L138 96" stroke="#4A3B32" stroke-width="1.6" fill="none" />
                      <circle cx="120" cy="184" r="3" fill="#D4AF37" />
                      <line x1="88" y1="198" x2="102" y2="198" stroke="#332B25" stroke-width="1.2" />
                      <line x1="138" y1="198" x2="152" y2="198" stroke="#332B25" stroke-width="1.2" />
                    } @else {
                      <!-- Blouse / Top -->
                      <path
                        d="M98 94 C108 92, 132 92, 142 94 C152 114, 150 146, 144 174 C138 184, 134 186, 120 186 C106 186, 102 184, 96 174 C90 146, 88 114, 98 94 Z"
                        [attr.fill]="top.silhouette.colorHex"
                        stroke="#332B25"
                        stroke-width="1.2"
                      />
                      @if (mannequinRenderMode() === 'photo') {
                        <image
                          [attr.href]="top.image"
                          x="82"
                          y="92"
                          width="76"
                          height="102"
                          preserveAspectRatio="xMidYMid slice"
                          clip-path="url(#mannequin-top-clip)"
                        />
                      }
                      <path
                        d="M98 94 C108 92, 132 92, 142 94 C152 114, 150 146, 144 174 C138 184, 134 186, 120 186 C106 186, 102 184, 96 174 C90 146, 88 114, 98 94 Z"
                        fill="url(#mannequin-shading-gradient)"
                        stroke="#332B25"
                        stroke-width="1.2"
                      />
                      <path d="M112 94 Q120 106 128 94" stroke="#D4AF37" stroke-width="1.2" fill="none" />
                    }
                  </g>
                }

                <!-- GARMENT LAYER 3: BOTTOM / PALAZZO / SKIRT (If equipped and no dress) -->
                @if (lookBuilderFacade.slots().bottom; as bottom) {
                  <g class="transition-all duration-500 ease-out">
                    @if (bottom.silhouette.svgType === 'pants-palazzo') {
                      <!-- Palazzo Wide-leg pants draping down the full legs to ankles/shoes (Y: 438) -->
                      <path
                        d="M96 182 L144 182 C152 218, 158 248, 158 262 L164 438 L124 438 L120 260 L116 260 L76 438 L82 262 C82 248, 88 218, 96 182 Z"
                        [attr.fill]="bottom.silhouette.colorHex"
                        stroke="#332B25"
                        stroke-width="1.2"
                      />
                      @if (mannequinRenderMode() === 'photo') {
                        <image
                          [attr.href]="bottom.image"
                          x="72"
                          y="182"
                          width="96"
                          height="258"
                          preserveAspectRatio="xMidYMid slice"
                          clip-path="url(#mannequin-pants-clip)"
                        />
                      }
                      <path
                        d="M96 182 L144 182 C152 218, 158 248, 158 262 L164 438 L124 438 L120 260 L116 260 L76 438 L82 262 C82 248, 88 218, 96 182 Z"
                        fill="url(#mannequin-shading-gradient)"
                        stroke="#332B25"
                        stroke-width="1.2"
                      />
                      <!-- Center pleat lines and tailored seams down the legs -->
                      <path d="M95 210 L94 435" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="1.2" />
                      <path d="M145 210 L146 435" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="1.2" />
                      <path d="M120 260 L120 295" stroke="#000000" stroke-opacity="0.25" stroke-width="1.2" />
                    } @else {
                      <!-- Midi Skirt (stops at Y: 348, letting sculpted calves & heels show below) -->
                      <path
                        d="M96 182 L144 182 C152 224, 158 278, 162 348 C140 354, 100 354, 78 348 C82 278, 88 224, 96 182 Z"
                        [attr.fill]="bottom.silhouette.colorHex"
                        stroke="#332B25"
                        stroke-width="1"
                      />
                      @if (mannequinRenderMode() === 'photo') {
                        <image
                          [attr.href]="bottom.image"
                          x="78"
                          y="182"
                          width="84"
                          height="168"
                          preserveAspectRatio="xMidYMid slice"
                          clip-path="url(#mannequin-skirt-clip)"
                        />
                      }
                      <path
                        d="M96 182 L144 182 C152 224, 158 278, 162 348 C140 354, 100 354, 78 348 C82 278, 88 224, 96 182 Z"
                        fill="url(#mannequin-shading-gradient)"
                        stroke="#332B25"
                        stroke-width="1"
                      />
                    }
                  </g>
                }

                <!-- GARMENT LAYER 4: SHOES / STILETTO HEELS (Fitted directly on the feet) -->
                @if (lookBuilderFacade.slots().shoes; as shoes) {
                  <g class="transition-all duration-500 ease-out">
                    <!-- Left Stiletto Heel on Left Foot -->
                    <g id="left-shoe">
                      <path
                        d="M94 442 C95 454, 102 454, 102 442 L102 436 L95 436 Z"
                        [attr.fill]="shoes.silhouette.colorHex"
                        stroke="#332B25"
                        stroke-width="1"
                      />
                      <path d="M102 438 L102 456" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" />
                      <line x1="95" y1="436" x2="102" y2="436" stroke="#D4AF37" stroke-width="1.4" />
                    </g>
                    <!-- Right Stiletto Heel on Right Foot -->
                    <g id="right-shoe">
                      <path
                        d="M138 442 C138 454, 145 454, 146 442 L145 436 L138 436 Z"
                        [attr.fill]="shoes.silhouette.colorHex"
                        stroke="#332B25"
                        stroke-width="1"
                      />
                      <path d="M138 438 L138 456" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" />
                      <line x1="138" y1="436" x2="145" y2="436" stroke="#D4AF37" stroke-width="1.4" />
                    </g>
                  </g>
                }

                <!-- GARMENT LAYER 5: ACCESSORY / BAG / JEWELRY / HAT -->
                @if (lookBuilderFacade.slots().accessory; as acc) {
                  <g class="transition-all duration-500 ease-out">
                    @if (acc.silhouette.svgType === 'hat-fedora') {
                      <!-- Fedora Hat on the chic chignon hairstyle -->
                      <ellipse cx="120" cy="28" rx="30" ry="10" [attr.fill]="acc.silhouette.colorHex" stroke="#332B25" stroke-width="1" />
                      <path d="M104 26 C104 15, 136 15, 136 26 Z" [attr.fill]="acc.silhouette.colorHex" stroke="#332B25" stroke-width="1" />
                      <line x1="104" y1="26" x2="136" y2="26" stroke="#1C1917" stroke-width="2.5" />
                    } @else if (acc.silhouette.svgType === 'jewelry-necklace') {
                      <!-- Gold Atelier Choker Necklace on collarbone -->
                      <path d="M113 86 C114 96, 126 96, 127 86" stroke="#D4AF37" stroke-width="2.5" fill="none" stroke-linecap="round" />
                      <circle cx="120" cy="94" r="3.2" fill="#D4AF37" />
                    } @else {
                      <!-- Handbag carried gracefully at the model's hand/wrist -->
                      <g transform="translate(152, 230)">
                        <!-- Gold bag strap looped over wrist/hand -->
                        <path d="M8 0 C4 -14, -6 -14, -2 8" stroke="#D4AF37" stroke-width="1.8" fill="none" />
                        <!-- Handbag leather body -->
                        <rect x="-10" y="8" width="28" height="22" rx="4" [attr.fill]="acc.silhouette.colorHex" stroke="#332B25" stroke-width="1.2" />
                        @if (mannequinRenderMode() === 'photo') {
                          <image
                            [attr.href]="acc.image"
                            x="-10"
                            y="8"
                            width="28"
                            height="22"
                            preserveAspectRatio="xMidYMid slice"
                            clip-path="url(#mannequin-bag-clip)"
                          />
                        }
                        <!-- Gold logo clasp -->
                        <circle cx="4" cy="19" r="2.2" fill="#D4AF37" />
                      </g>
                    }
                  </g>
                }
              </svg>

              <!-- Slot Hotspot Tags on Avatar (Quick unequip or inspect) -->
              <div class="absolute inset-0 pointer-events-none">
                <!-- Top / Dress Hotspot -->
                @if (lookBuilderFacade.slots().dress || lookBuilderFacade.slots().top; as piece) {
                  <div class="absolute top-[26%] -left-3 pointer-events-auto">
                    <button
                      (click)="lookBuilderFacade.unequipSlot(lookBuilderFacade.slots().dress ? 'dress' : 'top')"
                      class="px-2 py-1 bg-stone-900/90 text-amber-200 text-[10px] rounded-lg shadow-md flex items-center gap-1 hover:bg-rose-900 transition-colors cursor-pointer"
                      title="Quitar prenda"
                    >
                      <span class="max-w-[85px] truncate">{{ piece.name }}</span>
                      <span class="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>
                }

                <!-- Bottom Hotspot -->
                @if (lookBuilderFacade.slots().bottom; as bottom) {
                  <div class="absolute top-[58%] -right-3 pointer-events-auto">
                    <button
                      (click)="lookBuilderFacade.unequipSlot('bottom')"
                      class="px-2 py-1 bg-stone-900/90 text-amber-200 text-[10px] rounded-lg shadow-md flex items-center gap-1 hover:bg-rose-900 transition-colors cursor-pointer"
                      title="Quitar prenda"
                    >
                      <span class="max-w-[85px] truncate">{{ bottom.name }}</span>
                      <span class="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>
                }

                <!-- Shoes Hotspot -->
                @if (lookBuilderFacade.slots().shoes; as shoes) {
                  <div class="absolute bottom-6 -left-3 pointer-events-auto">
                    <button
                      (click)="lookBuilderFacade.unequipSlot('shoes')"
                      class="px-2 py-1 bg-stone-900/90 text-amber-200 text-[10px] rounded-lg shadow-md flex items-center gap-1 hover:bg-rose-900 transition-colors cursor-pointer"
                      title="Quitar calzado"
                    >
                      <span class="max-w-[85px] truncate">{{ shoes.name }}</span>
                      <span class="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>
                }

                <!-- Accessory Hotspot -->
                @if (lookBuilderFacade.slots().accessory; as acc) {
                  <div
                    class="absolute -right-3 pointer-events-auto transition-all"
                    [class.top-[44%]]="acc.silhouette.svgType === 'bag-clutch'"
                    [class.top-[14%]]="acc.silhouette.svgType !== 'bag-clutch'"
                  >
                    <button
                      (click)="lookBuilderFacade.unequipSlot('accessory')"
                      class="px-2 py-1 bg-stone-900/90 text-amber-200 text-[10px] rounded-lg shadow-md flex items-center gap-1 hover:bg-rose-900 transition-colors cursor-pointer"
                      title="Quitar accesorio"
                    >
                      <span class="max-w-[85px] truncate">{{ acc.name }}</span>
                      <span class="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>
                }
              </div>
            </div>

            <!-- Equipped Garments Bar with High-Res Thumbnails -->
            @if (lookBuilderFacade.equippedCount() > 0) {
              <div class="w-full bg-stone-50 border border-stone-200/80 rounded-2xl p-2.5 my-2">
                <div class="flex items-center justify-between text-[11px] text-stone-500 font-medium mb-1.5 px-0.5">
                  <span class="flex items-center gap-1 text-amber-800 font-semibold">
                    <span class="material-symbols-outlined text-sm">accessibility_new</span>
                    Prendas en la Modelo ({{ lookBuilderFacade.equippedCount() }})
                  </span>
                  <span class="text-[10px] text-stone-400">Click en la X para desvestir</span>
                </div>
                <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  @for (item of lookBuilderFacade.equippedItems(); track item.id) {
                    <div class="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white border border-stone-200 shadow-xs shrink-0">
                      <img [src]="item.image" [alt]="item.name" class="w-7 h-7 rounded-lg object-cover border border-stone-100" />
                      <div class="text-[11px] leading-tight pr-1">
                        <span class="font-medium text-stone-800 block max-w-[100px] truncate">{{ item.name }}</span>
                        <span class="text-stone-500 font-mono text-[10px]">{{ item.price | arsCurrency }}</span>
                      </div>
                      <button
                        type="button"
                        (click)="lookBuilderFacade.unequipSlot(item.slot)"
                        class="text-stone-400 hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer"
                        title="Quitar prenda de la modelo"
                      >
                        <span class="material-symbols-outlined text-xs">close</span>
                      </button>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Mannequin Footer: Pricing, Bundle Discount & Buy Whole Look -->
            <div class="w-full pt-4 border-t border-stone-100 space-y-3">
              <!-- Pricing Line -->
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs text-stone-500 block">Total del Look ({{ lookBuilderFacade.equippedCount() }} prendas)</span>
                  <div class="flex items-baseline gap-2">
                    <span class="text-2xl font-bold font-mono text-stone-900">
                      {{ lookBuilderFacade.finalLookPrice() | arsCurrency }}
                    </span>
                    @if (lookBuilderFacade.bundleDiscountAmount() > 0) {
                      <span class="text-sm font-mono text-stone-400 line-through">
                        {{ lookBuilderFacade.rawTotalPrice() | arsCurrency }}
                      </span>
                    }
                  </div>
                </div>

                @if (lookBuilderFacade.discountRate() > 0) {
                  <span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold tracking-wide">
                    -{{ lookBuilderFacade.discountRate() * 100 }}% OFF Pack Look
                  </span>
                }
              </div>

              <!-- Main Look Actions -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  (click)="addWholeLookToBag()"
                  [disabled]="lookBuilderFacade.equippedCount() === 0"
                  class="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:hover:bg-stone-900 text-amber-200 text-xs font-bold tracking-wider uppercase rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
                >
                  <span class="material-symbols-outlined text-base">shopping_bag</span>
                  <span>Comprar Look Completo</span>
                </button>

                <button
                  type="button"
                  (click)="lookBuilderFacade.saveCurrentLook()"
                  [disabled]="lookBuilderFacade.equippedCount() === 0"
                  class="w-full py-3 px-3 bg-white hover:bg-stone-50 disabled:opacity-40 border border-stone-300 text-stone-800 text-xs font-semibold tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <span class="material-symbols-outlined text-base text-amber-700">bookmark</span>
                  <span>Guardar Look</span>
                </button>
              </div>

              <!-- Stylist Advice Tip -->
              <div class="p-3 bg-stone-50 rounded-xl text-xs text-stone-600 space-y-1">
                <p class="font-medium text-stone-900 flex items-center gap-1">
                  <span class="material-symbols-outlined text-amber-600 text-sm">tips_and_updates</span>
                  <span>Consejo de Estilismo Malaika:</span>
                </p>
                <p class="text-stone-500 font-light">
                  {{ lookBuilderFacade.harmony().paletteDescription }}
                </p>
              </div>
            </div>

          </div>

          <!-- Column 2: The Dressing Wardrobe Rack Selector (7 cols) -->
          <div class="lg:col-span-7 space-y-5">
            <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-200/80">
              
              <!-- Slot Category Selector Tabs -->
              <div class="relative pb-4 border-b border-stone-100 mb-5">
                <div class="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 pr-8">
                  <button
                    type="button"
                    (click)="lookBuilderFacade.setSlotSelector('dress')"
                    class="px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all shrink-0"
                    [ngClass]="{
                      'bg-stone-900 text-amber-200': lookBuilderFacade.activeSlotSelector() === 'dress',
                      'bg-stone-100 text-stone-700 hover:bg-stone-200': lookBuilderFacade.activeSlotSelector() !== 'dress'
                    }"
                  >
                    Vestidos
                  </button>
                  <button
                    type="button"
                    (click)="lookBuilderFacade.setSlotSelector('top')"
                    class="px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all shrink-0"
                    [ngClass]="{
                      'bg-stone-900 text-amber-200': lookBuilderFacade.activeSlotSelector() === 'top',
                      'bg-stone-100 text-stone-700 hover:bg-stone-200': lookBuilderFacade.activeSlotSelector() !== 'top'
                    }"
                  >
                    Tops & Blazers
                  </button>
                  <button
                    type="button"
                    (click)="lookBuilderFacade.setSlotSelector('bottom')"
                    class="px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all shrink-0"
                    [ngClass]="{
                      'bg-stone-900 text-amber-200': lookBuilderFacade.activeSlotSelector() === 'bottom',
                      'bg-stone-100 text-stone-700 hover:bg-stone-200': lookBuilderFacade.activeSlotSelector() !== 'bottom'
                    }"
                  >
                    Pantalones & Faldas
                  </button>
                  <button
                    type="button"
                    (click)="lookBuilderFacade.setSlotSelector('shoes')"
                    class="px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all shrink-0"
                    [ngClass]="{
                      'bg-stone-900 text-amber-200': lookBuilderFacade.activeSlotSelector() === 'shoes',
                      'bg-stone-100 text-stone-700 hover:bg-stone-200': lookBuilderFacade.activeSlotSelector() !== 'shoes'
                    }"
                  >
                    Calzado
                  </button>
                  <button
                    type="button"
                    (click)="lookBuilderFacade.setSlotSelector('accessory')"
                    class="px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all shrink-0"
                    [ngClass]="{
                      'bg-stone-900 text-amber-200': lookBuilderFacade.activeSlotSelector() === 'accessory',
                      'bg-stone-100 text-stone-700 hover:bg-stone-200': lookBuilderFacade.activeSlotSelector() !== 'accessory'
                    }"
                  >
                    Accesorios & Joyas
                  </button>
                </div>
                <div class="pointer-events-none absolute inset-y-0 right-0 bottom-4 w-10 bg-gradient-to-l from-white to-transparent" aria-hidden="true"></div>
              </div>

              <!-- Available Garments Rack for the Active Slot -->
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4 max-h-[520px] overflow-y-auto pr-1">
                @for (prod of activeSlotProducts(); track prod.id) {
                  <div
                    [id]="'rack-item-' + prod.id"
                    (click)="lookBuilderFacade.equipItem(prod)"
                    role="button"
                    tabindex="0"
                    (keydown.enter)="lookBuilderFacade.equipItem(prod)"
                    class="group relative bg-stone-50 hover:bg-white rounded-2xl p-2.5 border transition-all duration-200 cursor-pointer flex flex-col justify-between"
                    [ngClass]="{
                      'border-amber-600 ring-2 ring-amber-600 bg-amber-50/40': isItemEquipped(prod),
                      'border-stone-200 hover:border-stone-400 hover:shadow-md': !isItemEquipped(prod)
                    }"
                  >
                    <div class="relative aspect-[3/4] rounded-xl overflow-hidden bg-stone-200">
                      <img [src]="prod.image" [alt]="prod.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      @if (isItemEquipped(prod)) {
                        <div class="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-md">
                          <span class="material-symbols-outlined text-sm">check</span>
                        </div>
                      }
                    </div>

                    <div class="pt-2">
                      <p class="text-xs font-medium text-stone-900 truncate">{{ prod.name }}</p>
                      <div class="flex items-center justify-between mt-1">
                        <span class="text-xs font-mono font-bold text-stone-800">{{ prod.price | arsCurrency }}</span>
                        <span
                          class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          [ngClass]="isItemEquipped(prod) ? 'text-stone-600 bg-stone-100' : 'text-white bg-amber-700'"
                        >
                          {{ isItemEquipped(prod) ? 'En Maniquí' : 'Poner' }}
                        </span>
                      </div>
                    </div>
                  </div>
                }
              </div>

              <div class="pt-4 text-center">
                <a
                  href="#catalogo"
                  class="text-xs text-stone-500 hover:text-amber-800 font-medium inline-flex items-center gap-1"
                >
                  <span>Ver más prendas en el catálogo general</span>
                  <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </a>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  `,
})
export class MannequinStudioComponent {
  readonly lookBuilderFacade = inject(LookBuilderFacade);
  readonly catalogFacade = inject(CatalogFacade);
  readonly cartFacade = inject(CartFacade);

  /**
   * Avatar display model:
   * 'female-model': full female silhouette with arms, legs, chic hair and realistic proportions.
   * 'tailor-dummy': classical atelier tailor dress form dummy.
   */
  readonly avatarModel = signal<'female-model' | 'tailor-dummy'>('female-model');

  /**
   * Tone selection for the female model silhouette.
   */
  readonly skinTones = SILHOUETTE_SKIN_TONES;
  readonly selectedSkinToneId = signal<'arena' | 'porcelain' | 'caramel' | 'ebony'>('arena');
  readonly currentSkinTone = computed(
    () => this.skinTones.find((t) => t.id === this.selectedSkinToneId()) ?? this.skinTones[0]
  );

  readonly mannequinFilter = computed(() => {
    switch (this.selectedSkinToneId()) {
      case 'porcelain':
        return 'brightness(1.08) contrast(0.96) saturate(0.85)';
      case 'caramel':
        return 'sepia(0.28) saturate(1.25) brightness(0.92) contrast(1.02)';
      case 'ebony':
        return 'brightness(0.68) contrast(1.1) saturate(0.92) sepia(0.15)';
      case 'arena':
      default:
        return 'none';
    }
  });

  /**
   * Rendering mode for the mannequin:
   * 'photo' displays the real photographic texture and drapery of the equipped garment.
   * 'couture' displays the classical atelier silhouette vector line art.
   */
  readonly mannequinRenderMode = signal<'photo' | 'couture'>('photo');

  setAvatarModel(model: 'female-model' | 'tailor-dummy'): void {
    this.avatarModel.set(model);
  }

  setSkinTone(id: 'arena' | 'porcelain' | 'caramel' | 'ebony'): void {
    this.selectedSkinToneId.set(id);
  }

  setRenderMode(mode: 'photo' | 'couture'): void {
    this.mannequinRenderMode.set(mode);
  }

  activeSlotProducts(): Product[] {
    const slot = this.lookBuilderFacade.activeSlotSelector();
    const all = this.catalogFacade.allProducts();

    if (slot === 'dress') {
      return all.filter((p) => p.slot === 'dress');
    }
    if (slot === 'top') {
      return all.filter((p) => p.slot === 'top');
    }
    if (slot === 'bottom') {
      return all.filter((p) => p.slot === 'bottom');
    }
    if (slot === 'shoes') {
      return all.filter((p) => p.slot === 'shoes');
    }
    if (slot === 'accessory') {
      return all.filter((p) => p.slot === 'accessory');
    }
    return all;
  }

  isItemEquipped(product: Product): boolean {
    const slots = this.lookBuilderFacade.slots();
    return (
      slots.dress?.id === product.id ||
      slots.top?.id === product.id ||
      slots.bottom?.id === product.id ||
      slots.shoes?.id === product.id ||
      slots.accessory?.id === product.id
    );
  }

  applyPreset(preset: LookPreset): void {
    this.lookBuilderFacade.applyPreset(preset, this.catalogFacade.allProducts());
  }

  addWholeLookToBag(): void {
    const items = this.lookBuilderFacade.equippedItems();
    if (items.length > 0) {
      this.cartFacade.addOutfitBundle(items);
    }
  }
}

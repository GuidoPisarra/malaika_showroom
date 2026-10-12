import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
  inject,
  computed,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShowroomARFacade } from '../../../application/showroom-ar.facade';
import { CatalogFacade } from '../../../application/catalog.facade';
import { LookBuilderFacade } from '../../../application/look-builder.facade';
import { CartFacade } from '../../../application/cart.facade';
import { Product } from '../../../domain/catalog/models/product.model';
import { ArsCurrencyPipe } from '../../shared/pipes/ars-currency.pipe';

@Component({
  selector: 'app-ar-showroom',
  imports: [CommonModule, ArsCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'onKeydown($event)',
  },
  template: `
    <section id="showroom-ar" class="pt-10 sm:pt-14 pb-16 sm:pb-24 bg-stone-950 text-stone-100 relative overflow-hidden">
      <!-- Ambient Lighting in dark boutique -->
      <div class="absolute top-1/4 left-1/3 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute bottom-10 right-10 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl pointer-events-none"></div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <!-- Section Header -->
        <div class="text-center max-w-3xl mx-auto space-y-3 mb-8 sm:mb-12">
          <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-semibold tracking-widest uppercase">
            <span class="material-symbols-outlined text-sm">view_in_ar</span>
            <span>Experiencia Espacial Inmersiva</span>
          </div>
          <h2 class="font-display text-3xl sm:text-4xl lg:text-5xl text-stone-100 font-medium tracking-tight">
            Showroom en Realidad Aumentada
          </h2>
          <p class="text-sm sm:text-base text-stone-400 font-light max-w-xl mx-auto">
            Camina por nuestros espacios boutique de Tres Arroyos o proyecta las prendas en tu propio vestidor con tu cámara en vivo.
          </p>

          <!-- Mode Switcher Tabs -->
          <div class="flex items-center justify-center gap-2 pt-2">
            <button
              id="ar-tab-360"
              type="button"
              (click)="showroomFacade.setMode('virtual-360')"
              class="px-5 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-2"
              [ngClass]="{
                'bg-amber-500 text-stone-950 shadow-lg': showroomFacade.activeMode() === 'virtual-360',
                'bg-stone-900 text-stone-400 hover:text-white border border-stone-800': showroomFacade.activeMode() !== 'virtual-360'
              }"
            >
              <span class="material-symbols-outlined text-base">360</span>
              <span>Paseo Virtual 360°</span>
            </button>

            <button
              id="ar-tab-camera"
              type="button"
              (click)="showroomFacade.setMode('camera-ar')"
              class="px-5 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all flex items-center gap-2"
              [ngClass]="{
                'bg-amber-500 text-stone-950 shadow-lg': showroomFacade.activeMode() === 'camera-ar',
                'bg-stone-900 text-stone-400 hover:text-white border border-stone-800': showroomFacade.activeMode() !== 'camera-ar'
              }"
            >
              <span class="material-symbols-outlined text-base">videocam</span>
              <span>Cámara AR en Vivo</span>
            </button>
          </div>
        </div>

        <!-- MODE 1: Paseo Virtual 360° Showroom -->
        @if (showroomFacade.activeMode() === 'virtual-360') {
          <div class="space-y-6">
            <!-- Showroom Zone Selector Tabs -->
            <div class="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              @for (zone of showroomFacade.zones(); track zone.id; let i = $index) {
                <button
                  type="button"
                  (click)="showroomFacade.setZone(i)"
                  class="px-4 py-2 rounded-xl text-xs font-medium tracking-wide transition-all shrink-0 flex items-center gap-2"
                  [ngClass]="{
                    'bg-stone-800 text-amber-300 border border-amber-500/50 shadow-md': showroomFacade.currentZoneIndex() === i,
                    'bg-stone-900/60 text-stone-400 hover:text-stone-200 border border-stone-800/80': showroomFacade.currentZoneIndex() !== i
                  }"
                >
                  <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>{{ zone.name }}</span>
                </button>
              }
            </div>

            <!-- Panoramic Stage Container with Hotspots -->
            <div
              #panoramicContainer
              class="relative aspect-[16/9] sm:aspect-[21/9] rounded-3xl overflow-hidden border border-stone-800 shadow-2xl bg-stone-900 select-none group"
            >
              <!-- Panoramic Boutique Background Image -->
              <img
                [src]="showroomFacade.activeZone().panoramicImage"
                alt="Showroom Panorama"
                class="w-full h-full object-cover object-center filter brightness-90 contrast-105 transition-transform duration-700 ease-out"
              />

              <!-- Atmospheric Overlay -->
              <div class="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-stone-950/40 pointer-events-none"></div>

              <!-- Interactive Floating Hotspots on clothing racks & stands -->
              @for (hs of showroomFacade.activeZone().hotspots; track hs.id) {
                <div
                  class="absolute transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 z-20"
                  [style.left.%]="hs.xPercent"
                  [style.top.%]="hs.yPercent"
                >
                  <!-- Hotspot Pin Button -->
                  <div class="relative group/pin">
                    <!-- Glowing animated ring -->
                    <span class="absolute -inset-2 rounded-full bg-amber-400/40 animate-ping"></span>
                    <button
                      type="button"
                      [id]="'hotspot-' + hs.id"
                      (click)="showroomFacade.selectHotspot(hs)"
                      [attr.aria-label]="hs.label"
                      class="relative w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-lg transition-transform hover:scale-125 active:scale-95 cursor-pointer"
                      [ngClass]="{
                        'bg-amber-500 text-stone-950': showroomFacade.selectedHotspot()?.id === hs.id,
                        'bg-stone-900/90 text-amber-300': showroomFacade.selectedHotspot()?.id !== hs.id
                      }"
                    >
                      <span class="material-symbols-outlined text-base">styler</span>
                    </button>

                    <!-- Hotspot Tooltip -->
                    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/pin:block sm:block bg-stone-900/90 backdrop-blur-md border border-stone-700 px-3 py-1 rounded-lg text-center whitespace-nowrap shadow-xl pointer-events-none">
                      <p class="text-[10px] text-amber-300 font-semibold">{{ hs.category }}</p>
                      <p class="text-xs font-medium text-stone-100">{{ hs.label }}</p>
                    </div>
                  </div>
                </div>
              }

              <!-- Bottom Ambiance Label -->
              <div class="absolute bottom-4 left-6 z-20 max-w-md hidden sm:block">
                <span class="text-[10px] uppercase font-bold tracking-widest text-amber-400 block">
                  {{ showroomFacade.activeZone().ambianceTitle }}
                </span>
                <p class="text-xs text-stone-300 font-light mt-0.5">
                  {{ showroomFacade.activeZone().description }}
                </p>
              </div>

              <div class="absolute top-4 right-4 z-20 bg-stone-900/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs text-stone-300 flex items-center gap-1.5 border border-stone-700">
                <span class="material-symbols-outlined text-amber-400 text-sm">touch_app</span>
                <span>Toca los puntos dorados para inspeccionar las prendas</span>
              </div>
            </div>

            <!-- Magnified Garment Inspector Modal (Overlays viewport with zoom-in effect) -->
            @if (showroomFacade.isHotspotModalOpen() && activeSelectedProduct(); as product) {
              <div
                id="showroom-hotspot-modal-backdrop"
                role="dialog"
                aria-modal="true"
                aria-labelledby="showroom-modal-title"
                class="fixed inset-0 z-50 overflow-y-auto bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 lg:p-8 animate-fade-in-backdrop"
              >
                <!-- Backdrop click button -->
                <button
                  type="button"
                  class="fixed inset-0 bg-transparent w-full h-full cursor-default"
                  (click)="showroomFacade.closeHotspotModal()"
                  aria-label="Cerrar modal de inspección"
                ></button>

                <!-- Centered Modal Wrapper with Side Navigation Arrows -->
                <div class="relative w-full max-w-2xl z-10 my-auto">
                  <!-- Left Navigation Arrow (Flecha Izquierda) -->
                  <button
                    type="button"
                    (click)="showroomFacade.selectPreviousHotspot()"
                    class="absolute -left-3.5 sm:-left-6 md:-left-7 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-stone-900/95 hover:bg-amber-500 text-amber-300 hover:text-stone-950 border border-amber-500/50 shadow-2xl backdrop-blur-md flex items-center justify-center transition-all duration-200 active:scale-90 hover:scale-110 cursor-pointer group"
                    aria-label="Prenda anterior en el showroom"
                    title="Prenda anterior (←)"
                  >
                    <span class="material-symbols-outlined text-2xl sm:text-3xl transition-transform group-hover:-translate-x-0.5">chevron_left</span>
                  </button>

                  <!-- Right Navigation Arrow (Flecha Derecha) -->
                  <button
                    type="button"
                    (click)="showroomFacade.selectNextHotspot()"
                    class="absolute -right-3.5 sm:-right-6 md:-right-7 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-stone-900/95 hover:bg-amber-500 text-amber-300 hover:text-stone-950 border border-amber-500/50 shadow-2xl backdrop-blur-md flex items-center justify-center transition-all duration-200 active:scale-90 hover:scale-110 cursor-pointer group"
                    aria-label="Siguiente prenda en el showroom"
                    title="Siguiente prenda (→)"
                  >
                    <span class="material-symbols-outlined text-2xl sm:text-3xl transition-transform group-hover:translate-x-0.5">chevron_right</span>
                  </button>

                  <!-- Modal Dialog with Magnification Zoom Effect -->
                  <div
                    id="showroom-modal-content"
                    class="relative w-full bg-stone-900 border border-amber-500/30 rounded-3xl p-5 sm:p-8 shadow-2xl animate-zoom-in-modal overflow-hidden text-stone-100"
                  >
                    <!-- Subtle Gold Ambient Light -->
                    <div class="absolute -top-20 -right-20 w-56 h-56 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>

                    <!-- Top Bar: Index Indicator & Close Button -->
                    <div class="flex items-center justify-between mb-4">
                      <!-- Indicator: Prenda X de Y -->
                      <div class="flex items-center gap-2">
                        <span class="px-3 py-1 rounded-full bg-stone-800/90 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-semibold flex items-center gap-1.5 shadow-xs">
                          <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                          Prenda {{ currentHotspotIndex() + 1 }} de {{ showroomFacade.activeZone().hotspots.length }}
                        </span>

                        <span class="text-[11px] text-stone-400 hidden sm:inline-block">
                          • Navega con las flechas o teclas ← →
                        </span>
                      </div>

                      <!-- Close Button ('X') -->
                      <button
                        type="button"
                        (click)="showroomFacade.closeHotspotModal()"
                        class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-800/90 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center border border-stone-600/70 shadow-lg transition-colors cursor-pointer"
                        aria-label="Cerrar inspección de prenda"
                      >
                        <span class="material-symbols-outlined text-xl sm:text-2xl">close</span>
                      </button>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                      <!-- Garment High-Res Visual / Magnification Showcase -->
                      <div class="sm:col-span-5 relative flex items-center justify-center">
                        <div class="relative w-full aspect-[3/4] max-w-[240px] rounded-2xl overflow-hidden border border-amber-500/30 shadow-2xl bg-stone-950 group">
                          <img
                            [src]="product.image"
                            [alt]="product.name"
                            class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                          />
                          <div class="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent pointer-events-none"></div>
                          <div class="absolute bottom-2.5 inset-x-2.5 bg-stone-900/90 backdrop-blur-md rounded-xl p-2 text-center border border-amber-500/20">
                            <span class="text-[10px] text-amber-300 font-semibold tracking-wider uppercase flex items-center justify-center gap-1">
                              <span class="material-symbols-outlined text-xs">zoom_in</span>
                              Exhibido en Showroom 360°
                            </span>
                          </div>
                        </div>
                      </div>

                    <!-- Garment Specs & Direct Actions -->
                    <div class="sm:col-span-7 space-y-4">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold uppercase tracking-wider">
                          {{ product.category }}
                        </span>
                        <span class="text-xs text-stone-400">
                          Material: {{ product.material }}
                        </span>
                      </div>

                      <div>
                        <h3 id="showroom-modal-title" class="font-display text-2xl sm:text-3xl text-stone-100 font-medium leading-tight">
                          {{ product.name }}
                        </h3>
                        <p class="text-xs sm:text-sm text-stone-300 font-light mt-1.5 leading-relaxed">
                          {{ product.description }}
                        </p>
                      </div>

                      <!-- Available Colors and Sizes Preview -->
                      <div class="flex items-center gap-4 text-xs text-stone-400 pt-1">
                        <div>
                          <span class="text-[10px] uppercase font-bold tracking-wider text-stone-400 block mb-1">Talles</span>
                          <div class="flex items-center gap-1.5">
                            @for (sz of product.sizes; track sz) {
                              <span class="px-2 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-200 text-[11px] font-mono">
                                {{ sz }}
                              </span>
                            }
                          </div>
                        </div>

                        <div>
                          <span class="text-[10px] uppercase font-bold tracking-wider text-stone-400 block mb-1">Color</span>
                          <div class="flex items-center gap-1.5">
                            @for (col of product.colors; track col) {
                              <span
                                class="w-4 h-4 rounded-full border border-stone-600 shadow-xs"
                                [style.background-color]="col"
                              ></span>
                            }
                          </div>
                        </div>
                      </div>

                      <div class="flex items-baseline gap-3 pt-1">
                        <span class="text-2xl font-bold font-mono text-amber-300">
                          {{ product.price | arsCurrency }}
                        </span>
                        <span class="text-xs text-stone-400">
                          3 cuotas sin interés de {{ (product.price / 3) | arsCurrency }}
                        </span>
                      </div>

                      <!-- Action Buttons -->
                      <div class="flex flex-col sm:flex-row gap-2.5 pt-2">
                        <button
                          type="button"
                          (click)="onAddCartAndClose(product)"
                          class="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-98 text-stone-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span class="material-symbols-outlined text-base">shopping_bag</span>
                          <span>Añadir a Bolsa</span>
                        </button>

                        <button
                          type="button"
                          (click)="equipOnMannequin(product)"
                          class="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 active:scale-98 border border-stone-700 text-stone-200 text-xs font-semibold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span class="material-symbols-outlined text-base text-amber-400">accessibility_new</span>
                          <span>Probar en Maniquí</span>
                        </button>

                        <button
                          type="button"
                          (click)="openInCameraAR(product)"
                          class="px-3.5 py-2.5 bg-stone-900 hover:bg-stone-850 active:scale-98 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span class="material-symbols-outlined text-base">videocam</span>
                          <span>Cámara AR</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }

        <!-- MODE 2: Realidad Aumentada con Cámara Web / Móvil en Vivo -->
        @if (showroomFacade.activeMode() === 'camera-ar') {
          <div class="space-y-6">
            <!-- Camera Viewport Card -->
            <div class="relative aspect-[4/3] sm:aspect-[16/9] max-w-4xl mx-auto rounded-3xl overflow-hidden border-2 border-amber-500/40 bg-stone-900 shadow-2xl relative">
              
              <!-- Video Feed Element -->
              <video
                #videoElement
                autoplay
                playsinline
                muted
                class="w-full h-full object-cover filter"
                [ngClass]="{
                  'brightness-110 sepia-[0.15]': showroomFacade.arPlacement().lightingAdjustment === 'calida',
                  'contrast-110 brightness-105': showroomFacade.arPlacement().lightingAdjustment === 'estudio',
                  '': showroomFacade.arPlacement().lightingAdjustment === 'natural'
                }"
              ></video>

              <!-- Video Stream Loader / Permission Notice if not active -->
              @if (!showroomFacade.arPlacement().isCameraActive) {
                <div class="absolute inset-0 bg-stone-900/90 flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <div class="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400">
                    <span class="material-symbols-outlined text-3xl">videocam</span>
                  </div>
                  <div class="max-w-md">
                    <h3 class="font-display text-xl text-stone-100 font-medium">
                      Activa tu cámara para el Probador AR
                    </h3>
                    <p class="text-xs text-stone-400 mt-1">
                      Visualiza las prendas proyectadas a escala en tu espacio real o frente al espejo.
                    </p>
                    @if (showroomFacade.cameraError(); as err) {
                      <div class="mt-3 p-3 rounded-xl bg-rose-900/40 border border-rose-700 text-xs text-rose-200">
                        {{ err }}
                      </div>
                    }
                  </div>
                  <button
                    type="button"
                    (click)="showroomFacade.initCamera()"
                    class="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                  >
                    <span class="material-symbols-outlined text-base">photo_camera</span>
                    <span>Permitir Cámara & Proyectar</span>
                  </button>
                </div>
              }

              <!-- AR Projected Garment Layer over live camera -->
              @if (showroomFacade.arPlacement().isCameraActive && activeSelectedProduct(); as product) {
                <div
                  class="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <div
                    class="transition-transform duration-100 ease-out flex flex-col items-center select-none"
                    [style.transform]="'scale(' + showroomFacade.arPlacement().scale + ') rotate(' + showroomFacade.arPlacement().rotation + 'deg)'"
                  >
                    <!-- Floating Garment Holographic Stand in User Room -->
                    <div class="relative w-48 sm:w-56 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-400/80 bg-stone-900/80 backdrop-blur-xs">
                      <img [src]="product.image" [alt]="product.name" class="w-full h-full object-cover" />
                      
                      <!-- Holographic AR Badge overlay -->
                      <div class="absolute top-2 left-2 px-2 py-0.5 bg-stone-950/80 text-amber-300 rounded text-[9px] font-mono border border-amber-500/40">
                        AR LIVE • ESCALA {{ showroomFacade.arPlacement().scale }}x
                      </div>
                      <div class="absolute bottom-2 inset-x-2 bg-stone-950/90 rounded-lg p-1.5 text-center">
                        <p class="text-xs font-semibold text-stone-100 truncate">{{ product.name }}</p>
                        <p class="text-[11px] text-amber-300 font-mono">{{ product.price | arsCurrency }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Live Camera HUD Controls Overlay (Bottom) -->
                <div class="absolute inset-x-4 bottom-4 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-950/80 backdrop-blur-md p-3.5 rounded-2xl border border-stone-800 text-xs">
                  
                  <!-- Scale Zoom Controls -->
                  <div class="flex items-center gap-2">
                    <span class="text-stone-400">Escala:</span>
                    <button
                      type="button"
                      (click)="showroomFacade.updateScale(-0.1)"
                      class="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-100 flex items-center justify-center font-bold"
                    >
                      -
                    </button>
                    <span class="font-mono text-amber-300 w-10 text-center font-bold">
                      {{ showroomFacade.arPlacement().scale }}x
                    </span>
                    <button
                      type="button"
                      (click)="showroomFacade.updateScale(0.1)"
                      class="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-100 flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>

                  <!-- Lighting Adjustment Filter -->
                  <div class="flex items-center gap-1.5">
                    <span class="text-stone-400 mr-1">Luz:</span>
                    <button
                      type="button"
                      (click)="showroomFacade.setLighting('calida')"
                      class="px-2.5 py-1 rounded-lg transition-colors"
                      [ngClass]="{'bg-amber-600 text-white': showroomFacade.arPlacement().lightingAdjustment === 'calida', 'bg-stone-800 text-stone-300': showroomFacade.arPlacement().lightingAdjustment !== 'calida'}"
                    >
                      Cálida
                    </button>
                    <button
                      type="button"
                      (click)="showroomFacade.setLighting('estudio')"
                      class="px-2.5 py-1 rounded-lg transition-colors"
                      [ngClass]="{'bg-amber-600 text-white': showroomFacade.arPlacement().lightingAdjustment === 'estudio', 'bg-stone-800 text-stone-300': showroomFacade.arPlacement().lightingAdjustment !== 'estudio'}"
                    >
                      Estudio
                    </button>
                    <button
                      type="button"
                      (click)="showroomFacade.setLighting('natural')"
                      class="px-2.5 py-1 rounded-lg transition-colors"
                      [ngClass]="{'bg-amber-600 text-white': showroomFacade.arPlacement().lightingAdjustment === 'natural', 'bg-stone-800 text-stone-300': showroomFacade.arPlacement().lightingAdjustment !== 'natural'}"
                    >
                      Natural
                    </button>
                  </div>

                  <!-- Actions: Snapshot & Buy -->
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      (click)="capturePhoto()"
                      class="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg flex items-center gap-1"
                      title="Tomar foto con la prenda proyectada"
                    >
                      <span class="material-symbols-outlined text-base">photo_camera</span>
                      <span>Foto AR</span>
                    </button>

                    <button
                      type="button"
                      (click)="cartFacade.addItem(product)"
                      class="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg flex items-center gap-1"
                    >
                      <span class="material-symbols-outlined text-base">shopping_bag</span>
                      <span>Comprar</span>
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Captured Snapshot Modal / Download -->
            @if (showroomFacade.capturedSnapshot(); as snapshot) {
              <div class="p-4 bg-stone-900 border border-stone-800 rounded-2xl flex items-center justify-between animate-fadeIn">
                <div class="flex items-center gap-3">
                  <img [src]="snapshot" alt="Captura AR" class="w-14 h-14 object-cover rounded-lg border border-amber-400" />
                  <div>
                    <p class="text-xs font-semibold text-stone-200">¡Foto AR capturada con éxito!</p>
                    <p class="text-[11px] text-stone-400">Guarda o comparte tu look en Realidad Aumentada.</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <a
                    [href]="snapshot"
                    download="malaika-showroom-ar-look.jpg"
                    class="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-lg flex items-center gap-1"
                  >
                    <span class="material-symbols-outlined text-sm">download</span>
                    <span>Descargar</span>
                  </a>
                  <button
                    type="button"
                    (click)="showroomFacade.clearSnapshot()"
                    class="p-1.5 text-stone-400 hover:text-white"
                  >
                    <span class="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              </div>
            }

            <!-- Quick Garment Carousel to switch AR product -->
            <div class="p-4 bg-stone-900/70 border border-stone-800 rounded-2xl space-y-2">
              <span class="text-xs text-stone-400 font-medium block">
                Selecciona otra prenda para probar en Realidad Aumentada:
              </span>
              <div class="flex items-center gap-3 overflow-x-auto pb-2">
                @for (item of catalogFacade.allProducts(); track item.id) {
                  <button
                    type="button"
                    (click)="selectARProduct(item)"
                    class="flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-800/70 hover:bg-stone-800 border transition-all shrink-0"
                    [ngClass]="{
                      'border-amber-400 text-amber-300': showroomFacade.arPlacement().selectedProductId === item.id,
                      'border-stone-700 text-stone-300': showroomFacade.arPlacement().selectedProductId !== item.id
                    }"
                  >
                    <img [src]="item.image" [alt]="item.name" class="w-8 h-8 object-cover rounded" />
                    <span class="text-xs font-medium truncate max-w-[120px]">{{ item.name }}</span>
                  </button>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class ARShowroomComponent implements OnDestroy {
  @ViewChild('videoElement') videoElementRef?: ElementRef<HTMLVideoElement>;

  readonly showroomFacade = inject(ShowroomARFacade);
  readonly catalogFacade = inject(CatalogFacade);
  readonly lookBuilderFacade = inject(LookBuilderFacade);
  readonly cartFacade = inject(CartFacade);

  readonly activeSelectedProduct = computed(() => {
    const prodId = this.showroomFacade.arPlacement().selectedProductId;
    return this.catalogFacade.getProductById(prodId) || this.catalogFacade.allProducts()[0];
  });

  readonly currentHotspotIndex = computed(() => {
    const current = this.showroomFacade.selectedHotspot();
    if (!current) return 0;
    const list = this.showroomFacade.activeZone().hotspots;
    const idx = list.findIndex((h) => h.id === current.id);
    return idx >= 0 ? idx : 0;
  });

  onKeydown(event: KeyboardEvent): void {
    if (!this.showroomFacade.isHotspotModalOpen()) return;
    if (event.key === 'ArrowLeft') {
      this.showroomFacade.selectPreviousHotspot();
    } else if (event.key === 'ArrowRight') {
      this.showroomFacade.selectNextHotspot();
    } else if (event.key === 'Escape') {
      this.showroomFacade.closeHotspotModal();
    }
  }

  constructor() {
    // When camera stream updates, attach to video element
    // Using simple watch pattern
  }

  ngOnDestroy(): void {
    this.showroomFacade.stopCamera();
  }

  equipOnMannequin(product: Product): void {
    this.lookBuilderFacade.equipItem(product);
    this.showroomFacade.closeHotspotModal();
    const el = document.getElementById('maniqui-studio');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  onAddCartAndClose(product: Product): void {
    this.cartFacade.addItem(product);
    this.showroomFacade.closeHotspotModal();
  }

  openInCameraAR(product: Product): void {
    this.showroomFacade.closeHotspotModal();
    this.showroomFacade.arPlacement.update((prev) => ({
      ...prev,
      selectedProductId: product.id,
    }));
    this.showroomFacade.setMode('camera-ar');
  }

  selectARProduct(product: Product): void {
    this.showroomFacade.arPlacement.update((prev) => ({
      ...prev,
      selectedProductId: product.id,
    }));
  }

  capturePhoto(): void {
    if (this.videoElementRef?.nativeElement) {
      this.showroomFacade.takeSnapshot(this.videoElementRef.nativeElement);
    }
  }
}

import { Injectable, computed, inject, signal } from '@angular/core';
import { ARCameraService, CameraStreamResult } from '../infrastructure/camera/ar-camera.service';
import { ShowroomZone, ShowroomHotspot, ARPlacementState } from '../domain/showroom-ar/models/showroom.model';

@Injectable({
  providedIn: 'root',
})
export class ShowroomARFacade {
  private cameraService = inject(ARCameraService);

  // Available showroom zones
  readonly zones: ShowroomZone[] = [
    {
      id: 'zone-gala',
      name: 'Salón Alta Noche',
      ambianceTitle: 'Atelier de Vestidos y Seda',
      description: 'Espacio cálido con iluminación puntual y suelo de roble claro, exhibiendo vestidos de gala cortados al bies y calzado de fiesta.',
      bgGradient: 'from-amber-950/40 via-stone-900/60 to-stone-950/80',
      accentColor: '#D4AF37',
      panoramicImage: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=1600&q=80',
      hotspots: [
        {
          id: 'hs-1',
          productId: 'prod-v1',
          xPercent: 32,
          yPercent: 46,
          label: 'Vestido Midi Seda Champagne',
          category: 'Vestidos',
          standType: 'maniqui-lujo',
          price: 185,
          rotationY: 15,
        },
        {
          id: 'hs-2',
          productId: 'prod-v2',
          xPercent: 54,
          yPercent: 44,
          label: 'Vestido Lencero Esmeralda',
          category: 'Vestidos',
          standType: 'perchero-dorado',
          price: 160,
          rotationY: -10,
        },
        {
          id: 'hs-3',
          productId: 'prod-s1',
          xPercent: 78,
          yPercent: 62,
          label: 'Stilettos Tiras Finas Celestia',
          category: 'Calzado',
          standType: 'podio-calzado',
          price: 175,
          rotationY: 45,
        },
      ],
    },
    {
      id: 'zone-accesorios',
      name: 'Boutique Joyería & Bolsos',
      ambianceTitle: 'Vitrinas de Cristal y Oro 18k',
      description: 'Sector minimalista con pedestales de travertino y vitrinas iluminadas que destacan los reflejos de las joyas finas y el cuero italiano.',
      bgGradient: 'from-stone-900/70 via-stone-800/60 to-stone-950/80',
      accentColor: '#E6D2B5',
      panoramicImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80',
      hotspots: [
        {
          id: 'hs-4',
          productId: 'prod-j1',
          xPercent: 38,
          yPercent: 48,
          label: 'Collar Choker Solstice 18k',
          category: 'Joyería',
          standType: 'vitrina-joyas',
          price: 125,
          rotationY: 0,
        },
        {
          id: 'hs-5',
          productId: 'prod-a1',
          xPercent: 62,
          yPercent: 52,
          label: 'Cartera Baguette Piel Luna',
          category: 'Accesorios',
          standType: 'podio-calzado',
          price: 165,
          rotationY: -20,
        },
        {
          id: 'hs-6',
          productId: 'prod-j2',
          xPercent: 82,
          yPercent: 46,
          label: 'Aros Cascada Perlas Barrocas',
          category: 'Joyería',
          standType: 'vitrina-joyas',
          price: 88,
          rotationY: 10,
        },
      ],
    },
    {
      id: 'zone-sastreria',
      name: 'Galería Sastrería Urbana',
      ambianceTitle: 'Línea de Estructura y Lino',
      description: 'Expositor con percheros dorados suspendidos, mostrando blazers sartoriales, palazzos con movimiento y sombreros toquilla.',
      bgGradient: 'from-amber-900/40 via-stone-900/70 to-stone-950/80',
      accentColor: '#C5A880',
      panoramicImage: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1600&q=80',
      hotspots: [
        {
          id: 'hs-7',
          productId: 'prod-t2',
          xPercent: 28,
          yPercent: 45,
          label: 'Blazer Sastre Solapa Esmoquin',
          category: 'Sastrería',
          standType: 'maniqui-lujo',
          price: 210,
          rotationY: 20,
        },
        {
          id: 'hs-8',
          productId: 'prod-p1',
          xPercent: 50,
          yPercent: 52,
          label: 'Pantalón Palazzo Plisado Aurora',
          category: 'Pantalones',
          standType: 'perchero-dorado',
          price: 130,
          rotationY: -15,
        },
        {
          id: 'hs-9',
          productId: 'prod-a2',
          xPercent: 74,
          yPercent: 42,
          label: 'Sombrero Fedora Paja Toquilla',
          category: 'Accesorios',
          standType: 'podio-calzado',
          price: 98,
          rotationY: 30,
        },
      ],
    },
  ];

  // State Signals
  readonly activeMode = signal<'virtual-360' | 'camera-ar'>('virtual-360');
  readonly currentZoneIndex = signal<number>(0);
  readonly selectedHotspot = signal<ShowroomHotspot | null>(this.zones[0].hotspots[0]);
  readonly isHotspotModalOpen = signal<boolean>(false);
  readonly arPlacement = signal<ARPlacementState>({
    scale: 1.0,
    rotation: 0,
    posX: 50,
    posY: 50,
    selectedProductId: 'prod-v1',
    activeZoneId: 'zone-gala',
    isCameraActive: false,
    cameraPermissionGranted: false,
    lightingAdjustment: 'calida',
  });

  // Panoramic exploration rotation
  readonly panoramicPanX = signal<number>(0);
  readonly isDraggingPanorama = signal<boolean>(false);

  // Camera stream
  readonly cameraStream = signal<MediaStream | null>(null);
  readonly cameraError = signal<string | null>(null);
  readonly capturedSnapshot = signal<string | null>(null);

  // Computed
  readonly activeZone = computed(() => this.zones[this.currentZoneIndex()]);

  setMode(mode: 'virtual-360' | 'camera-ar'): void {
    this.activeMode.set(mode);
    if (mode === 'camera-ar') {
      this.initCamera();
    } else {
      this.stopCamera();
    }
  }

  setZone(index: number): void {
    if (index >= 0 && index < this.zones.length) {
      this.currentZoneIndex.set(index);
      const zone = this.zones[index];
      this.selectedHotspot.set(zone.hotspots[0] || null);
      if (zone.hotspots[0]) {
        this.arPlacement.update((prev) => ({
          ...prev,
          selectedProductId: zone.hotspots[0].productId,
          activeZoneId: zone.id,
        }));
      }
    }
  }

  selectHotspot(hotspot: ShowroomHotspot): void {
    this.selectedHotspot.set(hotspot);
    this.arPlacement.update((prev) => ({
      ...prev,
      selectedProductId: hotspot.productId,
    }));
    this.isHotspotModalOpen.set(true);
  }

  selectPreviousHotspot(): void {
    const hotspots = this.activeZone().hotspots;
    if (hotspots.length <= 1) return;
    const current = this.selectedHotspot();
    const idx = current ? hotspots.findIndex((h) => h.id === current.id) : 0;
    const prevIdx = (idx - 1 + hotspots.length) % hotspots.length;
    this.selectHotspot(hotspots[prevIdx]);
  }

  selectNextHotspot(): void {
    const hotspots = this.activeZone().hotspots;
    if (hotspots.length <= 1) return;
    const current = this.selectedHotspot();
    const idx = current ? hotspots.findIndex((h) => h.id === current.id) : 0;
    const nextIdx = (idx + 1) % hotspots.length;
    this.selectHotspot(hotspots[nextIdx]);
  }

  closeHotspotModal(): void {
    this.isHotspotModalOpen.set(false);
  }

  async initCamera(): Promise<void> {
    this.cameraError.set(null);
    const result: CameraStreamResult = await this.cameraService.requestCamera('environment');

    if (result.hasPermission && result.stream) {
      this.cameraStream.set(result.stream);
      this.arPlacement.update((prev) => ({
        ...prev,
        isCameraActive: true,
        cameraPermissionGranted: true,
      }));
    } else {
      this.cameraError.set(result.error || 'No se pudo activar la cámara.');
      this.arPlacement.update((prev) => ({
        ...prev,
        isCameraActive: false,
        cameraPermissionGranted: false,
      }));
    }
  }

  stopCamera(): void {
    this.cameraService.stopCamera();
    this.cameraStream.set(null);
    this.arPlacement.update((prev) => ({
      ...prev,
      isCameraActive: false,
    }));
  }

  updateScale(delta: number): void {
    this.arPlacement.update((prev) => {
      const nextScale = Math.min(1.8, Math.max(0.6, prev.scale + delta));
      return { ...prev, scale: Math.round(nextScale * 100) / 100 };
    });
  }

  updateRotation(deg: number): void {
    this.arPlacement.update((prev) => ({
      ...prev,
      rotation: (deg + 360) % 360,
    }));
  }

  setLighting(lighting: 'calida' | 'estudio' | 'natural'): void {
    this.arPlacement.update((prev) => ({
      ...prev,
      lightingAdjustment: lighting,
    }));
  }

  takeSnapshot(videoElement: HTMLVideoElement, overlayCanvas?: HTMLCanvasElement): void {
    const dataUrl = this.cameraService.captureSnapshot(videoElement, overlayCanvas);
    if (dataUrl) {
      this.capturedSnapshot.set(dataUrl);
    }
  }

  clearSnapshot(): void {
    this.capturedSnapshot.set(null);
  }
}

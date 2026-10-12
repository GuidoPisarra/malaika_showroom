import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { API_BASE_URL } from '../infrastructure/http/api.config';
import { ARCameraService, CameraStreamResult } from '../infrastructure/camera/ar-camera.service';
import { ShowroomZone, ShowroomHotspot, ARPlacementState } from '../domain/showroom-ar/models/showroom.model';

const EMPTY_ZONE: ShowroomZone = {
  id: '',
  name: '',
  ambianceTitle: '',
  description: '',
  bgGradient: '',
  accentColor: '#D4AF37',
  panoramicImage: '',
  hotspots: [],
};

@Injectable({
  providedIn: 'root',
})
export class ShowroomARFacade {
  private cameraService = inject(ARCameraService);

  private http = inject(HttpClient);
  private api = inject(API_BASE_URL);

  // Zonas del showroom configuradas por el comercio (se cargan desde la API)
  readonly zones = signal<ShowroomZone[]>([]);

  // State Signals
  readonly activeMode = signal<'virtual-360' | 'camera-ar'>('virtual-360');
  readonly currentZoneIndex = signal<number>(0);
  readonly selectedHotspot = signal<ShowroomHotspot | null>(null);
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
  readonly activeZone = computed(() => this.zones()[this.currentZoneIndex()] ?? EMPTY_ZONE);

  constructor() {
    this.http.get<ShowroomZone[]>(`${this.api}/showroom-zones`).subscribe({
      next: (zones) => {
        this.zones.set(zones);
        if (zones.length) this.setZone(0);
      },
      error: () => undefined,
    });
  }

  setMode(mode: 'virtual-360' | 'camera-ar'): void {
    this.activeMode.set(mode);
    if (mode === 'camera-ar') {
      this.initCamera();
    } else {
      this.stopCamera();
    }
  }

  setZone(index: number): void {
    if (index >= 0 && index < this.zones().length) {
      this.currentZoneIndex.set(index);
      const zone = this.zones()[index];
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

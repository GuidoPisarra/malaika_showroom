import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface CameraStreamResult {
  stream?: MediaStream;
  error?: string;
  hasPermission: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ARCameraService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private currentStream: MediaStream | null = null;

  async requestCamera(facingMode: 'user' | 'environment' = 'environment'): Promise<CameraStreamResult> {
    if (!this.isBrowser || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        hasPermission: false,
        error: 'Tu navegador no soporta acceso directo a cámara web o se encuentra en un entorno seguro limitado.',
      };
    }

    try {
      this.stopCamera();
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentStream = stream;
      return {
        stream,
        hasPermission: true,
      };
    } catch (err: unknown) {
      console.warn('AR Camera access notice:', err);
      return {
        hasPermission: false,
        error: 'No se otorgó permiso de cámara o el dispositivo no cuenta con cámara activa. Puedes usar el Showroom 360° Virtual interactivo.',
      };
    }
  }

  stopCamera(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }
  }

  captureSnapshot(videoElement: HTMLVideoElement, overlayCanvas?: HTMLCanvasElement): string | null {
    if (!this.isBrowser) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 640;
      canvas.height = videoElement.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Draw camera video
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // Draw overlay elements if provided
      if (overlayCanvas) {
        ctx.drawImage(overlayCanvas, 0, 0, canvas.width, canvas.height);
      }

      return canvas.toDataURL('image/jpeg', 0.9);
    } catch {
      return null;
    }
  }
}

export type ARMode = 'virtual-360' | 'camera-ar';

export interface ShowroomZone {
  id: string;
  name: string;
  ambianceTitle: string;
  description: string;
  bgGradient: string;
  accentColor: string;
  panoramicImage: string;
  hotspots: ShowroomHotspot[];
}

export interface ShowroomHotspot {
  id: string;
  productId: string;
  xPercent: number; // 0 to 100 on virtual panoramic stage
  yPercent: number;
  label: string;
  category: string;
  standType: 'perchero-dorado' | 'maniqui-lujo' | 'vitrina-joyas' | 'podio-calzado';
  price: number;
  rotationY?: number;
}

export interface ARPlacementState {
  scale: number; // 0.5 to 2.0
  rotation: number; // 0 to 360 deg
  posX: number;
  posY: number;
  selectedProductId: string;
  activeZoneId: string;
  isCameraActive: boolean;
  cameraPermissionGranted: boolean;
  lightingAdjustment: 'calida' | 'estudio' | 'natural';
}

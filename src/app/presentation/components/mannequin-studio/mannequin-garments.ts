import { GarmentSlot, GarmentTexture, Product } from '../../../domain/catalog/models/product.model';
import { resolveSilhouette } from '../../../domain/look-builder/services/garment-silhouette';

/**
 * Geometría de las prendas sobre la foto del maniquí (viewBox 240 x 480).
 *
 * Las prendas ceñidas se recortan con la máscara del cuerpo
 * (`boutique_mannequin_mask.png`) y con una zona del cuerpo (torso, brazos,
 * piernas), así siguen el contorno real de la foto; encima se multiplica la
 * misma foto para que tomen las sombras del cuerpo. Las partes sueltas
 * (faldas, piernas de palazzo) son trazos propios que siguen la pose.
 */
export const MANNEQUIN_IMAGE = {
  href: 'assets/mannequin/boutique_mannequin_clean.png?v=clean2',
  maskHref: 'assets/mannequin/boutique_mannequin_mask.png?v=1',
  x: 35.7,
  y: 14,
  width: 168.6,
  height: 446,
} as const;

/** Prenda pegada al cuerpo: zona del cuerpo recortada con la máscara del maniquí. */
export interface HugLayer {
  kind: 'hug';
  key: string;
  clip: string;
  fill: string;
  texture: GarmentTexture;
}

/** Tela suelta que no sigue el contorno del cuerpo (faldas, palazzos). */
export interface DrapeLayer {
  kind: 'drape';
  key: string;
  d: string;
  fill: string;
  texture: GarmentTexture;
  folds?: string;
}

/** Detalle dibujado tal cual: costuras, solapas, accesorios. */
export interface ShapeLayer {
  kind: 'shape';
  key: string;
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  texture?: GarmentTexture;
}

export type GarmentLayer = HugLayer | DrapeLayer | ShapeLayer;

/** Lo mínimo de un producto para dibujarlo (sirve también para la vista previa del panel). */
export type DressableItem = Pick<Product, 'slot' | 'category' | 'colors' | 'silhouette'>;
export type DressableSlots = Partial<Record<GarmentSlot, DressableItem>>;

// --- Zonas del cuerpo -------------------------------------------------------

const NECK_SCOOP = 'M101 84 L114 79 Q128 104 146 81 L150 82 L162 96';
const TORSO_RIGHT_TO_WAIST = 'C163 115 161 132 157 144 L157 168 L166 186 L177 202';
const TORSO_LEFT_FROM_WAIST = 'L101 172 L100 140 Z';

/** Torso sin brazos, del escote a la cintura. */
const BODICE = `${NECK_SCOOP} ${TORSO_RIGHT_TO_WAIST} L100 202 ${TORSO_LEFT_FROM_WAIST}`;
/** Torso corto, termina sobre el ombligo. */
const CROP_BODICE = `${NECK_SCOOP} C163 115 161 132 157 144 L157 170 L101 170 L100 140 Z`;
/** Torso con hombros y cadera, para blazers. */
const JACKET_BODY = 'M98 78 L116 76 L128 138 L144 77 L164 92 L162 136 L156 146 L157 168 L166 186 L179 202 L180 236 L105 236 L104 214 L101 172 L100 140 Z';
const ARM_LEFT_FULL = 'M70 74 L101 78 L100 140 L103 172 L104 194 L90 208 L82 206 L58 160 Z';
const ARM_RIGHT_FULL = 'M158 86 L186 88 L190 160 L193 210 L179 216 L176 200 L166 186 L157 168 L156 146 L162 136 Z';
const ARM_LEFT_CAP = 'M72 74 L101 78 L100 124 L70 122 Z';
const ARM_RIGHT_CAP = 'M158 86 L186 88 L184 124 L160 126 Z';
// --- Prendas sueltas ----------------------------------------------------------

const SKIRT_LONG = 'M103 201 C106 222 106 240 104 254 C98 300 80 370 56 428 Q106 442 160 426 C156 380 156 330 164 286 C170 256 176 228 177 201 Z';
const SKIRT_LONG_FOLDS = 'M112 262 C102 320 88 380 74 432 M132 230 C130 300 120 372 108 436 M158 240 C152 300 146 370 144 428';
const SKIRT_MIDI = 'M102 199 C106 222 106 240 104 254 C98 290 86 322 72 350 Q118 364 168 344 C166 310 168 282 170 262 C173 240 176 222 177 199 Z';
const SKIRT_MIDI_FOLDS = 'M112 262 C106 300 98 330 88 354 M134 226 C132 280 126 324 120 358 M158 236 C158 280 156 320 154 350';
const PALAZZO =
  'M102 198 L177 198 C178 250 166 320 148 428 L104 430 C112 356 124 296 139 240 C128 300 112 364 98 432 L52 432 C66 360 84 300 104 254 C106 236 106 218 102 198 Z';
const PALAZZO_FOLDS = 'M96 276 C88 330 76 384 66 430 M162 252 C156 320 148 380 138 428 M118 300 L106 428';

/** Chaleco largo sin mangas, abierto adelante: cada delantero baja del hombro a la rodilla. */
const VEST_LEFT = 'M100 82 L116 77 L121 120 L122 206 L121 340 Q108 344 94 339 C97 300 100 250 102 206 L101 172 L100 140 Z';
const VEST_RIGHT =
  'M144 78 L162 96 C163 115 161 132 157 144 L157 168 L166 186 L178 206 C179 250 180 300 181 336 Q158 342 137 339 L136 206 L136 120 Z';
const VEST_FOLDS = 'M110 214 L107 336 M150 214 L151 336 M165 214 L167 334';

// --- Detalles -----------------------------------------------------------------

/** Zapatos sobre los pies en punta del maniquí (izquierdo de perfil, derecho de frente). */
const SHOE_LEFT = 'M62 427 C67 431 75 430 81 426 L77 440 C74 446 68 449 62 452 C57 453 52 451 54 446 C56 441 59 434 62 427 Z';
const SHOE_RIGHT = 'M110 426 C115 429 121 429 126 426 L126 434 C126 440 122 443 117.5 443 C113 443 110 440 110 435 Z';
const SHOE_LEFT_SANDAL = 'M60 433 C66 436 73 435 78 432 L77 440 C74 446 68 449 62 452 C57 453 52 451 54 446 C56 442 58 437 60 433 Z';
const SHOE_RIGHT_SANDAL = 'M110 432 C115 435 121 435 126 432 L126 435 C126 440 122 443 117.5 443 C113 443 110 440 110 436 Z';
const NECKLINE_TRIM = 'M114 79 Q128 104 146 81';
const BLAZER_LAPELS = 'M116 77 L128 138 L144 78 M116 77 L110 92 L121 110 M144 78 L149 92 L135 110';
const BLAZER_DETAILS = 'M106 214 L119 213 M139 213 L153 212';
const WAIST_SEAM = 'M103 201 Q140 205 177 201';
const HAT_CROWN = 'M123 37 C121 22 128 15 139 15 C151 15 157 21 156 35 Z';
const HAT_BRIM = 'M109 38 C111 32 167 29 170 35 C172 42 111 46 109 38 Z';
const HAT_BAND = 'M123.4 32 C134 34 146 33.5 156.3 30.5';
const NECKLACE_CHAIN = 'M116 80 Q131 99 146 82';
const NECKLACE_PENDANT = 'M131 88 L133.5 91 L131 95 L128.5 91 Z';
const BAG_STRAP = 'M182 236 C181 223 193 222 194 235';
const BAG_BODY = 'M174 238 Q174 235 177 235 L201 233 Q204 233 204 236 L205 251 Q205 254 202 254 L178 256 Q175 256 175 253 Z';
const BAG_FLAP = 'M174.5 238 L204.5 235.5 L190 246 Z';

const OUTLINE = '#332B25';
const GOLD = '#D4AF37';

/** Capas a dibujar, de atrás hacia adelante, para lo que tiene puesto el maniquí. */
export function buildGarmentLayers(slots: DressableSlots): GarmentLayer[] {
  const layers: GarmentLayer[] = [];

  if (slots.dress) {
    const s = resolveSilhouette(slots.dress);
    const texture = s.texturePattern ?? 'solid';
    const long = s.svgType === 'dress-silk';
    layers.push(
      { kind: 'drape', key: 'dress-skirt', d: long ? SKIRT_LONG : SKIRT_MIDI, fill: s.colorHex, texture, folds: long ? SKIRT_LONG_FOLDS : SKIRT_MIDI_FOLDS },
      { kind: 'hug', key: 'dress-bodice', clip: BODICE, fill: s.colorHex, texture },
      { kind: 'shape', key: 'dress-seam', d: WAIST_SEAM, stroke: OUTLINE, strokeWidth: 0.5 },
    );
  }

  if (slots.bottom) {
    const s = resolveSilhouette(slots.bottom);
    const texture = s.texturePattern ?? 'solid';
    if (s.svgType === 'pants-palazzo') {
      layers.push({ kind: 'drape', key: 'pants', d: PALAZZO, fill: s.colorHex, texture, folds: PALAZZO_FOLDS });
    } else {
      layers.push({ kind: 'drape', key: 'skirt', d: SKIRT_MIDI, fill: s.colorHex, texture, folds: SKIRT_MIDI_FOLDS });
    }
  }

  if (slots.top) {
    const s = resolveSilhouette(slots.top);
    const texture = s.texturePattern ?? 'solid';
    if (s.svgType === 'blazer') {
      layers.push(
        { kind: 'hug', key: 'blazer-body', clip: JACKET_BODY, fill: s.colorHex, texture },
        { kind: 'hug', key: 'blazer-arm-left', clip: ARM_LEFT_FULL, fill: s.colorHex, texture },
        { kind: 'hug', key: 'blazer-arm-right', clip: ARM_RIGHT_FULL, fill: s.colorHex, texture },
        { kind: 'shape', key: 'blazer-lapels', d: BLAZER_LAPELS, stroke: OUTLINE, strokeWidth: 0.5 },
        { kind: 'shape', key: 'blazer-pockets', d: BLAZER_DETAILS, stroke: OUTLINE, strokeWidth: 0.5 },
        { kind: 'shape', key: 'blazer-button', d: 'M128 174 m-1.8 0 a1.8 1.8 0 1 0 3.6 0 a1.8 1.8 0 1 0 -3.6 0', fill: GOLD },
      );
    } else if (s.svgType === 'vest-long') {
      layers.push(
        { kind: 'drape', key: 'vest-left', d: VEST_LEFT, fill: s.colorHex, texture, folds: VEST_FOLDS },
        { kind: 'drape', key: 'vest-right', d: VEST_RIGHT, fill: s.colorHex, texture },
      );
    } else if (s.svgType === 'top-crop') {
      layers.push({ kind: 'hug', key: 'crop', clip: CROP_BODICE, fill: s.colorHex, texture });
    } else {
      layers.push(
        { kind: 'hug', key: 'blouse', clip: BODICE, fill: s.colorHex, texture },
        { kind: 'hug', key: 'blouse-sleeve-left', clip: ARM_LEFT_CAP, fill: s.colorHex, texture },
        { kind: 'hug', key: 'blouse-sleeve-right', clip: ARM_RIGHT_CAP, fill: s.colorHex, texture },
        { kind: 'shape', key: 'blouse-neck', d: NECKLINE_TRIM, stroke: OUTLINE, strokeWidth: 0.5 },
      );
    }
  }

  if (slots.shoes) {
    const s = resolveSilhouette(slots.shoes);
    const texture = s.texturePattern ?? 'solid';
    const heels = s.svgType === 'shoes-heels';
    layers.push(
      { kind: 'shape', key: 'shoe-left', d: heels ? SHOE_LEFT_SANDAL : SHOE_LEFT, fill: s.colorHex, stroke: OUTLINE, strokeWidth: 0.4, texture },
      { kind: 'shape', key: 'shoe-right', d: heels ? SHOE_RIGHT_SANDAL : SHOE_RIGHT, fill: s.colorHex, stroke: OUTLINE, strokeWidth: 0.4, texture },
    );
    if (heels) {
      layers.push({ kind: 'shape', key: 'shoe-heel', d: 'M79.5 433 L81 449', stroke: s.colorHex, strokeWidth: 1.3 });
    }
  }

  if (slots.accessory) {
    layers.push(...accessoryLayers(slots.accessory));
  }

  return layers;
}

function accessoryLayers(product: DressableItem): GarmentLayer[] {
  const s = resolveSilhouette(product);
  const texture = s.texturePattern ?? 'solid';
  switch (s.svgType) {
    case 'hat-fedora':
      return [
        { kind: 'shape', key: 'hat-crown', d: HAT_CROWN, fill: s.colorHex, stroke: OUTLINE, strokeWidth: 0.6, texture },
        { kind: 'shape', key: 'hat-brim', d: HAT_BRIM, fill: s.colorHex, stroke: OUTLINE, strokeWidth: 0.6, texture },
        { kind: 'shape', key: 'hat-band', d: HAT_BAND, stroke: '#1C1917', strokeWidth: 2 },
      ];
    case 'jewelry-necklace':
      return [
        { kind: 'shape', key: 'necklace-chain', d: NECKLACE_CHAIN, stroke: s.colorHex, strokeWidth: 1.1 },
        { kind: 'shape', key: 'necklace-pendant', d: NECKLACE_PENDANT, fill: s.colorHex, stroke: OUTLINE, strokeWidth: 0.3, texture: 'gold' },
      ];
    default:
      return [
        { kind: 'shape', key: 'bag-strap', d: BAG_STRAP, stroke: GOLD, strokeWidth: 1.1 },
        { kind: 'shape', key: 'bag-body', d: BAG_BODY, fill: s.colorHex, stroke: OUTLINE, strokeWidth: 0.6, texture },
        { kind: 'shape', key: 'bag-flap', d: BAG_FLAP, fill: s.colorHex, stroke: OUTLINE, strokeWidth: 0.5 },
        { kind: 'shape', key: 'bag-clasp', d: 'M190 245 m-1.6 0 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0', fill: GOLD },
      ];
  }
}

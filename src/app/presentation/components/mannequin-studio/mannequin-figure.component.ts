import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DressableSlots, MANNEQUIN_IMAGE, buildGarmentLayers } from './mannequin-garments';

let nextId = 0;

/** Maniquí con las prendas puestas, ajustadas a su cuerpo. */
@Component({
  selector: 'app-mannequin-figure',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      viewBox="0 0 240 480"
      class="block w-full h-full select-none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Maniquí con el look elegido"
    >
      <defs>
        <!-- Body silhouette (alpha) used to fit garments to the mannequin -->
        <mask [attr.id]="id('body')" maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="480" style="mask-type: alpha">
          <image [attr.href]="mannequin.maskHref" [attr.x]="mannequin.x" [attr.y]="mannequin.y" [attr.width]="mannequin.width" [attr.height]="mannequin.height" />
        </mask>

        <!-- Thin dark edge around each garment so light fabrics read on the white mannequin -->
        <filter [attr.id]="id('edge')" x="-10%" y="-10%" width="120%" height="120%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="0.45" result="grown" />
          <feFlood flood-color="#332B25" flood-opacity="0.55" />
          <feComposite in2="grown" operator="in" result="edge" />
          <feMerge>
            <feMergeNode in="edge" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <!-- Side shading for loose fabric -->
        <linearGradient [attr.id]="id('drape')" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#000" stop-opacity="0.3" />
          <stop offset="0.3" stop-color="#fff" stop-opacity="0.14" />
          <stop offset="0.62" stop-color="#000" stop-opacity="0.03" />
          <stop offset="1" stop-color="#000" stop-opacity="0.32" />
        </linearGradient>

        <!-- Fabric textures -->
        <linearGradient [attr.id]="id('tex-silk')" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff" stop-opacity="0" />
          <stop offset="0.42" stop-color="#fff" stop-opacity="0.28" />
          <stop offset="0.5" stop-color="#fff" stop-opacity="0.05" />
          <stop offset="0.7" stop-color="#fff" stop-opacity="0.2" />
          <stop offset="1" stop-color="#fff" stop-opacity="0" />
        </linearGradient>
        <pattern [attr.id]="id('tex-linen')" width="2" height="2" patternUnits="userSpaceOnUse">
          <path d="M0 0.5 H2 M0.5 0 V2" stroke="#000" stroke-opacity="0.035" stroke-width="0.3" />
        </pattern>
        <radialGradient [attr.id]="id('tex-leather')" cx="35%" cy="30%" r="80%">
          <stop offset="0" stop-color="#fff" stop-opacity="0.22" />
          <stop offset="1" stop-color="#000" stop-opacity="0.18" />
        </radialGradient>
        <linearGradient [attr.id]="id('tex-gold')" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#FFF6D5" stop-opacity="0.55" />
          <stop offset="0.5" stop-color="#fff" stop-opacity="0" />
          <stop offset="1" stop-color="#7A5A12" stop-opacity="0.35" />
        </linearGradient>

        @for (layer of layers(); track layer.key) {
          @if (layer.kind === 'hug') {
            <clipPath [attr.id]="id('clip-' + layer.key)"><path [attr.d]="layer.clip" /></clipPath>
          }
        }
      </defs>

      <!-- Floor shadow -->
      <ellipse cx="104" cy="452" rx="58" ry="7" fill="#1C1917" fill-opacity="0.08" />

      <!-- Mannequin photo -->
      <image
        [attr.href]="mannequin.href"
        [attr.x]="mannequin.x"
        [attr.y]="mannequin.y"
        [attr.width]="mannequin.width"
        [attr.height]="mannequin.height"
        preserveAspectRatio="xMidYMid meet"
        [style.filter]="bodyFilter()"
        class="transition-all duration-300"
      />

      <!-- Garments, back to front -->
      @for (layer of layers(); track layer.key) {
        @switch (layer.kind) {
          @case ('hug') {
            <g [attr.filter]="ref('edge')" class="mq-garment">
              <g [attr.mask]="ref('body')" [attr.clip-path]="ref('clip-' + layer.key)">
                <rect x="0" y="0" width="240" height="480" [attr.fill]="layer.fill" />
                @if (layer.texture !== 'solid') {
                  <rect x="0" y="0" width="240" height="480" [attr.fill]="ref('tex-' + layer.texture)" />
                }
                <!-- The mannequin's own light and shadow, multiplied over the fabric -->
                <image
                  [attr.href]="mannequin.href"
                  [attr.x]="mannequin.x"
                  [attr.y]="mannequin.y"
                  [attr.width]="mannequin.width"
                  [attr.height]="mannequin.height"
                  style="mix-blend-mode: multiply"
                />
              </g>
            </g>
          }
          @case ('drape') {
            <g [attr.filter]="ref('edge')" class="mq-garment">
              <path [attr.d]="layer.d" [attr.fill]="layer.fill" />
              @if (layer.texture !== 'solid') {
                <path [attr.d]="layer.d" [attr.fill]="ref('tex-' + layer.texture)" />
              }
              <path [attr.d]="layer.d" [attr.fill]="ref('drape')" />
              @if (layer.folds) {
                <path [attr.d]="layer.folds" stroke="#000" stroke-opacity="0.16" stroke-width="1.1" stroke-linecap="round" />
              }
            </g>
          }
          @case ('shape') {
            <g class="mq-garment">
              <path
                [attr.d]="layer.d"
                [attr.fill]="layer.fill ?? 'none'"
                [attr.stroke]="layer.stroke ?? null"
                [attr.stroke-width]="layer.strokeWidth ?? null"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              @if (layer.fill && layer.texture && layer.texture !== 'solid') {
                <path [attr.d]="layer.d" [attr.fill]="ref('tex-' + layer.texture)" />
              }
            </g>
          }
        }
      }
    </svg>
  `,
})
export class MannequinFigureComponent {
  /** Prendas puestas, por lugar del maniquí. */
  readonly slots = input<DressableSlots>({});
  /** Filtro CSS para el tono del maniquí. */
  readonly bodyFilter = input('none');

  readonly mannequin = MANNEQUIN_IMAGE;
  readonly layers = computed(() => buildGarmentLayers(this.slots()));

  /** Prefijo propio para que dos maniquíes en la misma página no compartan máscaras. */
  private readonly uid = `mq${nextId++}`;

  id(name: string): string {
    return `${this.uid}-${name}`;
  }

  ref(name: string): string {
    return `url(#${this.uid}-${name})`;
  }
}

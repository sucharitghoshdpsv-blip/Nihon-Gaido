import type { CityGuide, DistrictLandmark } from '../data/japanData';

export interface NormalizedPointer {
  nx: number;
  ny: number;
  px: number;
  py: number;
}

export interface DepthLayerOffsets {
  backdropX: number;
  backdropY: number;
  typographyX: number;
  typographyY: number;
  foregroundX: number;
  foregroundY: number;
  moonX: number;
  moonY: number;
}

export interface RevealedLandmarkInfo {
  landmark: DistrictLandmark;
  distancePx: number;
  visibility: number;
}

export interface CityShadowPalette {
  kanjiMark: string;
  romajiSub: string;
  moonTint: string;
  floraAccent: string;
  emberColor: string;
}

export const SHADOW_LENS_DEFAULT_RADIUS = 155;

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function clampPointerNormalized(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number }
): NormalizedPointer {
  const safeWidth = Math.max(1, rect.width);
  const safeHeight = Math.max(1, rect.height);
  const px = clampNumber(clientX - rect.left, 0, safeWidth);
  const py = clampNumber(clientY - rect.top, 0, safeHeight);
  return {
    nx: px / safeWidth,
    ny: py / safeHeight,
    px,
    py,
  };
}

/**
 * Frame-rate independent exponential damping toward target.
 */
export function dampValue(
  current: number,
  target: number,
  smoothing: number,
  dtSeconds: number
): number {
  if (Math.abs(target - current) < 0.05) {
    return target;
  }
  const safeDt = clampNumber(dtSeconds, 0, 0.1);
  const factor = 1 - Math.exp(-Math.max(0.1, smoothing) * safeDt);
  return current + (target - current) * factor;
}

/**
 * Computes differential parallax pixel offsets across 4 depth planes:
 * backdrop < typography (sandwiched) < foreground flora/ridge.
 */
export function computeDepthLayerOffsets(
  nx: number,
  ny: number,
  intensity = 1
): DepthLayerOffsets {
  const dx = clampNumber(nx, 0, 1) - 0.5;
  const dy = clampNumber(ny, 0, 1) - 0.5;
  const scale = clampNumber(intensity, 0, 2);

  return {
    moonX: -dx * 10 * scale || 0,
    moonY: -dy * 8 * scale || 0,
    backdropX: -dx * 14 * scale || 0,
    backdropY: -dy * 10 * scale || 0,
    typographyX: -dx * 26 * scale || 0,
    typographyY: -dy * 16 * scale || 0,
    foregroundX: -dx * 42 * scale || 0,
    foregroundY: -dy * 24 * scale || 0,
  };
}

/**
 * Determines which city landmarks fall inside the spotlight beam and returns
 * sorted entries with normalized visibility intensity (0..1).
 */
export function evaluateRevealedLandmarks(
  landmarks: DistrictLandmark[],
  pointerPx: number,
  pointerPy: number,
  width: number,
  height: number,
  radiusPx = SHADOW_LENS_DEFAULT_RADIUS,
  fullReveal = false
): RevealedLandmarkInfo[] {
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const safeRadius = Math.max(1, radiusPx);

  return landmarks
    .map((landmark) => {
      const lx = (landmark.xPct / 100) * safeW;
      const ly = (landmark.yPct / 100) * safeH;
      const distancePx = Math.hypot(pointerPx - lx, pointerPy - ly);
      const visibility = fullReveal
        ? 1
        : clampNumber(1 - distancePx / (safeRadius * 1.15), 0, 1);
      return { landmark, distancePx, visibility };
    })
    .sort((a, b) => a.distancePx - b.distancePx);
}

/**
 * Generates a radial CSS mask gradient anchored at (px, py).
 * When fullReveal is true, reveals the full illuminated canvas cleanly.
 */
export function buildSpotlightMaskGradient(
  px: number,
  py: number,
  radiusPx: number,
  fullReveal: boolean
): string {
  if (fullReveal) {
    return 'radial-gradient(circle 1600px at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 100%)';
  }
  const x = Math.round(px);
  const y = Math.round(py);
  const r = Math.max(60, Math.round(radiusPx));
  const inner = Math.round(r * 0.56);
  const mid = Math.round(r * 0.84);
  return `radial-gradient(circle ${r}px at ${x}px ${y}px, rgba(0,0,0,1) 0%, rgba(0,0,0,0.92) ${inner}px, rgba(0,0,0,0.34) ${mid}px, rgba(0,0,0,0) ${r}px)`;
}

export function getCityShadowPalette(cityId: CityGuide['id']): CityShadowPalette {
  switch (cityId) {
    case 'Kyoto':
      return {
        kanjiMark: '京都',
        romajiSub: 'GION · ARASHIYAMA',
        moonTint: 'rgba(225, 29, 72, 0.72)',
        floraAccent: '#e11d48',
        emberColor: '#fb7185',
      };
    case 'Osaka':
      return {
        kanjiMark: '大阪',
        romajiSub: 'DOTONBORI · SHINSEKAI',
        moonTint: 'rgba(234, 88, 12, 0.72)',
        floraAccent: '#f97316',
        emberColor: '#fbbf24',
      };
    case 'Sapporo':
      return {
        kanjiMark: '札幌',
        romajiSub: 'ODORI · JOZANKEI',
        moonTint: 'rgba(244, 63, 94, 0.62)',
        floraAccent: '#f43f5e',
        emberColor: '#bae6fd',
      };
    case 'Nara':
      return {
        kanjiMark: '奈良',
        romajiSub: 'KASUGA · TODAI-JI',
        moonTint: 'rgba(217, 119, 6, 0.68)',
        floraAccent: '#dc2626',
        emberColor: '#fcd34d',
      };
    case 'Kanazawa':
      return {
        kanjiMark: '金沢',
        romajiSub: 'HIGASHI CHAYA · KENROKU-EN',
        moonTint: 'rgba(245, 158, 11, 0.72)',
        floraAccent: '#e11d48',
        emberColor: '#f6c945',
      };
    case 'Tokyo':
    default:
      return {
        kanjiMark: '東京',
        romajiSub: 'SHIBUYA · YANAKA',
        moonTint: 'rgba(225, 29, 72, 0.74)',
        floraAccent: '#e11d48',
        emberColor: '#f59e0b',
      };
  }
}

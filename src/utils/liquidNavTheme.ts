import type { JapaneseThemeId } from '../data/japanData';

export interface LiquidThemeColors {
  /** Normalized RGB triplet (0..1) for WebGL water meniscus & caustic tint */
  waterRgb: [number, number, number];
  /** Normalized RGB triplet (0..1) for subtle rim shimmer / secondary caustic */
  rimRgb: [number, number, number];
  /** CSS hex or rgba accent color matching active Japanese theme */
  accentCss: string;
}

export function getJapaneseLiquidPalette(
  themeId: JapaneseThemeId,
  isDarkMode: boolean
): LiquidThemeColors {
  switch (themeId) {
    case 'aizome':
      return isDarkMode
        ? {
            waterRgb: [0.38, 0.65, 0.98], // Aizome glowing indigo-azure
            rimRgb: [0.96, 0.79, 0.27], // Subtle gold thread glint
            accentCss: '#60A5FA',
          }
        : {
            waterRgb: [0.11, 0.31, 0.85], // Deep indigo dye water
            rimRgb: [0.22, 0.52, 0.95],
            accentCss: '#1D4ED8',
          };

    case 'sakura':
      return isDarkMode
        ? {
            waterRgb: [0.96, 0.45, 0.71], // Sakura dusk petal tint
            rimRgb: [0.98, 0.82, 0.42],
            accentCss: '#F472B6',
          }
        : {
            waterRgb: [0.65, 0.20, 0.34], // Deep plum-blossom rose
            rimRgb: [0.93, 0.48, 0.65],
            accentCss: '#A63457',
          };

    case 'take':
      return isDarkMode
        ? {
            waterRgb: [0.20, 0.83, 0.60], // Bamboo jade stream
            rimRgb: [0.96, 0.79, 0.27],
            accentCss: '#34D399',
          }
        : {
            waterRgb: [0.09, 0.40, 0.20], // Arashiyama deep emerald
            rimRgb: [0.16, 0.62, 0.38],
            accentCss: '#166534',
          };

    case 'kinpaku':
    default:
      return isDarkMode
        ? {
            waterRgb: [0.96, 0.79, 0.27], // Kinpaku gold leaf reflection
            rimRgb: [1.0, 0.89, 0.56],
            accentCss: '#F6C945',
          }
        : {
            waterRgb: [0.65, 0.44, 0.03], // Warm bronze-ochre gold on washi
            rimRgb: [0.85, 0.64, 0.16],
            accentCss: '#A67108',
          };
  }
}

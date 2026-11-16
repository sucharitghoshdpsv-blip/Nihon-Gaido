export type VisualDecodeMode = 'menu' | 'vending' | 'shrine' | 'sign';

export interface DecodedVisualEntry {
  originalJapanese: string;
  reading: string;
  englishName: string;
  priceOrDetail: string;
  notes: string;
}

export interface VisualDecodeResponse {
  mode: VisualDecodeMode;
  title: string;
  summary: string;
  entries: DecodedVisualEntry[];
  allergenWarnings: string[];
  usageSteps: string[];
  modelUsed?: string;
}

export function normalizeVisualDecodeMode(mode: unknown): VisualDecodeMode {
  if (mode === 'menu' || mode === 'vending' || mode === 'shrine' || mode === 'sign') {
    return mode;
  }
  return 'menu';
}

export function buildVisualDecoderPrompt(mode: VisualDecodeMode, cityContext?: string): string {
  const city = cityContext?.trim() || 'Japan';
  switch (mode) {
    case 'menu':
      return `Analyze this Japanese restaurant or izakaya menu image taken in ${city}. Extract readable dishes, provide Romaji/reading, English meaning, estimated prices if shown, flag common Japanese hidden allergens (dashi fish stock, soy/wheat, shellfish, egg, sesame, buckwheat, alcohol/mirin, pork), and give concise ordering tips.`;
    case 'vending':
      return `Analyze this Japanese vending machine or ticket kiosk panel from ${city}. Identify each visible beverage/button (e.g., Hot vs Cold red/blue labels, unsweetened green tea vs sweetened milk tea, coffee, corn soup), give Romaji & English translations, and list step-by-step payment/button instructions.`;
    case 'shrine':
      return `Analyze this Japanese shrine or temple sign (e.g., temizuya purification trough, omikuji fortune drawer, or etiquette board) in ${city}. Explain the Japanese text and provide clear numbered step-by-step ritual instructions plus photography/etiquette warnings.`;
    case 'sign':
      return `Analyze this Japanese street sign, storefront plaque, or station notice in ${city}. Identify key kanji compounds (such as 出口, 入口, 禁煙, 営業中, 準備中, 押/引), give pronunciation, English meaning, and practical action steps for a traveler.`;
  }
}

export function parseVisualDecodePayload(rawText: string, mode: VisualDecodeMode): VisualDecodeResponse {
  const cleaned = (rawText || '{}').trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  const rawEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
  const entries: DecodedVisualEntry[] = rawEntries
    .slice(0, 10)
    .map((item) => {
      const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      return {
        originalJapanese: typeof obj.originalJapanese === 'string' ? obj.originalJapanese : '',
        reading: typeof obj.reading === 'string' ? obj.reading : '',
        englishName: typeof obj.englishName === 'string' ? obj.englishName : '',
        priceOrDetail: typeof obj.priceOrDetail === 'string' ? obj.priceOrDetail : '',
        notes: typeof obj.notes === 'string' ? obj.notes : '',
      };
    })
    .filter((e) => e.originalJapanese || e.englishName);

  const allergenWarnings = Array.isArray(parsed.allergenWarnings)
    ? parsed.allergenWarnings.filter((w): w is string => typeof w === 'string' && w.trim().length > 0).slice(0, 8)
    : [];

  const usageSteps = Array.isArray(parsed.usageSteps)
    ? parsed.usageSteps.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).slice(0, 8)
    : [];

  return {
    mode,
    title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : 'Decoded Visual Guide',
    summary: typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : 'Translated cultural and practical breakdown.',
    entries,
    allergenWarnings,
    usageSteps,
  };
}

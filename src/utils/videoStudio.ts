export type VideoAspectRatio = '16:9' | '9:16';

export interface ExploreVideoPreset {
  id: 'hero' | 'Tokyo' | 'Kyoto' | 'Osaka' | 'Sapporo' | 'Nara' | 'Kanazawa';
  label: string;
  imageUrl: string;
  filename: string;
  defaultPrompt: string;
}

export const EXPLORE_VIDEO_PRESETS: ExploreVideoPreset[] = [
  {
    id: 'hero',
    label: 'Gion Twilight Hero',
    imageUrl: '/images/hero_japan_twilight_1794670215092.jpg',
    filename: 'hero_japan_twilight_1794670215092.jpg',
    defaultPrompt:
      'Smooth 3-second cinematic dolly forward down the twilight Kyoto stone lane as paper lanterns sway gently in the evening breeze and warm window reflections shimmer on cobblestones.',
  },
  {
    id: 'Tokyo',
    label: 'Tokyo · Shibuya',
    imageUrl: '/images/city_tokyo_shibuya_1794670214672.jpg',
    filename: 'city_tokyo_shibuya_1794670214672.jpg',
    defaultPrompt:
      'Crisp 3-second urban glide over glowing Tokyo neon signage, subtle headlight trails moving along the avenue, and gentle atmospheric evening mist.',
  },
  {
    id: 'Kyoto',
    label: 'Kyoto · Arashiyama',
    imageUrl: '/images/city_kyoto_arashiyama_1794670217427.jpg',
    filename: 'city_kyoto_arashiyama_1794670217427.jpg',
    defaultPrompt:
      'Serene 3-second pan through sun-dappled Arashiyama bamboo stalks swaying softly in morning mist with dappled golden light beams.',
  },
  {
    id: 'Osaka',
    label: 'Osaka · Dotonbori',
    imageUrl: '/images/city_osaka_dotonbori_1794670216998.jpg',
    filename: 'city_osaka_dotonbori_1794670216998.jpg',
    defaultPrompt:
      'Lively 3-second canal-side camera drift past glowing Dotonbori lanterns with gentle ripples shimmering across the water surface.',
  },
  {
    id: 'Sapporo',
    label: 'Sapporo · Jozankei',
    imageUrl: '/images/city_hokkaido_winter_1794670217421.jpg',
    filename: 'city_hokkaido_winter_1794670217421.jpg',
    defaultPrompt:
      'Peaceful 3-second alpine zoom as fine powder snow drifts softly past warm amber lantern light in Hokkaido.',
  },
  {
    id: 'Nara',
    label: 'Nara · Nara Park',
    imageUrl: '/images/city_nara_park_1794762230326.jpg',
    filename: 'city_nara_park_1794762230326.jpg',
    defaultPrompt:
      'Gentle 3-second floating camera motion beneath mossy stone lanterns as sacred maple leaves drift slowly through warm morning light.',
  },
  {
    id: 'Kanazawa',
    label: 'Kanazawa · Kenroku-en',
    imageUrl: '/images/city_kanazawa_garden_1794762230854.jpg',
    filename: 'city_kanazawa_garden_1794762230854.jpg',
    defaultPrompt:
      'Tranquil 3-second slow pan across pine trees, stone paths, and soft reflections rippling over the traditional garden pond.',
  },
];

export const ALLOWED_VIDEO_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_UPLOAD_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

export function getExplorePresetById(id: string | null | undefined): ExploreVideoPreset | null {
  if (!id) return null;
  return EXPLORE_VIDEO_PRESETS.find((item) => item.id.toLowerCase() === id.trim().toLowerCase()) ?? null;
}

export function resolveExploreAssetFilename(assetIdOrPath: string | null | undefined): string | null {
  if (!assetIdOrPath || typeof assetIdOrPath !== 'string') return null;
  const trimmed = assetIdOrPath.trim();
  const byId = getExplorePresetById(trimmed);
  if (byId) return byId.filename;

  const byUrlOrFilename = EXPLORE_VIDEO_PRESETS.find(
    (item) => item.imageUrl === trimmed || item.filename === trimmed
  );
  return byUrlOrFilename ? byUrlOrFilename.filename : null;
}

export function normalizeVideoAspectRatio(ratio: unknown): VideoAspectRatio {
  if (ratio === '9:16') return '9:16';
  return '16:9';
}

export function parseImageDataUrl(dataUrl: string): {
  mimeType: (typeof ALLOWED_VIDEO_MIME_TYPES)[number];
  base64Data: string;
  estimatedBytes: number;
} {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    throw new Error('Expected a valid base64 image data URL.');
  }
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl.trim());
  if (!match) {
    throw new Error('Only PNG, JPEG, or WebP images encoded as base64 data URLs are supported.');
  }
  const rawMime = match[1].toLowerCase();
  const mimeType = (rawMime === 'image/jpg' ? 'image/jpeg' : rawMime) as (typeof ALLOWED_VIDEO_MIME_TYPES)[number];
  const base64Data = match[2].replace(/\s+/g, '');
  const estimatedBytes = Math.floor((base64Data.length * 3) / 4);
  if (estimatedBytes <= 0 || estimatedBytes > MAX_UPLOAD_IMAGE_BYTES) {
    throw new Error('Uploaded image exceeds the 10 MB size limit.');
  }
  return { mimeType, base64Data, estimatedBytes };
}

export interface ExtractedVideoResult {
  mimeType: string;
  dataBase64: string | null;
  uri: string | null;
}

export function extractVideoFromInteraction(interaction: unknown): ExtractedVideoResult | null {
  if (!interaction || typeof interaction !== 'object') return null;
  const record = interaction as Record<string, unknown>;

  const direct = record.output_video;
  if (direct && typeof direct === 'object') {
    const vid = direct as Record<string, unknown>;
    const mimeType = typeof vid.mime_type === 'string' && vid.mime_type ? vid.mime_type : 'video/mp4';
    const dataBase64 = typeof vid.data === 'string' && vid.data ? vid.data : null;
    const uri = typeof vid.uri === 'string' && vid.uri ? vid.uri : null;
    if (dataBase64 || uri) {
      return { mimeType, dataBase64, uri };
    }
  }

  const steps = Array.isArray(record.steps) ? record.steps : [];
  for (const step of steps) {
    if (!step || typeof step !== 'object') continue;
    const stepObj = step as Record<string, unknown>;
    const outputs = Array.isArray(stepObj.outputs)
      ? stepObj.outputs
      : Array.isArray(stepObj.content)
        ? stepObj.content
        : [];
    for (const part of outputs) {
      if (!part || typeof part !== 'object') continue;
      const p = part as Record<string, unknown>;
      if (p.type === 'video' || p.type === 'output_video') {
        const mimeType = typeof p.mime_type === 'string' && p.mime_type ? p.mime_type : 'video/mp4';
        const dataBase64 = typeof p.data === 'string' && p.data ? p.data : null;
        const uri = typeof p.uri === 'string' && p.uri ? p.uri : null;
        if (dataBase64 || uri) {
          return { mimeType, dataBase64, uri };
        }
      }
    }
  }

  const directOutputs = Array.isArray(record.outputs) ? record.outputs : [];
  for (const part of directOutputs) {
    if (!part || typeof part !== 'object') continue;
    const p = part as Record<string, unknown>;
    if (p.type === 'video') {
      const mimeType = typeof p.mime_type === 'string' && p.mime_type ? p.mime_type : 'video/mp4';
      const dataBase64 = typeof p.data === 'string' && p.data ? p.data : null;
      const uri = typeof p.uri === 'string' && p.uri ? p.uri : null;
      if (dataBase64 || uri) {
        return { mimeType, dataBase64, uri };
      }
    }
  }

  return null;
}

export function isBillingOrQuotaMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('403') ||
    lower.includes('429') ||
    lower.includes('permission_denied') ||
    lower.includes('resource_exhausted') ||
    lower.includes('billing') ||
    lower.includes('quota') ||
    lower.includes('paid')
  );
}

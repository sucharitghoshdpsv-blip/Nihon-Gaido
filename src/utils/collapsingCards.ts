import { CITY_GUIDES, type CityGuide } from '../data/japanData';
import { SHRINE_BIOMES, type ShrineBiomeId } from './shrineSceneConfig';

export interface CollapsingCardItem {
  id: string;
  wordmark: string;
  title: string;
  subtitle?: string;
  badge?: string;
  japaneseMark?: string;
  img: string;
  ctaLabel?: string;
}

export function formatCardCounter(index: number, total: number): string {
  const safeTotal = Math.max(1, total);
  const safeIdx = Math.min(safeTotal, Math.max(1, index + 1));
  return `${String(safeIdx).padStart(2, '0')} / ${String(safeTotal).padStart(2, '0')}`;
}

export function resolveActiveCollapsingId(
  cards: ReadonlyArray<Pick<CollapsingCardItem, 'id'>>,
  controlledActiveId?: string,
  internalActiveId?: string
): string {
  if (controlledActiveId && cards.some((c) => c.id === controlledActiveId)) {
    return controlledActiveId;
  }
  if (internalActiveId && cards.some((c) => c.id === internalActiveId)) {
    return internalActiveId;
  }
  return cards[0]?.id ?? '';
}

export function buildCityCollapsingCards(
  cities: CityGuide[] = CITY_GUIDES,
  options?: {
    offlineCityIds?: string[];
    ctaLabel?: string;
  }
): CollapsingCardItem[] {
  const offlineSet = new Set(options?.offlineCityIds ?? []);
  return cities.map((city) => ({
    id: city.id,
    wordmark: city.id,
    japaneseMark: city.japaneseName,
    badge: offlineSet.has(city.id)
      ? `${city.regionLabel} · Saved Offline`
      : `${city.regionLabel} · ${city.offlineSizeMb} MB`,
    title: `${city.id} — ${city.district}`,
    subtitle: city.headline,
    img: city.imageUrl,
    ctaLabel: options?.ctaLabel ?? 'Spotlight',
  }));
}

const BIOME_CARD_IMAGES: Record<ShrineBiomeId, string> = {
  kyoto_shrine: '/images/hero_japan_twilight_1794670215092.jpg',
  jigokudani: '/images/city_hokkaido_winter_1794670217421.jpg',
  arashiyama: '/images/city_kyoto_arashiyama_1794670217427.jpg',
  gion: '/images/city_kanazawa_garden_1794762230854.jpg',
};

export function buildShrineBiomeCollapsingCards(): CollapsingCardItem[] {
  return (Object.keys(SHRINE_BIOMES) as ShrineBiomeId[]).map((biomeId) => {
    const info = SHRINE_BIOMES[biomeId];
    return {
      id: biomeId,
      wordmark: info.shortLabel,
      japaneseMark: info.japanese,
      badge: 'Interactive 3D Biome',
      title: info.label,
      subtitle: info.subtitle,
      img: BIOME_CARD_IMAGES[biomeId],
      ctaLabel: 'Enter 3D',
    };
  });
}

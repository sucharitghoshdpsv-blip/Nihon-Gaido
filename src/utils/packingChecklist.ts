import type { ItineraryPlan } from '../data/japanData';
import type { CityWeatherSummary } from './weather';

export interface PackingChecklistItem {
  id: string;
  label: string;
  category: 'Weather Auto' | 'Itinerary Auto' | 'Core Japan';
  reason: string;
  checked: boolean;
}

const TEMPLE_KEYWORDS = [
  'temple',
  'shrine',
  'jingu',
  'dera',
  'taisha',
  'inari',
  'todai',
  'senso',
  'kasuga',
  'goshuin',
  'ryokan',
  'tatami',
];

export function hasTempleOrTatamiStops(itinerary: ItineraryPlan): boolean {
  for (const day of itinerary.days) {
    if (TEMPLE_KEYWORDS.some((kw) => day.theme.toLowerCase().includes(kw) || day.etiquetteTip.toLowerCase().includes(kw))) {
      return true;
    }
    for (const stop of day.stops) {
      const text = `${stop.name} ${stop.description}`.toLowerCase();
      if (TEMPLE_KEYWORDS.some((kw) => text.includes(kw))) {
        return true;
      }
    }
  }
  return false;
}

export function buildDynamicPackingItems(params: {
  cityName: string;
  weather: CityWeatherSummary | null;
  itinerary: ItineraryPlan;
  checkedIds: string[];
  customItems?: Array<{ id: string; label: string }>;
}): PackingChecklistItem[] {
  const checkedSet = new Set(params.checkedIds);
  const items: PackingChecklistItem[] = [];

  const addItem = (
    id: string,
    label: string,
    category: PackingChecklistItem['category'],
    reason: string
  ) => {
    items.push({
      id,
      label,
      category,
      reason,
      checked: checkedSet.has(id),
    });
  };

  // Core Japan essentials
  addItem(
    'core-coin-pouch',
    'Coin purse & ¥5,000 small bills',
    'Core Japan',
    'Needed for shrine offertories, ramen ticket machines, and smaller kissaten cafes.'
  );
  addItem(
    'core-trash-pouch',
    'Pocket zip pouch for wrappers',
    'Core Japan',
    'Public street bins are rare across Tokyo, Kyoto, and Osaka.'
  );
  addItem(
    'core-powerbank',
    '10,000mAh power bank + eSIM/IC card',
    'Core Japan',
    'Keeps Apple/Google Wallet Suica and Maps active through full transit days.'
  );

  // Weather-reactive auto-additions from 3-Day Weather Outlook
  if (params.weather && params.weather.days.length > 0) {
    const maxPrecip = Math.max(...params.weather.days.map((d) => d.precipPercent));
    const minTemp = Math.min(...params.weather.days.map((d) => d.tempMinC));
    const maxTemp = Math.max(...params.weather.days.map((d) => d.tempMaxC));
    const hasSnow = params.weather.days.some((d) => d.conditionKind === 'snow');
    const maxWind = Math.max(...params.weather.days.map((d) => d.windKmh));

    if (maxPrecip > 50) {
      addItem(
        'weather-umbrella',
        'Compact folding umbrella',
        'Weather Auto',
        `Auto-added: ${params.cityName} 3-day precipitation forecast peaks at ${maxPrecip}%.`
      );
      addItem(
        'weather-waterproof-pouch',
        'Waterproof daypack cover / dry bag',
        'Weather Auto',
        `Auto-added: protects JR Pass & goshuincho book during wet transit (${maxPrecip}% rain chance).`
      );
    }
    if (hasSnow) {
      addItem(
        'weather-snow-boots',
        'Waterproof grip-sole boots',
        'Weather Auto',
        `Auto-added: snow forecast ahead in ${params.cityName}.`
      );
    }
    if (minTemp <= 9) {
      addItem(
        'weather-kairo-layer',
        'Packable thermal layer & kairo warmers',
        'Weather Auto',
        `Auto-added: overnight/morning lows drop to ${Math.round(minTemp)}°C in ${params.cityName}.`
      );
    }
    if (maxTemp >= 25) {
      addItem(
        'weather-uv-hydration',
        'UV sun hat & quick-dry hand towel',
        'Weather Auto',
        `Auto-added: warm afternoon highs up to ${Math.round(maxTemp)}°C in ${params.cityName}.`
      );
    }
    if (maxWind >= 25) {
      addItem(
        'weather-windbreaker',
        'Light windproof outer shell',
        'Weather Auto',
        `Auto-added: coastal/canal gusts up to ${maxWind} km/h forecast.`
      );
    }
  }

  // Itinerary-reactive auto-additions
  if (hasTempleOrTatamiStops(params.itinerary)) {
    addItem(
      'itin-slipon-shoes',
      'Slip-on shoes & hole-free socks',
      'Itinerary Auto',
      'Auto-added: temple halls & tatami interiors require frequent shoe removal.'
    );
    addItem(
      'itin-goshuincho',
      'Goshuincho stamp book & ¥500 coins',
      'Itinerary Auto',
      'Auto-added: your itinerary includes temples/shrines offering handwritten goshuin.'
    );
  }

  if (params.itinerary.days.length >= 2) {
    addItem(
      'itin-takkyubin-bag',
      'Overnight pouch (for Takkyubin luggage transfer)',
      'Itinerary Auto',
      'Auto-added: pack 1 night of essentials while Yamato forwards main suitcases.'
    );
  }

  for (const custom of params.customItems || []) {
    addItem(custom.id, custom.label, 'Core Japan', 'Added manually to your pre-departure list.');
  }

  return items;
}

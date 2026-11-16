import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDynamicPackingItems } from './packingChecklist';
import { SEED_ITINERARY } from '../data/japanData';
import type { CityWeatherSummary } from './weather';

const RAINY_WEATHER: CityWeatherSummary = {
  cityId: 'Tokyo',
  source: 'open-meteo',
  fetchedAt: 1700000000000,
  currentTempC: 12,
  feelsLikeC: 10,
  currentConditionText: 'Showers',
  currentConditionKind: 'rain',
  currentHumidity: 80,
  currentWindKmh: 16,
  uvIndex: 2,
  days: [
    {
      dateIso: '2026-11-16',
      dayLabel: 'Today',
      conditionText: 'Steady rain',
      conditionKind: 'rain',
      tempMaxC: 14,
      tempMinC: 8,
      precipPercent: 75,
      humidityPercent: 85,
      windKmh: 18,
    },
  ],
};

test('buildDynamicPackingItems auto-adds umbrella when precipitation exceeds 50% and slip-on shoes for temple stops', () => {
  const items = buildDynamicPackingItems({
    cityName: 'Tokyo',
    weather: RAINY_WEATHER,
    itinerary: SEED_ITINERARY,
    checkedIds: ['core-coin-pouch'],
  });

  const umbrella = items.find((i) => i.id === 'weather-umbrella');
  const slipOn = items.find((i) => i.id === 'itin-slipon-shoes');
  const coinPouch = items.find((i) => i.id === 'core-coin-pouch');

  assert.ok(umbrella, 'expected umbrella auto-added when precip > 50%');
  assert.equal(umbrella.category, 'Weather Auto');
  assert.ok(slipOn, 'expected slip-on shoes auto-added for SEED_ITINERARY temple/shrine stops');
  assert.equal(slipOn.category, 'Itinerary Auto');
  assert.equal(coinPouch?.checked, true);
});

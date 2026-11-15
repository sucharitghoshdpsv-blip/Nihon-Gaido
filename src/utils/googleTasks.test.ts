import test from 'node:test';
import assert from 'node:assert/strict';
import { buildItineraryTaskDrafts } from './googleTasks';
import { CITY_GUIDES, SEED_ITINERARY } from '../data/japanData';

test('buildItineraryTaskDrafts converts itinerary stops and deduplicates existing task titles', () => {
  const tokyo = CITY_GUIDES[0];
  const initialDrafts = buildItineraryTaskDrafts(tokyo, SEED_ITINERARY);

  assert.ok(initialDrafts.length >= 6);
  assert.equal(initialDrafts[0].title, '[Day 1 · Tokyo] Meiji Jingu Forest Walk');
  assert.ok(initialDrafts[0].notes.includes('JR Yamanote Line'));

  const filteredDrafts = buildItineraryTaskDrafts(tokyo, SEED_ITINERARY, [
    '[Day 1 · Tokyo] Meiji Jingu Forest Walk',
  ]);
  assert.equal(filteredDrafts.length, initialDrafts.length - 1);
  assert.ok(
    !filteredDrafts.some((d) => d.title === '[Day 1 · Tokyo] Meiji Jingu Forest Walk')
  );
});

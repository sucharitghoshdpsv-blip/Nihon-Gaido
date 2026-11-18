import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCityCollapsingCards,
  buildShrineBiomeCollapsingCards,
  formatCardCounter,
  resolveActiveCollapsingId,
} from './collapsingCards';

test('formatCardCounter pads single digits cleanly', () => {
  assert.equal(formatCardCounter(0, 6), '01 / 06');
  assert.equal(formatCardCounter(5, 6), '06 / 06');
  assert.equal(formatCardCounter(99, 4), '04 / 04');
});

test('resolveActiveCollapsingId respects controlled id and falls back to first card', () => {
  const cards = [{ id: 'Tokyo' }, { id: 'Kyoto' }, { id: 'Osaka' }];
  assert.equal(resolveActiveCollapsingId(cards, 'Kyoto', 'Tokyo'), 'Kyoto');
  assert.equal(resolveActiveCollapsingId(cards, 'Unknown', 'Osaka'), 'Osaka');
  assert.equal(resolveActiveCollapsingId(cards, undefined, 'Unknown'), 'Tokyo');
  assert.equal(resolveActiveCollapsingId([], undefined, undefined), '');
});

test('buildCityCollapsingCards maps all 6 Japan cities with local images and offline status', () => {
  const cards = buildCityCollapsingCards(undefined, { offlineCityIds: ['Kyoto'] });
  assert.equal(cards.length, 6);
  const kyoto = cards.find((c) => c.id === 'Kyoto');
  assert.ok(kyoto);
  assert.ok(kyoto.img.startsWith('/images/'));
  assert.ok(kyoto.badge?.includes('Saved Offline'));
});

test('buildShrineBiomeCollapsingCards includes all 4 interactive 3D biomes', () => {
  const cards = buildShrineBiomeCollapsingCards();
  assert.deepEqual(
    cards.map((c) => c.id),
    ['kyoto_shrine', 'jigokudani', 'arashiyama', 'gion']
  );
  for (const card of cards) {
    assert.ok(card.img.startsWith('/images/'));
    assert.ok(card.ctaLabel);
  }
});

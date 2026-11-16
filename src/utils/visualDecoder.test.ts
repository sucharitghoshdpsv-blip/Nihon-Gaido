import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVisualDecoderPrompt,
  normalizeVisualDecodeMode,
  parseVisualDecodePayload,
} from './visualDecoder';

test('normalizeVisualDecodeMode validates mode and falls back to menu', () => {
  assert.equal(normalizeVisualDecodeMode('vending'), 'vending');
  assert.equal(normalizeVisualDecodeMode('shrine'), 'shrine');
  assert.equal(normalizeVisualDecodeMode('unknown'), 'menu');
});

test('buildVisualDecoderPrompt tailors instructions for allergen checks and shrine steps', () => {
  const menuPrompt = buildVisualDecoderPrompt('menu', 'Osaka');
  assert.match(menuPrompt, /dashi|allergen/i);
  assert.match(menuPrompt, /Osaka/);

  const shrinePrompt = buildVisualDecoderPrompt('shrine', 'Kyoto');
  assert.match(shrinePrompt, /temizuya|ritual/i);
});

test('parseVisualDecodePayload safely normalizes structured JSON response', () => {
  const parsed = parseVisualDecodePayload(
    JSON.stringify({
      title: 'Izakaya Yakitori Board',
      summary: 'Handwritten counter skewers and sashimi specials.',
      entries: [
        {
          originalJapanese: 'ねぎま (塩/タレ)',
          reading: 'Negima (Shio / Tare)',
          englishName: 'Chicken Thigh & Scallion Skewer',
          priceOrDetail: '¥220',
          notes: 'Choose Shio (sea salt) or Tare (sweet soy glaze).',
        },
      ],
      allergenWarnings: ['Tare glaze contains wheat and soy'],
      usageSteps: ['Point and specify number of sticks plus Shio or Tare.'],
    }),
    'menu'
  );
  assert.equal(parsed.entries.length, 1);
  assert.equal(parsed.entries[0].reading, 'Negima (Shio / Tare)');
  assert.equal(parsed.allergenWarnings[0], 'Tare glaze contains wheat and soy');
});

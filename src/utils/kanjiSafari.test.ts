import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSafariVaultSummary, matchKanjiFromText, WILD_KANJI_CATALOG } from './kanjiSafari';

test('matchKanjiFromText matches street signs by kanji, reading, or English meaning', () => {
  assert.equal(matchKanjiFromText('出口')[0]?.id, 'kanji-deguchi');
  assert.equal(matchKanjiFromText('smoking')[0]?.id, 'kanji-kinen');
  assert.equal(matchKanjiFromText('Eigyō')[0]?.id, 'kanji-eigyochu');
  assert.equal(matchKanjiFromText('').length, WILD_KANJI_CATALOG.length);
});

test('buildSafariVaultSummary formats encrypted vault record payload cleanly', () => {
  const payload = buildSafariVaultSummary([
    {
      kanjiId: 'kanji-deguchi',
      spottedAtCity: 'Tokyo',
      spottedDate: '2026-11-15',
      note: 'Shibuya Hachiko Exit',
    },
  ]);
  assert.equal(payload.docNumber, 'SAFARI-1-SIGNS');
  assert.match(payload.notes, /出口 \(Exit\) @ Tokyo/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluatePronunciationMatch,
  recordMasteredItem,
  type LearningProgressState,
} from './learning';
import { FULL_KANA_DECK, buildKanaMatrixRows } from '../data/kanaDeck';
import { KANA_LESSONS } from '../data/japanData';

test('evaluatePronunciationMatch scores exact and partial matches properly', () => {
  const exact = evaluatePronunciationMatch('ありがとうございます', 'arigatou gozaimasu', 'ありがとうございます');
  assert.equal(exact.score, 100);
  assert.equal(exact.grade, 'Excellent');

  const romaji = evaluatePronunciationMatch('すみません', 'sumimasen', 'sumimasen');
  assert.equal(romaji.score, 100);
  assert.equal(romaji.grade, 'Excellent');

  const empty = evaluatePronunciationMatch('すみません', 'sumimasen', '   ');
  assert.equal(empty.score, 0);
  assert.equal(empty.grade, 'Keep Practicing');
});

test('recordMasteredItem deduplicates items and increments XP', () => {
  const initial: LearningProgressState = {
    masteredIds: ['hira-a'],
    xp: 25,
    streakDays: 3,
    completedLessons: 0,
  };
  const dup = recordMasteredItem(initial, 'hira-a');
  assert.equal(dup.xp, 25);

  const next = recordMasteredItem(initial, 'hira-i');
  assert.equal(next.masteredIds.length, 2);
  assert.equal(next.xp, 50);
});

test('FULL_KANA_DECK provides complete 104 Hiragana and 104 Katakana characters without duplicate IDs', () => {
  assert.equal(KANA_LESSONS.length, 208);
  assert.equal(FULL_KANA_DECK.length, 208);

  const hiragana = FULL_KANA_DECK.filter((k) => k.script === 'Hiragana');
  const katakana = FULL_KANA_DECK.filter((k) => k.script === 'Katakana');
  assert.equal(hiragana.length, 104);
  assert.equal(katakana.length, 104);

  for (const list of [hiragana, katakana]) {
    assert.equal(list.filter((k) => k.group === 'basic').length, 46);
    assert.equal(list.filter((k) => k.group === 'dakuten').length, 25);
    assert.equal(list.filter((k) => k.group === 'yoon').length, 33);
    assert.equal(new Set(list.map((k) => k.char)).size, 104);
  }

  assert.equal(new Set(FULL_KANA_DECK.map((k) => k.id)).size, 208);

  const legacyIds = [
    'hira-a',
    'hira-i',
    'hira-u',
    'hira-e',
    'hira-o',
    'hira-ka',
    'hira-ki',
    'hira-sa',
    'hira-su',
    'hira-ta',
    'hira-no',
    'hira-ma',
    'kata-a',
    'kata-ka',
    'kata-ko',
    'kata-so',
    'kata-ra',
    'kata-n',
  ];
  const allIds = new Set(FULL_KANA_DECK.map((k) => k.id));
  for (const id of legacyIds) {
    assert.ok(allIds.has(id), `Expected legacy id ${id} to remain in deck`);
  }
});

test('buildKanaMatrixRows aligns Gojūon vowel columns accurately with null spacers', () => {
  const hiraBasic = buildKanaMatrixRows('Hiragana', 'basic');
  assert.equal(hiraBasic.length, 11);

  const yRow = hiraBasic.find((r) => r.rowKey === 'y');
  assert.ok(yRow);
  assert.deepEqual(
    yRow.cells.map((c) => c?.char ?? null),
    ['や', null, 'ゆ', null, 'よ']
  );

  const wRow = hiraBasic.find((r) => r.rowKey === 'w');
  assert.ok(wRow);
  assert.deepEqual(
    wRow.cells.map((c) => c?.char ?? null),
    ['わ', null, null, null, 'を']
  );

  const nRow = hiraBasic.find((r) => r.rowKey === 'n_only');
  assert.ok(nRow);
  assert.deepEqual(
    nRow.cells.map((c) => c?.char ?? null),
    ['ん', null, null, null, null]
  );

  const kataYoon = buildKanaMatrixRows('Katakana', 'yoon');
  assert.equal(kataYoon.length, 11);
  assert.deepEqual(
    kataYoon[0]?.cells.map((c) => c?.char ?? null),
    ['キャ', 'キュ', 'キョ']
  );
});

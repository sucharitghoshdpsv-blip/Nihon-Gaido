import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluatePronunciationMatch,
  recordMasteredItem,
  type LearningProgressState,
} from './learning';

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

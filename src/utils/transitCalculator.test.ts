import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareRailPassVsSingle,
  computeLastTrainCountdown,
  estimateTransitLeg,
  LAST_TRAIN_SCHEDULES,
  reorderStops,
  summarizeDayTransit,
} from './transitCalculator';

test('estimateTransitLeg computes realistic station transfer time and Suica IC fare between Shibuya Crossing and Yanaka Ginza', () => {
  const leg = estimateTransitLeg(
    { name: 'Shibuya Crossing', area: 'Shibuya' },
    { name: 'Yanaka Ginza', area: 'Yanaka' }
  );
  assert.equal(leg.fromStation, 'Shibuya Sta.');
  assert.equal(leg.toStation, 'Nippori Sta.');
  assert.equal(leg.lineName, 'JR Yamanote Line');
  assert.ok(leg.railMinutes >= 18 && leg.railMinutes <= 40);
  assert.ok(leg.icFareJpy >= 170 && leg.icFareJpy <= 350);
});

test('summarizeDayTransit aggregates rail, walk, and IC card totals across ordered stops', () => {
  const summary = summarizeDayTransit([
    { name: 'Meiji Jingu Forest', area: 'Harajuku' },
    { name: 'Shibuya Crossing', area: 'Shibuya' },
    { name: 'Tsukiji Outer Market', area: 'Tsukiji' },
  ]);
  assert.equal(summary.legs.length, 2);
  assert.equal(summary.totalTransitMinutes, summary.totalRailMinutes + summary.totalWalkMinutes);
  assert.ok(summary.totalIcFareJpy > 0);
});

test('reorderStops swaps spots cleanly without mutating original array', () => {
  const initial = ['A', 'B', 'C'];
  const moved = reorderStops(initial, 0, 2);
  assert.deepEqual(moved, ['B', 'C', 'A']);
  assert.deepEqual(initial, ['A', 'B', 'C']);
});

test('compareRailPassVsSingle accurately evaluates 7-day JR Pass vs single tickets', () => {
  // Tokyo -> Kyoto -> Nara -> Osaka one way is under ¥50,000, so point-to-point wins
  const oneWay = compareRailPassVsSingle(['tyo-kyo', 'kyo-nar', 'nar-osa'], 'jr-7', false);
  assert.equal(oneWay.recommendPass, false);
  assert.equal(oneWay.pointToPointTotalJpy, 15470);

  // Round-trip Tokyo <-> Kyoto + Kanazawa + Hiroshima exceeds ¥50,000, so 7-Day Pass saves money
  const heavyLoop = compareRailPassVsSingle(['tyo-kyo', 'kyo-kan', 'kan-tyo', 'tyo-hir'], 'jr-7', false);
  assert.equal(heavyLoop.recommendPass, true);
  assert.ok(heavyLoop.savingsWithPassJpy > 0);
});

test('computeLastTrainCountdown tracks pre-midnight urgency, missed state after last train, and 22:00+ taxi surcharge', () => {
  const gion = LAST_TRAIN_SCHEDULES.find((s) => s.id === 'kyo-gion')!;
  const hurry = computeLastTrainCountdown(gion, 23, 25, 0);
  assert.equal(hurry.urgency, 'hurry');
  assert.equal(hurry.minutesRemaining, 30);
  assert.equal(hurry.lateNightTaxiJpy, Math.round(gion.taxiFallbackBaseJpy * 1.2));

  const missed = computeLastTrainCountdown(gion, 0, 15, 0);
  assert.equal(missed.urgency, 'missed');
  assert.equal(missed.minutesRemaining, 0);
});

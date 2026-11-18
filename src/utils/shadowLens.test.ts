import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSpotlightMaskGradient,
  clampPointerNormalized,
  computeDepthLayerOffsets,
  dampValue,
  evaluateRevealedLandmarks,
  getCityShadowPalette,
} from './shadowLens';
import { CITY_GUIDES } from '../data/japanData';

test('clampPointerNormalized clamps outside coordinates into normalized [0..1] bounds', () => {
  const rect = { left: 100, top: 50, width: 800, height: 400 };
  const inside = clampPointerNormalized(500, 250, rect);
  assert.equal(inside.nx, 0.5);
  assert.equal(inside.ny, 0.5);
  assert.equal(inside.px, 400);
  assert.equal(inside.py, 200);

  const clampedLow = clampPointerNormalized(0, 0, rect);
  assert.equal(clampedLow.nx, 0);
  assert.equal(clampedLow.ny, 0);
  assert.equal(clampedLow.px, 0);
  assert.equal(clampedLow.py, 0);

  const clampedHigh = clampPointerNormalized(2000, 1200, rect);
  assert.equal(clampedHigh.nx, 1);
  assert.equal(clampedHigh.ny, 1);
  assert.equal(clampedHigh.px, 800);
  assert.equal(clampedHigh.py, 400);
});

test('dampValue smoothly converges toward target and snaps within sub-pixel threshold', () => {
  const step1 = dampValue(0, 100, 10, 0.016);
  assert.ok(step1 > 10 && step1 < 25);

  const step2 = dampValue(step1, 100, 10, 0.016);
  assert.ok(step2 > step1 && step2 < 100);

  const snapped = dampValue(99.98, 100, 10, 0.016);
  assert.equal(snapped, 100);
});

test('computeDepthLayerOffsets preserves progressive foreground > typography > backdrop velocity', () => {
  const center = computeDepthLayerOffsets(0.5, 0.5);
  assert.equal(center.backdropX, 0);
  assert.equal(center.typographyX, 0);
  assert.equal(center.foregroundX, 0);

  const shifted = computeDepthLayerOffsets(1, 0.25);
  assert.ok(Math.abs(shifted.foregroundX) > Math.abs(shifted.typographyX));
  assert.ok(Math.abs(shifted.typographyX) > Math.abs(shifted.backdropX));
  assert.ok(Math.abs(shifted.backdropX) > Math.abs(shifted.moonX));
});

test('evaluateRevealedLandmarks sorts nearest hotspot and scales reveal visibility by spotlight distance', () => {
  const tokyo = CITY_GUIDES.find((c) => c.id === 'Tokyo')!;
  // Meiji Jingu Forest is at (28%, 35%) => on 1000x500 canvas that is (280, 175)
  const revealed = evaluateRevealedLandmarks(tokyo.landmarks, 280, 175, 1000, 500, 155, false);
  assert.equal(revealed[0].landmark.id, 'tyo-1');
  assert.equal(revealed[0].visibility, 1);

  const farLandmark = revealed[revealed.length - 1];
  assert.ok(farLandmark.visibility < 0.5);

  const full = evaluateRevealedLandmarks(tokyo.landmarks, 0, 0, 1000, 500, 155, true);
  assert.ok(full.every((entry) => entry.visibility === 1));
});

test('buildSpotlightMaskGradient formats valid radial-gradient CSS mask strings', () => {
  const beam = buildSpotlightMaskGradient(312.4, 184.7, 155, false);
  assert.ok(beam.includes('circle 155px at 312px 185px'));
  assert.ok(beam.includes('rgba(0,0,0,0) 155px'));

  const full = buildSpotlightMaskGradient(312.4, 184.7, 155, true);
  assert.ok(full.includes('rgba(0,0,0,1) 100%'));
});

test('getCityShadowPalette returns distinct Kanji badges for all 6 cities', () => {
  const kanjiMarks = CITY_GUIDES.map((c) => getCityShadowPalette(c.id).kanjiMark);
  assert.equal(new Set(kanjiMarks).size, 6);
});

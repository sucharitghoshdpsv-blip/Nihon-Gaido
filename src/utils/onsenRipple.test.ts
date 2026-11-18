import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_ONSEN_RIPPLES,
  ONSEN_POOL_RADIUS,
  ONSEN_RIPPLE_LIFETIME_SEC,
  createInitialRippleSlots,
  evaluateRippleDisplacement,
  hasActiveRipples,
  spawnWaterRipple,
} from './onsenRipple';

test('initial ripple slots start inactive', () => {
  const slots = createInitialRippleSlots();
  assert.equal(slots.length, MAX_ONSEN_RIPPLES);
  assert.equal(hasActiveRipples(slots, 2.0), false);
  assert.equal(evaluateRippleDisplacement(slots, 0, 0, 2.0), 0);
});

test('spawnWaterRipple clamps click position inside pool radius and activates ripple', () => {
  const init = createInitialRippleSlots();
  const { slots, slotIndex } = spawnWaterRipple(init, 10, 0, 5.0, 1.0);
  assert.equal(slotIndex, 0);
  assert.ok(slots[0].x <= ONSEN_POOL_RADIUS);
  assert.equal(hasActiveRipples(slots, 5.2), true);
  assert.equal(hasActiveRipples(slots, 5.0 + ONSEN_RIPPLE_LIFETIME_SEC + 0.2), false);
});

test('spawnWaterRipple recycles oldest slot after MAX_ONSEN_RIPPLES overlapping clicks', () => {
  let slots = createInitialRippleSlots();
  for (let i = 0; i < MAX_ONSEN_RIPPLES; i++) {
    slots = spawnWaterRipple(slots, i * 0.4, 0, 10 + i * 0.2, 1.0).slots;
  }
  const extra = spawnWaterRipple(slots, -1.5, 1.2, 11.4, 1.2);
  assert.equal(extra.slotIndex, 0);
  assert.ok(Math.abs(extra.slots[0].x - -1.5) < 0.001);
});

test('evaluateRippleDisplacement propagates outward over time and decays smoothly', () => {
  const { slots } = spawnWaterRipple(createInitialRippleSlots(), 0, 0, 1.0, 1.0);
  // Immediately after click (age = 0.05s), displacement near center is stronger than far rim
  const nearEarly = Math.abs(evaluateRippleDisplacement(slots, 0.2, 0, 1.05));
  const farEarly = Math.abs(evaluateRippleDisplacement(slots, 3.6, 0, 1.05));
  assert.ok(nearEarly > farEarly);

  // After full lifetime expires, displacement returns to zero
  const expired = evaluateRippleDisplacement(slots, 0.2, 0, 1.0 + ONSEN_RIPPLE_LIFETIME_SEC + 0.1);
  assert.equal(expired, 0);
});

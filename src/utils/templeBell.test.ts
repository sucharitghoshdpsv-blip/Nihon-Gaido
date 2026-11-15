import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBellShakeOffset,
  createInitialBellPhysicsState,
  stepBellPhysics,
  triggerBellStrike,
} from './templeBell';

test('triggerBellStrike activates bell swing impulse, striker motion, ring wave, and subtle shake trauma', () => {
  const initial = createInitialBellPhysicsState();
  const struck = triggerBellStrike(initial);

  assert.ok(struck.bellVelocity > 0);
  assert.ok(struck.strikerAngle < 0);
  assert.ok(struck.ringWave > 0);
  assert.ok(struck.trauma > 0.4 && struck.trauma <= 1);
});

test('stepBellPhysics swings bell, produces subtle non-zero shake during decay, and settles back to rest', () => {
  let state = triggerBellStrike(createInitialBellPhysicsState());
  const mid = stepBellPhysics(state, 0.04);

  assert.ok(Math.abs(mid.bellAngle) > 0);
  const shake = computeBellShakeOffset(mid);
  assert.ok(Math.abs(shake.offsetX) > 0 || Math.abs(shake.offsetY) > 0);

  // Advance 5 seconds of simulation time
  state = mid;
  for (let i = 0; i < 150; i++) {
    state = stepBellPhysics(state, 0.04);
  }

  assert.equal(state.trauma, 0);
  assert.equal(state.ringWave, -1);
  assert.ok(Math.abs(state.bellAngle) < 0.02);

  const settledShake = computeBellShakeOffset(state);
  assert.equal(settledShake.offsetX, 0);
  assert.equal(settledShake.offsetY, 0);
  assert.equal(settledShake.rollRad, 0);
});

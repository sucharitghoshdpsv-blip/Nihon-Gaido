import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SHISHI_REST_ANGLE,
  SHISHI_TIP_ANGLE,
  createInitialShishiOdoshiState,
  stepShishiOdoshiAndWind,
  triggerWindAndShishiOdoshi,
} from './biomeMechanics';

test('Shishi-odoshi cycle completes rock, emits exactly one stone strike, and resets cleanly', () => {
  let state = triggerWindAndShishiOdoshi(createInitialShishiOdoshiState());
  assert.equal(state.gustStrength, 1.0);
  assert.equal(state.isTipping, true);

  let strikes = 0;
  let sawForwardTip = false;
  for (let i = 0; i < 45; i++) {
    const step = stepShishiOdoshiAndWind(state, 0.04);
    state = step.state;
    if (step.didStrikeStone) strikes += 1;
    if (state.rockAngle > SHISHI_TIP_ANGLE * 0.7) sawForwardTip = true;
  }

  assert.equal(strikes, 1, 'Shishi-odoshi must strike the stone anvil once per cycle');
  assert.equal(sawForwardTip, true, 'Shishi-odoshi must swing forward before rebounding');
  assert.equal(state.knockCount, 1);
  assert.equal(state.isTipping, false);
  assert.ok(Math.abs(state.rockAngle - SHISHI_REST_ANGLE) < 0.08);
});

test('Bamboo wind gust strength settles smoothly back toward calm baseline', () => {
  let state = triggerWindAndShishiOdoshi(createInitialShishiOdoshiState());
  for (let i = 0; i < 60; i++) {
    state = stepShishiOdoshiAndWind(state, 0.05).state;
  }
  assert.ok(state.gustStrength < 0.35 && state.gustStrength >= 0.16);
});

export interface TempleBellPhysicsState {
  bellAngle: number;
  bellVelocity: number;
  strikerAngle: number;
  strikerVelocity: number;
  ringWave: number; // 0..1 active expanding ripple, -1 when idle
  trauma: number; // 0..1 screen-shake intensity
  elapsed: number;
}

export interface TempleBellShakeOffset {
  offsetX: number;
  offsetY: number;
  rollRad: number;
}

export function createInitialBellPhysicsState(): TempleBellPhysicsState {
  return {
    bellAngle: 0,
    bellVelocity: 0,
    strikerAngle: 0,
    strikerVelocity: 0,
    ringWave: -1,
    trauma: 0,
    elapsed: 0,
  };
}

/**
 * Triggers a wooden shumoku strike against the Bonsho bronze bell,
 * initiating pendulum sway, an expanding golden resonance wave, and subtle screen shake trauma.
 */
export function triggerBellStrike(
  state: TempleBellPhysicsState
): TempleBellPhysicsState {
  return {
    ...state,
    bellVelocity: state.bellVelocity + 0.95,
    strikerAngle: -0.34,
    strikerVelocity: 4.8,
    ringWave: 0.001,
    trauma: Math.min(1, Math.max(state.trauma, 0.52)),
  };
}

/**
 * Advances bell pendulum spring, wooden striker return swing, resonance ring wave,
 * and trauma-squared screen shake cleanly with capped delta time.
 */
export function stepBellPhysics(
  state: TempleBellPhysicsState,
  rawDt: number
): TempleBellPhysicsState {
  const dt = Math.min(0.05, Math.max(0.001, rawDt));
  const elapsed = state.elapsed + dt;

  // Damped spring pendulum for heavy bronze bell
  const bellStiffness = 14.0;
  const bellDamping = 1.65;
  const bellAccel = -bellStiffness * state.bellAngle - bellDamping * state.bellVelocity;
  const bellVelocity = state.bellVelocity + bellAccel * dt;
  const bellAngle = state.bellAngle + bellVelocity * dt;

  // Slightly faster spring for suspended wooden striker beam
  const strikerStiffness = 22.0;
  const strikerDamping = 3.6;
  const strikerAccel =
    -strikerStiffness * state.strikerAngle - strikerDamping * state.strikerVelocity;
  const strikerVelocity = state.strikerVelocity + strikerAccel * dt;
  const strikerAngle = state.strikerAngle + strikerVelocity * dt;

  // Expanding acoustic shockwave progress (0..1 over ~1.4s)
  let ringWave = state.ringWave;
  if (ringWave >= 0) {
    ringWave += dt * 0.72;
    if (ringWave >= 1) {
      ringWave = -1;
    }
  }

  // Smooth exponential decay on subtle screen-shake trauma
  const trauma = Math.max(0, state.trauma - dt * 0.85);

  return {
    bellAngle,
    bellVelocity,
    strikerAngle,
    strikerVelocity,
    ringWave,
    trauma,
    elapsed,
  };
}

/**
 * Computes subtle rotational & translational camera shake from squared trauma.
 * Writes directly into a target object when provided to stay zero-allocation in rAF.
 */
export function computeBellShakeOffset(
  state: TempleBellPhysicsState,
  out?: TempleBellShakeOffset
): TempleBellShakeOffset {
  const target = out ?? { offsetX: 0, offsetY: 0, rollRad: 0 };
  if (state.trauma <= 0.0005) {
    target.offsetX = 0;
    target.offsetY = 0;
    target.rollRad = 0;
    return target;
  }

  const intensity = state.trauma * state.trauma;
  const t = state.elapsed;
  target.offsetX = Math.sin(t * 42.0) * 0.095 * intensity;
  target.offsetY = Math.cos(t * 36.0) * 0.075 * intensity;
  target.rollRad = Math.sin(t * 29.0) * 0.012 * intensity;
  return target;
}

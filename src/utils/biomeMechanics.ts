export interface ShishiOdoshiState {
  fillProgress: number; // 0..1 water accumulation before tipping
  rockAngle: number; // radians: resting (-0.28) to tipped down (+0.48)
  isTipping: boolean;
  tipTimer: number; // 0..1 animation progress during knock & rebound
  strikeEmitted: boolean;
  gustStrength: number; // 0..1 decaying bamboo breeze intensity
  knockCount: number;
}

export const SHISHI_REST_ANGLE = -0.26;
export const SHISHI_TIP_ANGLE = 0.46;

export function createInitialShishiOdoshiState(): ShishiOdoshiState {
  return {
    fillProgress: 0.35,
    rockAngle: SHISHI_REST_ANGLE,
    isTipping: false,
    tipTimer: 0,
    strikeEmitted: false,
    gustStrength: 0.22,
    knockCount: 0,
  };
}

/**
 * Triggers an immediate bamboo wind gust + Shishi-odoshi rock cycle if currently resting.
 */
export function triggerWindAndShishiOdoshi(state: ShishiOdoshiState): ShishiOdoshiState {
  return {
    ...state,
    gustStrength: 1.0,
    isTipping: true,
    tipTimer: state.isTipping ? state.tipTimer : 0,
    strikeEmitted: state.isTipping ? state.strikeEmitted : false,
    fillProgress: 0,
  };
}

/**
 * Advances the Shishi-odoshi water accumulation, tipping rock curve, hollow stone strike trigger,
 * and decaying bamboo breeze envelope cleanly with capped delta time.
 */
export function stepShishiOdoshiAndWind(
  state: ShishiOdoshiState,
  rawDt: number
): { state: ShishiOdoshiState; didStrikeStone: boolean } {
  const dt = Math.min(0.05, Math.max(0.001, rawDt));
  const gustStrength = Math.max(0.16, state.gustStrength - dt * 0.32);

  if (!state.isTipping) {
    const nextFill = state.fillProgress + dt * 0.16; // fills over ~6.2 seconds naturally
    if (nextFill >= 1.0) {
      return {
        state: {
          ...state,
          fillProgress: 0,
          isTipping: true,
          tipTimer: 0,
          strikeEmitted: false,
          rockAngle: SHISHI_REST_ANGLE,
          gustStrength,
        },
        didStrikeStone: false,
      };
    }
    // Slight gradual lean forward as bamboo fills with spring water
    const preloadAngle = SHISHI_REST_ANGLE + nextFill * 0.12;
    return {
      state: {
        ...state,
        fillProgress: nextFill,
        rockAngle: preloadAngle,
        gustStrength,
      },
      didStrikeStone: false,
    };
  }

  // Tipping + rebounding rock animation over ~1.45 seconds
  const nextTimer = state.tipTimer + dt * 0.72;
  let rockAngle = SHISHI_REST_ANGLE;
  let didStrikeStone = false;
  let strikeEmitted = state.strikeEmitted;
  let knockCount = state.knockCount;

  if (nextTimer < 0.35) {
    // Tips forward rapidly to pour water into stone basin
    const t = nextTimer / 0.35;
    const easeIn = t * t;
    rockAngle = SHISHI_REST_ANGLE + (SHISHI_TIP_ANGLE - SHISHI_REST_ANGLE) * easeIn;
  } else if (nextTimer < 0.68) {
    // Rebounds back smoothly after emptying water and strikes the stone anvil at t ≈ 0.68!
    const t = (nextTimer - 0.35) / 0.33;
    rockAngle = SHISHI_TIP_ANGLE + (SHISHI_REST_ANGLE - 0.04 - SHISHI_TIP_ANGLE) * (t * t);
  } else {
    if (!strikeEmitted) {
      didStrikeStone = true;
      strikeEmitted = true;
      knockCount += 1;
    }
    // Subtle post-knock dampened bounce at rest angle
    const settleT = Math.min(1, (nextTimer - 0.68) / 0.32);
    const bounce = Math.sin(settleT * Math.PI * 2.0) * 0.055 * (1 - settleT);
    rockAngle = SHISHI_REST_ANGLE + bounce;
  }

  if (nextTimer >= 1.0) {
    return {
      state: {
        fillProgress: 0,
        rockAngle: SHISHI_REST_ANGLE,
        isTipping: false,
        tipTimer: 0,
        strikeEmitted: false,
        gustStrength,
        knockCount,
      },
      didStrikeStone,
    };
  }

  return {
    state: {
      ...state,
      rockAngle,
      tipTimer: nextTimer,
      strikeEmitted,
      gustStrength,
      knockCount,
    },
    didStrikeStone,
  };
}

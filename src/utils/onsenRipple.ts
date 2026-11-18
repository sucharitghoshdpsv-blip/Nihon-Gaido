export const MAX_ONSEN_RIPPLES = 6;
export const ONSEN_RIPPLE_LIFETIME_SEC = 4.6;
export const ONSEN_POOL_RADIUS = 4.9;

export interface OnsenRippleSlot {
  x: number;
  z: number;
  startTime: number;
  amplitude: number;
}

export function createInitialRippleSlots(): OnsenRippleSlot[] {
  return Array.from({ length: MAX_ONSEN_RIPPLES }, () => ({
    x: 0,
    z: 0,
    startTime: -100,
    amplitude: 0,
  }));
}

/**
 * Clamps ripple coordinates safely inside the hot spring water basin and recycles
 * the oldest or already-expired ripple slot with zero heap allocations on existing slots.
 */
export function spawnWaterRipple(
  slots: OnsenRippleSlot[],
  worldX: number,
  worldZ: number,
  nowSec: number,
  amplitude = 1.0
): { slots: OnsenRippleSlot[]; slotIndex: number } {
  const maxR = ONSEN_POOL_RADIUS - 0.35;
  const dist = Math.hypot(worldX, worldZ);
  const clampedX = dist > maxR && dist > 0.0001 ? (worldX / dist) * maxR : worldX;
  const clampedZ = dist > maxR && dist > 0.0001 ? (worldZ / dist) * maxR : worldZ;

  let chosenIndex = 0;
  let oldestStart = Number.POSITIVE_INFINITY;

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const age = nowSec - slot.startTime;
    if (slot.startTime < -50 || age >= ONSEN_RIPPLE_LIFETIME_SEC) {
      chosenIndex = i;
      break;
    }
    if (slot.startTime < oldestStart) {
      oldestStart = slot.startTime;
      chosenIndex = i;
    }
  }

  const nextSlots = slots.map((slot, idx) =>
    idx === chosenIndex
      ? {
          x: clampedX,
          z: clampedZ,
          startTime: nowSec,
          amplitude: Math.max(0.25, Math.min(1.6, amplitude)),
        }
      : slot
  );

  return { slots: nextSlots, slotIndex: chosenIndex };
}

export function hasActiveRipples(slots: OnsenRippleSlot[], nowSec: number): boolean {
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (slot.startTime >= -50) {
      const age = nowSec - slot.startTime;
      if (age >= 0 && age < ONSEN_RIPPLE_LIFETIME_SEC) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Pure TypeScript analytical mirror of the concentric radial packet wave GLSL math,
 * used for unit testing wave propagation speed, attenuation, and decay.
 */
export function evaluateRippleDisplacement(
  slots: OnsenRippleSlot[],
  x: number,
  z: number,
  nowSec: number
): number {
  let height = 0;
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (slot.startTime < -50) continue;
    const age = nowSec - slot.startTime;
    if (age < 0 || age >= ONSEN_RIPPLE_LIFETIME_SEC) continue;

    const dist = Math.hypot(x - slot.x, z - slot.z);
    const waveFront = age * 2.4;
    const ringDelta = dist - waveFront;
    const radialEnvelope = Math.exp(-dist * 0.36);
    const timeDecay = Math.exp(-age * 0.85);
    const packet = Math.exp(-(ringDelta * ringDelta) * 0.8);
    height +=
      Math.sin(dist * 7.5 - age * 11.5) * 0.085 * slot.amplitude * radialEnvelope * timeDecay * packet;
  }
  return height;
}

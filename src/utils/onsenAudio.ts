/**
 * Procedural Web Audio synthesizer producing a soothing, warm Japanese onsen
 * water droplet & gentle mineral ripple shimmer when clicking the hot spring pool.
 */
let onsenAudioCtx: AudioContext | null = null;

function getOnsenAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;

  if (!onsenAudioCtx) {
    onsenAudioCtx = new AudioCtor();
  }
  if (onsenAudioCtx.state === 'suspended') {
    void onsenAudioCtx.resume().catch(() => {});
  }
  return onsenAudioCtx;
}

export function playOnsenRippleSound(): boolean {
  try {
    const ctx = getOnsenAudioContext();
    if (!ctx) return false;

    const now = ctx.currentTime;

    // 1. Soft upward-chirped water droplet bloop
    const dropOsc = ctx.createOscillator();
    const dropGain = ctx.createGain();
    dropOsc.type = 'sine';
    dropOsc.frequency.setValueAtTime(340, now);
    dropOsc.frequency.exponentialRampToValueAtTime(760, now + 0.09);

    dropGain.gain.setValueAtTime(0.0001, now);
    dropGain.gain.linearRampToValueAtTime(0.14, now + 0.014);
    dropGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.24);

    dropOsc.connect(dropGain);
    dropGain.connect(ctx.destination);
    dropOsc.start(now);
    dropOsc.stop(now + 0.28);

    // 2. Delicate harmonic shimmer tail
    const shimmerOsc = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmerOsc.type = 'sine';
    shimmerOsc.frequency.setValueAtTime(640, now + 0.045);
    shimmerOsc.frequency.exponentialRampToValueAtTime(1020, now + 0.14);

    shimmerGain.gain.setValueAtTime(0.0001, now + 0.04);
    shimmerGain.gain.linearRampToValueAtTime(0.065, now + 0.065);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0004, now + 0.36);

    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmerOsc.start(now + 0.04);
    shimmerOsc.stop(now + 0.4);

    return true;
  } catch {
    return false;
  }
}

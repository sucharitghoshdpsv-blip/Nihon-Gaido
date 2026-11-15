/**
 * Procedural Web Audio synthesizer producing a subtle, warm Japanese Bonsho
 * bronze temple bell toll + soft cedar shumoku mallet transient.
 * Zero external audio assets required.
 */
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;

  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtor();
  }
  if (sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function playTempleBellChime(): boolean {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(0.24, now + 0.025);
    master.gain.exponentialRampToValueAtTime(0.0008, now + 3.4);

    // Subtle lowpass softens bronze brightness into a warm meditative resonance
    const warmthFilter = ctx.createBiquadFilter();
    warmthFilter.type = 'lowpass';
    warmthFilter.frequency.setValueAtTime(1600, now);
    warmthFilter.frequency.exponentialRampToValueAtTime(420, now + 2.8);

    master.connect(warmthFilter);
    warmthFilter.connect(ctx.destination);

    // Authentic Bonsho bronze partials (warmer beating pair around ~196Hz + overtones)
    const partials: Array<{ freq: number; gain: number; decay: number; type: OscillatorType }> = [
      { freq: 196.0, gain: 0.55, decay: 3.3, type: 'sine' },
      { freq: 198.2, gain: 0.35, decay: 3.1, type: 'sine' }, // gentle slow bronze shimmer beat
      { freq: 392.0, gain: 0.28, decay: 2.2, type: 'sine' },
      { freq: 466.16, gain: 0.16, decay: 1.8, type: 'triangle' },
      { freq: 659.25, gain: 0.11, decay: 1.2, type: 'sine' },
    ];

    for (const p of partials) {
      const osc = ctx.createOscillator();
      const pGain = ctx.createGain();
      osc.type = p.type;
      osc.frequency.setValueAtTime(p.freq, now);

      pGain.gain.setValueAtTime(0.0001, now);
      pGain.gain.linearRampToValueAtTime(p.gain, now + 0.015);
      pGain.gain.exponentialRampToValueAtTime(0.0005, now + p.decay);

      osc.connect(pGain);
      pGain.connect(master);

      osc.start(now);
      osc.stop(now + p.decay + 0.05);
    }

    // Soft wooden mallet (shumoku) strike thud
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(118, now);
    thudOsc.frequency.exponentialRampToValueAtTime(54, now + 0.09);
    thudGain.gain.setValueAtTime(0.28, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudOsc.start(now);
    thudOsc.stop(now + 0.13);

    return true;
  } catch {
    return false;
  }
}

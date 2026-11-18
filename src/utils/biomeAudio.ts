/**
 * Procedural Web Audio synthesizers for:
 * 1) Arashiyama Bamboo Grove: wind rustle through bamboo leaves + hollow bamboo Shishi-odoshi knock
 * 2) Gion Historic Tea House District: layered evening river murmur, gentle geta sandal clacks,
 *    and soft shamisen pentatonic plucks drifting from behind sliding shoji screens.
 */

let sharedCtx: AudioContext | null = null;

function getBiomeAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!sharedCtx) {
    sharedCtx = new AudioCtor();
  }
  if (sharedCtx.state === 'suspended') {
    void sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

function createNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    // Slight pink-ish smoothing so wind & river sound organic rather than harsh static
    last = (last + 0.08 * white) / 1.08;
    data[i] = last * 2.6;
  }
  return buffer;
}

/**
 * Hollow resonant bamboo tube knock ("kon!") against wet garden stone.
 */
export function playShishiOdoshiKnock(): boolean {
  try {
    const ctx = getBiomeAudioContext();
    if (!ctx) return false;
    const now = ctx.currentTime;

    // Hollow cylindrical air cavity fundamental (~295Hz -> 240Hz pitch settle)
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(305, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(228, now + 0.14);

    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.linearRampToValueAtTime(0.32, now + 0.008);
    bodyGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.26);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(380, now);
    filter.Q.setValueAtTime(3.2, now);

    bodyOsc.connect(filter);
    filter.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.28);

    // Crisp dry bamboo skin overtone click (~780Hz)
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(790, now);
    clickOsc.frequency.exponentialRampToValueAtTime(520, now + 0.055);
    clickGain.gain.setValueAtTime(0.18, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.075);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.085);

    return true;
  } catch {
    return false;
  }
}

/**
 * Gentle breezy swell of bamboo foliage rustling overhead.
 */
export function playBambooWindRustle(): boolean {
  try {
    const ctx = getBiomeAudioContext();
    if (!ctx) return false;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, 2.2);

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(820, now);
    bandpass.frequency.linearRampToValueAtTime(1450, now + 0.75);
    bandpass.frequency.linearRampToValueAtTime(640, now + 2.1);
    bandpass.Q.setValueAtTime(1.4, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 2.15);

    src.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + 2.2);

    return true;
  } catch {
    return false;
  }
}

export interface GionAudioController {
  start: () => boolean;
  stop: () => void;
  triggerGetaStep: () => void;
  isPlaying: () => boolean;
}

/**
 * Layered twilight ambient generator for Gion district:
 *  - Soft distant Shirakawa canal water murmur
 *  - Occasional gentle twin cedar geta sandal clacks ("karan-koron") on stone
 *  - Warm pentatonic shamisen plucks filtered gently as if behind paper shoji screens
 */
export function createGionAudioLayer(): GionAudioController {
  let active = false;
  let riverSource: AudioBufferSourceNode | null = null;
  let riverGain: GainNode | null = null;
  let loopTimer: number | null = null;

  const triggerGetaStep = () => {
    try {
      const ctx = getBiomeAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      // Characteristic two-tooth wooden geta "ka-ran" dual tap
      const offsets = [0, 0.19];
      offsets.forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(idx === 0 ? 740 : 620, now + offset);
        osc.frequency.exponentialRampToValueAtTime(idx === 0 ? 410 : 350, now + offset + 0.045);
        g.gain.setValueAtTime(0.0001, now + offset);
        g.gain.linearRampToValueAtTime(0.08, now + offset + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0005, now + offset + 0.075);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.085);
      });
    } catch {
      // Ignore if audio locked
    }
  };

  const pluckShamisenNote = (freq: number) => {
    try {
      const ctx = getBiomeAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const lpf = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(freq * 0.5, now);

      // Muffled shoji screen warmth filter
      lpf.type = 'lowpass';
      lpf.frequency.setValueAtTime(1450, now);
      lpf.frequency.exponentialRampToValueAtTime(480, now + 0.65);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.075, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.85);

      osc.connect(lpf);
      sub.connect(lpf);
      lpf.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      sub.start(now);
      osc.stop(now + 0.9);
      sub.stop(now + 0.9);
    } catch {
      // Ignore
    }
  };

  // Classic Miyako-bushi / In-sen scale frequencies (D4, Eb4, G4, A4, C5, D5)
  const scale = [293.66, 311.13, 392.0, 440.0, 523.25, 587.33];
  let stepIndex = 0;

  const stop = () => {
    active = false;
    if (loopTimer !== null) {
      window.clearInterval(loopTimer);
      loopTimer = null;
    }
    try {
      riverSource?.stop();
      riverSource?.disconnect();
      riverGain?.disconnect();
    } catch {
      // Already stopped
    }
    riverSource = null;
    riverGain = null;
  };

  const start = (): boolean => {
    try {
      const ctx = getBiomeAudioContext();
      if (!ctx) return false;
      stop();
      active = true;

      const src = ctx.createBufferSource();
      src.buffer = createNoiseBuffer(ctx, 3.5);
      src.loop = true;

      const lpf = ctx.createBiquadFilter();
      lpf.type = 'bandpass';
      lpf.frequency.setValueAtTime(420, ctx.currentTime);
      lpf.Q.setValueAtTime(0.85, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.075, ctx.currentTime + 0.8);

      src.connect(lpf);
      lpf.connect(gain);
      gain.connect(ctx.destination);
      src.start(ctx.currentTime);

      riverSource = src;
      riverGain = gain;

      // Play immediate gentle welcome pluck & geta cadence
      pluckShamisenNote(scale[0]);
      window.setTimeout(() => {
        if (active) triggerGetaStep();
      }, 420);

      loopTimer = window.setInterval(() => {
        if (!active) return;
        const note = scale[(stepIndex * 2 + (stepIndex % 3)) % scale.length];
        pluckShamisenNote(note);
        if (stepIndex % 3 === 1) {
          window.setTimeout(() => {
            if (active) triggerGetaStep();
          }, 520);
        }
        stepIndex += 1;
      }, 1550);

      return true;
    } catch {
      active = false;
      return false;
    }
  };

  return {
    start,
    stop,
    triggerGetaStep,
    isPlaying: () => active,
  };
}

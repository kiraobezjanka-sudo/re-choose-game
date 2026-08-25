const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class HorrorAudio {
  constructor() {
    this.supported = Boolean(AudioContextClass);
    this.enabled = true;
    this.context = null;
    this.master = null;
    this.ambient = null;
    this.tensionOscillator = null;
    this.noiseBuffer = null;
    this.state = "idle";
    this.ending = null;
    this.updateDocumentState();
  }

  ensureContext() {
    if (!this.supported || this.context) return this.context;

    const context = new AudioContextClass();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.008;
    compressor.release.value = 0.28;

    this.master = context.createGain();
    this.master.gain.value = this.enabled ? 0.58 : 0;
    this.master.connect(compressor);
    compressor.connect(context.destination);

    this.ambient = context.createGain();
    this.ambient.gain.value = 0;
    this.ambient.connect(this.master);

    this.context = context;
    this.noiseBuffer = this.createNoiseBuffer(2.4);
    this.createAmbientLayer();
    this.updateDocumentState();
    return context;
  }

  createNoiseBuffer(seconds) {
    const length = Math.floor(this.context.sampleRate * seconds);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 173;

    for (let index = 0; index < length; index += 1) {
      seed = (seed * 16807) % 2147483647;
      data[index] = ((seed / 2147483647) * 2 - 1) * 0.72;
    }

    return buffer;
  }

  createAmbientLayer() {
    const context = this.context;

    const droneFilter = context.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 190;
    droneFilter.Q.value = 1.6;
    droneFilter.connect(this.ambient);

    const lowDrone = context.createOscillator();
    lowDrone.type = "sawtooth";
    lowDrone.frequency.value = 36.71;
    const lowGain = context.createGain();
    lowGain.gain.value = 0.055;
    lowDrone.connect(lowGain).connect(droneFilter);

    const beatingDrone = context.createOscillator();
    beatingDrone.type = "triangle";
    beatingDrone.frequency.value = 38.2;
    const beatingGain = context.createGain();
    beatingGain.gain.value = 0.045;
    beatingDrone.connect(beatingGain).connect(droneFilter);

    const tensionFilter = context.createBiquadFilter();
    tensionFilter.type = "bandpass";
    tensionFilter.frequency.value = 440;
    tensionFilter.Q.value = 5.5;
    tensionFilter.connect(this.ambient);

    const tension = context.createOscillator();
    tension.type = "sine";
    tension.frequency.value = 146.83;
    tension.detune.value = 17;
    const tensionGain = context.createGain();
    tensionGain.gain.value = 0.012;
    tension.connect(tensionGain).connect(tensionFilter);
    this.tensionOscillator = tension;

    const ventilation = context.createBufferSource();
    ventilation.buffer = this.noiseBuffer;
    ventilation.loop = true;
    const ventilationFilter = context.createBiquadFilter();
    ventilationFilter.type = "lowpass";
    ventilationFilter.frequency.value = 245;
    ventilationFilter.Q.value = 0.75;
    const ventilationGain = context.createGain();
    ventilationGain.gain.value = 0.034;
    ventilation.connect(ventilationFilter).connect(ventilationGain).connect(this.ambient);

    const pulse = context.createOscillator();
    pulse.type = "sine";
    pulse.frequency.value = 0.075;
    const pulseDepth = context.createGain();
    pulseDepth.gain.value = 0.018;
    pulse.connect(pulseDepth);
    pulseDepth.connect(lowGain.gain);

    const drift = context.createOscillator();
    drift.type = "sine";
    drift.frequency.value = 0.031;
    const driftDepth = context.createGain();
    driftDepth.gain.value = 32;
    drift.connect(driftDepth);
    driftDepth.connect(tensionFilter.frequency);

    const now = context.currentTime;
    [lowDrone, beatingDrone, tension, ventilation, pulse, drift].forEach((node) => node.start(now));
  }

  start() {
    const context = this.ensureContext();
    if (!context) return false;
    if (context.state === "suspended") context.resume().catch(() => {});
    this.applyState();
    this.updateDocumentState();
    return true;
  }

  playClick() {
    if (!this.enabled) return;
    const context = this.ensureContext();
    if (!context) return;
    if (context.state === "suspended") context.resume().catch(() => {});

    const now = context.currentTime;
    const tone = context.createOscillator();
    tone.type = "square";
    tone.frequency.setValueAtTime(178, now);
    tone.frequency.exponentialRampToValueAtTime(68, now + 0.055);

    const toneGain = context.createGain();
    toneGain.gain.setValueAtTime(0.0001, now);
    toneGain.gain.exponentialRampToValueAtTime(0.075, now + 0.004);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.072);
    tone.connect(toneGain).connect(this.master);

    const noise = context.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 1280;
    noiseFilter.Q.value = 1.1;
    const noiseGain = context.createGain();
    noiseGain.gain.setValueAtTime(0.045, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);
    noise.connect(noiseFilter).connect(noiseGain).connect(this.master);

    tone.start(now);
    tone.stop(now + 0.08);
    noise.start(now);
    noise.stop(now + 0.045);
  }

  setGameState(state, ending = null) {
    this.state = state;
    this.ending = ending;
    if (this.context) this.applyState();
  }

  applyState() {
    if (!this.context || !this.ambient) return;
    const now = this.context.currentTime;
    const levels = { idle: 0, running: 0.82, paused: 0.1, finished: 0.52 };
    let level = levels[this.state] ?? 0.5;
    if (this.ending === "escape") level = 0.9;
    if (!this.enabled) level = 0;

    this.ambient.gain.cancelScheduledValues(now);
    this.ambient.gain.setValueAtTime(this.ambient.gain.value, now);
    this.ambient.gain.linearRampToValueAtTime(level, now + 0.45);

    if (this.tensionOscillator) {
      const endingPitch = this.ending === "escape" ? 155.56 : this.ending === "secret" ? 138.59 : 146.83;
      this.tensionOscillator.frequency.cancelScheduledValues(now);
      this.tensionOscillator.frequency.linearRampToValueAtTime(endingPitch, now + 0.8);
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) this.start();
    if (this.context && this.master) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(this.enabled ? 0.58 : 0, now + 0.08);
    }
    this.applyState();
    this.updateDocumentState();
    return this.enabled;
  }

  updateDocumentState() {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.audio = !this.supported
      ? "unsupported"
      : this.enabled
        ? this.context?.state ?? "armed"
        : "muted";
  }

  snapshot() {
    return {
      supported: this.supported,
      enabled: this.enabled,
      contextState: this.context?.state ?? "not-created",
      gameState: this.state,
      ending: this.ending,
      ambientLevel: this.ambient ? clamp(this.ambient.gain.value, 0, 1) : 0,
    };
  }
}

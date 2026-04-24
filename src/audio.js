// Synthesized audio layer — pure Web Audio API, no binary assets.
// Gives the sim an automotive cockpit feel: drone pad + telemetry pings,
// engine hum driven by ego speed, brake squeal, collision thud, pass chime,
// alert beeps, weather ambience (rain).
//
// Browsers block autoplay, so the AudioContext can only be unlocked by a
// user gesture (any pointerdown). App.jsx wires a one-shot listener.

class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.volume = 0.32;
    this.ready = false;

    this.ambientNodes = null;
    this.engineNodes = null;
    this.rainNodes = null;
    this._pingTimer = null;
    this._footstepTimer = null;
  }

  async init() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return; // non-browser
    this.ctx = new AC();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? this.volume : 0;
    this.master.connect(this.ctx.destination);
    this.startAmbient();
    this.ready = true;
  }

  setEnabled(b) {
    this.enabled = b;
    if (!this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(b ? this.volume : 0, t, 0.1);
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.enabled) {
      const t = this.ctx.currentTime;
      this.master.gain.setTargetAtTime(this.volume, t, 0.05);
    }
  }

  // --- Ambient automotive pad + telemetry pings (always on once ready) ---
  startAmbient() {
    if (!this.ctx || this.ambientNodes) return;
    const { ctx, master } = this;
    const bus = ctx.createGain();
    bus.gain.value = 0.28;
    bus.connect(master);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 620;
    lp.Q.value = 0.8;
    lp.connect(bus);

    // A-minor drone: A2, C3, E3, A3 with slow gain LFOs for "breathing".
    const notes = [110, 130.81, 164.81, 220];
    const oscs = notes.map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? "sawtooth" : "triangle";
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = 0.22 / notes.length;

      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.07 + i * 0.04;
      const lfoAmt = ctx.createGain();
      lfoAmt.gain.value = 0.14 / notes.length;
      lfo.connect(lfoAmt);
      lfoAmt.connect(og.gain);

      o.connect(og);
      og.connect(lp);
      o.start();
      lfo.start();
      return { o, lfo };
    });

    const schedulePing = () => {
      if (!this.ambientNodes) return;
      if (this.enabled) this._ping(520 + Math.random() * 700, 0.035);
      this._pingTimer = setTimeout(schedulePing, 9000 + Math.random() * 11000);
    };
    this._pingTimer = setTimeout(schedulePing, 5000);

    this.ambientNodes = { bus, lp, oscs };
  }

  _ping(freq = 880, gain = 0.04) {
    if (!this.ctx) return;
    const { ctx, master } = this;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 1.3);
  }

  // --- Engine hum (speed-modulated) ---
  startEngine() {
    if (!this.ctx || this.engineNodes) return;
    const { ctx, master } = this;
    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.connect(master);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 320;
    lp.Q.value = 0.6;
    lp.connect(bus);

    const saw = ctx.createOscillator();
    saw.type = "sawtooth";
    saw.frequency.value = 55;
    saw.connect(lp);
    saw.start();

    const sub = ctx.createOscillator();
    sub.type = "triangle";
    sub.frequency.value = 28;
    const subG = ctx.createGain();
    subG.gain.value = 0.55;
    sub.connect(subG);
    subG.connect(lp);
    sub.start();

    this.engineNodes = { bus, lp, saw, sub };
  }

  updateEngine(speedMs) {
    if (!this.engineNodes) return;
    const { bus, lp, saw, sub } = this.engineNodes;
    const t = this.ctx.currentTime;
    const s = Math.max(0, Math.min(18, speedMs));
    const targetFreq = 48 + s * 7.2;         // 48 – 178 Hz
    const targetGain = Math.min(0.14, 0.018 + s * 0.0085);
    const targetCutoff = 260 + s * 45;
    saw.frequency.setTargetAtTime(targetFreq, t, 0.18);
    sub.frequency.setTargetAtTime(targetFreq / 2, t, 0.18);
    bus.gain.setTargetAtTime(targetGain, t, 0.18);
    lp.frequency.setTargetAtTime(targetCutoff, t, 0.18);
  }

  stopEngine() {
    if (!this.engineNodes) return;
    const { bus, saw, sub } = this.engineNodes;
    const t = this.ctx.currentTime;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setTargetAtTime(0, t, 0.2);
    const oscs = [saw, sub];
    this.engineNodes = null;
    setTimeout(() => oscs.forEach((o) => { try { o.stop(); } catch {} }), 700);
  }

  // --- One-shot event sounds ---
  ignition() {
    if (!this.ctx || !this.enabled) return;
    const { ctx, master } = this;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    const t = ctx.currentTime;
    o.frequency.setValueAtTime(40, t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.45);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 400;
    o.connect(lp); lp.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.75);
  }

  brakeSqueal() {
    if (!this.ctx || !this.enabled) return;
    const { ctx, master } = this;
    const n = this._noise(0.7);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 3400;
    bp.Q.value = 9;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    n.connect(bp); bp.connect(g); g.connect(master);
    n.start(t); n.stop(t + 0.6);
  }

  collision() {
    if (!this.ctx || !this.enabled) return;
    const { ctx, master } = this;
    const t = ctx.currentTime;

    // Low-frequency impact
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.45);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.38, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    o.connect(og); og.connect(master);
    o.start(t); o.stop(t + 0.65);

    // Debris noise
    const n = this._noise(0.55);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1700;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.28, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    n.connect(lp); lp.connect(ng); ng.connect(master);
    n.start(t); n.stop(t + 0.55);
  }

  alertBeep(level = "warn") {
    if (!this.ctx || !this.enabled) return;
    const { ctx, master } = this;
    const freq = level === "fail" ? 1400 : level === "pass" ? 1000 : 880;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = freq;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.22);
  }

  passChime() {
    if (!this.ctx || !this.enabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => setTimeout(() => this._ping(f, 0.065), i * 130));
  }

  failBuzzer() {
    if (!this.ctx || !this.enabled) return;
    const { ctx, master } = this;
    [220, 196].forEach((f, i) => {
      setTimeout(() => {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = f;
        const g = ctx.createGain();
        const t = ctx.currentTime;
        g.gain.setValueAtTime(0.11, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + 0.4);
      }, i * 380);
    });
  }

  footstep() {
    if (!this.ctx || !this.enabled) return;
    const { ctx, master } = this;
    const n = this._noise(0.12);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 190;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.035, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    n.connect(lp); lp.connect(g); g.connect(master);
    n.start(t); n.stop(t + 0.1);
  }

  click() {
    if (!this.ctx || !this.enabled) return;
    const { ctx, master } = this;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = 1200;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.04, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.06);
  }

  // --- Weather beds ---
  startRain() {
    if (!this.ctx || this.rainNodes) return;
    const { ctx, master } = this;
    const n = this._noise(4, true);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = 800;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 1400; bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.value = 0;
    n.connect(hp); hp.connect(bp); bp.connect(g); g.connect(master);
    n.start();
    const t = ctx.currentTime;
    g.gain.setTargetAtTime(0.08, t, 0.4);
    this.rainNodes = { n, g };
  }

  stopRain() {
    if (!this.rainNodes) return;
    const { n, g } = this.rainNodes;
    const t = this.ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setTargetAtTime(0, t, 0.3);
    this.rainNodes = null;
    setTimeout(() => { try { n.stop(); } catch {} }, 900);
  }

  _noise(seconds = 0.8, loop = false) {
    const { ctx } = this;
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = loop;
    return src;
  }
}

export const audio = new AudioManager();

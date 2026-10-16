// صوت بسيط بـ WebAudio (من غير ملفات)
export class Sfx {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.engine = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(this.ctx.destination);

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    osc.connect(lp);
    lp.connect(gain);
    gain.connect(this.master);
    osc.start();
    this.engine = { osc, gain, lp };
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) this.engineOff();
  }

  engineOff() {
    if (this.engine) this.engine.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }

  updateEngine(v, vmax, throttle) {
    if (!this.ctx || !this.engine) return;
    const t = this.ctx.currentTime;
    const r = Math.min(1, v / vmax);
    this.engine.osc.frequency.setTargetAtTime(48 + r * 120 + throttle * 14, t, 0.08);
    this.engine.lp.frequency.setTargetAtTime(300 + r * 500, t, 0.1);
    this.engine.gain.gain.setTargetAtTime(this.enabled ? 0.035 + 0.03 * throttle : 0, t, 0.08);
  }

  _tone(freq, dur, type = 'square', vol = 0.15, when = 0, slideTo = null) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  horn() {
    this._tone(420, 0.32, 'square', 0.12);
    this._tone(530, 0.32, 'square', 0.1);
  }

  crash() {
    if (!this.ctx || !this.enabled) return;
    const len = this.ctx.sampleRate * 0.35;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = 0.5;
    src.connect(g);
    g.connect(this.master);
    src.start();
    this._tone(90, 0.3, 'sawtooth', 0.2, 0, 40);
  }

  coin() {
    this._tone(880, 0.1, 'triangle', 0.18);
    this._tone(1320, 0.18, 'triangle', 0.18, 0.09);
  }

  pickup() {
    this._tone(660, 0.1, 'triangle', 0.16);
    this._tone(880, 0.14, 'triangle', 0.16, 0.1);
  }

  fine() {
    this._tone(300, 0.18, 'sawtooth', 0.14);
    this._tone(200, 0.28, 'sawtooth', 0.14, 0.16);
  }

  tick() {
    this._tone(1000, 0.05, 'square', 0.06);
  }
}

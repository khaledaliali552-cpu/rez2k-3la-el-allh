// الراديو: أغانى mp3 من فولدر audio + إيقاع شعبى متولّد بالكود
const GEN = { title: '🎹 إيقاع شعبى (متولّد بالكود)', gen: true };

export class Radio {
  constructor(settings) {
    this.settings = settings;
    this.tracks = [GEN];
    this.idx = -1; // -1 = مقفول
    this.playing = false;
    this.audio = null;
    this.ctx = null;
    this.timer = null;
    this.onChange = null;
    this.loaded = this._loadManifest();
  }

  async _loadManifest() {
    try {
      const r = await fetch('audio/playlist.json', { cache: 'no-cache' });
      if (!r.ok) return;
      const list = await r.json();
      if (Array.isArray(list)) {
        const mp3 = list.filter((t) => t && t.file).map((t) => ({ title: '🎵 ' + (t.title || t.file), file: t.file }));
        this.tracks = [...mp3, GEN];
      }
    } catch (e) {
      /* مفيش playlist، هنكمل بالإيقاع المتولّد */
    }
  }

  get current() {
    return this.idx >= 0 ? this.tracks[this.idx] : null;
  }

  get volume() {
    return this.settings.radioVol;
  }

  setVolume(v) {
    this.settings.radioVol = v;
    if (this.audio) this.audio.volume = v;
    if (this.master) this.master.gain.value = v * 0.9;
  }

  // لازم تتنده من ضغطة مستخدم (قيود المتصفح)
  async start(index) {
    await this.loaded;
    this.stop(true);
    this.idx = index == null ? Math.max(0, Math.min(this.settings.radioTrack || 0, this.tracks.length - 1)) : index;
    const t = this.current;
    this.settings.radioTrack = this.idx;
    this.settings.radio = true;
    if (t.gen) this._startGen();
    else this._startFile(t);
    this.playing = true;
    this.onChange && this.onChange();
  }

  stop(silent) {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.master) this.master.gain.value = 0;
    this.playing = false;
    if (!silent) {
      this.idx = -1;
      this.settings.radio = false;
      this.onChange && this.onChange();
    }
  }

  // الضغطة على زرار الراديو: التراك اللى بعده، وبعد آخر واحد يقفل
  async cycle() {
    await this.loaded;
    if (this.idx < 0) return this.start(0);
    if (this.idx >= this.tracks.length - 1) return this.stop();
    return this.start(this.idx + 1);
  }

  async next() {
    await this.loaded;
    return this.start(this.idx < 0 ? 0 : (this.idx + 1) % this.tracks.length);
  }

  pauseForGame() {
    if (this.audio) this.audio.pause();
    if (this.master) this.master.gain.value = 0;
  }

  resumeForGame() {
    if (!this.playing) return;
    if (this.audio) this.audio.play().catch(() => {});
    if (this.master) this.master.gain.value = this.volume * 0.9;
  }

  _startFile(t) {
    const a = new Audio('audio/' + encodeURIComponent(t.file));
    a.volume = this.volume;
    a.onended = () => this.next();
    a.onerror = () => {
      // ملف مش موجود: كمّل على اللى بعده
      if (this.tracks.length > 1) this.next();
    };
    a.play().catch(() => {});
    this.audio = a;
  }

  // ---------- الإيقاع المتولّد (مقسوم 8/4 شعبى بمقام حجاز) ----------
  _startGen() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.master.gain.value = this.volume * 0.9;
    this.step = 0;
    this.nextT = this.ctx.currentTime + 0.1;
    this.bpm = 108;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this._schedule(), 30);
  }

  _schedule() {
    const c = this.ctx;
    const stepDur = 60 / this.bpm / 4;
    while (this.nextT < c.currentTime + 0.15) {
      this._playStep(this.step, this.nextT);
      this.nextT += stepDur;
      this.step = (this.step + 1) % 32;
    }
  }

  _env(node, t, a, d, peak) {
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(peak, t + a);
    node.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  _kick(t) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    this._env(g, t, 0.005, 0.22, 0.9);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.3);
  }

  _noiseHit(t, freq, dur, vol, type = 'bandpass') {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = c.createGain();
    this._env(g, t, 0.002, dur, vol);
    s.connect(f);
    f.connect(g);
    g.connect(this.master);
    s.start(t);
    s.stop(t + dur + 0.05);
  }

  _tone(t, freq, dur, vol, type = 'sawtooth', cutoff = 2200) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = c.createGain();
    this._env(g, t, 0.01, dur, vol);
    o.connect(f);
    f.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  _playStep(i, t) {
    const k = i % 16;
    // دُم (كيك) وتَك وكلاب
    if ([0, 3, 8, 11].includes(k)) this._kick(t);
    if ([4, 12].includes(k)) this._noiseHit(t, 1800, 0.14, 0.5); // كلاب/سناير
    if ([6, 7, 14, 15].includes(k)) this._noiseHit(t, 5200, 0.05, 0.25, 'highpass'); // تَك
    if (k % 2 === 0) this._noiseHit(t, 8500, 0.03, 0.12, 'highpass'); // هاى هات
    // لحن بمقام حجاز على ر: ر، مي♭، فا#، صول، لا، سي♭، دو#
    const D = 146.83;
    const R = [1, 1.0595 ** 1, 1.0595 ** 4, 1.0595 ** 5, 1.0595 ** 7, 1.0595 ** 8, 1.0595 ** 11, 2];
    const lead1 = [3, -1, 4, -1, 3, 2, 1, 0, 3, -1, 4, 5, 4, 3, 2, 1];
    const lead2 = [0, -1, 2, 3, 4, -1, 3, 2, 1, 2, 3, -1, 2, 1, 0, -1];
    const phrase = Math.floor(i / 16) % 2 ? lead2 : lead1;
    const n = phrase[k];
    if (n >= 0) this._tone(t, D * 2 * R[n], 0.28, 0.16, 'sawtooth', 1800);
    // بيز
    if ([0, 3, 8, 11].includes(k)) this._tone(t, D / 2 * (k >= 8 ? R[3] : 1), 0.3, 0.3, 'triangle', 500);
  }
}

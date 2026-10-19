// الراديو: أغانى mp3 من فولدر audio + إيقاع شعبى متولّد بالكود
// أغانى متولّدة بالكود (ألحان وإيقاعات من تأليفى، مفيش أى أغنية حقيقية)
// الإيقاعات: 16 خطوة. x = ضربة، . = سكوت. اللحن بيتولد من النغمات المسموحة (scale) بنفس البذرة فى كل مرة.
const HIJAZ = [0, 1, 4, 5, 7, 8, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const PENTA_MIN = [0, 3, 5, 7, 10];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const PENTA_MAJ = [0, 2, 4, 7, 9];
const KURD = [0, 1, 3, 5, 7, 8, 10];
const STYLES = [
  { title: '🎹 إيقاع شعبى (حجاز)', bpm: 108, root: 146.83, scale: HIJAZ, seed: 11, wave: 'sawtooth', cut: 1800, vol: 0.16, len: 2.2,
    kick: 'x..x....x..x....', snare: '....x.......x...', tak: '......xx......xx', hat: 'x.x.x.x.x.x.x.x.', bass: '0..2....0..3....', dens: 0.7 },
  { title: '🔥 مهرجان الكورنيش', bpm: 128, root: 130.81, scale: PENTA_MIN, seed: 23, wave: 'square', cut: 2600, vol: 0.12, len: 1.2,
    kick: 'x..x..x.x..x..x.', snare: '....x.......x..x', tak: 'x.x.x.x.x.x.x.xx', hat: '..x...x...x...x.', bass: '0..0..2.0..0..3.', dens: 0.6 },
  { title: '🌅 حنين على البحر', bpm: 76, root: 164.81, scale: MINOR, seed: 5, wave: 'triangle', cut: 1400, vol: 0.2, len: 3.5, pad: true,
    kick: 'x.......x.......', snare: '........x.......', tak: '', hat: 'x...x...x...x...', bass: '0.......3.......', dens: 0.5 },
  { title: '🎻 سهرة إسكندرانى', bpm: 96, root: 146.83, scale: HIJAZ, seed: 37, wave: 'sawtooth', cut: 2200, vol: 0.14, len: 2.6,
    kick: 'x..x..x.x.......', snare: '....x.......x...', tak: '..x...x...x...x.', hat: 'x.x.x.x.x.x.x.x.', bass: '0..0..2.3..2....', dens: 0.8 },
  { title: '☀️ صباحية رايقة', bpm: 92, root: 196.0, scale: PENTA_MAJ, seed: 8, wave: 'triangle', cut: 2800, vol: 0.2, len: 2.5, pad: true,
    kick: 'x...x...x...x...', snare: '....x.......x...', tak: '', hat: 'x.x.x.x.x.x.x.x.', bass: '0...2...3...2...', dens: 0.65 },
  { title: '🌙 ليل رايق (لوفاى)', bpm: 68, root: 110.0, scale: MINOR, seed: 51, wave: 'sine', cut: 1200, vol: 0.24, len: 3.8, pad: true,
    kick: 'x.....x.x.......', snare: '........x.......', tak: '', hat: '..x...x...x...x.', bass: '0.....2.3.......', dens: 0.45 },
  { title: '🏁 سباق على الجسر', bpm: 150, root: 146.83, scale: KURD, seed: 64, wave: 'sawtooth', cut: 3200, vol: 0.12, len: 1.4,
    kick: 'x...x...x...x..x', snare: '....x.......x...', tak: 'x.x.x.x.x.x.x.x.', hat: 'xxxxxxxxxxxxxxxx', bass: '0.0.0.0.2.2.3.3.', dens: 0.85 },
  { title: '🥁 دُبكة وطرب', bpm: 120, root: 155.56, scale: HIJAZ, seed: 77, wave: 'square', cut: 2000, vol: 0.1, len: 1.8,
    kick: 'x.....x.x...x...', snare: '..x...x...x...x.', tak: '.x...x...x...x..', hat: 'x.x.x.x.x.x.x.x.', bass: '0.....2.0...3...', dens: 0.75 },
  { title: '🌴 ساحل وصيف', bpm: 104, root: 174.61, scale: MAJOR, seed: 91, wave: 'triangle', cut: 3000, vol: 0.2, len: 2.0,
    kick: 'x..x..x...x...x.', snare: '....x.......x...', tak: '..x.....x.......', hat: 'x.x.x.x.x.x.x.x.', bass: '0..3..4...3.....', dens: 0.7 },
  { title: '🚖 تاكسى بعد نص الليل', bpm: 84, root: 123.47, scale: KURD, seed: 103, wave: 'sawtooth', cut: 1500, vol: 0.14, len: 3.0, pad: true,
    kick: 'x..x....x.......', snare: '....x.......x...', tak: '......x.......x.', hat: 'x.x.x.x.x.x.x.x.', bass: '0..0....2.......', dens: 0.55 },
];
const GENS = STYLES.map((st) => ({ title: st.title + ' · متولّدة', gen: true, style: st }));

function rngFor(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// لحن من جملتين (32 خطوة): مقطع A يتكرر بتنويع، وبعده مقطع B ثم A
function makeMelody(st) {
  const r = rngFor(st.seed);
  const n = st.scale.length;
  const motif = (len, start) => {
    const out = [];
    let d = start;
    for (let i = 0; i < len; i++) {
      if (r() > st.dens) { out.push(-1); continue; }
      d = Math.max(0, Math.min(n + 2, d + Math.round((r() - 0.5) * 4)));
      out.push(d);
    }
    return out;
  };
  const A = motif(8, Math.floor(n / 2));
  const B = motif(8, Math.floor(n / 2) + 1);
  const A2 = A.map((x, i) => (i === 7 && x >= 0 ? Math.max(0, x - 1) : x));
  return [...A, ...A2, ...B, ...A];
}


export class Radio {
  constructor(settings) {
    this.settings = settings;
    this.tracks = [...GENS];
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
        this.tracks = [...mp3, ...GENS];
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
    if (t.gen) this._startGen(t.style);
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
  _startGen(style) {
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
    this.style = style || STYLES[0];
    this.bpm = this.style.bpm;
    this.mel = makeMelody(this.style);
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
    const st = this.style;
    const k = i % 16;
    const on = (pat) => pat && pat[k] === 'x';
    const swing = st.bpm < 100 ? 0.012 * (k % 2) : 0;
    t += swing;
    if (on(st.kick)) this._kick(t);
    if (on(st.snare)) this._noiseHit(t, 1800, 0.14, 0.5);
    if (on(st.tak)) this._noiseHit(t, 5200, 0.05, 0.25, 'highpass');
    if (on(st.hat)) this._noiseHit(t, 8500, 0.03, 0.12, 'highpass');
    const sc = st.scale;
    const freq = (deg, oct) => st.root * oct * 2 ** ((sc[deg % sc.length] + 12 * Math.floor(deg / sc.length)) / 12);
    const dur = (60 / st.bpm / 4) * st.len;
    const n = this.mel[i % 32];
    if (n >= 0) this._tone(t, freq(n, 2), dur, st.vol, st.wave, st.cut);
    const b = st.bass[k];
    if (b && b !== '.') this._tone(t, freq(+b, 0.5), dur * 1.4, 0.3, 'triangle', 500);
    if (st.pad && (k === 0 || k === 8)) {
      const base = Math.floor(i / 8) % 2 ? 3 : 0;
      for (const d of [0, 2, 4]) this._tone(t, freq(base + d, 1), dur * 7, 0.07, 'sine', 900);
    }
  }
}

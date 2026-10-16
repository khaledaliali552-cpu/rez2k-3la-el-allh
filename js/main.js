// الملف الرئيسى: بيربط العالم والعربية والركاب والواجهة
import * as THREE from '../vendor/three.module.min.js';
import { World, cx, radarS, radarLimit } from './world.js';
import { PlayerCar } from './car.js';
import { Traffic } from './traffic.js';
import { Rides } from './rides.js';
import { Input } from './input.js';
import { Sfx } from './sfx.js';
import { UI } from './ui.js';
import * as Save from './save.js';
import {
  QUEST_POOL, ACHIEVEMENTS, SHIFT_SECONDS, RADAR_FINE, THEME_ORDER,
  getCar, getColor, pick, clamp, fmtMoney, fmtTime,
} from './data.js';

const IS_TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const newShift = () => ({
  t: SHIFT_SECONDS, fares: 0, tips: 0, fines: 0, rides: 0, perfect: 0, crashes: 0, radarOk: 0, km: 0, bestTip: 0, over: false,
});

class Game {
  constructor() {
    this.state = Save.load();
    this.canvas = document.getElementById('gl');
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: !IS_TOUCH, powerPreference: 'high-performance' });
    } catch (e) {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div class="screen"><div class="panel"><h2>المتصفح مش دعّام WebGL</h2><p>جرّب متصفح تانى أو حدّث المتصفح.</p></div></div>',
      );
      throw e;
    }
    this.pr = Math.min(window.devicePixelRatio || 1, IS_TOUCH ? 1.5 : 1.75);
    this.renderer.setPixelRatio(this.pr);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.3, 720);
    this.world = new World(this.scene);
    this.player = new PlayerCar(this.scene);
    this.traffic = new Traffic(this.scene);
    this.rides = new Rides(this.scene);
    this.input = new Input();
    this.sfx = new Sfx();
    this.ui = new UI(this);

    this.mode = 'menu';
    this.previewId = this.state.selected;
    this.shift = newShift();
    this.questDone = new Set();
    this.nextRadar = 0;
    this.shake = 0;
    this.camAngle = 0.6;
    this.crashCd = 0;
    this.frames = [];
    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.camReady = false;

    this.input.onPause = () => (this.mode === 'playing' ? this.pause() : this.mode === 'paused' ? this.resume() : null);
    this.input.onHorn = () => this.horn();
    this.input.bindHold(document.getElementById('t-left'), 'left');
    this.input.bindHold(document.getElementById('t-right'), 'right');
    this.input.bindHold(document.getElementById('t-gas'), 'gas');
    this.input.bindHold(document.getElementById('t-brake'), 'brake');
    document.getElementById('t-horn').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.horn();
    });

    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'playing') this.pause();
    });

    this.sfx.setEnabled(this.state.settings.sound);
    this.ensureQuests();
    this.resize();
    this.enterPreview();
    this.ui.renderMenu();
    this.ui.show('menu');

    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));

    // للاختبار والتصحيح من الكونسول
    window.__game = this;
  }

  // ---------- أدوات ----------
  get theme() {
    return THEME_ORDER[(this.state.day - 1) % THEME_ORDER.length];
  }

  save() {
    Save.save(this.state);
  }

  carColor(id) {
    const car = getCar(id);
    if (car.rented) return 0xf2b21b;
    return getColor(this.state.colors[id] || 'white').hex;
  }

  setPlayerCar(id) {
    const car = getCar(id);
    this.player.setSpec(car, this.carColor(id));
  }

  resize() {
    this._vo = null;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(this.pr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  vibrate(ms) {
    if (this.state.settings.vibrate && navigator.vibrate) navigator.vibrate(ms);
  }

  horn() {
    this.sfx.init();
    this.sfx.horn();
  }

  ensureQuests() {
    const q = this.state.quests;
    if (q.day === this.state.day && q.ids.length) return;
    const pool = [...QUEST_POOL];
    const ids = [];
    while (ids.length < 3 && pool.length) ids.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id);
    this.state.quests = { day: this.state.day, ids };
    this.save();
  }

  questView() {
    const s = this.shift;
    return this.state.quests.ids
      .map((id) => QUEST_POOL.find((q) => q.id === id))
      .filter(Boolean)
      .map((q) => {
        const progress = Math.min(q.target, Math.floor(q.calc(s)));
        return { id: q.id, text: q.text, reward: q.reward, target: q.target, progress, done: progress >= q.target };
      });
  }

  // ---------- الوضع الاستعراضى (قائمة / جراج) ----------
  enterPreview() {
    this.mode = this.mode === 'garage' ? 'garage' : 'menu';
    this.world.setTheme(this.theme);
    this.world.reset(this.state.day * 131 + 7);
    this.player.reset(40, 8.7);
    this.setPlayerCar(this.previewId);
    this.player.reset(40, 8.7);
    this.traffic.reset(40);
    this.rides.reset();
    this.input.enabled = false;
    this.camReady = false;
    this.ui.showHud(false, false);
    this.sfx.engineOff();
  }

  backToMenu() {
    this.mode = 'menu';
    this.previewId = this.state.selected;
    this.enterPreview();
    this.ui.renderMenu();
    this.ui.show('menu');
  }

  openGarage() {
    this.mode = 'garage';
    this.previewId = this.state.selected;
    this.enterPreview();
    this.mode = 'garage';
    this.ui.renderGarage();
    this.ui.show('garage');
  }

  openQuests() {
    this.ensureQuests();
    this.shift = this.mode === 'playing' ? this.shift : newShift();
    this.ui.renderQuests();
    this.ui.show('quests');
  }

  openSettings() {
    this.ui.renderSettings();
    this.ui.show('settings');
  }

  previewCar(id) {
    this.previewId = id;
    this.setPlayerCar(id);
    this.player.reset(40, 8.7);
    this.ui.renderGarage();
  }

  buyCar(id) {
    const car = getCar(id);
    const st = this.state;
    if (st.owned.includes(id) || st.money < car.price) return;
    st.money -= car.price;
    st.owned.push(id);
    st.selected = id;
    st.colors[id] = st.colors[id] || 'white';
    this.previewId = id;
    this.setPlayerCar(id);
    this.player.reset(40, 8.7);
    this.sfx.init();
    this.sfx.coin();
    this.ui.toast(`🎉 مبروك! بقيت صاحب ${car.name}`, 'gold');
    this.checkAchievements(true);
    this.save();
    this.ui.renderGarage();
  }

  selectCar(id) {
    if (!this.state.owned.includes(id)) return;
    this.state.selected = id;
    this.previewId = id;
    this.save();
    this.ui.renderGarage();
  }

  setColor(carId, colorId) {
    this.state.colors[carId] = colorId;
    this.save();
    if (this.previewId === carId) {
      this.setPlayerCar(carId);
      this.player.reset(40, 8.7);
    }
    this.ui.renderGarage();
  }

  setSetting(key, val) {
    this.state.settings[key] = val;
    if (key === 'sound') this.sfx.setEnabled(val);
    this.save();
  }

  toggleSound() {
    this.setSetting('sound', !this.state.settings.sound);
    this.ui.setSoundLabel(this.state.settings.sound);
  }

  resetProgress() {
    if (!window.confirm('هتمسح كل التقدم والفلوس والعربيات. متأكد؟')) return;
    this.state = Save.reset();
    this.previewId = 'boss_taxi';
    this.ensureQuests();
    this.sfx.setEnabled(this.state.settings.sound);
    this.enterPreview();
    this.ui.renderMenu();
    this.ui.show('menu');
  }

  // ---------- الوردية ----------
  onStartClick() {
    this.sfx.init();
    if (!this.state.tutorialDone) this.ui.show('tutorial');
    else this.startShift();
  }

  tutorialGo() {
    this.state.tutorialDone = true;
    this.save();
    this.startShift();
  }

  startShift() {
    this.sfx.init();
    this.ensureQuests();
    const st = this.state;
    if (!st.owned.includes(st.selected)) st.selected = 'boss_taxi';
    this.world.setTheme(this.theme);
    this.world.reset(st.day * 131 + 7);
    this.setPlayerCar(st.selected);
    this.player.reset(0, 5.4);
    this.traffic.reset(0);
    this.rides.reset();
    this.shift = newShift();
    this.questDone = new Set();
    this.nextRadar = 0;
    this.shake = 0;
    this.camReady = false;
    this.mode = 'playing';
    this.input.clear();
    this.input.enabled = true;
    this.ui.clearToasts();
    this.ui.hideAll();
    this.ui.showHud(true, IS_TOUCH);
    this.ui.setDay(st.day);
    this.ui.setSoundLabel(st.settings.sound);
    const car = getCar(st.selected);
    this.ui.toast(car.rented ? `🚖 ${car.name}. الوردية بدأت!` : `🚗 ${car.name}. الوردية بدأت!`, 'gold');
  }

  pause() {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    this.input.clear();
    this.input.enabled = true; // عشان Esc يكمّل
    this.sfx.engineOff();
    this.ui.setSoundLabel(this.state.settings.sound);
    this.ui.show('pause');
  }

  resume() {
    if (this.mode !== 'paused') return;
    this.mode = 'playing';
    this.input.clear();
    this.ui.hideAll();
    this.last = performance.now();
  }

  endShiftEarly() {
    if (this.mode !== 'paused') return;
    if (!window.confirm('تنهى الوردية دلوقتى؟ الحساب بيتخصم عادى.')) return;
    this.endShift();
  }

  checkQuestToasts() {
    for (const q of this.questView()) {
      if (q.done && !this.questDone.has(q.id)) {
        this.questDone.add(q.id);
        this.ui.toast(`✅ مهمة خلصت: ${q.text}`, 'gold');
        this.sfx.coin();
      }
    }
  }

  checkAchievements(silent) {
    const st = this.state;
    const got = [];
    for (const a of ACHIEVEMENTS) {
      if (!st.ach[a.id] && a.check(st)) {
        st.ach[a.id] = true;
        st.money += a.reward;
        got.push(a);
        if (!silent) this.ui.toast(`🏅 إنجاز جديد: ${a.text} (+${a.reward} ج)`, 'gold');
      }
    }
    if (silent && got.length) this.ui.toast(`🏅 إنجاز جديد: ${got[0].text} (+${got[0].reward} ج)`, 'gold');
    return got;
  }

  endShift() {
    if (this.mode === 'summary') return;
    const st = this.state;
    const s = this.shift;
    const car = getCar(st.selected);
    this.mode = 'summary';
    this.input.clear();
    this.input.enabled = false;
    this.sfx.engineOff();
    this.ui.clearToasts();
    this.ui.showHud(false, false);
    this.ui.setHint(null);
    this.ui.setLimit(null);

    const gross = s.fares + s.tips;
    const qres = this.questView();
    const questReward = qres.filter((q) => q.done).reduce((a, q) => a + q.reward, 0);
    const fee = car.rented ? car.fee : 0;
    const repair = Math.round(this.player.damage * car.repair);

    st.stats.rides += s.rides;
    st.stats.perfect += s.perfect;
    st.stats.km += s.km;
    st.stats.earned += gross;
    st.stats.tips += s.tips;
    st.stats.fines += s.fines;
    st.stats.crashes += s.crashes;
    st.stats.bestTip = Math.max(st.stats.bestTip, s.bestTip);
    st.stats.shifts += 1;

    const before = st.money;
    st.money += gross + questReward - fee - s.fines - repair;
    const ach = this.checkAchievements(true);
    const achReward = ach.reduce((a, x) => a + x.reward, 0);
    const net = st.money - before;
    st.day += 1;
    this.ensureQuests();
    this.save();

    const rows = [{ label: 'ركاب وصّلتهم', value: String(s.rides) }, { label: 'الأجرة', value: '+' + fmtMoney(s.fares), cls: 'pos' }];
    if (s.tips) rows.push({ label: 'البقشيش', value: '+' + fmtMoney(s.tips), cls: 'pos' });
    if (questReward) rows.push({ label: 'مكافآت المهام', value: '+' + fmtMoney(questReward), cls: 'pos' });
    if (achReward) rows.push({ label: 'مكافآت الإنجازات', value: '+' + fmtMoney(achReward), cls: 'pos' });
    if (fee) rows.push({ label: 'حساب المعلم', value: '-' + fmtMoney(fee), cls: 'neg' });
    if (s.fines) rows.push({ label: 'غرامات الرادار', value: '-' + fmtMoney(s.fines), cls: 'neg' });
    if (repair) rows.push({ label: `تصليح العربية (${Math.round(this.player.damage)}% ضرر)`, value: '-' + fmtMoney(repair), cls: 'neg' });
    rows.push({ label: 'صافى الوردية', value: (net >= 0 ? '+' : '') + fmtMoney(net), cls: 'total ' + (net >= 0 ? 'pos' : 'neg') });
    rows.push({ label: 'رصيدك دلوقتى', value: fmtMoney(st.money) + ' جنيه', cls: 'total' });

    const extras = [];
    for (const q of qres) extras.push({ text: q.text, tag: q.done ? `✅ +${q.reward}` : `${q.progress}/${q.target}`, done: q.done });
    for (const a of ach) extras.push({ text: `🏅 إنجاز: ${a.text}`, tag: `+${a.reward}`, done: true });

    let title = 'الوردية خلصت';
    if (!s.rides) title = 'وردية فاضية!';
    else if (net < 0) title = 'وردية خسرانة… حاول تانى';
    else if (net > 600) title = 'وردية ممتازة! 🔥';

    this.mode = 'summary';
    this.world.setTheme(this.theme);
    this.ui.showSummary({ title, rows, extras });
    // العربية تقف على الرصيف فى الخلفية
    this.previewId = st.selected;
    this.enterPreviewKeepSummary();
  }

  enterPreviewKeepSummary() {
    this.mode = 'summary';
    this.world.reset(this.state.day * 131 + 7);
    this.player.reset(40, 8.7);
    this.setPlayerCar(this.previewId);
    this.player.reset(40, 8.7);
    this.traffic.reset(40);
    this.rides.reset();
    this.camReady = false;
  }

  // ---------- الأحداث أثناء اللعب ----------
  onCrash(sev) {
    if (this.crashCd > 0) return;
    this.crashCd = 0.5;
    const dmg = clamp(sev * 0.55, 0.6, 14);
    this.player.addDamage(dmg);
    this.shift.crashes++;
    this.rides.noteRough('crash');
    this.sfx.crash();
    this.vibrate(sev > 8 ? 220 : 90);
    this.shake = Math.min(1, 0.25 + sev * 0.05);
    this.ui.toast('💥 خبطة! خلى بالك', 'bad');
  }

  onRideEvent(ev) {
    const s = this.shift;
    if (ev.type === 'boarded') {
      const line = pick(ev.ride.type.boardLines);
      this.sfx.pickup();
      this.ui.toast(`${ev.ride.type.icon} ${ev.ride.name}: ${line}`, 'good');
    } else if (ev.type === 'delivered') {
      const r = ev.result;
      s.rides++;
      s.fares += r.fare;
      s.tips += r.tip;
      s.bestTip = Math.max(s.bestTip, r.tip);
      if (r.perfect) s.perfect++;
      this.sfx.coin();
      const stars = '⭐'.repeat(r.stars);
      let say = 'تسلم ايدك!';
      if (r.late) say = 'اتأخرنا أوى…';
      else if (r.comfort < 0.5) say = 'رجّتنا شوية!';
      else if (r.perfect) say = 'سواقة ناعمة، عظمة!';
      this.ui.toast(`${ev.ride.type.icon} ${say} +${r.fare} ج${r.tip ? ' + ' + r.tip + ' بقشيش' : ''} ${stars}`, 'good');
    } else if (ev.type === 'missedPickup') {
      this.ui.toast('😕 فاتك الراكب! فى غيره', 'bad');
    } else if (ev.type === 'missedDest') {
      s.fares += ev.result.fare;
      this.sfx.fine();
      this.ui.toast(`🙁 عدّيت المكان! الراكب نزل ودفع ${ev.result.fare} ج بس`, 'bad');
    }
    this.checkQuestToasts();
  }

  updateRadar() {
    const p = this.player;
    const kmh = p.v * 3.6;
    while (p.s >= radarS(this.nextRadar)) {
      const lim = radarLimit(this.nextRadar);
      if (kmh > lim + 4) {
        this.shift.fines += RADAR_FINE;
        this.sfx.fine();
        this.ui.flash();
        this.ui.toast(`📸 رادار! غرامة ${RADAR_FINE} جنيه (الحد ${lim})`, 'bad');
      } else {
        this.shift.radarOk++;
        this.ui.toast('✅ عدّيت الرادار بسرعة قانونية', 'good');
        this.checkQuestToasts();
      }
      this.nextRadar++;
    }
    const nextS = radarS(this.nextRadar);
    const ahead = nextS - p.s;
    if (ahead < 230) {
      const lim = radarLimit(this.nextRadar);
      this.ui.setLimit(lim, kmh > lim + 4);
    } else this.ui.setLimit(null);
  }

  // ---------- الحلقة الرئيسية ----------
  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (!(dt > 0)) dt = 0.016;
    this.watchPerf(dt);
    dt = Math.min(dt, 0.05);
    if (this.crashCd > 0) this.crashCd -= dt;

    if (this.mode === 'playing') this.updatePlaying(dt);
    else if (this.mode === 'paused') {
      /* مجمّد */
    } else this.updatePreview(dt);

    this.renderer.render(this.scene, this.camera);
  }

  watchPerf(dt) {
    this.frames.push(dt);
    if (this.frames.length < 120) return;
    const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
    this.frames = [];
    if (avg > 0.028 && this.pr > 0.7) {
      this.pr = Math.max(0.7, this.pr * 0.85);
      this.resize();
    }
  }

  // فى الشاشات العريضة القايمة على الشمال، فنزحزح الصورة عشان العربية تبان
  applyViewOffset() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const shifted = (this.mode === 'menu' || this.mode === 'garage') && w >= 900;
    const key = shifted ? 'on' + w + 'x' + h : 'off';
    if (this._vo === key) return;
    this._vo = key;
    if (shifted) this.camera.setViewOffset(w, h, -w * 0.17, 0, w, h);
    else this.camera.clearViewOffset();
  }

  updatePreview(dt) {
    this.applyViewOffset();
    this.player.sync(0);
    this.traffic.update(dt, this.player, { noPlayer: true });
    this.world.update(this.player.s);
    const near = this.mode === 'garage';
    this.camAngle += dt * (near ? 0.35 : 0.18);
    const r = near ? 7.2 : 10.5;
    const target = this.player.root.position;
    const cam = this.camera;
    cam.position.set(target.x + Math.cos(this.camAngle) * r, 2.6 + (near ? 0.4 : 1.2), target.z + Math.sin(this.camAngle) * r);
    cam.lookAt(target.x, 1.0, target.z);
    if (cam.fov !== 48) {
      cam.fov = 48;
      cam.updateProjectionMatrix();
    }
  }

  updatePlaying(dt) {
    this.applyViewOffset();
    const st = this.state;
    const s = this.shift;
    const p = this.player;
    const inp = this.input;

    inp.poll(dt, st.settings.auto);
    if (!s.over) {
      s.t -= dt;
      if (s.t <= 0) {
        s.t = 0;
        s.over = true;
        this.ui.toast('⏰ الوردية خلصت! كمّل المشوار الأخير', 'gold');
      }
    }

    const evs = p.update(dt, inp, { steer: st.settings.steer, brakeSens: st.settings.brakeSens });
    s.km += (p.v * dt) / 1000;
    for (const e of evs) {
      if (e.type === 'hardBrake') this.rides.noteRough('hard');
      else if (e.type === 'swerve') this.rides.noteRough('swerve');
      else if (e.type === 'scrape') {
        this.sfx.crash();
        this.vibrate(40);
        this.shake = Math.max(this.shake, 0.25);
        this.rides.noteRough('hard');
      }
    }

    for (const e of this.traffic.update(dt, p)) if (e.type === 'crash') this.onCrash(e.severity);

    for (const e of this.rides.update(dt, p, { shiftOver: s.over })) this.onRideEvent(e);
    this.updateRadar();
    this.checkQuestToasts();

    // نهاية الوردية
    if (s.over && this.rides.phase === 'idle') return this.endShift();
    if (s.over && this.rides.phase === 'riding' && this.rides.remaining < -60) {
      this.ui.toast('الراكب زهق ونزل', 'bad');
      return this.endShift();
    }

    this.world.update(p.s);
    this.sfx.updateEngine(p.v, p.vmaxEff, inp.throttle);
    this.updateCamera(dt);
    this.updateHud();
  }

  updateCamera(dt) {
    const p = this.player;
    const cam = this.camera;
    const back = 9.2 + p.v * 0.03;
    const want = new THREE.Vector3(cx(p.s - back) + p.x * 0.85, 3.9 + p.v * 0.012, -(p.s - back));
    const look = new THREE.Vector3(cx(p.s + 16) + p.x * 0.9, 1.3, -(p.s + 16));
    if (!this.camReady) {
      this.camPos.copy(want);
      this.camLook.copy(look);
      this.camReady = true;
    } else {
      const k = 1 - Math.exp(-dt * 7);
      this.camPos.lerp(want, k);
      this.camLook.lerp(look, 1 - Math.exp(-dt * 9));
    }
    cam.position.copy(this.camPos);
    if (this.shake > 0) {
      cam.position.x += (Math.random() - 0.5) * this.shake * 0.5;
      cam.position.y += (Math.random() - 0.5) * this.shake * 0.4;
      this.shake = Math.max(0, this.shake - dt * 1.8);
    }
    cam.lookAt(this.camLook);
    const fov = 60 + 16 * clamp(p.v / p.spec.vmax, 0, 1);
    if (Math.abs(cam.fov - fov) > 0.1) {
      cam.fov += (fov - cam.fov) * Math.min(1, dt * 4);
      cam.updateProjectionMatrix();
    }
  }

  updateHud() {
    const ui = this.ui;
    const p = this.player;
    const s = this.shift;
    const r = this.rides;
    ui.setSpeed(Math.round(p.v * 3.6));
    ui.setMoney(s.fares + s.tips - s.fines);
    ui.setTimer(s.t, s.over);
    ui.setDamage(p.damage);

    const c = r.cur;
    let card = null;
    let hint = null;
    const kmh = p.v * 3.6;
    if (r.phase === 'waiting' && c) {
      const ds = c.pickupS - p.s;
      const inZone = Math.abs(ds) < 10 && p.x > 2.4;
      card = {
        icon: c.type.icon,
        title: `${c.name} مستنيك`,
        sub: `${c.type.label} · ${Math.max(0, Math.round(ds))} م قدامك`,
        bar: r.holdT / 1.4,
        barClass: 'gold',
        line: 'الراكب على الرصيف اليمين. وقّف جنبه.',
      };
      if (ds < 70 && ds > -12) {
        if (p.x < 2.4) hint = 'قرّب من الرصيف اليمين ↘';
        else if (kmh > 11 && ds < 45) hint = 'هدّى! لازم تحت 10 كم/س';
        else if (inZone) hint = 'استنى… الراكب بيركب';
      }
    } else if (r.phase === 'riding' && c) {
      const ds = c.destS - p.s;
      const rem = r.remaining;
      const inZone = Math.abs(ds) < 10 && p.x > 2.4;
      card = {
        icon: c.type.icon,
        title: `${c.name} ← ${c.place}`,
        sub: `باقى ${Math.max(0, Math.round(ds))} م · ${rem >= 0 ? fmtTime(rem) : 'اتأخرت!'}`,
        bar: inZone ? r.holdT / 1.2 : rem / c.limit,
        barClass: inZone ? 'gold' : rem / c.limit < 0.25 ? 'warn' : '',
        line: rem >= 0 ? 'سوق بنعومة: البقشيش على قد الراحة والسرعة.' : 'الأجرة بتقل كل ما بتتأخر.',
      };
      if (ds < 70 && ds > -12) {
        if (p.x < 2.4) hint = 'قرّب من الرصيف اليمين ↘';
        else if (kmh > 11 && ds < 45) hint = 'هدّى! لازم تحت 10 كم/س';
        else if (inZone) hint = 'الراكب بينزل…';
      }
    } else if (!s.over) {
      card = { icon: '🔎', title: 'بدوّر على راكب…', sub: 'كمّل سواقة على الكورنيش', bar: 0, line: '' };
    }
    ui.setCard(card);
    ui.setHint(hint);
  }
}

new Game();

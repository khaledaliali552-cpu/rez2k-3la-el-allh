// الملف الرئيسى: بيربط العالم والعربية والركاب والواجهة
import * as THREE from '../vendor/three.module.min.js';
import { World, cx, UT_HALF } from './world.js';
import { ROADS, getRoad, uturnS, nextUturnIndex, uturnRoad, nextRadarIndex, radarS as roadRadarS, radarLimit as roadRadarLimit } from './roads.js';
import { boardLine, chatterLine, reactLine } from './dialog.js';
import { Radio } from './radio.js';
import { Cloud } from './cloud.js';
import { PlayerCar } from './car.js';
import { Traffic } from './traffic.js';
import { Rides } from './rides.js';
import { lookIds, defaultLook } from './car-images.js';
import { Input } from './input.js';
import { Sfx } from './sfx.js';
import { UI } from './ui.js';
import * as Save from './save.js';
import {
  QUEST_POOL, ACHIEVEMENTS, SHIFT_SECONDS, RADAR_FINE, THEME_ORDER, WELCOME_BONUS,
  getCar, getColor, colorKey, getAcc, stickerById, SLOGAN_PRICE, modBonus, getBoss, getRentVehicle, pick, clamp, fmtMoney, fmtTime,
} from './data.js';

const GAME_NAME_LOCAL = 'أجرة الكورنيش';
const IS_TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const newShift = () => ({
  t: SHIFT_SECONDS, fares: 0, tips: 0, fines: 0, rides: 0, people: 0, perfect: 0, crashes: 0, radarOk: 0, km: 0, bestTip: 0, over: false,
});

class Game {
  constructor() {
    this.state = Save.load();
    this.road = getRoad(this.state.selectedRoad);
    this.refMsg = this.applyReferral();
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
    this.rides.onDest = (s, name) => this.world.addBoard(s, name);
    this.input = new Input();
    this.sfx = new Sfx();
    this.radio = new Radio(this.state.settings);
    this.ui = new UI(this);
    this.cloud = new Cloud(this);
    this.cloud.onChange = () => this.ui.renderAccount();

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
    this.input.bindWheel(document.getElementById('wheel'), document.getElementById('wheel-face'));
    if (IS_TOUCH) document.body.classList.add('touch-mode');
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
    this.radio.onChange = () => this.ui.setRadioLabel();
    this.ensureQuests();
    this.resize();
    this.enterPreview();
    this.ui.renderMenu();
    this.ui.show('menu');
    if (this.refMsg) this.ui.toast(this.refMsg, 'gold');

    this.cloud.init();
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
    this.cloud.queueSave();
  }

  // العربية بالـ id (ممكن تكون عربية صاحب: job:<id>)
  jobById(id) {
    return this.cloud.workerJobs.find((j) => j.id === id && j.status === 'active') || null;
  }

  carSpec(id) {
    if (id === 'boss_taxi') {
      const w = this.state.work;
      const boss = getBoss(w.boss);
      const veh = getRentVehicle(boss.vehicles.includes(w.vehicle) ? w.vehicle : boss.vehicles[0]);
      const fee = boss.fee ? Math.round((boss.fee * veh.feeMul) / 5) * 5 : 0;
      return { ...veh, id: 'boss_taxi', name: `${veh.name} (${boss.name})`, rented: true, fee, pct: boss.pct, bossName: boss.name, price: 0 };
    }
    if (typeof id === 'string' && id.startsWith('job:')) {
      const job = this.jobById(id.slice(4));
      if (!job) return null;
      const base = getCar(job.carId);
      return { ...base, id, name: `${base.name} (${job.ownerName})`, rented: false, fee: 0, job };
    }
    const base = getCar(id);
    if (base && this.state.owned.includes(id)) {
      const b = modBonus(this.state.mods[id]);
      if (b) return { ...base, fareMul: (base.fareMul || 1) * (1 + b) };
    }
    return base;
  }

  validSelected() {
    const st = this.state;
    const spec = this.carSpec(st.selected);
    if (spec && (spec.job || st.owned.includes(st.selected))) return spec;
    st.selected = 'boss_taxi';
    return getCar('boss_taxi');
  }

  replaceState(ns) {
    this.state = ns;
    Save.save(ns);
    this.road = getRoad(ns.selectedRoad);
    this.sfx.setEnabled(ns.settings.sound);
    this.previewId = ns.selected;
    this.ensureQuests();
  }

  onCloudSignOut() {
    if (this.state.selected.startsWith('job:')) this.state.selected = 'boss_taxi';
    if (this.mode === 'menu' || this.mode === 'garage') this.ui.renderMenu();
  }

  onCloudReady() {
    this.validSelected();
    this.previewId = this.state.selected;
    this.ui.renderMenu();
    if (this.mode === 'menu') this.enterPreview();
    if (this.mode === 'garage') this.ui.renderGarage();
  }

  // اسم المظهر (اللون) المستخدم للعربية: لازم يكون من المظاهر اللى ليها صور
  carLook(id) {
    const car = this.carSpec(id) || getCar('boss_taxi');
    const ids = lookIds(car.body);
    if (car.job) return ids.includes(car.job.colorId) ? car.job.colorId : defaultLook(car.body);
    if (car.rented) return defaultLook(car.body);
    const c = this.state.colors[id];
    return ids.includes(c) && this.hasColor(id, c) ? c : defaultLook(car.body);
  }

  hasColor(carId, colorId) {
    const car = getCar(carId);
    return (car && colorId === defaultLook(car.body)) || this.state.ownedColors.includes(colorKey(carId, colorId));
  }

  // ---------- كود الدعوة ----------
  applyReferral() {
    const st = this.state;
    let code = '';
    try {
      code = (new URLSearchParams(location.search).get('r') || '').toUpperCase().trim();
    } catch (e) {
      /* ignore */
    }
    if (!code) return '';
    try {
      history.replaceState(null, '', location.pathname);
    } catch (e) {
      /* ignore */
    }
    return this.redeemCode(code, true);
  }

  redeemCode(code, fromLink = false) {
    const st = this.state;
    code = String(code || '').toUpperCase().trim();
    if (!/^[A-Z0-9]{6}$/.test(code)) return fromLink ? '' : 'الكود لازم يكون 6 حروف وأرقام';
    if (code === st.refCode) return 'ده كودك انت! ابعته لصحابك';
    if (st.referredBy) return fromLink ? '' : 'انت استخدمت كود دعوة قبل كده';
    st.referredBy = code;
    st.money += WELCOME_BONUS;
    this.save();
    return `🎁 مكافأة الدعوة: +${WELCOME_BONUS} جنيه (الكود ${code})`;
  }

  inviteLink() {
    const base = location.origin + location.pathname;
    return `${base}?r=${this.state.refCode}`;
  }

  inviteText() {
    return `تعالى العب معايا "${GAME_NAME_LOCAL}"! سوق تاكسى على طرق إسكندرية وانت داخل بالكود بتاعى هتاخد ${WELCOME_BONUS} جنيه هدية 🎁\nالكود: ${this.state.refCode}\n${this.inviteLink()}`;
  }

  shareWhatsApp() {
    window.open('https://wa.me/?text=' + encodeURIComponent(this.inviteText()), '_blank', 'noopener');
  }

  async copyInvite() {
    const t = this.inviteLink();
    try {
      await navigator.clipboard.writeText(t);
      this.ui.toast('تم نسخ الرابط ✅', 'good');
    } catch (e) {
      window.prompt('انسخ الرابط:', t);
    }
  }

  setPlayerCar(id) {
    const car = this.carSpec(id) || getCar('boss_taxi');
    this.player.setSpec(car, this.carLook(id), this.state.owned.includes(id) ? this.state.mods[id] : null);
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
  get free() {
    return this.state.work.mode === 'free' && this.isOwnCarSelected();
  }

  isOwnCarSelected() {
    const st = this.state;
    return st.owned.includes(st.selected) && !getCar(st.selected).rented;
  }

  applyRoad() {
    this.road = getRoad(this.free ? 'free' : this.state.selectedRoad);
    if (this.world.road !== this.road) this.world.setRoad(this.road);
    this.traffic.setRoad(this.road);
    this.rides.setRoad(this.road);
  }

  enterPreview() {
    this.mode = this.mode === 'garage' ? 'garage' : 'menu';
    this.applyRoad();
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

  openAccount() {
    this.ui.renderAccount();
    this.ui.show('account');
  }

  openRoads() {
    this.sfx.init();
    this.applyRoad();
    this.ui.renderSetup();
    this.ui.show('roads');
  }

  openInvite() {
    this.ui.renderInvite();
    this.ui.show('invite');
  }

  openRadio() {
    this.ui.renderRadio();
    this.ui.show('radio');
  }

  selectRoad(id) {
    this.state.selectedRoad = id;
    this.save();
    this.ui.renderSetup();
  }

  setWorkCar(id) {
    this.state.selected = id;
    this.previewId = id;
    if (!this.isOwnCarSelected()) this.state.work.mode = 'shift';
    this.save();
    this.ui.renderSetup();
  }

  setBoss(id) {
    const w = this.state.work;
    w.boss = id;
    const boss = getBoss(id);
    if (!boss.vehicles.includes(w.vehicle)) w.vehicle = boss.vehicles[0];
    this.save();
    this.ui.renderSetup();
  }

  setVehicle(id) {
    this.state.work.vehicle = id;
    this.save();
    this.ui.renderSetup();
  }

  setMode(mode) {
    const spec = this.carSpec(this.state.selected);
    if (mode === 'free' && (!this.isOwnCarSelected() || spec.cap < 3)) {
      this.ui.toast('الشغل الحر محتاج عربية بتاعتك بتشيل 3 ركاب على الأقل', 'bad');
      return;
    }
    this.state.work.mode = mode;
    this.save();
    this.ui.renderSetup();
  }

  startFromSetup() {
    this.applyRoad();
    this.onStartClick();
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
    st.colors[id] = st.colors[id] || defaultLook(car.body);
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
    if (!this.state.owned.includes(id) && !this.jobById(id.replace(/^job:/, ''))) return;
    this.state.selected = id;
    this.previewId = id;
    this.save();
    this.ui.renderGarage();
  }

  // ---------- الورشة ----------
  ownedList() {
    return this.state.owned.filter((id) => !getCar(id).rented);
  }

  openWorkshop() {
    const list = this.ownedList();
    if (!list.length) {
      this.ui.toast('الورشة للعربيات اللى بتملكها. اشترى عربية الأول 🚗', 'bad');
      return;
    }
    this.wsCar = list.includes(this.state.selected) ? this.state.selected : list[0];
    this.mode = 'garage';
    this.previewId = this.wsCar;
    this.enterPreview();
    this.mode = 'garage';
    this.ui.renderWorkshop();
    this.ui.show('workshop');
  }

  wsPick(id) {
    this.wsCar = id;
    this.previewId = id;
    this.refreshWs();
  }

  refreshWs() {
    this.setPlayerCar(this.wsCar);
    this.player.reset(40, 8.7);
    this.player.damage = this.state.damage[this.wsCar] || 0;
    this.ui.renderWorkshop();
  }

  _pay(cost) {
    if (this.state.money < cost) {
      this.ui.toast(`محتاج ${fmtMoney(cost)} جنيه`, 'bad');
      return false;
    }
    this.state.money -= cost;
    this.sfx.init();
    this.sfx.coin();
    return true;
  }

  wsRepair() {
    const id = this.wsCar;
    const dmg = this.state.damage[id] || 0;
    const cost = Math.round(dmg * getCar(id).repair);
    if (dmg < 1) return;
    if (!this._pay(cost)) return;
    this.state.damage[id] = 0;
    this.save();
    this.ui.toast('🔧 العربية اتصلّحت زى الجديدة', 'good');
    this.refreshWs();
  }

  wsSlogan(stickerId) {
    const id = this.wsCar;
    const mods = (this.state.mods[id] = this.state.mods[id] || { slogan: '', accs: [] });
    if (!stickerId || !stickerById(stickerId)) {
      if (!mods.slogan) return;
      mods.slogan = '';
    } else {
      if (stickerId === mods.slogan) return;
      if (!this._pay(SLOGAN_PRICE)) return;
      mods.slogan = stickerId;
      this.ui.toast('✍️ الاستيكر اتلزق على العربية', 'gold');
    }
    this.save();
    this.refreshWs();
  }

  wsAcc(accId) {
    const id = this.wsCar;
    const acc = getAcc(accId);
    const mods = (this.state.mods[id] = this.state.mods[id] || { slogan: '', accs: [] });
    mods.accs = mods.accs || [];
    if (mods.accs.includes(accId)) {
      mods.accs = mods.accs.filter((a) => a !== accId); // فك (من غير استرداد)
    } else {
      if (!this._pay(acc.price)) return;
      mods.accs.push(accId);
      this.ui.toast(`${acc.icon} اتركّبت: ${acc.name}`, 'gold');
    }
    this.save();
    this.refreshWs();
  }

  buyColor(carId, colorId) {
    const col = getColor(colorId);
    const st = this.state;
    if (this.hasColor(carId, colorId)) return this.setColor(carId, colorId);
    if (st.money < col.price) {
      this.ui.toast(`محتاج ${fmtMoney(col.price)} جنيه عشان اللون ده`, 'bad');
      return;
    }
    st.money -= col.price;
    st.ownedColors.push(colorKey(carId, colorId));
    this.sfx.init();
    this.sfx.coin();
    this.ui.toast(`🎨 اشتريت اللون ${col.name}`, 'gold');
    this.setColor(carId, colorId);
  }

  setColor(carId, colorId) {
    if (!this.hasColor(carId, colorId)) return;
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
    this.validSelected();
    this.applyRoad();
    this.world.setTheme(this.theme);
    this.world.reset(st.day * 131 + 7);
    this.setPlayerCar(st.selected);
    this.player.reset(0, 5.4);
    const spec0 = this.validSelected();
    if (st.owned.includes(spec0.id) && !spec0.rented) this.player.damage = st.damage[spec0.id] || 0;
    this.traffic.reset(0);
    this.rides.reset();
    this.shift = newShift();
    if (this.road.free) this.shift.t = Infinity;
    this.shift.free = !!this.road.free;
    this.questDone = new Set();
    this.nextRadar = 0;
    this.shake = 0;
    this.camReady = false;
    this.state.roadsPlayed[this.road.id] = true;
    this.mode = 'playing';
    this.input.clear();
    this.input.enabled = true;
    this.ui.clearToasts();
    this.ui.hideAll();
    this.ui.showHud(true, IS_TOUCH);
    this.ui.setDay(st.day, this.road);
    this.ui.setRadioLabel();
    if (st.settings.radio && !this.radio.playing) this.radio.start(st.settings.radioTrack || 0);
    else this.radio.resumeForGame();
    this.ui.setSoundLabel(st.settings.sound);
    this.ui.toast(this.road.free ? '🛣️ شغل حر: وصّل 3 أفراد لمسافات بعيدة' : `${this.road.tagIcon} ${this.road.name} · ${this.road.perKm} جنيه للكيلو`, 'gold');
  }

  pause() {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    this.radio.pauseForGame();
    this.input.clear();
    this.input.enabled = true; // عشان Esc يكمّل
    this.sfx.engineOff();
    this.ui.setSoundLabel(this.state.settings.sound);
    this.ui.show('pause');
  }

  resume() {
    if (this.mode !== 'paused') return;
    this.mode = 'playing';
    this.radio.resumeForGame();
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
    const car = this.carSpec(st.selected) || getCar('boss_taxi');
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
    const cutPct = car.job ? car.job.share : car.pct || 0;
    const cutName = car.job ? car.job.ownerName : car.bossName;
    const cut = Math.round((gross * cutPct) / 100);
    const ownCar = st.owned.includes(car.id) && !car.rented && !car.job;
    const repair = ownCar ? 0 : Math.round(this.player.damage * car.repair);
    if (ownCar) st.damage[car.id] = Math.round(this.player.damage * 10) / 10;

    st.stats.rides += s.rides;
    st.stats.people += s.people;
    st.stats.perfect += s.perfect;
    st.stats.km += s.km;
    st.stats.earned += gross;
    st.stats.tips += s.tips;
    st.stats.fines += s.fines;
    st.stats.crashes += s.crashes;
    st.stats.bestTip = Math.max(st.stats.bestTip, s.bestTip);
    st.stats.shifts += 1;

    const before = st.money;
    st.money += gross + questReward - fee - cut - s.fines - repair;
    const ach = this.checkAchievements(true);
    const achReward = ach.reduce((a, x) => a + x.reward, 0);
    const net = st.money - before;
    st.day += 1;
    this.ensureQuests();
    this.save();
    if (car.job && cut > 0) {
      this.cloud.createPayout(car.job, cut).catch((e) => this.ui.toast('تعذر إرسال حصة صاحب العربية: ' + (e.code || e.message), 'bad'));
    }

    const rows = [{ label: this.road.free ? 'مشاوير سفر (خطافى)' : `مشاوير على ${this.road.name}`, value: `${s.rides} (${s.people} فرد)` }, { label: 'الأجرة', value: '+' + fmtMoney(s.fares), cls: 'pos' }];
    if (s.tips) rows.push({ label: 'البقشيش', value: '+' + fmtMoney(s.tips), cls: 'pos' });
    if (questReward) rows.push({ label: 'مكافآت المهام', value: '+' + fmtMoney(questReward), cls: 'pos' });
    if (achReward) rows.push({ label: 'مكافآت الإنجازات', value: '+' + fmtMoney(achReward), cls: 'pos' });
    if (cut) rows.push({ label: `حصة ${cutName} (${cutPct}%)`, value: '-' + fmtMoney(cut), cls: 'neg' });
    if (fee) rows.push({ label: `يومية ${cutName || 'المعلم'}`, value: '-' + fmtMoney(fee), cls: 'neg' });
    if (s.fines) rows.push({ label: 'غرامات الرادار', value: '-' + fmtMoney(s.fines), cls: 'neg' });
    if (repair) rows.push({ label: `تصليح العربية (${Math.round(this.player.damage)}% ضرر)`, value: '-' + fmtMoney(repair), cls: 'neg' });
    else if (ownCar && this.player.damage > 1) rows.push({ label: `ضرر العربية ${Math.round(this.player.damage)}% (صلّحها فى الورشة)`, value: '', cls: '' });
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
    this.applyRoad();
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
    const rc = this.rides.cur;
    this.ui.toast(this.rides.phase === 'riding' && rc ? `💥 ${rc.name}: ${reactLine('crash')}` : '💥 خبطة! خلى بالك', 'bad');
  }

  onRideEvent(ev) {
    const s = this.shift;
    if (ev.type === 'boarded') {
      this.sfx.pickup();
      this.ui.toast(`${ev.ride.type.icon} ${ev.ride.name}: ${boardLine(ev.ride)}`, 'good');
    } else if (ev.type === 'delivered') {
      const r = ev.result;
      s.rides++;
      s.people += ev.ride.group;
      s.fares += r.fare;
      s.tips += r.tip;
      s.bestTip = Math.max(s.bestTip, r.tip);
      if (r.perfect) s.perfect++;
      this.sfx.coin();
      const stars = '⭐'.repeat(r.stars);
      let say = reactLine('good');
      if (r.late) say = reactLine('late');
      else if (r.comfort < 0.5) say = reactLine('bad');
      else if (r.perfect) say = reactLine('smooth');
      this.ui.toast(`${ev.ride.type.icon} ${say} +${r.fare} ج${r.tip ? ' + ' + r.tip + ' بقشيش' : ''} ${stars}`, 'good');
    } else if (ev.type === 'chatter') {
      this.ui.toast(`${ev.ride.type.icon} ${ev.ride.name}: ${chatterLine(ev.ride, this.road.id)}`, '');
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
    while (p.s >= roadRadarS(this.road, this.nextRadar)) {
      const lim = roadRadarLimit(this.road, this.nextRadar);
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
    const nextS = roadRadarS(this.road, this.nextRadar);
    const ahead = nextS - p.s;
    if (ahead < 230) {
      const lim = roadRadarLimit(this.road, this.nextRadar);
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
    const ang = Math.PI + Math.sin(this.camAngle) * 1.1; // الكاميرا دايما من ناحية الطريق
    cam.position.set(target.x + Math.cos(ang) * r, 2.6 + (near ? 0.4 : 1.2), target.z + Math.sin(ang) * r);
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
    this.updateUturn(dt);
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

  // الدوران (يو تيرن) فى فتحة الجزيرة: ادخل الحارة الشمال وهدّى فتلف للطريق الراجع
  updateUturn(dt) {
    const road = this.road;
    const p = this.player;
    this.utHint = null;
    this.utMsgCd = Math.max(0, (this.utMsgCd || 0) - dt);
    if (!road.uturn || road.free || this.uturning) return;
    const su = uturnS(road, nextUturnIndex(road, p.s - UT_HALF));
    const ds = su - p.s;
    const riding = this.rides.phase === 'riding';
    if (ds > 0 && ds < 240) this.utHint = riding ? null : '↩ دوران قدامك: ادخل الحارة الشمال وهدّى عشان ترجع';
    if (Math.abs(ds) < UT_HALF && p.x < -4.2) {
      if (riding) {
        if (this.utMsgCd <= 0) { this.ui.toast('الراكب معاك! مينفعش تلف وتسيبه', 'bad'); this.utMsgCd = 4; }
      } else if (p.v * 3.6 > 45) {
        this.utHint = 'هدّى! الدوران تحت 45 كم/س';
      } else {
        this.doUturn();
      }
    }
  }

  doUturn() {
    this.uturning = true;
    let f = document.getElementById('uturn-fade');
    if (!f) {
      f = document.createElement('div');
      f.id = 'uturn-fade';
      document.body.appendChild(f);
    }
    f.style.opacity = '1';
    this.sfx.init();
    setTimeout(() => {
      const p = this.player;
      const nr = uturnRoad(this.road, p.s);
      this.road = nr;
      this.world.setRoad(nr);
      this.traffic.setRoad(nr);
      this.rides.setRoad(nr);
      this.traffic.reset(p.s);
      this.rides.reset();
      this.nextRadar = nextRadarIndex(nr, p.s);
      p.x = 3.4;
      p.vx = 0;
      this.ui.setDay(this.state.day, nr);
      this.ui.toast(nr.back ? '↩ لفّيت فى الدوران ورجعت على ' + nr.base.name : '↩ لفّيت تانى: كمّل فى الاتجاه الأصلى', 'gold');
      f.style.opacity = '0';
      setTimeout(() => { this.uturning = false; }, 600);
    }, 280);
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
        title: `${c.name} مستنيك → ${c.place}`,
        sub: `${c.type.label}${c.group > 1 ? ' · ' + c.group + ' أفراد' : ''} · ${Math.max(0, Math.round(ds))} م قدامك`,
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
        sub: `${c.group > 1 ? c.group + ' أفراد · ' : ''}باقى ${Math.max(0, Math.round(ds))} م · ${rem >= 0 ? fmtTime(rem) : 'اتأخرت!'} · 🧮 ${c.km.toFixed(2)} كم × ${Math.round(c.perKm)} ج/فرد = ${fmtMoney(Math.max(20, Math.round(c.baseFare / 5) * 5))} ج`,
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
      card = { icon: '🔎', title: 'بدوّر على راكب…', sub: `كمّل سواقة على ${this.road.name}`, bar: 0, line: '' };
    }
    ui.setCard(card);
    ui.setHint(hint || this.utHint || null);
  }
}

new Game();

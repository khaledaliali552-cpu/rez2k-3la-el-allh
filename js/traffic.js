// الزحمة: عربيات فى نفس اتجاهك (بتتصادم) وعربيات عكسية (للمنظر بس)
import * as THREE from '../vendor/three.module.min.js';
import { buildVehicle } from './vehicles.js';
import { LANE_X, ONC_X, place, headingYaw, dcx, trafficDensity } from './world.js';
import { rand, pick, clamp } from './data.js';

const KINDS = [
  { kind: 'taxi', weight: 4, v: [17, 26], colors: [0xf2b21b, 0xf2b21b, 0xe8a317, 0xf4f4f0] },
  { kind: 'sedan', weight: 4, v: [16, 28], colors: [0xb7bcc4, 0xf1f1ee, 0x24262b, 0x2a5bd7, 0xc4302b, 0x7a8a99] },
  { kind: 'hatch', weight: 2, v: [15, 26], colors: [0xf1f1ee, 0xc4302b, 0x2f8f5b, 0xb7bcc4] },
  { kind: 'minibus', weight: 3, v: [14, 23], colors: [0x2a5bd7, 0xc4302b, 0x2f8f5b], cut: true },
  { kind: 'tuktuk', weight: 1.3, v: [6, 10], colors: [0x2f8f5b, 0xe9c46a, 0xc4302b] },
  { kind: 'truck', weight: 1.2, v: [10, 15], colors: [0x6b8e23, 0x5c6b7a, 0x9c4a2a] },
];
const TOTAL_W = KINDS.reduce((a, k) => a + k.weight, 0);

function pickKind() {
  let r = Math.random() * TOTAL_W;
  for (const k of KINDS) {
    r -= k.weight;
    if (r <= 0) return k;
  }
  return KINDS[0];
}

export class Traffic {
  constructor(scene) {
    this.scene = scene;
    this.cars = [];
    this.decor = [];
  }

  clear() {
    for (const c of this.cars) this.scene.remove(c.model.group);
    for (const d of this.decor) this.scene.remove(d.model.group);
    this.cars = [];
    this.decor = [];
  }

  reset(playerS) {
    this.clear();
    for (let i = 0; i < 9; i++) this._spawnDecor(playerS, true);
    // ابدأ بشوية عربيات قدامك
    for (let i = 0; i < 6; i++) this._spawnCar(playerS, playerS + 60 + i * 45 + rand(0, 20), null);
  }

  _spawnDecor(playerS, initial = false) {
    const k = pickKind();
    if (k.kind === 'tuktuk') return this._spawnDecor(playerS, initial);
    const model = buildVehicle(k.kind, pick(k.colors));
    this.scene.add(model.group);
    const d = {
      model,
      s: playerS + (initial ? rand(-30, 520) : rand(440, 620)),
      x: pick(ONC_X),
      v: rand(15, 30),
    };
    this.decor.push(d);
    return d;
  }

  _free(s, x, ignore, range = 20) {
    for (const c of this.cars) {
      if (c === ignore) continue;
      if (Math.abs(c.x - x) < 2.6 && Math.abs(c.s - s) < range) return false;
    }
    return true;
  }

  _spawnCar(playerS, s, forcedLane) {
    const k = pickKind();
    const lane = forcedLane == null ? Math.floor(Math.random() * 4) : forcedLane;
    // التوك توك مش بيمشى فى الحارة الشمال خالص
    const useLane = k.kind === 'tuktuk' || k.kind === 'truck' ? Math.max(2, lane) : lane;
    const x = LANE_X[useLane];
    if (!this._free(s, x, null, 22)) return null;
    const model = buildVehicle(k.kind, pick(k.colors));
    this.scene.add(model.group);
    const cruise = rand(k.v[0], k.v[1]);
    const c = {
      model, kind: k.kind, cut: !!k.cut, s, x, targetX: x, vx: 0, v: cruise * 0.9, cruise,
      lane: useLane, laneT: rand(2, 9), hitCd: 0, stopT: 0, stopped: false,
    };
    this.cars.push(c);
    return c;
  }

  _remove(c) {
    this.scene.remove(c.model.group);
    this.cars = this.cars.filter((o) => o !== c);
  }

  // يرجع أحداث تصادم مع اللاعب
  update(dt, player, opts = {}) {
    const noPlayer = !!opts.noPlayer;
    const events = [];
    const ps = player.s;
    const dens = trafficDensity(ps);

    // إنشاء وحذف
    const want = Math.round(6 + 14 * dens);
    this.spawnT = (this.spawnT || 0) - dt;
    if (this.cars.length < want && this.spawnT <= 0) {
      this._spawnCar(ps, ps + rand(300, 420), null);
      this.spawnT = 0.35;
    }
    if (Math.random() < dt * 0.15 && this.cars.length < want + 2) {
      // عربية سريعة بتيجى من ورا
      const c = this._spawnCar(ps, ps - rand(40, 60), null);
      if (c) {
        c.cruise = rand(26, 34);
        c.v = c.cruise * 0.9;
      }
    }
    for (const c of [...this.cars]) {
      if (c.s < ps - 90 || c.s > ps + 500) this._remove(c);
    }

    // سلوك العربيات
    const all = this.cars;
    for (const c of all) {
      // مين قدامى؟
      let gap = Infinity;
      let leader = null;
      for (const o of all) {
        if (o === c) continue;
        if (Math.abs(o.x - c.x) < 2.5 && o.s > c.s) {
          const g = o.s - c.s - (o.model.l + c.model.l) / 2;
          if (g < gap) {
            gap = g;
            leader = o;
          }
        }
      }
      if (!noPlayer && Math.abs(player.x - c.x) < 2.5 && player.s > c.s) {
        const g = player.s - c.s - (player.l + c.model.l) / 2;
        if (g < gap) {
          gap = g;
          leader = player;
        }
      }

      let desired = c.cruise;
      const safe = 6 + c.v * 0.9;
      if (leader && gap < safe) desired = Math.max(0, Math.min(desired, leader.v + (gap - 5) * 0.6));

      // ميكروباص بيقف ياخد ركاب
      if (c.cut && c.lane === 3 && !c.stopped && c.s > ps + 40 && Math.random() < dt * 0.012) {
        c.stopT = rand(2.5, 4.5);
        c.stopped = true;
      }
      if (c.stopT > 0) {
        desired = 0;
        if (c.v < 0.6) c.stopT -= dt;
      }

      // تغيير الحارة
      c.laneT -= dt;
      if (c.laneT <= 0 && c.stopT <= 0) {
        const blocked = leader && gap < safe * 1.4 && leader.v < c.cruise - 2;
        const chance = c.cut ? 0.55 : 0.25;
        if (blocked || Math.random() < chance) {
          const dirs = Math.random() < 0.5 ? [-1, 1] : [1, -1];
          for (const d of dirs) {
            const nl = c.lane + d;
            if (nl < 0 || nl > 3) continue;
            if (c.kind === 'tuktuk' && nl < 2) continue;
            const tx = LANE_X[nl];
            if (!this._free(c.s - 6, tx, c, 24)) continue;
            if (!noPlayer && Math.abs(player.x - tx) < 2.6 && Math.abs(player.s - c.s) < 20) continue;
            c.lane = nl;
            c.targetX = tx;
            break;
          }
        }
        c.laneT = rand(4, 11);
      }

      // حركة
      const acc = desired > c.v ? 3.2 : -9;
      c.v = clamp(c.v + acc * dt, 0, 45);
      if (acc < 0 && c.v < desired) c.v = desired;
      if (acc > 0 && c.v > desired) c.v = desired;
      const dx = c.targetX - c.x;
      c.vx = clamp(dx * 2.2, -2.4, 2.4);
      c.x += c.vx * dt;
      c.s += c.v * dt;
      c.hitCd -= dt;
    }

    // تصادم مع اللاعب
    for (const c of noPlayer ? [] : this.cars) {
      const dx = player.x - c.x;
      const ds = player.s - c.s;
      const halfW = (player.w + c.model.w) / 2;
      const halfL = (player.l + c.model.l) / 2;
      const ox = halfW * 0.92 - Math.abs(dx);
      const os = halfL * 0.94 - Math.abs(ds);
      if (ox > 0 && os > 0) {
        const rel = Math.abs(player.v - c.v) + Math.abs(player.vx - c.vx) * 0.6;
        const nx = ox / halfW;
        const ns = os / halfL;
        if (ns < nx) {
          if (ds < 0) {
            player.s = c.s - halfL * 0.94;
            player.v = Math.min(player.v, c.v * 0.7);
            c.v += Math.min(2, rel * 0.1);
          } else {
            c.s = player.s - halfL * 0.94;
            const bump = Math.min(4, rel * 0.25);
            c.v = Math.min(c.v, player.v * 0.85);
            player.v += bump;
          }
        } else {
          const side = dx >= 0 ? 1 : -1;
          player.x += side * ox * 0.6;
          c.x -= side * ox * 0.4;
          player.vx = side * 2.2;
        }
        if (c.hitCd <= 0 && rel > 1.2) {
          c.hitCd = 1.0;
          events.push({ type: 'crash', severity: rel, car: c });
        }
      }
    }

    // العربيات العكسية
    for (const d of this.decor) {
      d.s -= d.v * dt;
      if (d.s < ps - 60) {
        d.s = ps + rand(440, 620);
        d.x = pick(ONC_X);
        d.v = rand(15, 30);
      }
    }
    this.sync();
    return events;
  }

  sync() {
    for (const c of this.cars) {
      place(c.model.group, c.s, c.x, 0);
      c.model.group.rotation.y = headingYaw(c.s, c.v, c.vx);
      const spin = c.v * 0.016 / 0.34;
      for (const w of c.model.wheels) w.rotation.x -= spin;
    }
    for (const d of this.decor) {
      place(d.model.group, d.s, d.x, 0);
      d.model.group.rotation.y = Math.PI - Math.atan(dcx(d.s));
    }
  }
}

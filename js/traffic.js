// الزحمة: عربيات فى نفس اتجاهك (بتتصادم) وعربيات عكسية (للمنظر بس)
import * as THREE from '../vendor/three.module.min.js';
import { buildVehicle, SIZES } from './vehicles.js';
import { models } from './models.js';
import { hasSprite, buildSprite } from './sprites.js';
import { LANE_X, ONC_X, place, headingYaw, dcx, trafficDensity } from './world.js';
import { rand, pick, clamp, pickWeighted } from './data.js';

const W = 0xf1f1ee;
const VEH = {
  luxury: { v: [20, 30], colors: [0x24262b, 0x24262b, 0x1b1d22, 0xf1f1ee, 0x7a8a99] },
  suv: { v: [19, 29], colors: [0x1b1d22, 0x1b1d22, 0x24262b, W, 0x8a8f94] },
  sedan: { v: [16, 28], colors: [0xb7bcc4, 0xb7bcc4, W, 0x24262b, 0x2a5bd7, 0xc4302b, 0x7a8a99] },
  taxi: { v: [17, 26], colors: [0xf2b21b, 0xf2b21b, 0xe8a317, 0xf4f4f0] },
  hatch: { v: [15, 26], colors: [W, 0xc4302b, 0x2f8f5b, 0xb7bcc4, 0x2a5bd7] },
  microbus: { v: [14, 23], colors: [W, W, W, 0xf4f4f0], accents: [0x2a5bd7, 0xc4302b, 0x2f8f5b], cut: true },
  tonaya: { v: [13, 21], colors: [W, W, 0xe9e6dc, 0xb7bcc4], slow: true },
  tuktuk: { v: [6, 10], colors: [0xc4302b, 0xc4302b, 0x2f8f5b, 0xe9c46a], slow: true },
  pickup: { v: [13, 21], colors: [W, W, 0xb7bcc4, 0xc4302b], accents: [W, 0x8a6a44, 0x2a5bd7], slow: true },
  boxtruck: { v: [12, 19], colors: [W, 0xc4302b, 0x2a5bd7], accents: [W, W, 0xdcdcd0, 0xc4302b], slow: true },
  lada: { v: [14, 24], colors: [0x1f3a6e, 0x1f3a6e, W, 0x8d1f1f, 0x2f8f5b, 0xb7bcc4] },
  gwagon: { v: [20, 30], colors: [0x1b1d22, 0x1b1d22, 0x24262b] },
  bus: { v: [11, 17], colors: [0xc4302b, 0xc4302b], accents: [0x2f6fd0], slow: true },
  ambulance: { v: [22, 32], colors: [0xffffff] },
  moto: { v: [14, 24], colors: [0xc4302b, 0x24262b, 0x2a5bd7], cut: true },
  tuktuk2: { v: [6, 10], colors: [0x1f2f6e, 0x1f2f6e], slow: true },
  truck: { v: [10, 15], colors: [0xc4302b, 0xc4302b, 0x2a5bd7, 0x2f8f5b], accents: [0x2a5bd7, 0xc4302b, 0x9c4a2a, 0x5c6b7a], slow: true },
};
const DEFAULT_MIX = { sedan: 4, taxi: 4, hatch: 2, microbus: 3, tuktuk: 1, truck: 1 };

// صور المرور (لو متاحة للنوع ده)، وإلا المجسم 3D
function trafficModel(k, facing) {
  if (hasSprite(k.kind, facing)) return buildSprite(k.kind, facing, SIZES[k.kind] || SIZES.sedan);
  return buildVehicle(k.kind, pick(k.colors), k.accents ? { accent: pick(k.accents) } : {});
}

function pickKind(mix, noSlow = false) {
  const m = {};
  for (const [k, w] of Object.entries(mix)) if (VEH[k] && (!noSlow || (k !== 'tuktuk' && k !== 'ambulance'))) m[k] = w;
  const kind = pickWeighted(m);
  models.ensure(kind); // تحميل كسول لنموذج GLB لو موجود (مرة واحدة)
  return { kind, ...VEH[kind] };
}

export class Traffic {
  constructor(scene) {
    this.scene = scene;
    this.cars = [];
    this.decor = [];
    this.mix = DEFAULT_MIX;
    this.density = 1;
    this.speed = 1;
  }

  setRoad(road) {
    this.mix = road.traffic.mix;
    this.density = road.traffic.density;
    this.speed = road.traffic.speed;
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
    const k = pickKind(this.mix, true);
    const model = trafficModel(k, 'front');
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
    const k = pickKind(this.mix);
    const lane = forcedLane == null ? Math.floor(Math.random() * 4) : forcedLane;
    // العربيات البطيئة بتمشى فى اليمين
    const useLane = k.slow ? Math.max(2, lane) : lane;
    const x = LANE_X[useLane];
    if (!this._free(s, x, null, 22)) return null;
    const model = trafficModel(k, 'rear');
    this.scene.add(model.group);
    const cruise = rand(k.v[0], k.v[1]) * this.speed;
    const c = {
      model, kind: k.kind, cut: !!k.cut, slow: !!k.slow, s, x, targetX: x, vx: 0, v: cruise * 0.9, cruise,
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
    const dens = trafficDensity(ps) * this.density;

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
            if (c.slow && nl < 2) continue;
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

    }
    for (const d of this.decor) {
      place(d.model.group, d.s, d.x, 0);
      d.model.group.rotation.y = Math.PI - Math.atan(dcx(d.s));
    }
  }
}

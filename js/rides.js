// نظام الركاب: استنى الراكب (فرد أو مجموعة)، وصّله لمحطة، واحسب الأجرة والبقشيش
import * as THREE from '../vendor/three.module.min.js';
import { PASSENGERS, CARGO_TYPES, pick, pickWeighted, rand, clamp } from './data.js';
import { CURB_X, place } from './world.js';
import { buildPerson, buildCrates, buildBeacon } from './vehicles.js';
import { landmarkS, landmarkAt, landmarkAfter, FREE_DESTS } from './roads.js';

const roundTo = (n, step) => Math.round(n / step) * step;
const GROUP_W = { 1: 4, 2: 3.2, 3: 2, 4: 1.4, 5: 0.7, 6: 0.5 };
const MAX_MESH = 6; // أقصى عدد أشخاص بيتعرضوا على الرصيف

// حساب الأجرة والبقشيش والنجوم (دالة صافية عشان تتختبر)
export function settleRide(ride, remaining, fareMul = 1) {
  const t = ride.type;
  const ratio = clamp(remaining / ride.limit, 0, 1);
  const rough = ride.hardBrakes + ride.swerves * 0.7 + ride.crashes * 3;
  const comfort = clamp(1 - rough * 0.13 * t.bumpSens, 0, 1);
  let fare = ride.baseFare * fareMul;
  let tip = 0;
  const late = remaining < 0;
  if (!late) {
    tip = fare * 0.3 * (0.25 + 0.75 * ratio) * t.tipMul * comfort;
    if (ride.crashes > 0) tip = 0;
  } else {
    fare *= clamp(1 + (remaining / ride.limit) * 0.8, 0.6, 1);
  }
  fare = Math.max(20, roundTo(fare, 5));
  tip = Math.max(0, roundTo(tip, 5));
  const stars = clamp(Math.round(1 + 4 * (0.55 * comfort + 0.45 * (late ? 0.2 : 0.4 + 0.6 * ratio))), 1, 5);
  const perfect = rough === 0 && !late;
  return { fare, tip, stars, perfect, late, comfort };
}

export class Rides {
  constructor(scene) {
    this.scene = scene;
    this.road = null;
    this.phase = 'idle';
    this.cur = null;
    this.person = null;
    this.beacon = null;
    this.holdT = 0;
    this.idleT = 0;
    this.time = 0;
    this.chatT = 0;
    this.onDest = null;
  }

  setRoad(road) {
    this.road = road;
  }

  reset() {
    this._clearMeshes();
    this.phase = 'idle';
    this.cur = null;
    this.holdT = 0;
    this.idleT = 0.8;
  }

  _clearMeshes() {
    if (this.person) this.scene.remove(this.person);
    if (this.beacon) this.scene.remove(this.beacon);
    this.person = null;
    this.beacon = null;
  }

  spawn(playerS, spec = {}) {
    const cap = spec.cap == null ? 3 : spec.cap;
    const cargo = spec.cat === 'cargo' && !this.road.free;
    const road = this.road;
    const type = cargo ? pick(CARGO_TYPES) : PASSENGERS.find((p) => p.id === pickWeighted(road.pax)) || pick(PASSENGERS);
    const gw = {};
    for (let n = 1; n <= Math.min(6, Math.max(1, cap)); n++) gw[n] = GROUP_W[n] || 0.3;
    // ميكروباص/أتوبيس: كل فترة جروب كبير بيملّى العربية تقريبا
    if (cap > 6) { gw[Math.round(cap * 0.5)] = 0.5; gw[Math.round(cap * 0.85)] = 0.3; }
    let group = cargo ? Math.max(1, spec.load || 2) : +pickWeighted(gw);
    const gap = rand(280, 520);
    const pickupS = playerS + gap;
    let destS, dist, lm, baseFare;
    if (road.free) {
      // شغل حر: 3 أفراد، وجهة بعيدة بأجرة ثابتة
      group = Math.min(3, Math.max(1, cap));
      const wmap = {};
      FREE_DESTS.forEach((d, i) => (wmap[i] = d.w));
      const d = FREE_DESTS[+pickWeighted(wmap)];
      lm = { name: d.name };
      dist = d.dist;
      destS = pickupS + dist;
      baseFare = d.fare;
      if (this.onDest) this.onDest(destS, d.name);
    } else {
      // أول محطة بعد الراكب بمسافة معقولة، وممكن نتخطى واحدة
      let k = landmarkAfter(road, pickupS + 420);
      if (Math.random() < 0.35 && landmarkS(road, k + 1) - pickupS < 3400) k++;
      destS = landmarkS(road, k);
      dist = destS - pickupS;
      lm = landmarkAt(road, k);
      baseFare = road.fare * group; // الأجرة للفرد × عدد الأفراد
    }
    const limit = dist / (14 + 3 * type.impatience) + 12;
    this.cur = {
      type, name: pick(type.names), group, place: lm.name, landmarkLines: lm.lines || null, free: !!road.free,
      cargo, pickupS, destS, dist, baseFare, km: 0, limit, hardBrakes: 0, swerves: 0, crashes: 0,
    };
    this.remaining = limit;
    this._clearMeshes();
    this.person = cargo ? buildCrates(type.shirt, group) : buildPerson(type.shirt, Math.min(group, MAX_MESH));
    place(this.person, pickupS, CURB_X, 0.16);
    this.person.rotation.y = Math.PI / 2;
    this.beacon = buildBeacon(0xffd23f);
    place(this.beacon, pickupS, CURB_X - 0.4, 0.16);
    this.scene.add(this.person, this.beacon);
    this.phase = 'waiting';
    this.holdT = 0;
  }

  noteRough(kind) {
    if (this.phase !== 'riding' || !this.cur) return;
    if (kind === 'hard') this.cur.hardBrakes++;
    else if (kind === 'swerve') this.cur.swerves++;
    else if (kind === 'crash') this.cur.crashes++;
  }

  // بترجع قايمة أحداث للّعبة تتصرف فيها
  update(dt, player, ctx) {
    if (this.disabled) return [];
    const events = [];
    this.time += dt;
    const c = this.cur;
    const inZone = (s) => Math.abs(s - player.s) < 10 && player.x > 2.4 && player.v < 3.0;

    if (this.person && this.person.userData.arm) {
      this.person.userData.arm.rotation.z = -0.4 + Math.sin(this.time * 7) * 0.5;
    }
    if (this.beacon) {
      const a = this.beacon.userData.arrow;
      a.position.y = 4.2 + Math.sin(this.time * 3) * 0.35;
      a.rotation.y += dt * 2;
    }

    if (this.phase === 'idle') {
      this.idleT -= dt;
      if (this.idleT <= 0 && !ctx.shiftOver) this.spawn(player.s, player.spec);
      return events;
    }

    if (this.phase === 'waiting') {
      const ds = c.pickupS - player.s;
      if (ds < -70) {
        this._clearMeshes();
        this.phase = 'idle';
        this.idleT = 0.6;
        events.push({ type: 'missedPickup', ride: c });
        return events;
      }
      if (ctx.shiftOver) {
        this._clearMeshes();
        this.phase = 'idle';
        return events;
      }
      if (inZone(c.pickupS)) this.holdT += dt;
      else this.holdT = Math.max(0, this.holdT - dt * 2);
      if (this.holdT >= 1.4) {
        this.phase = 'riding';
        this.holdT = 0;
        this.remaining = c.limit;
        this.chatT = rand(14, 22);
        this._clearMeshes();
        this.beacon = buildBeacon(0x3ddc84);
        place(this.beacon, c.destS, CURB_X - 0.4, 0.16);
        this.scene.add(this.beacon);
        events.push({ type: 'boarded', ride: c });
      }
      return events;
    }

    if (this.phase === 'riding') {
      this.remaining -= dt;
      this.chatT -= dt;
      c.km = Math.max(c.km, (player.s - c.pickupS) / 1000);
      if (this.chatT <= 0) {
        this.chatT = rand(18, 30);
        events.push({ type: 'chatter', ride: c });
      }
      const ds = c.destS - player.s;
      if (ds < -60) {
        this._clearMeshes();
        this.phase = 'idle';
        this.idleT = 1.0;
        const res = settleRide(c, -c.limit * 0.5, player.spec.fareMul);
        res.fare = Math.max(20, roundTo(res.fare * 0.4, 5));
        res.tip = 0;
        res.stars = 1;
        res.perfect = false;
        events.push({ type: 'missedDest', ride: c, result: res });
        return events;
      }
      if (inZone(c.destS)) this.holdT += dt;
      else this.holdT = Math.max(0, this.holdT - dt * 2);
      if (this.holdT >= 1.2) {
        c.km = Math.max(c.km, (player.s - c.pickupS) / 1000);
          const res = settleRide(c, this.remaining, player.spec.fareMul);
        this._clearMeshes();
        this.phase = 'idle';
        this.idleT = 1.2;
        this.holdT = 0;
        events.push({ type: 'delivered', ride: c, result: res });
      }
    }
    return events;
  }
}

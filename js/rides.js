// نظام الركاب: استنى الراكب، وصّله، واحسب الأجرة والبقشيش
import * as THREE from '../vendor/three.module.min.js';
import { PASSENGERS, PLACES, pick, rand, clamp } from './data.js';
import { CURB_X, place } from './world.js';
import { buildPerson, buildBeacon } from './vehicles.js';

const roundTo = (n, step) => Math.round(n / step) * step;

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
    tip = fare * 0.45 * (0.25 + 0.75 * ratio) * t.tipMul * comfort;
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
    this.phase = 'idle';
    this.cur = null;
    this.person = null;
    this.beacon = null;
    this.holdT = 0;
    this.idleT = 0;
    this.time = 0;
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

  spawn(playerS) {
    const type = pick(PASSENGERS);
    const dist = roundTo(rand(900, 2800), 50);
    const gap = rand(280, 520);
    const baseFare = (25 + dist * 0.028) * type.fareMul;
    const limit = dist / (14 + 3 * type.impatience) + 12;
    this.cur = {
      type, name: pick(type.names), place: pick(PLACES),
      pickupS: playerS + gap, destS: playerS + gap + dist, dist, baseFare, limit,
      hardBrakes: 0, swerves: 0, crashes: 0,
    };
    this.remaining = limit;
    this._clearMeshes();
    this.person = buildPerson(type.shirt);
    place(this.person, this.cur.pickupS, CURB_X, 0.16);
    this.person.rotation.y = Math.PI / 2; // بيبص ناحية الطريق
    this.beacon = buildBeacon(0xffd23f);
    place(this.beacon, this.cur.pickupS, CURB_X - 0.4, 0.16);
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
    const events = [];
    this.time += dt;
    const c = this.cur;
    const inZone = (s) => Math.abs(s - player.s) < 10 && player.x > 2.4 && player.v < 3.0;

    if (this.person) {
      this.person.userData.arm.rotation.z = -0.4 + Math.sin(this.time * 7) * 0.5;
    }
    if (this.beacon) {
      const a = this.beacon.userData.arrow;
      a.position.y = 4.2 + Math.sin(this.time * 3) * 0.35;
      a.rotation.y += dt * 2;
    }

    if (this.phase === 'idle') {
      this.idleT -= dt;
      if (this.idleT <= 0 && !ctx.shiftOver) this.spawn(player.s);
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
        if (this.person) this.person.visible = false;
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

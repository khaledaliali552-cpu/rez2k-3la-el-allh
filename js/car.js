// عربية اللاعب: فيزياء بسيطة بتحس بالعربية من غير تعقيد
import * as THREE from '../vendor/three.module.min.js';
import { buildVehicle } from './vehicles.js';
import { place, headingYaw } from './world.js';
import { clamp } from './data.js';

export const X_MIN = -6.3;
export const X_MAX = 6.3;

export class PlayerCar {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group(); // موضع + اتجاه
    this.inner = new THREE.Group(); // ميلان وانضغاط
    this.root.add(this.inner);
    scene.add(this.root);
    this.model = null;
    this.spec = null;
    this.w = 1.85;
    this.l = 4.5;
    this.reset();
  }

  setSpec(spec, colorHex) {
    this.spec = spec;
    if (this.model) this.inner.remove(this.model.group);
    this.model = buildVehicle(spec.body, colorHex, { wheels: true });
    this.inner.add(this.model.group);
    this.w = this.model.w;
    this.l = this.model.l;
  }

  reset(s = 0, x = 5.4) {
    this.s = s;
    this.x = x;
    this.v = 0;
    this.vx = 0;
    this.vxS = 0;
    this.accel = 0;
    this.damage = 0; // 0..100
    this.hardCd = 0;
    this.swerveCd = 0;
    this.scrapeCd = 0;
    this.honk = false;
    this.sync(0);
  }

  get vmaxEff() {
    return this.spec.vmax * (1 - 0.4 * (this.damage / 100));
  }

  // events: بترجع أحداث زى hardBrake / swerve / scrape
  update(dt, input, settings = {}) {
    const spec = this.spec;
    const events = [];
    const throttle = input.throttle;
    const brake = input.brake * (settings.brakeSens || 1);
    const vOld = this.v;

    let a = 0;
    if (throttle > 0) {
      const r = clamp(this.v / this.vmaxEff, 0, 1);
      a += spec.accel * throttle * (1 - r * r);
    }
    if (brake > 0 && this.v > 0.05) a -= spec.brake * clamp(brake, 0, 1.4);
    a -= 0.35 + 0.0009 * this.v * this.v; // مقاومة هوا واحتكاك
    this.v = Math.max(0, this.v + a * dt);
    if (this.v > this.vmaxEff) this.v = Math.max(this.vmaxEff, this.v - 6 * dt);
    this.accel = (this.v - vOld) / Math.max(dt, 1e-4);

    // انحراف جانبى
    const grip = clamp(this.v / 4, 0, 1);
    const maxLat = 7.4 * spec.handling * grip * (1 - 0.35 * (this.v / spec.vmax));
    const target = input.steer * (settings.steer || 1) * maxLat;
    this.vx += (target - this.vx) * Math.min(1, dt * 8);
    this.x += this.vx * dt;
    this.s += this.v * dt;

    // حواف الطريق
    if (this.x > X_MAX || this.x < X_MIN) {
      const side = this.x > X_MAX ? 1 : -1;
      this.x = side > 0 ? X_MAX : X_MIN;
      if (this.vx * side > 1.5 && this.v > 4) {
        this.v *= 1 - Math.min(0.5, dt * 2.5);
        if (this.scrapeCd <= 0) {
          events.push({ type: 'scrape', power: Math.abs(this.vx) });
          this.scrapeCd = 0.5;
          this.damage = Math.min(100, this.damage + 0.6);
        }
      }
      this.vx = -side * 0.8;
    }

    // أحداث الرجّة
    this.hardCd -= dt;
    this.swerveCd -= dt;
    this.scrapeCd -= dt;
    if (this.accel < -12 && vOld > 9 && this.hardCd <= 0) {
      events.push({ type: 'hardBrake' });
      this.hardCd = 1.0;
    }
    if (Math.abs(this.vx) > 5.6 && this.v > 18 && this.swerveCd <= 0) {
      events.push({ type: 'swerve' });
      this.swerveCd = 1.2;
    }

    this.sync(dt);
    return events;
  }

  addDamage(amount) {
    this.damage = Math.min(100, this.damage + amount);
  }

  sync(dt) {
    this.vxS += (this.vx - this.vxS) * Math.min(1, (dt || 1) * 6);
    place(this.root, this.s, this.x, 0);
    this.root.rotation.y = headingYaw(this.s, this.v, this.vxS * 0.9);
    const pitch = clamp(this.accel * 0.004, -0.06, 0.05);
    this.inner.rotation.x = pitch;
    this.inner.rotation.z = clamp(this.vxS * 0.012, -0.07, 0.07);
    if (this.model) {
      for (const w of this.model.wheels) w.rotation.x -= (this.v * (dt || 0)) / w.userData.r;
    }
  }
}

// التحكم: كيبورد + أزرار لمس
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Input {
  constructor() {
    this.keys = new Set();
    this.touch = { left: false, right: false, gas: false, brake: false };
    this.mode = 'arrows'; // arrows | wheel | stick
    this.stick = null; // {x,y} -1..1 لو عصا الدايرة الواحدة شغالة
    this.reverse = 0;
    this.steer = 0;
    this.throttle = 0;
    this.brake = 0;
    this.wheel = null; // قيمة عجلة القيادة (-1..1) أو null لو مش مستخدمة
    this.enabled = false;
    this.onPause = null;
    this.onHorn = null;

    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'Escape' || e.code === 'KeyP') this.onPause && this.onPause();
      if (e.code === 'KeyH') this.onHorn && this.onHorn();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      for (const k of Object.keys(this.touch)) this.touch[k] = false;
    });
  }

  // اربط عنصر HTML بزرار (ضغطة مستمرة)
  bindHold(el, name) {
    const down = (e) => {
      e.preventDefault();
      this.touch[name] = true;
      el.classList.add('down');
      try {
        el.setPointerCapture(e.pointerId);
      } catch (err) {
        /* ignore */
      }
    };
    const up = (e) => {
      e.preventDefault();
      this.touch[name] = false;
      el.classList.remove('down');
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // عجلة قيادة دايرية: اسحب حواليها وهى بتلف
  bindWheel(el, face) {
    let id = null;
    const calc = (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      if (Math.hypot(dx, dy) < r.width * 0.08) return;
      const ang = Math.atan2(dx, -dy); // 0 = لفوق، موجب = يمين
      this.wheel = clamp(ang / 1.0, -1, 1);
      face.style.transform = `rotate(${this.wheel * 95}deg)`;
    };
    const end = (e) => {
      if (id !== null && e.pointerId !== id) return;
      id = null;
      this.wheel = null;
      face.style.transform = '';
      face.classList.remove('down');
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      id = e.pointerId;
      face.classList.add('down');
      try {
        el.setPointerCapture(e.pointerId);
      } catch (err) {
        /* ignore */
      }
      calc(e);
    });
    el.addEventListener('pointermove', (e) => {
      if (id !== null && e.pointerId === id) calc(e);
    });
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // دايرة واحدة: اسحب لفوق بنزين، لتحت رجوع/فرامل، يمين ويسار اتجاه
  bindStick(el, knob) {
    let id = null;
    const calc = (e) => {
      const r = el.getBoundingClientRect();
      const R = r.width / 2;
      let dx = (e.clientX - (r.left + R)) / R;
      let dy = (e.clientY - (r.top + R)) / R;
      const m = Math.hypot(dx, dy);
      if (m > 1) { dx /= m; dy /= m; }
      this.stick = { x: dx, y: dy };
      knob.style.transform = `translate(${dx * R * 0.55}px, ${dy * R * 0.55}px)`;
    };
    const end = (e) => {
      if (id !== null && e.pointerId !== id) return;
      id = null;
      this.stick = null;
      knob.style.transform = '';
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      id = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      calc(e);
    });
    el.addEventListener('pointermove', (e) => { if (id !== null && e.pointerId === id) calc(e); });
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  poll(dt, auto, v = 0) {
    const k = this.keys;
    const st = this.stick;
    const dead = 0.18;
    let left = k.has('ArrowLeft') || k.has('KeyA') || this.touch.left;
    let right = k.has('ArrowRight') || k.has('KeyD') || this.touch.right;
    let gas = k.has('ArrowUp') || k.has('KeyW') || this.touch.gas || !!auto;
    let back = k.has('ArrowDown') || k.has('KeyS') || this.touch.brake;
    const space = k.has('Space');
    let sx = null;
    if (st) {
      if (st.y < -dead) gas = true;
      if (st.y > dead) back = true;
      sx = Math.abs(st.x) < dead ? 0 : clamp(st.x * 1.15, -1, 1);
    }
    // لو العربية ماشية لقدام "رجوع" = فرامل، ولو واقفة = ريفرس
    const moving = v > 1.2;
    const brake = space || (back && moving);
    const rev = back && !moving && !space;

    const w = this.wheel !== null ? this.wheel : sx;
    const target = w !== null ? w : (right ? 1 : 0) - (left ? 1 : 0);
    const rate = w !== null ? 22 : target === 0 ? 16 : 10;
    this.steer += clamp(target - this.steer, -rate * dt, rate * dt);

    const gTarget = brake || rev ? 0 : gas ? 1 : 0;
    this.throttle += clamp(gTarget - this.throttle, -5 * dt, 4 * dt);
    const bTarget = brake ? 1 : 0;
    this.brake += clamp(bTarget - this.brake, -8 * dt, 8 * dt);
    this.reverse += clamp((rev ? 1 : 0) - this.reverse, -8 * dt, 4 * dt);
  }

  clear() {
    this.keys.clear();
    for (const k of Object.keys(this.touch)) this.touch[k] = false;
    this.steer = this.throttle = this.brake = this.reverse = 0;
    this.stick = null;
    this.wheel = null;
  }
}

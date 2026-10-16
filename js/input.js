// التحكم: كيبورد + أزرار لمس
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Input {
  constructor() {
    this.keys = new Set();
    this.touch = { left: false, right: false, gas: false, brake: false };
    this.steer = 0;
    this.throttle = 0;
    this.brake = 0;
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

  poll(dt, auto) {
    const k = this.keys;
    const left = k.has('ArrowLeft') || k.has('KeyA') || this.touch.left;
    const right = k.has('ArrowRight') || k.has('KeyD') || this.touch.right;
    const gas = k.has('ArrowUp') || k.has('KeyW') || this.touch.gas || !!auto;
    const brake = k.has('ArrowDown') || k.has('KeyS') || k.has('Space') || this.touch.brake;

    const target = (right ? 1 : 0) - (left ? 1 : 0);
    const rate = target === 0 ? 10 : 5.5;
    this.steer += clamp(target - this.steer, -rate * dt, rate * dt);

    const gTarget = brake ? 0 : gas ? 1 : 0;
    this.throttle += clamp(gTarget - this.throttle, -5 * dt, 4 * dt);
    const bTarget = brake ? 1 : 0;
    this.brake += clamp(bTarget - this.brake, -8 * dt, 8 * dt);
  }

  clear() {
    this.keys.clear();
    for (const k of Object.keys(this.touch)) this.touch[k] = false;
    this.steer = this.throttle = this.brake = 0;
  }
}

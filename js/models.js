// تحميل نماذج GLB اختيارية للمركبات (assets/models/vehicles/).
// لو النموذج مش موجود أو فشل تحميله، اللعبة بتكمل بالمجسم المبنى بالكود (fallback آمن).
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';

const BASE = 'assets/models/vehicles/';

class Models {
  constructor() {
    this.manifest = {}; // kind -> { file, bodyMaterials, wheelNodes, yaw, license }
    this.loaded = new Map(); // kind -> { scene, info } (نسخة واحدة تتشارك)
    this.pending = new Map();
    this.failed = new Set();
    this.paint = new Map(); // kind:color -> Map(material)
    this.onLoad = null; // (kind) => void
    this.ready = this._loadManifest();
    this.loader = null;
  }

  async _loadManifest() {
    try {
      const r = await fetch(BASE + 'manifest.json', { cache: 'no-cache' });
      if (!r.ok) return;
      const j = await r.json();
      if (j && typeof j === 'object') this.manifest = j;
    } catch (e) {
      /* مفيش نماذج: عادى */
    }
  }

  has(kind) {
    return this.loaded.has(kind);
  }

  // بيحمّل نموذج نوع واحد لو متسجل فى manifest (مرة واحدة بس)
  ensure(kind) {
    if (this.loaded.has(kind) || this.failed.has(kind)) return Promise.resolve(this.loaded.has(kind));
    if (this.pending.has(kind)) return this.pending.get(kind);
    const p = this.ready.then(() => {
      const info = this.manifest[kind];
      if (!info || !info.file) {
        this.failed.add(kind);
        return false;
      }
      this.loader = this.loader || new GLTFLoader();
      return new Promise((res) => {
        this.loader.load(
          BASE + info.file,
          (gltf) => {
            this.loaded.set(kind, { scene: gltf.scene, info });
            try { this.onLoad && this.onLoad(kind); } catch (e) { /* ignore */ }
            res(true);
          },
          undefined,
          () => {
            this.failed.add(kind);
            res(false);
          },
        );
      });
    });
    this.pending.set(kind, p);
    return p;
  }

  _paintMat(kind, mat, colorHex) {
    const key = kind + ':' + colorHex;
    let m = this.paint.get(key);
    if (!m) { m = new Map(); this.paint.set(key, m); }
    let c = m.get(mat);
    if (!c) {
      c = mat.clone();
      c.color.setHex(colorHex);
      m.set(mat, c);
    }
    return c;
  }

  // بيرجّع { root, wheels } أو null. size = {w,l} حجم التصادم
  instantiate(kind, colorHex, size, spinWheels) {
    const e = this.loaded.get(kind);
    if (!e) return null;
    try {
      const { scene, info } = e;
      const root = scene.clone(true); // الجيومترى والخامات متشاركة (مش بتتمسح مع العربية)
      const bodyNames = (info.bodyMaterials || ['body', 'paint']).map((s) => s.toLowerCase());
      root.traverse((o) => {
        if (o.isMesh && o.material && !Array.isArray(o.material) && bodyNames.includes((o.material.name || '').toLowerCase())) {
          o.material = this._paintMat(kind, o.material, colorHex);
        }
      });
      const holder = new THREE.Group();
      holder.add(root);
      if (info.yaw) holder.rotation.y = info.yaw;
      holder.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(holder);
      const dim = box.getSize(new THREE.Vector3());
      const k = size.l / (dim.z || 1);
      const outer = new THREE.Group();
      outer.add(holder);
      holder.scale.setScalar(k);
      outer.updateMatrixWorld(true);
      const b2 = new THREE.Box3().setFromObject(outer);
      const c = b2.getCenter(new THREE.Vector3());
      holder.position.set(-c.x, -b2.min.y, -c.z);
      outer.updateMatrixWorld(true);
      const wheels = [];
      if (spinWheels && info.wheelNodes) {
        for (const name of info.wheelNodes) {
          const node = outer.getObjectByName(name);
          if (!node) continue;
          const wb = new THREE.Box3().setFromObject(node);
          const wc = wb.getCenter(new THREE.Vector3());
          const pivot = new THREE.Group();
          outer.add(pivot);
          pivot.position.copy(wc);
          pivot.attach(node);
          pivot.userData.r = Math.max(0.15, (wb.max.y - wb.min.y) / 2);
          wheels.push(pivot);
        }
      }
      return { root: outer, wheels };
    } catch (err) {
      return null; // أى مشكلة: الجسم المبنى بالكود يفضل ظاهر
    }
  }
}

export const models = new Models();

// مجسمات العربيات المصرية والناس والعلامات (مبنية بالكود، من غير ملفات)
import * as THREE from '../vendor/three.module.min.js';
import { mergeParts, profileGeo, unitBox, matrixFor } from './geo.js';

const GLASS = 0x18222d;
const DARK = 0x16181c;
const bodyMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const litMat = new THREE.MeshBasicMaterial({ vertexColors: true });

// الحجم المستخدم فى التصادم (عرض × طول)
export const SIZES = {
  sedan: { w: 1.85, l: 4.55 },
  taxi: { w: 1.85, l: 4.55 },
  hatch: { w: 1.78, l: 3.85 },
  coupe: { w: 1.95, l: 4.5 },
  suv: { w: 2.0, l: 4.7 },
  luxury: { w: 2.0, l: 4.9 },
  microbus: { w: 1.98, l: 5.4 },
  tonaya: { w: 1.7, l: 4.0 },
  boxtruck: { w: 2.1, l: 5.8 },
  pickup: { w: 1.9, l: 5.0 },
  truck: { w: 2.5, l: 10.6 },
  tuktuk: { w: 1.45, l: 2.8 },
};

// ---------- عجل ----------
const wheelCache = new Map();
function wheelGeo(r, w) {
  const key = r + ':' + w;
  let g = wheelCache.get(key);
  if (!g) {
    const tire = new THREE.CylinderGeometry(r, r, w, 14);
    tire.rotateZ(Math.PI / 2);
    const rim = new THREE.CylinderGeometry(r * 0.62, r * 0.62, w + 0.03, 10);
    rim.rotateZ(Math.PI / 2);
    g = mergeParts([
      { geo: tire, color: 0x121212 },
      { geo: rim, color: 0xb9bec6 },
    ]);
    wheelCache.set(key, g);
  }
  return g;
}

// ---------- مُجمّع الأجزاء ----------
class Parts {
  constructor() {
    this.body = [];
    this.lit = [];
    this.wheelSpecs = [];
  }
  box(w, h, l, x, y, z, color, lit = false, rx = 0, ry = 0, rz = 0) {
    (lit ? this.lit : this.body).push({ geo: unitBox, matrix: matrixFor(x, y, z, w, h, l, rx, ry, rz), color });
    return this;
  }
  prof(pts, width, color, bevel = 0.05) {
    this.body.push({ geo: profileGeo(pts, width, bevel), color });
    return this;
  }
  geo(g, x, y, z, color, rx = 0, ry = 0, rz = 0, lit = false) {
    (lit ? this.lit : this.body).push({ geo: g, matrix: matrixFor(x, y, z, 1, 1, 1, rx, ry, rz), color });
    return this;
  }
  wheel(x, z, r = 0.33, w = 0.24) {
    this.wheelSpecs.push({ x, z, r, w });
    return this;
  }
  // أضواء ولوحات
  lamps(w, y, zf, zr, plateColor = 0xdbe9ff) {
    for (const s of [-1, 1]) {
      this.box(0.36, 0.13, 0.06, s * (w / 2 - 0.3), y, zf, 0xfff2c0, true);
      this.box(0.34, 0.13, 0.06, s * (w / 2 - 0.3), y, zr, 0xcc1f1f, true);
    }
    this.box(0.5, 0.13, 0.04, 0, y - 0.22, zf - 0.005, plateColor, true);
    this.box(0.5, 0.13, 0.04, 0, y - 0.22, zr + 0.005, plateColor, true);
    return this;
  }
  mirrors(x, y, z) {
    for (const s of [-1, 1]) this.box(0.14, 0.12, 0.1, s * x, y, z, DARK);
    return this;
  }
}

// ---------- وصفات العربيات ----------
// كل وصفة بترجع Parts. accent = لون ثانوى (شريط/صندوق/كابينة)
const RECIPES = {
  sedan(p, c) {
    p.prof([[-2.22, 0.34], [2.2, 0.34], [2.26, 0.58], [2.14, 0.8], [1.3, 0.92], [-1.45, 0.94], [-2.1, 0.9], [-2.26, 0.62]], 1.82, c);
    p.prof([[1.32, 0.9], [0.5, 1.42], [-0.9, 1.44], [-1.5, 0.93]], 1.55, GLASS, 0.02);
    p.prof([[0.5, 1.44], [-0.9, 1.46], [-0.92, 1.38], [0.46, 1.36]], 1.58, c, 0.02);
    p.box(1.86, 0.16, 0.12, 0, 0.42, -2.33, DARK).box(1.86, 0.16, 0.12, 0, 0.42, 2.33, DARK);
    p.mirrors(0.99, 1.0, -0.6);
    p.lamps(1.82, 0.72, -2.34, 2.34);
    p.wheel(0.86, -1.4).wheel(-0.86, -1.4).wheel(0.86, 1.4).wheel(-0.86, 1.4);
    return p;
  },
  taxi(p, c) {
    RECIPES.sedan(p, c);
    for (const s of [-1, 1]) p.box(0.03, 0.14, 3.3, s * 0.925, 0.62, 0.05, 0x16181c);
    p.box(0.7, 0.16, 0.3, 0, 1.55, 0.2, 0xffffff);
    p.box(0.7, 0.04, 0.3, 0, 1.64, 0.2, 0x16181c);
    return p;
  },
  hatch(p, c) {
    p.prof([[-1.9, 0.34], [1.88, 0.34], [1.94, 0.58], [1.84, 0.78], [1.1, 0.9], [-1.8, 0.92], [-1.92, 0.6]], 1.74, c);
    p.prof([[1.12, 0.88], [0.4, 1.42], [-1.55, 1.46], [-1.82, 0.95]], 1.48, GLASS, 0.02);
    p.prof([[0.4, 1.46], [-1.55, 1.5], [-1.56, 1.42], [0.38, 1.38]], 1.5, c, 0.02);
    p.box(1.78, 0.16, 0.12, 0, 0.42, -1.99, DARK).box(1.78, 0.16, 0.12, 0, 0.42, 1.99, DARK);
    p.mirrors(0.95, 1.0, -0.4);
    p.lamps(1.74, 0.72, -2.0, 2.0);
    p.wheel(0.82, -1.15).wheel(-0.82, -1.15).wheel(0.82, 1.15).wheel(-0.82, 1.15);
    return p;
  },
  coupe(p, c) {
    p.prof([[-2.2, 0.3], [2.2, 0.3], [2.28, 0.5], [2.1, 0.66], [1.0, 0.78], [-1.6, 0.82], [-2.15, 0.78], [-2.28, 0.55]], 1.92, c);
    p.prof([[1.0, 0.76], [0.15, 1.2], [-0.9, 1.22], [-1.6, 0.8]], 1.6, GLASS, 0.02);
    p.prof([[0.15, 1.22], [-0.9, 1.24], [-0.92, 1.16], [0.12, 1.14]], 1.62, c, 0.02);
    p.box(1.7, 0.05, 0.38, 0, 1.0, 2.1, DARK);
    for (const s of [-1, 1]) p.box(0.06, 0.2, 0.1, s * 0.6, 0.9, 2.1, DARK);
    p.lamps(1.92, 0.58, -2.36, 2.36);
    p.mirrors(1.0, 0.95, -0.3);
    p.wheel(0.9, -1.4, 0.35, 0.28).wheel(-0.9, -1.4, 0.35, 0.28).wheel(0.9, 1.4, 0.35, 0.28).wheel(-0.9, 1.4, 0.35, 0.28);
    return p;
  },
  suv(p, c) {
    p.prof([[-2.3, 0.5], [2.3, 0.5], [2.34, 0.8], [2.3, 1.15], [1.55, 1.22], [-2.25, 1.22], [-2.34, 0.9]], 1.96, c);
    p.prof([[1.5, 1.2], [1.3, 1.95], [-2.2, 1.95], [-2.25, 1.2]], 1.7, GLASS, 0.02);
    p.prof([[1.3, 1.97], [-2.2, 1.97], [-2.2, 1.9], [1.3, 1.9]], 1.74, c, 0.02);
    p.box(1.3, 0.34, 0.06, 0, 0.9, -2.4, DARK);
    p.box(2.0, 0.18, 0.14, 0, 0.55, -2.38, DARK).box(2.0, 0.18, 0.14, 0, 0.55, 2.38, DARK);
    const spare = new THREE.CylinderGeometry(0.36, 0.36, 0.2, 14);
    spare.rotateX(Math.PI / 2);
    p.geo(spare, 0, 1.22, 2.48, 0x15171a);
    for (const z of [-1.5, 1.5]) for (const s of [-1, 1]) p.box(0.1, 0.1, 1.05, s * 1.02, 0.9, z, DARK);
    p.mirrors(1.1, 1.35, -1.2);
    p.lamps(1.96, 0.98, -2.44, 2.44);
    p.wheel(0.96, -1.5, 0.43, 0.3).wheel(-0.96, -1.5, 0.43, 0.3).wheel(0.96, 1.5, 0.43, 0.3).wheel(-0.96, 1.5, 0.43, 0.3);
    return p;
  },
  luxury(p, c) {
    p.prof([[-2.4, 0.42], [2.4, 0.42], [2.46, 0.7], [2.3, 0.98], [1.5, 1.12], [-2.3, 1.12], [-2.44, 0.8]], 1.98, c);
    p.prof([[1.5, 1.1], [0.6, 1.7], [-1.6, 1.72], [-2.35, 1.15]], 1.62, GLASS, 0.02);
    p.prof([[0.6, 1.72], [-1.6, 1.74], [-1.62, 1.66], [0.58, 1.64]], 1.66, c, 0.02);
    p.box(1.4, 0.05, 0.05, 0, 0.98, -2.52, 0xf4f8ff, true);
    p.box(1.45, 0.05, 0.05, 0, 1.0, 2.5, 0xff2a2a, true);
    p.box(2.0, 0.16, 0.14, 0, 0.5, -2.47, DARK).box(2.0, 0.16, 0.14, 0, 0.5, 2.47, DARK);
    p.mirrors(1.08, 1.12, -0.7);
    p.lamps(1.98, 0.8, -2.5, 2.5);
    p.wheel(0.97, -1.55, 0.44, 0.3).wheel(-0.97, -1.55, 0.44, 0.3).wheel(0.97, 1.55, 0.44, 0.3).wheel(-0.97, 1.55, 0.44, 0.3);
    return p;
  },
  microbus(p, c, accent) {
    // c = لون الجسم (أبيض غالبا) ، accent = لون الشريط
    p.prof([[-2.65, 0.36], [2.6, 0.36], [2.68, 0.62], [2.55, 1.0], [2.2, 1.35], [1.85, 2.0], [-2.6, 2.05], [-2.7, 1.2], [-2.72, 0.6]], 1.94, c);
    p.prof([[2.22, 1.38], [1.875, 2.0], [1.65, 2.0], [2.0, 1.38]], 1.72, GLASS, 0.02);
    for (const z of [-1.55, -0.35, 0.85, 2.0]) for (const s of [-1, 1]) p.box(0.04, 0.5, 0.92, s * 0.985, 1.62, z, GLASS);
    p.box(1.5, 0.5, 0.04, 0, 1.55, 2.78, GLASS);
    for (const s of [-1, 1]) {
      p.box(0.04, 0.17, 4.9, s * 0.985, 0.88, 0.05, accent);
      p.box(0.04, 0.07, 4.9, s * 0.985, 0.68, 0.05, accent);
    }
    p.box(1.3, 0.32, 0.05, 0, 0.78, -2.76, DARK);
    p.box(1.98, 0.2, 0.15, 0, 0.5, -2.74, DARK).box(1.98, 0.2, 0.15, 0, 0.5, 2.78, DARK);
    p.mirrors(1.08, 1.5, -2.0);
    p.lamps(1.94, 0.82, -2.78, 2.82, 0xf0b050);
    p.wheel(0.88, -1.7, 0.36, 0.25).wheel(-0.88, -1.7, 0.36, 0.25).wheel(0.88, 1.7, 0.36, 0.25).wheel(-0.88, 1.7, 0.36, 0.25);
    return p;
  },
  tonaya(p, c) {
    p.prof([[-1.95, 0.4], [1.9, 0.4], [1.98, 0.66], [1.85, 1.0], [1.55, 1.25], [1.3, 1.85], [-1.9, 1.9], [-1.98, 1.2], [-2.0, 0.65]], 1.66, c);
    p.prof([[1.575, 1.28], [1.33, 1.84], [1.1, 1.84], [1.35, 1.28]], 1.46, GLASS, 0.02);
    for (const s of [-1, 1]) {
      p.box(0.04, 0.46, 0.8, s * 0.845, 1.55, -0.78, GLASS);
      p.box(0.03, 1.1, 0.04, s * 0.845, 1.2, 0.2, 0xcfd3d6);
    }
    p.box(1.66, 0.14, 0.12, 0, 0.5, -2.06, DARK).box(1.66, 0.14, 0.12, 0, 0.5, 2.06, DARK);
    p.lamps(1.66, 0.85, -2.1, 2.1);
    p.wheel(0.76, -1.2, 0.31, 0.2).wheel(-0.76, -1.2, 0.31, 0.2).wheel(0.76, 1.25, 0.31, 0.2).wheel(-0.76, 1.25, 0.31, 0.2);
    return p;
  },
  boxtruck(p, c, accent) {
    // c = لون الكابينة ، accent = لون الصندوق
    p.box(1.7, 0.3, 5.3, 0, 0.55, 0, DARK);
    p.prof([[2.78, 0.5], [2.78, 1.35], [2.5, 2.0], [1.4, 2.1], [1.4, 0.5]], 1.9, c);
    p.prof([[2.8, 1.38], [2.52, 2.02], [2.32, 2.02], [2.6, 1.38]], 1.7, GLASS, 0.02);
    for (const s of [-1, 1]) p.box(0.04, 0.55, 0.9, s * 0.97, 1.72, -1.95, GLASS);
    p.box(2.1, 2.2, 3.6, 0, 1.76, 0.5, accent);
    p.box(2.12, 0.08, 3.62, 0, 0.62, 0.5, DARK);
    p.box(1.8, 1.9, 0.04, 0, 1.75, 2.32, 0xd9dce0);
    p.lamps(1.9, 0.7, -2.9, 2.35);
    p.wheel(0.93, -1.95, 0.4, 0.3).wheel(-0.93, -1.95, 0.4, 0.3);
    p.wheel(0.93, 1.4, 0.4, 0.3).wheel(-0.93, 1.4, 0.4, 0.3).wheel(0.68, 1.4, 0.4, 0.3).wheel(-0.68, 1.4, 0.4, 0.3);
    return p;
  },
  pickup(p, c, accent) {
    p.box(1.7, 0.3, 4.6, 0, 0.55, 0, DARK);
    p.prof([[2.5, 0.45], [2.5, 1.0], [2.1, 1.15], [1.4, 1.25], [0.9, 1.9], [0.1, 1.9], [0.0, 1.2], [0.0, 0.45]], 1.88, c);
    p.prof([[1.4, 1.22], [0.92, 1.86], [0.14, 1.86], [0.04, 1.22]], 1.62, GLASS, 0.02);
    p.box(1.86, 0.1, 2.3, 0, 0.88, 1.3, accent);
    for (const s of [-1, 1]) p.box(0.08, 0.5, 2.3, s * 0.92, 1.18, 1.3, accent);
    p.box(1.86, 0.5, 0.08, 0, 1.18, 2.45, accent).box(1.86, 0.55, 0.08, 0, 1.18, 0.15, accent);
    p.box(1.2, 0.35, 0.8, 0.2, 1.1, 1.5, 0x8a6a44);
    p.box(1.9, 0.16, 0.12, 0, 0.5, -2.56, DARK);
    p.lamps(1.88, 0.75, -2.56, 2.5);
    p.wheel(0.9, -1.6, 0.38, 0.26).wheel(-0.9, -1.6, 0.38, 0.26).wheel(0.9, 1.5, 0.38, 0.26).wheel(-0.9, 1.5, 0.38, 0.26);
    return p;
  },
  truck(p, c, accent) {
    // c = لون الكابينة ، accent = لون صندوق النقل (مفتوح من فوق)
    p.box(2.0, 0.4, 10.0, 0, 0.82, 0, DARK);
    p.prof([[5.2, 0.9], [5.2, 2.4], [4.95, 2.85], [3.9, 3.1], [3.2, 3.1], [3.2, 0.9]], 2.4, c);
    p.prof([[5.22, 2.5], [4.97, 2.88], [4.7, 2.88], [4.95, 2.5]], 2.2, GLASS, 0.02);
    for (const s of [-1, 1]) p.box(0.04, 0.7, 0.9, s * 1.22, 2.55, -4.2, GLASS);
    p.box(2.5, 0.25, 8.2, 0, 1.38, 1.15, accent);
    for (const s of [-1, 1]) p.box(0.07, 0.6, 8.2, s * 1.24, 1.8, 1.15, accent);
    p.box(2.5, 0.6, 0.07, 0, 1.8, 5.25, accent).box(2.5, 0.65, 0.07, 0, 1.8, -2.9, accent);
    for (const s of [-1, 1]) {
      const stack = new THREE.CylinderGeometry(0.1, 0.1, 1.6, 8);
      p.geo(stack, s * 1.0, 3.6, -3.1, 0xb8bcc2);
    }
    p.box(2.4, 0.3, 0.2, 0, 0.9, -5.28, DARK);
    p.lamps(2.3, 1.1, -5.3, 5.2);
    p.wheel(1.1, -3.7, 0.55, 0.4).wheel(-1.1, -3.7, 0.55, 0.4);
    for (const z of [2.0, 3.4]) for (const s of [-1, 1]) p.wheel(s * 1.1, z, 0.55, 0.4).wheel(s * 0.8, z, 0.55, 0.4);
    return p;
  },
  tuktuk(p, c, accent) {
    // c = لون الجسم (أحمر) ، accent = لون المظلة (أسود)
    const canopy = accent;
    p.box(1.25, 0.15, 2.2, 0, 0.5, 0.1, 0x222222);
    p.prof([[1.35, 0.45], [1.42, 0.85], [1.15, 1.12], [0.7, 1.2], [0.55, 0.45]], 1.0, c, 0.04);
    p.box(0.34, 0.26, 0.1, 0, 0.88, -1.48, 0xfff2c0, true);
    p.box(1.1, 0.55, 0.04, 0, 1.55, -0.62, GLASS, false, -0.35);
    for (const s of [-1, 1]) {
      p.box(0.05, 0.95, 0.05, s * 0.62, 1.45, -0.55, canopy);
      p.box(0.05, 0.95, 0.05, s * 0.64, 1.45, 1.0, canopy);
      p.box(0.04, 0.3, 1.4, s * 0.66, 0.68, 0.45, c);
    }
    p.box(1.55, 0.07, 2.0, 0, 1.95, 0.22, canopy);
    p.box(1.45, 0.05, 0.4, 0, 1.9, -0.9, canopy, false, 0.25);
    p.box(1.15, 0.3, 0.7, 0, 0.82, 0.65, c);
    p.box(1.3, 0.95, 0.07, 0, 1.35, 1.1, canopy);
    p.box(0.9, 0.25, 0.02, 0, 1.4, 1.15, 0xe9a23b);
    p.box(0.5, 0.1, 0.04, 0, 0.7, 1.16, 0xcc1f1f, true);
    p.box(0.1, 0.5, 0.1, 0, 1.35, -0.85, canopy);
    p.box(0.9, 0.06, 0.06, 0, 1.58, -0.85, 0x222222);
    p.wheel(0, -1.0, 0.29, 0.14).wheel(0.62, 0.92, 0.3, 0.16).wheel(-0.62, 0.92, 0.3, 0.16);
    return p;
  },
};

const geoCache = new Map();

// بيرجع { group, wheels, w, l, kind }
// opts.wheels = true: عجل منفصلة بتلف (عربية اللاعب). غير كده العجل متدمجة فى الجسم.
export function buildVehicle(kind, colorHex, opts = {}) {
  const recipe = RECIPES[kind] ? kind : 'sedan';
  const accent = opts.accent === undefined ? defaultAccent(recipe) : opts.accent;
  const sep = !!opts.wheels;
  const key = [recipe, colorHex, accent, sep ? 1 : 0].join(':');
  let entry = geoCache.get(key);
  if (!entry) {
    const parts = RECIPES[recipe](new Parts(), colorHex, accent);
    const bodyList = parts.body.slice();
    if (!sep) {
      for (const w of parts.wheelSpecs) bodyList.push({ geo: wheelGeo(w.r, w.w), matrix: matrixFor(w.x, w.r, w.z) });
    }
    entry = {
      body: mergeParts(bodyList),
      lit: parts.lit.length ? mergeParts(parts.lit) : null,
      wheelSpecs: parts.wheelSpecs,
    };
    geoCache.set(key, entry);
  }
  const group = new THREE.Group();
  group.add(new THREE.Mesh(entry.body, bodyMat));
  if (entry.lit) group.add(new THREE.Mesh(entry.lit, litMat));
  const wheels = [];
  if (sep) {
    for (const w of entry.wheelSpecs) {
      const m = new THREE.Mesh(wheelGeo(w.r, w.w), bodyMat);
      m.position.set(w.x, w.r, w.z);
      m.userData.r = w.r;
      group.add(m);
      wheels.push(m);
    }
  }
  const size = SIZES[recipe] || SIZES.sedan;
  return { group, wheels, w: size.w, l: size.l, kind: recipe };
}

function defaultAccent(kind) {
  switch (kind) {
    case 'microbus': return 0x2a5bd7;
    case 'boxtruck': return 0xf1f1ee;
    case 'pickup': return 0xf1f1ee;
    case 'truck': return 0x2a5bd7;
    case 'tuktuk': return 0x16181c;
    default: return 0x16181c;
  }
}

// ---------- ناس وعلامات ----------
const matCache = new Map();
function mat(hex) {
  let m = matCache.get(hex);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: hex });
    matCache.set(hex, m);
  }
  return m;
}
function add(g, m, w, h, l, x, y, z) {
  const mesh = new THREE.Mesh(unitBox, m);
  mesh.scale.set(w, h, l);
  mesh.position.set(x, y, z);
  g.add(mesh);
  return mesh;
}

// مجموعة ناس واقفة على الرصيف (بتشاور)
export function buildPerson(shirtHex, count = 1) {
  const g = new THREE.Group();
  const skin = mat(0xd9a679);
  const dark = mat(0x2b2d33);
  const shirts = [shirtHex, 0x3d5a80, 0xb5651d, 0x6c757d, 0x8d5a97, 0x2a9d8f];
  for (let i = 0; i < count; i++) {
    const px = (i - (count - 1) / 2) * 0.7;
    const pz = (i % 2) * 0.25;
    const h = 0.9 + (i % 3) * 0.05;
    add(g, dark, 0.34, 0.55 * h, 0.2, px, 0.28 * h, pz);
    add(g, mat(shirts[i % shirts.length]), 0.44, 0.6 * h, 0.26, px, 0.85 * h, pz);
    add(g, skin, 0.22, 0.22, 0.22, px, 1.3 * h, pz);
    if (i === 0) {
      const arm = add(g, mat(shirts[0]), 0.09, 0.5, 0.09, px + 0.3, 1.25, pz);
      arm.rotation.z = -0.4;
      g.userData.arm = arm;
    }
  }
  return g;
}

// عمود ضوء شفاف يحدد مكان الراكب أو الوجهة
export function buildBeacon(colorHex) {
  const g = new THREE.Group();
  const beamMat = new THREE.MeshBasicMaterial({
    color: colorHex, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 16, 20, 1, true), beamMat);
  beam.position.y = 8;
  g.add(beam);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.2, 1.7, 28),
    new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.2;
  g.add(ring);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 4), new THREE.MeshBasicMaterial({ color: colorHex }));
  arrow.rotation.x = Math.PI;
  arrow.position.y = 4.2;
  g.add(arrow);
  g.userData.arrow = arrow;
  return g;
}

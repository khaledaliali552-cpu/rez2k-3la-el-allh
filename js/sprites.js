// عربيات المرور بصور (Sprites) بدل المجسمات: صور من ورا للعربيات اللى قدامك، ومن قدام للعربيات العكسية.
import * as THREE from '../vendor/three.module.min.js';
import { SIZES } from './vehicles.js';
import { lookFor } from './car-images.js';
import { stickerById } from './data.js';

const DIR = 'assets/images/cars/realistic/';
// [اسم الملف, العرض بالمتر (بالمرايا), نسبة الطول/العرض]
const S = {
  sedanRear: [['sedan-rear-cream', 1.95, 0.8071], ['sedan-rear-silver', 1.95, 0.8071], ['sedan-rear-white', 1.95, 0.8071], ['corolla-silver-rear', 2.0, 0.8071], ['corolla-white-rear', 2.0, 0.8071], ['lancer-black-rear', 1.95, 0.7879], ['lancer-silver-rear', 1.95, 0.7879], ['verna-white-rear', 2.0, 0.8053], ['byd-rear', 2.0, 0.7963], ['corolla20-rear', 2.0, 0.8296], ['mg-rear', 2.0, 0.8371]],
  pickupRear: [['dababa-rear', 2.1, 0.8528], ['flower-blue-rear', 1.95, 1.232], ['flower-red-rear', 1.95, 1.232], ['pickup-green-rear', 2.0, 0.811], ['dababa-blue-rear', 2.12, 0.85], ['dababa-orange-rear', 2.12, 0.85]],
  gwagonRear: [['gwagon-rear', 2.15, 0.9297]],
  ladaRear: [['lada-rear', 1.85, 0.81]],
  suvRear: [['suv-rear', 2.05, 0.8186], ['jeep-rear', 2.0, 0.8721]],
  coupeRear: [['ferrari-rear', 1.95, 0.7909]],
  luxRear: [['lancer-black-rear', 1.95, 0.7879], ['byd-rear', 2.0, 0.7963], ['corolla20-rear', 2.0, 0.8296]],
  taxiRear: [['taxi-verna-rear', 2.0, 0.8454], ['lada-taxi-rear', 1.85, 0.9482]],
  hatchRear: [['hatch-yellow-rear', 1.8, 0.8738]],
  busRear: [['bus-red-rear', 3.0, 0.986], ['bus-blue-rear', 3.33, 0.9308]],
  vanRear: [['van-hiace-rear', 1.95, 0.902]],
  tonayaRear: [['van-white-rear', 1.75, 0.9725]],
  tuktukRear: [['tuktuk-red-rear', 1.45, 1.1494]],
  tuktuk2Rear: [['tuktuk-gold-rear', 1.45, 1.1128]],
  moto: [['moto-rear-red', 0.9, 1.6902], ['moto-rear-yellow', 0.9, 1.7769], ['moto-benelli-rear', 1.26, 1.3481], ['moto-daiwa-rear', 1.24, 1.3673], ['moto-harley-rear', 1.34, 1.2673], ['moto-hojen-rear', 1.59, 1.1038], ['vespa-rear', 1.05, 1.6135]],
  motoFront: [['moto-benelli-front', 1.05, 1.6231], ['moto-daiwa-front', 1.21, 1.4019], ['moto-harley-front', 1.26, 1.3442], ['moto-hojen-front', 1.34, 1.3019], ['vespa-front', 1.04, 1.6288]],
  ambulance: [['ambulance-rear', 2.0, 1.2399]],
  luxFront: [['lux-front-black', 1.95, 0.7464], ['lux-front-blue', 1.95, 0.7464], ['lux-front-beige', 1.95, 0.7464], ['lux-front-silver', 1.95, 0.7464], ['lux-front-white', 1.95, 0.7464]],
  sedanFront: [['bmw-front-black', 1.98, 0.7683], ['bmw-front-blue', 1.98, 0.7683], ['bmw-front-gray', 1.98, 0.7683], ['bmw-front-red', 1.98, 0.7683], ['bmw-front-white', 1.98, 0.7683], ['sedan-front-cream', 1.95, 0.8089], ['sedan-front-silver', 1.95, 0.8089], ['corolla-silver-front', 2.0, 0.8053], ['corolla-white-front', 2.0, 0.8053], ['lancer-black-front', 1.95, 0.7862], ['corolla20-front', 2.0, 0.7639], ['mg-front', 2.0, 0.8097]],
  taxiFront: [['taxi-front', 2.0, 0.812], ['taxi-verna-front', 2.0, 0.8245], ['lada-taxi-front', 1.85, 0.932]],
  coupeFront: [['ferrari-front', 1.95, 0.7622]],
  hatchFront: [['hatch-yellow-front', 1.8, 0.8159]],
  busFront: [['bus-red-front', 3.0, 0.9882], ['bus-blue-front', 3.0, 1.0327]],
  vanFront: [['van-hiace-front', 1.95, 0.8513]],
  tonayaFront: [['van-white-front', 1.75, 0.8878]],
  tuktukFront: [['tuktuk-red-front', 1.45, 1.1812]],
  tuktuk2Front: [['tuktuk-gold-front', 1.45, 1.1566]],
  pickupFront: [['pickup-green-front', 2.0, 0.8118], ['dababa-blue-front', 1.95, 0.9231], ['dababa-orange-front', 1.95, 0.9231]],
  gwagonFront: [['gwagon-front', 2.15, 0.8776]],
  ladaFront: [['lada-front', 1.85, 0.7988]],
  suvFront: [['suv-front', 2.05, 0.7617], ['jeep-front', 2.0, 0.875]],
};
export const IMG = {};
for (const list of Object.values(S)) for (const [n, w, a] of list) IMG[n] = [w, a];

// نوع المرور -> مجموعة الصور (rear = اتجاهك، front = عكسى)
const MAP = {
  rear: { sedan: 'sedanRear', pickup: 'pickupRear', gwagon: 'gwagonRear', lada: 'ladaRear', suv: 'suvRear', moto: 'moto', ambulance: 'ambulance', coupe: 'coupeRear', luxury: 'luxRear', truck: 'pickupRear', boxtruck: 'pickupRear', taxi: 'taxiRear', hatch: 'hatchRear', bus: 'busRear', microbus: 'vanRear', tonaya: 'tonayaRear', tuktuk: 'tuktukRear', tuktuk2: 'tuktuk2Rear' },
  front: { luxury: 'luxFront', sedan: 'sedanFront', taxi: 'taxiFront', gwagon: 'gwagonFront', lada: 'ladaFront', suv: 'suvFront', hatch: 'hatchFront', bus: 'busFront', microbus: 'vanFront', tonaya: 'tonayaFront', tuktuk: 'tuktukFront', tuktuk2: 'tuktuk2Front', pickup: 'pickupFront', moto: 'motoFront', coupe: 'coupeFront', truck: 'pickupFront', boxtruck: 'pickupFront' },
};

const loader = new THREE.TextureLoader();
const mats = new Map();
const geos = new Map();
let light = 1;
let shadowMat = null;
let shadowGeo = null;

function material(name) {
  let m = mats.get(name);
  if (!m) {
    const tex = loader.load(DIR + name + '.webp');
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.06, side: THREE.DoubleSide });
    m.color.setScalar(light);
    mats.set(name, m);
  }
  return m;
}

// إضاءة النهار/الغروب/الليل (الصور مش بتتأثر بالإضاءة، فبنضرب لونها)
export function setSpriteLight(v) {
  light = v;
  for (const m of mats.values()) m.color.setScalar(v);
  if (shadowMat) shadowMat.opacity = 0.55;
}

export function hasSprite(kind, facing) {
  return !!(MAP[facing] && MAP[facing][kind]);
}

// بيرجع { group, w, l, kind, sprite:true } جاهز للإضافة للمشهد
export function buildSprite(kind, facing, size) {
  const list = S[MAP[facing][kind]];
  const [name, w, aspect] = list[Math.floor(Math.random() * list.length)];
  const h = w * aspect;
  const key = w + ':' + h;
  let g = geos.get(key);
  if (!g) {
    g = new THREE.PlaneGeometry(w, h);
    g.translate(0, h / 2, 0);
    geos.set(key, g);
  }
  const group = new THREE.Group();
  const plane = new THREE.Mesh(g, material(name));
  if (facing === 'front') plane.rotation.y = Math.PI; // العربية العكسية مقدمتها ناحية الكاميرا
  plane.renderOrder = 1;
  group.add(plane);
  group.add(contactShadow(w, size.l));
  return { group, wheels: [], w: size.w, l: size.l, kind, sprite: true };
}

function contactShadow(w, l) {
  if (!shadowMat) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 2, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.85)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    shadowMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.55 });
    shadowGeo = new THREE.PlaneGeometry(1, 1);
    shadowGeo.rotateX(-Math.PI / 2);
  }
  const sh = new THREE.Mesh(shadowGeo, shadowMat);
  sh.scale.set(w * 1.05, 1, l * 0.95);
  sh.position.y = 0.03;
  return sh;
}

// ---------- عربية اللاعب (صورة من ورا + كماليات) ----------
const stickerTex = new Map();
function stickerMaterial(id) {
  let m = stickerTex.get(id);
  if (!m) {
    const t = new THREE.TextureLoader().load('assets/images/stickers/' + id + '.webp');
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    m = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide });
    m.color.setScalar(light);
    stickerTex.set(id, m);
  }
  return m;
}
// ارتفاع الاستيكر على الزجاج الخلفى (نسبة من ارتفاع الصورة) وعرضه (نسبة من عرض العربية)
export const STICKER_SPOT = {
  sedan: [0.64, 0.62], taxi: [0.64, 0.6], hatch: [0.62, 0.62], coupe: [0.58, 0.5], suv: [0.64, 0.6], luxury: [0.64, 0.6],
  microbus: [0.62, 0.7], tonaya: [0.6, 0.7], lada: [0.62, 0.6], gwagon: [0.64, 0.6], tuktuk: [0.52, 0.6], tuktuk2: [0.5, 0.6], moto: [0.5, 0.5],
  pickup: [0.7, 0.55], bus: [0.55, 0.6], benelli: [0.4, 0.4], daiwa: [0.4, 0.4], harley: [0.4, 0.4], hojen: [0.4, 0.4], vespa: [0.4, 0.4],
};
export const NOGLASS = new Set(['moto', 'benelli', 'daiwa', 'harley', 'hojen', 'vespa']); // مفيش زجاج خلفى
let barTex = null;

// نيون من حواف العربية من تحت: بنعمل ظل ملون بلون العربية (من الصورة نفسها) ونفرده ونخليه يظهر من تحت بس
const neonMats = new Map();
const NEON_PAD = 0.14;
function neonMaterial(name) {
  let m = neonMats.get(name);
  if (m) return m;
  const cv = document.createElement('canvas');
  m = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, visible: false });
  const img = new Image();
  img.onload = () => {
    const W = 320, H = Math.round(W * img.height / img.width);
    const pw = Math.round(W * NEON_PAD), ph = Math.round(H * NEON_PAD);
    cv.width = W + pw * 2; cv.height = H + ph * 2;
    const x = cv.getContext('2d');
    const t = document.createElement('canvas'); t.width = cv.width; t.height = cv.height;
    const tx = t.getContext('2d');
    tx.drawImage(img, pw, ph, W, H);
    tx.globalCompositeOperation = 'source-in';
    tx.fillStyle = '#4de8ff'; tx.fillRect(0, 0, t.width, t.height);
    x.filter = 'blur(13px)'; x.drawImage(t, 0, 0); x.filter = 'blur(5px)'; x.drawImage(t, 0, 0); x.filter = 'none';
    x.globalCompositeOperation = 'destination-in';
    const gr = x.createLinearGradient(0, ph + H * 0.5, 0, ph + H * 1.02);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.8)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    x.fillStyle = gr; x.fillRect(0, 0, cv.width, cv.height);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    m.map = tex;
    m.visible = true;
    m.needsUpdate = true;
  };
  img.src = DIR + name + '.webp';
  neonMats.set(name, m);
  return m;
}
export function setSpriteLightPlayer() {}

export function buildPlayerSprite(body, colorId, mods) {
  const look = lookFor(body, colorId);
  const [w, aspect] = IMG[look.rear] || [1.9, 0.8];
  const h = w * aspect;
  const lift = mods && (mods.accs || []).includes('lift') ? 0.16 : 0;
  const size = SIZES[body] || SIZES.sedan;
  const group = new THREE.Group();
  group.add(contactShadow(w, size.l));
  const body3 = new THREE.Group();
  body3.position.y = lift;
  group.add(body3);
  let g = geos.get(w + ':' + h);
  if (!g) { g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2, 0); geos.set(w + ':' + h, g); }
  const plane = new THREE.Mesh(g, material(look.rear));
  plane.renderOrder = 1;
  body3.add(plane);
  if (mods && (mods.accs || []).includes('neon')) {
    const ng = new THREE.PlaneGeometry(w * (1 + 2 * NEON_PAD), h * (1 + 2 * NEON_PAD));
    ng.translate(0, h / 2, 0);
    const n = new THREE.Mesh(ng, neonMaterial(look.rear));
    n.position.z = -0.02;
    n.renderOrder = 0;
    body3.add(n);
  }
  // استيكر الكلام على الزجاج الخلفى
  const st = mods && mods.slogan && !NOGLASS.has(body) ? stickerById(mods.slogan) : null;
  if (st) {
    const [fy, fw] = STICKER_SPOT[body] || [0.6, 0.6];
    const sw = w * fw, sh = sw * st.aspect;
    const sg = new THREE.PlaneGeometry(sw, sh);
    const sp = new THREE.Mesh(sg, stickerMaterial(st.id));
    sp.position.set(0, h * fy, 0.03);
    sp.renderOrder = 2;
    body3.add(sp);
  }
  // لمبات السقف
  if (mods && (mods.accs || []).includes('bar')) {
    if (!barTex) {
      const c = document.createElement('canvas');
      c.width = 128; c.height = 16;
      const x = c.getContext('2d');
      for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#ff3b3b' : '#3b8bff'; x.fillRect(i * 16 + 2, 2, 12, 12); }
      barTex = new THREE.CanvasTexture(c);
    }
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.5, w * 0.5 * 0.125), new THREE.MeshBasicMaterial({ map: barTex, transparent: true }));
    bar.position.set(0, h * 0.99, 0.03);
    bar.renderOrder = 2;
    body3.add(bar);
  }
  return { group, wheels: [], w: size.w, l: size.l, kind: body, sprite: true };
}

// عربيات المرور بصور (Sprites) بدل المجسمات: صور من ورا للعربيات اللى قدامك، ومن قدام للعربيات العكسية.
import * as THREE from '../vendor/three.module.min.js';

const DIR = 'assets/images/cars/realistic/';
// [اسم الملف, العرض بالمتر (بالمرايا), نسبة الطول/العرض]
const S = {
  sedanRear: [['sedan-rear-cream', 1.95, 0.8071], ['sedan-rear-silver', 1.95, 0.8071], ['sedan-rear-white', 1.95, 0.8071], ['corolla-silver-rear', 2.0, 0.8071], ['corolla-white-rear', 2.0, 0.8071], ['lancer-black-rear', 1.95, 0.7879], ['lancer-silver-rear', 1.95, 0.7879], ['verna-white-rear', 2.0, 0.8053], ['byd-rear', 2.0, 0.7963], ['corolla20-rear', 2.0, 0.8296], ['mg-rear', 2.0, 0.8371]],
  pickupRear: [['dababa-rear', 2.1, 0.8528], ['flower-blue-rear', 1.95, 1.232], ['flower-red-rear', 1.95, 1.232], ['pickup-green-rear', 2.0, 0.811]],
  gwagonRear: [['gwagon-rear', 2.15, 0.9297]],
  ladaRear: [['lada-rear', 1.85, 0.81]],
  suvRear: [['suv-rear', 2.05, 0.8186], ['jeep-rear', 2.0, 0.8721]],
  taxiRear: [['taxi-verna-rear', 2.0, 0.8454], ['lada-taxi-rear', 1.85, 0.9482]],
  hatchRear: [['hatch-yellow-rear', 1.8, 0.8738]],
  busRear: [['bus-red-rear', 3.0, 0.986]],
  vanRear: [['van-hiace-rear', 1.95, 0.902]],
  tonayaRear: [['van-white-rear', 1.75, 0.9725]],
  tuktukRear: [['tuktuk-red-rear', 1.45, 1.1494]],
  tuktuk2Rear: [['tuktuk-gold-rear', 1.45, 1.1128]],
  moto: [['moto-rear-red', 0.9, 1.6902], ['moto-rear-yellow', 0.9, 1.7769]],
  ambulance: [['ambulance-rear', 2.0, 1.2399]],
  luxFront: [['lux-front-black', 1.95, 0.7464], ['lux-front-blue', 1.95, 0.7464], ['lux-front-beige', 1.95, 0.7464], ['lux-front-silver', 1.95, 0.7464], ['lux-front-white', 1.95, 0.7464]],
  sedanFront: [['bmw-front-black', 1.98, 0.7683], ['bmw-front-blue', 1.98, 0.7683], ['bmw-front-gray', 1.98, 0.7683], ['bmw-front-red', 1.98, 0.7683], ['bmw-front-white', 1.98, 0.7683], ['sedan-front-cream', 1.95, 0.8089], ['sedan-front-silver', 1.95, 0.8089], ['corolla-silver-front', 2.0, 0.8053], ['corolla-white-front', 2.0, 0.8053], ['lancer-black-front', 1.95, 0.7862], ['corolla20-front', 2.0, 0.7639], ['mg-front', 2.0, 0.8097]],
  taxiFront: [['taxi-front', 2.0, 0.812], ['taxi-verna-front', 2.0, 0.8245], ['lada-taxi-front', 1.85, 0.932]],
  hatchFront: [['hatch-yellow-front', 1.8, 0.8159]],
  busFront: [['bus-red-front', 3.0, 0.9882]],
  vanFront: [['van-hiace-front', 1.95, 0.8513]],
  tonayaFront: [['van-white-front', 1.75, 0.8878]],
  tuktukFront: [['tuktuk-red-front', 1.45, 1.1812]],
  tuktuk2Front: [['tuktuk-gold-front', 1.45, 1.1566]],
  pickupFront: [['pickup-green-front', 2.0, 0.8118]],
  gwagonFront: [['gwagon-front', 2.15, 0.8776]],
  ladaFront: [['lada-front', 1.85, 0.7988]],
  suvFront: [['suv-front', 2.05, 0.7617], ['jeep-front', 2.0, 0.875]],
};
// نوع المرور -> مجموعة الصور (rear = اتجاهك، front = عكسى)
const MAP = {
  rear: { sedan: 'sedanRear', pickup: 'pickupRear', gwagon: 'gwagonRear', lada: 'ladaRear', suv: 'suvRear', moto: 'moto', ambulance: 'ambulance', taxi: 'taxiRear', hatch: 'hatchRear', bus: 'busRear', microbus: 'vanRear', tonaya: 'tonayaRear', tuktuk: 'tuktukRear', tuktuk2: 'tuktuk2Rear' },
  front: { luxury: 'luxFront', sedan: 'sedanFront', taxi: 'taxiFront', gwagon: 'gwagonFront', lada: 'ladaFront', suv: 'suvFront', hatch: 'hatchFront', bus: 'busFront', microbus: 'vanFront', tonaya: 'tonayaFront', tuktuk: 'tuktukFront', tuktuk2: 'tuktuk2Front', pickup: 'pickupFront' },
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
  // ظل ملامس للأرض
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
  sh.scale.set(w * 1.05, 1, size.l * 0.95);
  sh.position.y = 0.03;
  group.add(sh);
  return { group, wheels: [], w: size.w, l: size.l, kind, sprite: true };
}

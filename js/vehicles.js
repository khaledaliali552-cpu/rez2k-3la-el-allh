// مجسمات العربيات والناس والعلامات (كلها مبنية من مكعبات بسيطة)
import * as THREE from '../vendor/three.module.min.js';

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 12);
wheelGeo.rotateZ(Math.PI / 2);

const matCache = new Map();
function mat(hex) {
  let m = matCache.get(hex);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: hex });
    matCache.set(hex, m);
  }
  return m;
}
const glass = new THREE.MeshLambertMaterial({ color: 0x1a2530 });
const tire = new THREE.MeshLambertMaterial({ color: 0x111111 });
const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
const tailMat = new THREE.MeshBasicMaterial({ color: 0xcc1f1f });

function add(g, m, w, h, l, x, y, z) {
  const mesh = new THREE.Mesh(boxGeo, m);
  mesh.scale.set(w, h, l);
  mesh.position.set(x, y, z);
  g.add(mesh);
  return mesh;
}

function wheels(g, w, zs, wheelList) {
  for (const z of zs) {
    for (const sx of [-1, 1]) {
      const wh = new THREE.Mesh(wheelGeo, tire);
      wh.position.set(sx * (w / 2 - 0.08), 0.34, z);
      g.add(wh);
      wheelList.push(wh);
    }
  }
}

function lights(g, w, y, zFront, zRear) {
  for (const sx of [-1, 1]) {
    add(g, headMat, 0.36, 0.14, 0.05, sx * (w / 2 - 0.3), y, zFront);
    add(g, tailMat, 0.36, 0.14, 0.05, sx * (w / 2 - 0.3), y, zRear);
  }
}

// الحجم المستخدم فى التصادم (عرض × طول)
export const SIZES = {
  sedan: { w: 1.85, l: 4.5 },
  hatch: { w: 1.75, l: 3.8 },
  taxi: { w: 1.85, l: 4.5 },
  coupe: { w: 1.95, l: 4.5 },
  van: { w: 2.0, l: 4.8 },
  minibus: { w: 2.05, l: 5.3 },
  tuktuk: { w: 1.45, l: 2.7 },
  truck: { w: 2.45, l: 7.2 },
};

export function buildVehicle(kind, colorHex) {
  const g = new THREE.Group();
  const wl = [];
  const body = mat(colorHex);
  const size = SIZES[kind] || SIZES.sedan;

  if (kind === 'sedan' || kind === 'taxi') {
    add(g, body, 1.8, 0.62, 4.4, 0, 0.62, 0);
    add(g, body, 1.58, 0.5, 2.2, 0, 1.17, 0.25);
    add(g, glass, 1.6, 0.3, 2.22, 0, 1.2, 0.25);
    lights(g, 1.8, 0.72, -2.2, 2.2);
    wheels(g, 1.8, [-1.4, 1.4], wl);
    if (kind === 'taxi') {
      add(g, mat(0x16181c), 1.82, 0.16, 4.42, 0, 0.45, 0);
      add(g, mat(0xffffff), 0.7, 0.16, 0.3, 0, 1.52, 0.25);
    }
  } else if (kind === 'hatch') {
    add(g, body, 1.7, 0.6, 3.6, 0, 0.6, 0);
    add(g, body, 1.5, 0.6, 2.3, 0, 1.15, 0.35);
    add(g, glass, 1.52, 0.32, 2.32, 0, 1.2, 0.35);
    lights(g, 1.7, 0.7, -1.8, 1.8);
    wheels(g, 1.7, [-1.15, 1.15], wl);
  } else if (kind === 'coupe') {
    add(g, body, 1.9, 0.5, 4.4, 0, 0.5, 0);
    add(g, body, 1.5, 0.42, 1.9, 0, 0.93, 0.5);
    add(g, glass, 1.52, 0.26, 1.92, 0, 0.96, 0.5);
    add(g, mat(0x16181c), 1.7, 0.06, 0.4, 0, 1.0, 2.05);
    lights(g, 1.9, 0.6, -2.2, 2.2);
    wheels(g, 1.9, [-1.4, 1.4], wl);
  } else if (kind === 'van') {
    add(g, body, 2.0, 1.2, 4.7, 0, 0.95, 0);
    add(g, glass, 2.02, 0.45, 3.6, 0, 1.4, 0.4);
    add(g, body, 2.0, 0.1, 4.7, 0, 1.65, 0);
    lights(g, 2.0, 0.8, -2.35, 2.35);
    wheels(g, 2.0, [-1.5, 1.5], wl);
  } else if (kind === 'minibus') {
    add(g, mat(0xf1f1ee), 2.0, 1.35, 5.2, 0, 1.02, 0);
    add(g, glass, 2.02, 0.5, 4.4, 0, 1.45, 0.25);
    add(g, body, 2.02, 0.2, 5.22, 0, 0.82, 0);
    add(g, mat(0xf1f1ee), 2.0, 0.1, 5.2, 0, 1.75, 0);
    lights(g, 2.0, 0.85, -2.6, 2.6);
    wheels(g, 2.0, [-1.7, 1.7], wl);
  } else if (kind === 'tuktuk') {
    add(g, body, 1.3, 1.0, 1.8, 0, 0.95, 0.35);
    add(g, mat(0x1f3d2b), 1.5, 0.08, 2.3, 0, 1.55, 0.3);
    add(g, glass, 1.32, 0.4, 0.05, 0, 1.2, -0.58);
    add(g, headMat, 0.3, 0.14, 0.05, 0, 0.8, -1.3);
    add(g, tailMat, 0.5, 0.14, 0.05, 0, 0.8, 1.3);
    // عجلة قدام واتنين ورا
    const front = new THREE.Mesh(wheelGeo, tire);
    front.position.set(0, 0.34, -1.0);
    g.add(front);
    wl.push(front);
    for (const sx of [-1, 1]) {
      const wh = new THREE.Mesh(wheelGeo, tire);
      wh.position.set(sx * 0.62, 0.34, 0.9);
      g.add(wh);
      wl.push(wh);
    }
  } else if (kind === 'truck') {
    add(g, mat(0x2c2f36), 2.2, 0.4, 7.0, 0, 0.6, 0);
    add(g, body, 2.2, 1.7, 2.2, 0, 1.45, -2.4);
    add(g, glass, 2.22, 0.55, 2.0, 0, 1.9, -2.45);
    add(g, mat(0xb8b2a6), 2.4, 2.3, 4.6, 0, 1.95, 1.2);
    lights(g, 2.2, 0.8, -3.5, 3.5);
    wheels(g, 2.4, [-2.5, 1.0, 2.6], wl);
  } else {
    return buildVehicle('sedan', colorHex);
  }
  return { group: g, wheels: wl, w: size.w, l: size.l, kind };
}

// شخص واقف على الرصيف بيشاور
export function buildPerson(shirtHex) {
  const g = new THREE.Group();
  const shirt = mat(shirtHex);
  const skin = mat(0xd9a679);
  const dark = mat(0x2b2d33);
  add(g, dark, 0.34, 0.55, 0.2, 0, 0.28, 0);
  add(g, shirt, 0.44, 0.6, 0.26, 0, 0.85, 0);
  add(g, skin, 0.22, 0.22, 0.22, 0, 1.3, 0);
  const arm = add(g, shirt, 0.09, 0.5, 0.09, 0.3, 1.25, 0);
  arm.rotation.z = -0.4;
  g.userData.arm = arm;
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
  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.6, 1.2, 4),
    new THREE.MeshBasicMaterial({ color: colorHex }),
  );
  arrow.rotation.x = Math.PI;
  arrow.position.y = 4.2;
  g.add(arrow);
  g.userData.arrow = arrow;
  return g;
}

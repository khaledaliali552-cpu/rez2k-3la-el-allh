// أحجام التصادم + ناس وعلامات (العربيات نفسها بقت صور: js/sprites.js)
import * as THREE from '../vendor/three.module.min.js';
import { unitBox } from './geo.js';

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
  tuktuk2: { w: 1.45, l: 3.1 },
  lada: { w: 1.72, l: 4.3 },
  gwagon: { w: 1.95, l: 4.7 },
  bus: { w: 2.55, l: 11.2 },
  moto: { w: 0.85, l: 2.1 },
  benelli: { w: 0.85, l: 2.1 },
  daiwa: { w: 0.85, l: 2.1 },
  harley: { w: 0.95, l: 2.4 },
  hojen: { w: 0.95, l: 2.4 },
  vespa: { w: 0.8, l: 1.9 },
  ambulance: { w: 2.0, l: 6.0 },
};


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

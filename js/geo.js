// أدوات هندسة مشتركة: دمج المجسمات فى ميش واحد لتقليل عدد الرسم
import * as THREE from '../vendor/three.module.min.js';

// parts: [{ geo, matrix, color }] — لو الجيومترى فيه ألوان جاهزة (attribute color) بنستخدمها
export function mergeParts(parts) {
  const pos = [];
  const nor = [];
  const col = [];
  const idx = [];
  const uv = [];
  let off = 0;
  for (const p of parts) {
    const g = p.geo.clone();
    if (p.matrix) g.applyMatrix4(p.matrix);
    if (!g.attributes.normal) g.computeVertexNormals();
    const P = g.attributes.position;
    const N = g.attributes.normal;
    const C = g.attributes.color;
    const U = g.attributes.uv;
    const c = new THREE.Color(p.color === undefined ? 0xffffff : p.color);
    for (let i = 0; i < P.count; i++) {
      pos.push(P.getX(i), P.getY(i), P.getZ(i));
      nor.push(N.getX(i), N.getY(i), N.getZ(i));
      if (C) col.push(C.getX(i), C.getY(i), C.getZ(i));
      else col.push(c.r, c.g, c.b);
      if (U) uv.push(U.getX(i), U.getY(i));
      else uv.push(0, 0);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off);
    else for (let i = 0; i < P.count; i++) idx.push(i + off);
    off += P.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setIndex(idx);
  out.computeBoundingSphere();
  return out;
}

// مقطع جانبى (x = للأمام، y = للأعلى) بيتسحب بالعرض. الناتج: مقدمة العربية ناحية -z
export function profileGeo(pts, width, bevel = 0.05) {
  const shape = new THREE.Shape();
  pts.forEach((p, i) => (i ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1])));
  const depth = Math.max(0.02, width - 2 * bevel);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 1, steps: 1,
  });
  g.rotateY(Math.PI / 2);
  g.translate(-depth / 2, 0, 0);
  return g;
}

export const unitBox = new THREE.BoxGeometry(1, 1, 1);

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpP = new THREE.Vector3();
const tmpS = new THREE.Vector3();

export function matrixFor(x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
  tmpP.set(x, y, z);
  tmpS.set(sx, sy, sz);
  tmpE.set(rx, ry, rz);
  tmpQ.setFromEuler(tmpE);
  return tmpM.clone().compose(tmpP, tmpQ, tmpS);
}

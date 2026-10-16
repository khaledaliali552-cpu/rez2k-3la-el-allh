// العالم: كورنيش طويل بيتبنى على حتت (chunks) وبيتمسح وراك
import * as THREE from '../vendor/three.module.min.js';

// ---------- هندسة الطريق ----------
export const LANE_W = 3.6;
export const LANE_X = [-5.4, -1.8, 1.8, 5.4]; // حارات اتجاهك
export const ROAD_L = -7.2;
export const ROAD_R = 7.2;
export const ONC_L = -20;
export const ONC_R = -9.2;
export const ONC_X = [-11, -14.6, -18.2]; // حارات الاتجاه العكسى
export const CURB_X = 9.0; // مكان وقوف الركاب
export const CHUNK = 80;

export const RADAR_FIRST = 700;
export const RADAR_STEP = 1100;
export const radarS = (k) => RADAR_FIRST + k * RADAR_STEP;
export const radarLimit = (k) => (k % 2 === 0 ? 60 : 80);

// انحناء الطريق (شكلى بس: كل حاجة بتتحسب بالمسافة s والإزاحة x)
export const cx = (s) => 38 * Math.sin(s / 650) + 16 * Math.sin(s / 210 + 1.3);
export const dcx = (s) => (38 / 650) * Math.cos(s / 650) + (16 / 210) * Math.cos(s / 210 + 1.3);

export function place(obj, s, x, y = 0) {
  obj.position.set(cx(s) + x, y, -s);
}
// زاوية الدوران حوالين Y لجسم ماشى بسرعة v وانحراف جانبى vx
export function headingYaw(s, v, vx) {
  return Math.atan2(-(dcx(s) * v + vx), Math.max(v, 0.5));
}

export const THEMES = {
  day: {
    label: 'صباح', sky: 0x8fc8ef, fog: 0xcfe6f5, hemiSky: 0xdff1ff, hemiGround: 0xa0a090, hemiI: 1.6,
    sun: 0xfff2d6, sunI: 1.1, sunPos: [80, 120, -40], windows: 0.0, lamp: 0, sea: 0x2a86b8,
  },
  sunset: {
    label: 'غروب', sky: 0xf0905a, fog: 0xf2b48a, hemiSky: 0xffd0a8, hemiGround: 0x7a6a62, hemiI: 1.3,
    sun: 0xffa060, sunI: 0.85, sunPos: [-120, 40, -80], windows: 0.4, lamp: 0.5, sea: 0x9a5f78,
  },
  night: {
    label: 'ليل', sky: 0x0b1226, fog: 0x121c38, hemiSky: 0x4a5c90, hemiGround: 0x2c2c3a, hemiI: 1.05,
    sun: 0x7f96d8, sunI: 0.4, sunPos: [40, 100, 60], windows: 1.0, lamp: 1.0, sea: 0x0d2744,
  },
};

// ---------- أدوات صغيرة ----------
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
  } else {
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  return t;
}

function mergeParts(parts) {
  const pos = [];
  const nor = [];
  const col = [];
  const idx = [];
  let off = 0;
  for (const p of parts) {
    const g = p.geo.clone();
    g.applyMatrix4(p.matrix);
    const P = g.attributes.position;
    const N = g.attributes.normal;
    const c = new THREE.Color(p.color);
    for (let i = 0; i < P.count; i++) {
      pos.push(P.getX(i), P.getY(i), P.getZ(i));
      nor.push(N.getX(i), N.getY(i), N.getZ(i));
      col.push(c.r, c.g, c.b);
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
  out.setIndex(idx);
  return out;
}

// شريط ماشى مع انحناء الطريق
function ribbon(s0, s1, xl, xr, y, material, nSeg, vScale) {
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i <= nSeg; i++) {
    const s = s0 + ((s1 - s0) * i) / nSeg;
    const c = cx(s);
    pos.push(c + xl, y, -s, c + xr, y, -s);
    nor.push(0, 1, 0, 0, 1, 0);
    const v = s / vScale;
    uv.push(0, v, 1, v);
    if (i < nSeg) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return new THREE.Mesh(g, material);
}

// حيطة رأسية على طول الطريق
function wall(s0, s1, x, y0, y1, material, nSeg) {
  const pos = [];
  const idx = [];
  for (let i = 0; i <= nSeg; i++) {
    const s = s0 + ((s1 - s0) * i) / nSeg;
    const c = cx(s);
    pos.push(c + x, y0, -s, c + x, y1, -s);
    if (i < nSeg) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, material);
}

// ---------- العالم ----------
export class World {
  constructor(scene) {
    this.scene = scene;
    this.chunks = new Map();
    this.seed = 1;
    this.themeName = 'day';
    this.dummy = new THREE.Object3D();

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    scene.add(this.hemi, this.sun);
    scene.fog = new THREE.Fog(0xcfe6f5, 80, 520);

    this._makeTextures();
    this._makeMaterials();
    this._makeGeometries();
    this.setTheme('day');
  }

  _makeTextures() {
    const rng = mulberry32(42);
    const road = (lanes) =>
      canvasTex(
        256,
        256,
        (g, w, h) => {
          g.fillStyle = '#34373c';
          g.fillRect(0, 0, w, h);
          for (let i = 0; i < 2600; i++) {
            const a = rng() * 0.25;
            g.fillStyle = rng() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
            g.fillRect(rng() * w, rng() * h, 2, 2);
          }
          g.fillStyle = '#e8e8e0';
          g.fillRect(5, 0, 6, h);
          g.fillRect(w - 11, 0, 6, h);
          for (let l = 1; l < lanes; l++) {
            const x = (w * l) / lanes - 3;
            g.fillRect(x, 0, 6, 86);
          }
        },
        false,
      );
    this.texRoad4 = road(4);
    this.texRoad3 = road(3);

    const cell = 64;
    this.texWin = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#e9e3d4';
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          g.fillStyle = '#2f3c4b';
          g.fillRect(x * cell + 10, y * cell + 12, 44, 34);
          g.fillStyle = 'rgba(255,255,255,0.18)';
          g.fillRect(x * cell + 10, y * cell + 12, 44, 5);
          g.fillStyle = '#c9c2b0';
          g.fillRect(x * cell, y * cell + 56, cell, 8);
        }
      }
    });
    this.texLit = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          if (rng() < 0.55) {
            g.fillStyle = rng() > 0.3 ? '#ffd48a' : '#bfe3ff';
            g.fillRect(x * cell + 10, y * cell + 12, 44, 34);
          }
        }
      }
    });

    this.texSea = canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) {
        g.fillStyle = `rgba(150,190,215,${0.1 + rng() * 0.2})`;
        g.fillRect(rng() * w, rng() * h, 6 + rng() * 22, 2);
      }
    });
    this.texSea.repeat.set(34, 1);

    const signTex = (n) =>
      canvasTex(
        128,
        128,
        (g) => {
          g.fillStyle = '#fff';
          g.beginPath();
          g.arc(64, 64, 62, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = '#d11';
          g.lineWidth = 14;
          g.beginPath();
          g.arc(64, 64, 54, 0, Math.PI * 2);
          g.stroke();
          g.fillStyle = '#111';
          g.font = 'bold 56px Arial, sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(String(n), 64, 68);
        },
        false,
      );
    this.signTex = { 60: signTex(60), 80: signTex(80) };
  }

  _makeMaterials() {
    this.mRoad = new THREE.MeshLambertMaterial({ map: this.texRoad4 });
    this.mRoadOnc = new THREE.MeshLambertMaterial({ map: this.texRoad3 });
    this.mWalk = new THREE.MeshLambertMaterial({ color: 0x9d9c94 });
    this.mConcrete = new THREE.MeshLambertMaterial({ color: 0xb9b7ad, side: THREE.DoubleSide });
    this.mGround = new THREE.MeshLambertMaterial({ color: 0x6b6f66 });
    this.mSea = new THREE.MeshLambertMaterial({ color: 0x2a86b8, map: this.texSea });
    this.mVertex = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.mBulb = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
    this.mMetal = new THREE.MeshLambertMaterial({ color: 0x55585e });
    this.mCamLens = new THREE.MeshBasicMaterial({ color: 0xff3030 });
    const tints = [0xf3eee2, 0xe8d9c0, 0xd9dfe6, 0xe7c9b4, 0xcfd6c4, 0xf0e0d0];
    this.mBuildings = tints.map(
      (t) =>
        new THREE.MeshLambertMaterial({
          color: t,
          map: this.texWin,
          emissive: 0xffffff,
          emissiveMap: this.texLit,
          emissiveIntensity: 0,
        }),
    );
    this.mSign = {
      60: new THREE.MeshBasicMaterial({ map: this.signTex[60] }),
      80: new THREE.MeshBasicMaterial({ map: this.signTex[80] }),
    };
  }

  _makeGeometries() {
    const m = new THREE.Matrix4();
    const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);

    // نخلة: جذع + 7 سعفات
    const parts = [{ geo: new THREE.CylinderGeometry(0.16, 0.26, 7, 6), matrix: T(0, 3.5, 0), color: 0x7a5a3a }];
    const leaf = new THREE.BoxGeometry(3.0, 0.06, 0.45);
    for (let i = 0; i < 7; i++) {
      m.identity();
      m.multiply(T(0, 7, 0));
      m.multiply(new THREE.Matrix4().makeRotationY((i / 7) * Math.PI * 2));
      m.multiply(new THREE.Matrix4().makeRotationZ(-0.4));
      m.multiply(T(1.5, 0, 0));
      parts.push({ geo: leaf, matrix: m.clone(), color: 0x2f7a3c });
    }
    this.palmGeo = mergeParts(parts);

    // عمود نور (دراع واحد جهة -x) ونسخة بدراعين للجزيرة الوسطانية
    const pole = new THREE.CylinderGeometry(0.09, 0.13, 8, 6);
    const arm = new THREE.BoxGeometry(2.2, 0.12, 0.12);
    this.lampGeo = mergeParts([
      { geo: pole, matrix: T(0, 4, 0), color: 0x5b5e66 },
      { geo: arm, matrix: T(-1.1, 8, 0), color: 0x5b5e66 },
    ]);
    this.lampGeo2 = mergeParts([
      { geo: pole, matrix: T(0, 4, 0), color: 0x5b5e66 },
      { geo: arm, matrix: T(-1.1, 8, 0), color: 0x5b5e66 },
      { geo: arm, matrix: T(1.1, 8, 0), color: 0x5b5e66 },
    ]);
    const bulb = new THREE.BoxGeometry(0.55, 0.1, 0.28);
    this.bulbGeo = mergeParts([{ geo: bulb, matrix: T(-2.05, 7.93, 0), color: 0xffffff }]);
    this.bulbGeo2 = mergeParts([
      { geo: bulb, matrix: T(-2.05, 7.93, 0), color: 0xffffff },
      { geo: bulb, matrix: T(2.05, 7.93, 0), color: 0xffffff },
    ]);
    this.mBulbV = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xaaaaaa });
    this.mBulb = this.mBulbV;

    this.unitBox = new THREE.BoxGeometry(1, 1, 1);
    this.signGeo = new THREE.PlaneGeometry(1.3, 1.3);
  }

  setTheme(name) {
    const t = THEMES[name] || THEMES.day;
    this.themeName = name in THEMES ? name : 'day';
    this.scene.background = new THREE.Color(t.sky);
    this.scene.fog.color.set(t.fog);
    this.hemi.color.set(t.hemiSky);
    this.hemi.groundColor.set(t.hemiGround);
    this.hemi.intensity = t.hemiI;
    this.sun.color.set(t.sun);
    this.sun.intensity = t.sunI;
    this.sun.position.set(...t.sunPos);
    this.mSea.color.set(t.sea);
    this.mBulb.color.set(t.lamp > 0 ? new THREE.Color(0xffe2a0).multiplyScalar(0.5 + 0.5 * t.lamp) : 0x8a8d94);
    for (const m of this.mBuildings) m.emissiveIntensity = t.windows * 0.95;
  }

  reset(seed) {
    for (const c of this.chunks.values()) this._disposeChunk(c);
    this.chunks.clear();
    this.seed = seed || 1;
  }

  update(playerS) {
    const lo = Math.floor((playerS - 170) / CHUNK);
    const hi = Math.floor((playerS + 560) / CHUNK);
    for (let i = lo; i <= hi; i++) if (!this.chunks.has(i)) this.chunks.set(i, this._buildChunk(i));
    for (const [i, c] of this.chunks) {
      if (i < lo || i > hi) {
        this._disposeChunk(c);
        this.chunks.delete(i);
      }
    }
  }

  _disposeChunk(c) {
    this.scene.remove(c.group);
    for (const g of c.geos) g.dispose();
    for (const m of c.instanced) m.dispose();
  }

  _instanced(geo, material, items, group, bag) {
    // items: [{s, x, y, yaw, scale}]
    const im = new THREE.InstancedMesh(geo, material, items.length);
    const d = this.dummy;
    items.forEach((it, i) => {
      d.position.set(cx(it.s) + it.x, it.y || 0, -it.s);
      d.rotation.set(0, it.yaw || 0, 0);
      d.scale.setScalar(it.scale || 1);
      d.updateMatrix();
      im.setMatrixAt(i, d.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
    group.add(im);
    bag.push(im);
    return im;
  }

  _buildChunk(i) {
    const s0 = i * CHUNK;
    const s1 = s0 + CHUNK;
    const rng = mulberry32(i * 92821 + this.seed * 7919 + 13);
    const group = new THREE.Group();
    const geos = [];
    const instanced = [];
    const addMesh = (mesh) => {
      group.add(mesh);
      geos.push(mesh.geometry);
      return mesh;
    };
    const N = 10;

    // الأسفلت
    addMesh(ribbon(s0, s1, ROAD_L, ROAD_R, 0, this.mRoad, N, 12));
    addMesh(ribbon(s0, s1, ONC_L, ONC_R, 0, this.mRoadOnc, N, 12));
    // الجزيرة الوسطانية
    addMesh(ribbon(s0, s1, ONC_R, ROAD_L, 0.3, this.mConcrete, N, 12));
    addMesh(wall(s0, s1, ROAD_L, 0, 0.3, this.mConcrete, N));
    addMesh(wall(s0, s1, ONC_R, 0, 0.3, this.mConcrete, N));
    // رصيف ناحية البحر وسور الكورنيش
    addMesh(ribbon(s0, s1, ROAD_R, 13, 0.16, this.mWalk, N, 12));
    addMesh(wall(s0, s1, ROAD_R, 0, 0.16, this.mConcrete, N));
    addMesh(wall(s0, s1, 13, 0.16, 1.0, this.mConcrete, N));
    addMesh(ribbon(s0, s1, 13, 13.7, 1.0, this.mConcrete, N, 12));
    addMesh(wall(s0, s1, 13.7, -2, 1.0, this.mConcrete, N));
    // البحر
    addMesh(ribbon(s0, s1, 13.7, 700, -2, this.mSea, 6, 20));
    // رصيف الجهة التانية والأرض
    addMesh(ribbon(s0, s1, -24, ONC_L, 0.16, this.mWalk, N, 12));
    addMesh(wall(s0, s1, ONC_L, 0, 0.16, this.mConcrete, N));
    addMesh(ribbon(s0, s1, -700, -24, 0.02, this.mGround, 6, 20));

    // أعمدة النور: على السور وعلى الجزيرة
    const lampsR = [];
    const lampsM = [];
    for (let k = 0; k < 3; k++) {
      lampsR.push({ s: s0 + 6 + k * 26.6, x: 12.5, yaw: 0 });
      lampsM.push({ s: s0 + 19 + k * 26.6, x: -8.2, yaw: 0 });
    }
    this._instanced(this.lampGeo, this.mVertex, lampsR, group, instanced);
    this._instanced(this.bulbGeo, this.mBulb, lampsR, group, instanced);
    this._instanced(this.lampGeo2, this.mVertex, lampsM, group, instanced);
    this._instanced(this.bulbGeo2, this.mBulb, lampsM, group, instanced);

    // نخل على الرصيف
    const palms = [];
    for (let k = 0; k < 4; k++) {
      palms.push({ s: s0 + 8 + k * 20 + rng() * 6, x: 11 + rng() * 0.8, yaw: rng() * 6.28, scale: 0.9 + rng() * 0.35 });
    }
    this._instanced(this.palmGeo, this.mVertex, palms, group, instanced);

    // عمارات
    const nB = 3 + Math.floor(rng() * 2);
    for (let b = 0; b < nB; b++) {
      const w = 14 + rng() * 10;
      const h = 18 + rng() * 38;
      const d = 14 + rng() * 8;
      const s = s0 + (b + 0.5) * (CHUNK / nB) + (rng() - 0.5) * 6;
      const x = -(32 + rng() * 10 + d / 2);
      const geo = new THREE.BoxGeometry(w, h, d);
      const uv = geo.attributes.uv;
      for (let f = 0; f < 6; f++) {
        const su = f < 2 ? d / 16 : f >= 4 ? w / 16 : 1;
        const sv = f < 2 || f >= 4 ? h / 12.8 : 1;
        for (let v = 0; v < 4; v++) {
          const idx = f * 4 + v;
          uv.setXY(idx, uv.getX(idx) * su, uv.getY(idx) * sv);
        }
      }
      const mesh = new THREE.Mesh(geo, this.mBuildings[Math.floor(rng() * this.mBuildings.length)]);
      mesh.position.set(cx(s) + x, h / 2, -s);
      mesh.rotation.y = -Math.atan(dcx(s));
      group.add(mesh);
      geos.push(geo);
    }

    // رادار: لافتة السرعة قبله بـ 120 متر
    for (let k = Math.max(0, Math.ceil((s0 - RADAR_FIRST - 130) / RADAR_STEP)); radarS(k) - 130 < s1; k++) {
      const rs = radarS(k);
      const lim = radarLimit(k);
      if (rs >= s0 && rs < s1) this._radarBox(group, rs);
      const ss = rs - 120;
      if (ss >= s0 && ss < s1) {
        const sign = new THREE.Mesh(this.signGeo, this.mSign[lim]);
        sign.position.set(cx(ss) + 8.6, 2.6, -ss);
        sign.rotation.y = -Math.atan(dcx(ss));
        group.add(sign);
        const post = new THREE.Mesh(this.unitBox, this.mMetal);
        post.scale.set(0.12, 2.6, 0.12);
        post.position.set(cx(ss) + 8.6, 1.3, -ss - 0.05);
        group.add(post);
      }
    }

    this.scene.add(group);
    return { group, geos, instanced };
  }

  _radarBox(group, s) {
    const c = cx(s);
    const post = new THREE.Mesh(this.unitBox, this.mMetal);
    post.scale.set(0.22, 5.6, 0.22);
    post.position.set(c + 8.0, 2.8, -s);
    const beam = new THREE.Mesh(this.unitBox, this.mMetal);
    beam.scale.set(6.4, 0.22, 0.22);
    beam.position.set(c + 4.8, 5.6, -s);
    const cam = new THREE.Mesh(this.unitBox, this.mMetal);
    cam.scale.set(0.7, 0.55, 0.9);
    cam.position.set(c + 3.2, 5.2, -s);
    const lens = new THREE.Mesh(this.unitBox, this.mCamLens);
    lens.scale.set(0.2, 0.2, 0.1);
    lens.position.set(c + 3.2, 5.2, -s + 0.48);
    group.add(post, beam, cam, lens);
  }
}

// دالة كثافة الزحمة (0..1) حسب المكان
export const trafficDensity = (s) => 0.55 + 0.35 * Math.sin(s / 700 + 2);

// العالم: طريق طويل بيتبنى على حتت (chunks) وبيتمسح وراك — وكل طريق له بيئته
import * as THREE from '../vendor/three.module.min.js';
import { mergeParts } from './geo.js';
import { getRoad, landmarkS, landmarkAt, landmarkAfter, radarS, radarLimit, nextRadarIndex } from './roads.js';

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

// انحناء الطريق (شكلى بس: كل حاجة بتتحسب بالمسافة s والإزاحة x)
export const cx = (s) => 38 * Math.sin(s / 650) + 16 * Math.sin(s / 210 + 1.3);
export const dcx = (s) => (38 / 650) * Math.cos(s / 650) + (16 / 210) * Math.cos(s / 210 + 1.3);

export function place(obj, s, x, y = 0) {
  obj.position.set(cx(s) + x, y, -s);
}
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

function canvasTex(w, h, draw, repeatY = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = repeatY ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  return t;
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

const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
const FLOOR_H = { apt: 3, old: 3, glass: 3, shed: 6 };
const SHOP_H = 5;
const TILE_W = 12;

const SHOP_WORDS = ['صيدلية', 'سوبر ماركت', 'مخبز', 'عصير', 'موبايلات', 'قهوة', 'كشرى', 'مكتبة', 'ملابس', 'أدوات منزلية', 'حلاق', 'فول وطعمية', 'مطعم', 'مفروشات', 'ألبان'];
const SIGN_COLORS = ['#b3261e', '#1e5aa8', '#1f7a4d', '#c77d0a', '#6a2c91', '#222831', '#0e7c86'];
const ADS = [
  ['عروض الصيف', '#d62828', '#fff'], ['شقق للبيع', '#1d4e89', '#fff'], ['اشترى دلوقتى', '#f2b21b', '#222'],
  ['تقسيط بدون فوائد', '#2a9d8f', '#fff'], ['افتتاح فرع جديد', '#7b2cbf', '#fff'],
];

// ---------- العالم ----------
export class World {
  constructor(scene) {
    this.scene = scene;
    this.chunks = new Map();
    this.seed = 1;
    this.themeName = 'day';
    this.dummy = new THREE.Object3D();
    this.road = getRoad('bashawat');
    this.extraBoards = [];
    this.boardTexCache = new Map();
    this.limitTexCache = new Map();

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    scene.add(this.hemi, this.sun);
    scene.fog = new THREE.Fog(0xcfe6f5, 80, 520);

    this._makeTextures();
    this._makeMaterials();
    this._makeGeometries();
    this.setRoad(this.road);
    this.setTheme('day');
  }

  setRoad(road) {
    this.road = road;
    this.mGround.color.set(road.env.ground);
    this.reset(this.seed);
  }

  // ---------- الخامات ----------
  _makeTextures() {
    const rng = mulberry32(42);
    this.texRoad4 = canvasTex(256, 256, (g, w, h) => {
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
      for (let l = 1; l < 4; l++) g.fillRect((w * l) / 4 - 3, 0, 6, 86);
    }, false);
    this.texRoad3 = canvasTex(256, 256, (g, w, h) => {
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
      for (let l = 1; l < 3; l++) g.fillRect((w * l) / 3 - 3, 0, 6, 86);
    }, false);

    this.texSea = canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) {
        g.fillStyle = `rgba(150,190,215,${0.1 + rng() * 0.2})`;
        g.fillRect(rng() * w, rng() * h, 6 + rng() * 22, 2);
      }
    });
    this.texSea.repeat.set(34, 1);
    this.texCanal = canvasTex(64, 64, (g, w, h) => {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(90,110,80,${0.1 + rng() * 0.2})`;
        g.fillRect(rng() * w, rng() * h, 4 + rng() * 14, 2);
      }
    });

    // --- واجهات المبانى (الألوان بتتضرب فى لون المبنى) ---
    const S = 32; // بكسل لكل متر (منطق الرسم)
    const Q = 1.5; // دقة أعلى للنسيج
    const weather = (g, w, h) => {
      // تعتيق: تدرّج أسود خفيف فوق، تسريبات مية، وبقع
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(0,0,0,0.10)');
      gr.addColorStop(0.5, 'rgba(0,0,0,0)');
      gr.addColorStop(1, 'rgba(60,45,30,0.14)');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        g.fillStyle = `rgba(${rng() < 0.5 ? '70,60,45' : '255,255,255'},${0.03 + rng() * 0.05})`;
        g.fillRect(rng() * w, rng() * h, 2 + rng() * 14, 2 + rng() * 9);
      }
      for (let i = 0; i < 9; i++) {
        const x = rng() * w;
        const gg = g.createLinearGradient(0, 0, 0, h);
        g.fillStyle = `rgba(40,35,28,${0.05 + rng() * 0.05})`;
        g.fillRect(x, rng() * h * 0.3, 2 + rng() * 3, h * (0.3 + rng() * 0.5));
      }
    };
    const tile = (floorH, draw, lit) =>
      canvasTex(TILE_W * S * Q, floorH * S * Q, (g, W, H) => {
        g.scale(Q, Q);
        draw(g, W / Q, H / Q);
        g.setTransform(1, 0, 0, 1, 0, 0);
        if (!lit) weather(g, W, H);
      }, true);
    const rr = (g, x, y, w, h, c) => {
      g.fillStyle = c;
      g.fillRect(x, y, w, h);
    };
    const bays = 3;
    const bw = (TILE_W * S) / bays;

    this.facade = {};
    this.facadeLit = {};
    // شقق بالبلكونات
    const aptDraw = (g, w, h, lit) => {
      rr(g, 0, 0, w, h, lit ? '#000' : '#f4f1ea');
      if (!lit) rr(g, 0, h - 8, w, 8, '#d9d4c8');
      for (let b = 0; b < bays; b++) {
        const x = b * bw;
        const litOn = rng() < 0.55;
        if (lit) {
          if (litOn) rr(g, x + 30, 14, 68, 50, rng() > 0.3 ? '#ffd48a' : '#bfe3ff');
          continue;
        }
        rr(g, x + 28, 12, 72, 54, '#e6e1d4');
        rr(g, x + 32, 16, 64, 46, '#33475a');
        rr(g, x + 32, 16, 64, 6, 'rgba(255,255,255,0.22)');
        rr(g, x + 63, 16, 2, 46, '#e6e1d4');
        if (rng() < 0.4) rr(g, x + 34, 17, 28, 20 + rng() * 22, rng() < 0.5 ? 'rgba(230,205,170,0.8)' : 'rgba(120,150,170,0.7)'); // ستارة
        rr(g, x + 26, 66, 76, 2, 'rgba(0,0,0,0.25)');
        // بلكونة
        rr(g, x + 8, 66, 112, 7, '#cfc9ba');
        g.fillStyle = '#4a4d55';
        for (let i = 0; i < 14; i++) g.fillRect(x + 10 + i * 8, 52, 2, 14);
        rr(g, x + 8, 50, 112, 2, '#4a4d55');
        const r = rng();
        if (r < 0.25) rr(g, x + 100, 24, 18, 14, '#e9ecef'); // تكييف
        else if (r < 0.4) {
          rr(g, x + 14, 56, 10, 8, '#d62828');
          rr(g, x + 26, 56, 10, 8, '#1d4e89');
          rr(g, x + 38, 56, 10, 8, '#f2b21b');
        } else if (r < 0.52) rr(g, x + 96, 18, 8, 44, '#5a7a52');
      }
    };
    const oldDraw = (g, w, h, lit) => {
      rr(g, 0, 0, w, h, lit ? '#000' : '#efe6d0');
      if (!lit) {
        rr(g, 0, h - 6, w, 6, '#cdbf9f');
        rr(g, 0, 0, w, 4, '#cdbf9f');
      }
      for (let b = 0; b < bays; b++) {
        const x = b * bw;
        if (lit) {
          if (rng() < 0.5) rr(g, x + 46, 14, 36, 58, '#ffd48a');
          continue;
        }
        rr(g, x + 40, 10, 48, 66, '#d8cba8');
        rr(g, x + 46, 14, 36, 58, '#2f3f4c');
        rr(g, x + 26, 12, 14, 62, '#5a7a52');
        rr(g, x + 88, 12, 14, 62, '#5a7a52');
        g.fillStyle = '#486040';
        for (let i = 0; i < 8; i++) {
          g.fillRect(x + 27, 16 + i * 7, 12, 2);
          g.fillRect(x + 89, 16 + i * 7, 12, 2);
        }
        rr(g, x + 36, 76, 56, 5, '#bfae86');
      }
    };
    const glassDraw = (g, w, h, lit) => {
      rr(g, 0, 0, w, h, lit ? '#000' : '#d6dfe8');
      if (lit) {
        for (let x = 0; x < w; x += 32) if (rng() < 0.45) rr(g, x + 2, 8, 28, 70, '#ffe0a0');
        return;
      }
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#7f9fb7');
      grd.addColorStop(1, '#5d7d96');
      g.fillStyle = grd;
      g.fillRect(0, 6, w, h - 16);
      g.fillStyle = '#e8eef3';
      for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 2, h);
      rr(g, 0, h - 10, w, 10, '#c3ced8');
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.fillRect(0, 6, w, 5);
    };
    const shedDraw = (g, w, h, lit) => {
      rr(g, 0, 0, w, h, lit ? '#000' : '#d9dbd8');
      if (lit) return;
      g.fillStyle = '#c9ccc8';
      for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 3, h);
      rr(g, 0, h * 0.62, w, 3, '#9aa0a0');
      for (let x = 20; x < w; x += 96) {
        rr(g, x, h * 0.2, 60, 26, '#4a5a66');
        rr(g, x, h * 0.2, 60, 4, 'rgba(255,255,255,0.2)');
      }
      rr(g, 0, h - 8, w, 8, '#b9bcb8');
    };
    const mk = (name, floorH, fn) => {
      this.facade[name] = tile(floorH, (g, w, h) => fn(g, w, h, false), false);
      this.facadeLit[name] = tile(floorH, (g, w, h) => fn(g, w, h, true), true);
    };
    mk('apt', 3, aptDraw);
    mk('old', 3, oldDraw);
    mk('glass', 3, glassDraw);
    mk('shed', 6, shedDraw);

    // واجهات المحلات (3 أشكال)
    this.shopTex = [];
    for (let v = 0; v < 3; v++) {
      this.shopTex.push(
        canvasTex(TILE_W * S, SHOP_H * S, (g, w, h) => {
          rr(g, 0, 0, w, h, '#d9d3c5');
          const n = 4;
          const sw = w / n;
          for (let i = 0; i < n; i++) {
            const x = i * sw;
            const col = SIGN_COLORS[Math.floor(rng() * SIGN_COLORS.length)];
            rr(g, x + 3, 8, sw - 6, 36, col);
            g.fillStyle = '#fff';
            g.font = 'bold 20px Tahoma, Arial, sans-serif';
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.direction = 'rtl';
            g.fillText(SHOP_WORDS[Math.floor(rng() * SHOP_WORDS.length)], x + sw / 2, 27, sw - 12);
            // فاترينة
            rr(g, x + 8, 52, sw - 16, 90, '#2d3a46');
            rr(g, x + 10, 54, sw - 20, 86, rng() < 0.6 ? '#f3dca0' : '#9fc4d8');
            if (v === 0 || rng() < 0.4) {
              // خرطوشة مظلة
              for (let k = 0; k < sw - 6; k += 12) rr(g, x + 3 + k, 44, 6, 10, k % 24 ? '#ffffff' : col);
            }
            // رفوف/بضاعة
            g.fillStyle = 'rgba(40,30,20,0.35)';
            g.fillRect(x + 10, 90, sw - 20, 3);
            g.fillRect(x + 10, 118, sw - 20, 3);
            rr(g, x + 3, 146, sw - 6, 14, '#a8a294');
          }
        }, false),
      );
    }

    // لوحات إعلانات
    this.adTex = ADS.map(([text, bg, fg]) =>
      canvasTex(256, 128, (g, w, h) => {
        rr(g, 0, 0, w, h, bg);
        rr(g, 6, 6, w - 12, h - 12, 'rgba(255,255,255,0.12)');
        g.fillStyle = fg;
        g.font = 'bold 34px Tahoma, Arial, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.direction = 'rtl';
        g.fillText(text, w / 2, h / 2, w - 24);
      }, false),
    );
  }

  _boardTex(name) {
    let t = this.boardTexCache.get(name);
    if (!t) {
      t = canvasTex(1024, 192, (g, w, h) => {
        g.fillStyle = '#0b6e3b';
        g.fillRect(0, 0, w, h);
        g.strokeStyle = '#fff';
        g.lineWidth = 8;
        g.strokeRect(10, 10, w - 20, h - 20);
        g.fillStyle = '#fff';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.direction = 'rtl';
        let size = 104;
        g.font = `bold ${size}px Tahoma, Arial, sans-serif`;
        while (g.measureText(name).width > w - 90 && size > 30) {
          size -= 4;
          g.font = `bold ${size}px Tahoma, Arial, sans-serif`;
        }
        g.fillText(name, w / 2, h / 2 + 4);
      }, false);
      this.boardTexCache.set(name, t);
    }
    return t;
  }

  _limitTex(n) {
    let t = this.limitTexCache.get(n);
    if (!t) {
      t = canvasTex(128, 128, (g) => {
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
        g.font = `bold ${n >= 100 ? 46 : 56}px Arial, sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(String(n), 64, 68);
      }, false);
      this.limitTexCache.set(n, t);
    }
    return t;
  }

  _makeMaterials() {
    this.mRoad = new THREE.MeshLambertMaterial({ map: this.texRoad4 });
    this.mRoadOnc = new THREE.MeshLambertMaterial({ map: this.texRoad3 });
    this.mWalk = new THREE.MeshLambertMaterial({ color: 0x9d9c94 });
    this.mConcrete = new THREE.MeshLambertMaterial({ color: 0xb9b7ad, side: THREE.DoubleSide });
    this.mGround = new THREE.MeshLambertMaterial({ color: 0x6b6f66 });
    this.mSea = new THREE.MeshLambertMaterial({ color: 0x2a86b8, map: this.texSea });
    this.mCanal = new THREE.MeshLambertMaterial({ color: 0x5d7a52, map: this.texCanal });
    this.mVertex = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.mMetal = new THREE.MeshLambertMaterial({ color: 0x55585e });
    this.mRail = new THREE.MeshLambertMaterial({ color: 0x9aa0a6, side: THREE.DoubleSide });
    this.mCamLens = new THREE.MeshBasicMaterial({ color: 0xff3030 });
    this.mFacade = {};
    for (const k of Object.keys(this.facade)) {
      this.mFacade[k] = new THREE.MeshLambertMaterial({
        vertexColors: true, map: this.facade[k], emissive: 0xffffff, emissiveMap: this.facadeLit[k], emissiveIntensity: 0,
      });
    }
    this.mShop = this.shopTex.map(
      (t) => new THREE.MeshLambertMaterial({ vertexColors: true, map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0 }),
    );
    this.mAd = this.adTex.map((t) => new THREE.MeshBasicMaterial({ map: t }));
    this.mDeck = new THREE.MeshLambertMaterial({ color: 0x8e8c85 });
  }

  _makeGeometries() {
    const m = new THREE.Matrix4();
    // نخلة
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

    // شجرة
    const ico = (r) => new THREE.IcosahedronGeometry(r, 0);
    this.treeGeo = mergeParts([
      { geo: new THREE.CylinderGeometry(0.14, 0.22, 3.6, 6), matrix: T(0, 1.8, 0), color: 0x6b4a2b },
      { geo: ico(1.7), matrix: T(0, 4.2, 0), color: 0x3f7d3a },
      { geo: ico(1.2), matrix: T(0.9, 5.2, 0.4), color: 0x4c8f44 },
      { geo: ico(1.1), matrix: T(-0.8, 4.9, -0.5), color: 0x37702f },
    ]);
    // شجيرة / صخرة صحراء
    this.bushGeo = mergeParts([{ geo: ico(0.7), matrix: T(0, 0.45, 0), color: 0x7c7a4a }, { geo: ico(0.5), matrix: T(0.6, 0.3, 0.3), color: 0x6b6a3e }]);
    this.rockGeo = mergeParts([{ geo: ico(1.0), matrix: new THREE.Matrix4().makeScale(1.6, 0.8, 1.2).setPosition(0, 0.5, 0), color: 0x9a8a6a }]);
    // عمود كهربا
    this.polePowerGeo = mergeParts([
      { geo: new THREE.CylinderGeometry(0.12, 0.16, 10, 6), matrix: T(0, 5, 0), color: 0x6a6258 },
      { geo: new THREE.BoxGeometry(3.2, 0.14, 0.14), matrix: T(0, 9.4, 0), color: 0x55585e },
      { geo: new THREE.BoxGeometry(2.2, 0.12, 0.12), matrix: T(0, 8.4, 0), color: 0x55585e },
    ]);

    // عمود نور
    const pole = new THREE.CylinderGeometry(0.09, 0.13, 8, 6);
    const arm = new THREE.BoxGeometry(2.2, 0.12, 0.12);
    this.lampGeo = mergeParts([{ geo: pole, matrix: T(0, 4, 0), color: 0x5b5e66 }, { geo: arm, matrix: T(-1.1, 8, 0), color: 0x5b5e66 }]);
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
    this.mBulb = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xaaaaaa });

    this.unitBox = new THREE.BoxGeometry(1, 1, 1);
    this.signGeo = new THREE.PlaneGeometry(1.3, 1.3);
    this.planeGeo = new THREE.PlaneGeometry(1, 1);
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
    for (const k of Object.keys(this.mFacade)) this.mFacade[k].emissiveIntensity = t.windows * 0.95;
    for (const m of this.mShop) m.emissiveIntensity = t.windows * 0.55;
  }

  reset(seed) {
    for (const c of this.chunks.values()) this._disposeChunk(c);
    this.chunks.clear();
    this.extraBoards = [];
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
    if (!items.length) return null;
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

  // ---------- المبانى ----------
  // صندوق بإحداثيات UV مظبوطة لتكرار الواجهة (D = عمق عرضى، L = الطول على الطريق)
  _facadeBox(D, h, L, kind, base) {
    const g = new THREE.BoxGeometry(D, h, L);
    const uv = g.attributes.uv;
    const tileH = kind === 'shop' ? SHOP_H : FLOOR_H[base];
    for (let f = 0; f < 6; f++) {
      for (let v = 0; v < 4; v++) {
        const i = f * 4 + v;
        const u0 = uv.getX(i);
        const v0 = uv.getY(i);
        if (f < 2) uv.setXY(i, u0 * (L / TILE_W), v0 * (h / tileH));
        else if (f >= 4) uv.setXY(i, u0 * (D / TILE_W), v0 * (h / tileH));
        else uv.setXY(i, 0.5, kind === 'shop' ? 0.5 : 0.03);
      }
    }
    return g;
  }

  // مبنى = قاعدة محلات (اختيارى) + أدوار فوقها
  _addBuilding(bag, spec, rng) {
    const { s, x, D, L, h, style, tint, shops } = spec;
    const rot = new THREE.Matrix4().makeRotationY(-Math.atan(dcx(s)));
    const base = (cy, geo) => T(cx(s) + x, cy, -s).multiply(rot);
    const put = (key, geo, cy, color) => {
      (bag[key] = bag[key] || []).push({ geo, matrix: base(cy), color });
    };
    if (shops) {
      const v = Math.floor(rng() * 3);
      put('shop' + v, this._facadeBox(D, SHOP_H, L, 'shop'), SHOP_H / 2, tint);
      put(style, this._facadeBox(D, h - SHOP_H, L, 'floor', style), SHOP_H + (h - SHOP_H) / 2, tint);
    } else {
      put(style, this._facadeBox(D, h, L, 'floor', style), h / 2, tint);
    }
    const side = x < 0 ? -1 : 1;
    const fx = -side * (D / 2); // وش المبنى ناحية الطريق (محلى)
    const box = (w, hh, l, lx, cy, lz, color, tl = 0) => {
      (bag.vtx = bag.vtx || []).push({
        geo: this.unitBox,
        matrix: base(cy).multiply(new THREE.Matrix4().makeTranslation(lx, 0, lz)).multiply(new THREE.Matrix4().makeScale(w, hh, l)),
        color,
      });
    };
    const baseY = shops ? SHOP_H : 0;
    const floorsN = Math.max(1, Math.round((h - baseY) / 3));
    // بلكونات بارزة للشقق (محاذية لنسيج الواجهة: u=0 من طرف المبنى)
    if (style === 'apt' && L > 8) {
      const bayW = TILE_W / 3;
      const nBays = Math.floor((L - 0.5) / bayW);
      for (let f = 0; f < floorsN; f++) {
        const y = baseY + f * 3;
        for (let t = 0; t < nBays; t++) {
          if (rng() < 0.2) continue;
          const lz = side > 0 ? -L / 2 + (t + 0.5) * bayW : L / 2 - (t + 0.5) * bayW;
          box(1.0, 0.14, bayW * 0.87, fx - side * 0.5, y + 0.72, lz, 0xc9c3b4);
          box(0.05, 0.85, bayW * 0.87, fx - side * 1.0, y + 1.2, lz, 0x4a4d55);
        }
      }
    }
    // مظلة المحل
    if (shops && rng() < 0.65) {
      const col = [0xd62828, 0x1d4e89, 0x2f8f5b, 0xe8741c, 0x7a3fb0][Math.floor(rng() * 5)];
      const aw = L * (0.45 + rng() * 0.4);
      (bag.vtx = bag.vtx || []).push({
        geo: this.unitBox,
        matrix: base(SHOP_H - 0.35).multiply(new THREE.Matrix4().makeTranslation(fx - side * 0.6, 0, (rng() - 0.5) * (L - aw))).multiply(new THREE.Matrix4().makeScale(1.4, 0.08, aw)),
        color: col,
      });
    }
    // سور السطح
    if (style !== 'shed') {
      box(0.3, 0.6, L, fx + side * 0.15, h + 0.3, 0, 0xb8b2a4);
      box(D, 0.6, 0.3, 0, h + 0.3, -L / 2 + 0.15, 0xb8b2a4);
      box(D, 0.6, 0.3, 0, h + 0.3, L / 2 - 0.15, 0xb8b2a4);
    }
    // سطح: خزانات/أسوار
    if (style !== 'shed' && rng() < 0.6) {
      (bag.vtx = bag.vtx || []).push({
        geo: this.unitBox,
        matrix: T(cx(s) + x, h + 0.8, -s).multiply(rot).multiply(new THREE.Matrix4().makeScale(D * 0.35, 1.6, L * 0.25)),
        color: 0xcfcac0,
      });
    }
  }

  // صف مبانى متلاصقة على جنب الطريق
  _streetWall(bag, rng, s0, side, cfg) {
    let pos = 0;
    while (pos < CHUNK - 0.5) {
      let L = cfg.len[0] + rng() * (cfg.len[1] - cfg.len[0]);
      if (CHUNK - (pos + L) < 10) L = CHUNK - pos;
      if (rng() < cfg.gap) {
        pos += Math.min(L, 10);
        continue;
      }
      const D = cfg.depth[0] + rng() * (cfg.depth[1] - cfg.depth[0]);
      const styleKey = cfg.styles[Math.floor(rng() * cfg.styles.length)];
      const tints = cfg.tints[styleKey] || cfg.tints.default;
      const floors = cfg.floors[0] + Math.floor(rng() * (cfg.floors[1] - cfg.floors[0] + 1));
      const h = styleKey === 'shed' ? 8 + rng() * 5 : cfg.shops ? SHOP_H + floors * 3 : floors * 3;
      const s = s0 + pos + L / 2;
      const x = side * (cfg.front + D / 2 + rng() * cfg.jitter);
      this._addBuilding(bag, { s, x, D, L: L - 0.3, h, style: styleKey, tint: tints[Math.floor(rng() * tints.length)], shops: cfg.shops && styleKey !== 'shed' }, rng);
      pos += L;
    }
  }

  _envFor(road) {
    const warm = [0xf3eee2, 0xe8d9c0, 0xe7c9b4, 0xf0e0d0, 0xd9cdb5, 0xeadbc8];
    const cool = [0xd9dfe6, 0xcfd6c4, 0xdfe6ea, 0xe8e0d0];
    const old = [0xf0e2c0, 0xe6d3a6, 0xdcc89a, 0xe9d9b8];
    const glass = [0xbfd3e4, 0xaec4d4, 0xc9d9d6, 0xd0d8e2];
    const sheds = [0xdfe2de, 0xc9d3dc, 0xdbd2c0, 0xd2d9cf];
    const tints = { default: warm, apt: warm.concat(cool), old, glass, shed: sheds };
    const e = road.env;
    const L = {
      towers: [
        { front: 27, jitter: 2, depth: [16, 22], len: [16, 26], floors: [8, 18], styles: ['apt', 'apt', 'apt', 'glass', 'glass'], gap: 0.05, shops: true, tints },
        { front: 58, jitter: 4, depth: [18, 26], len: [22, 34], floors: [14, 28], styles: ['glass', 'apt', 'glass'], gap: 0.3, shops: false, tints },
      ],
      old: [
        { front: 27, jitter: 1, depth: [14, 18], len: [12, 20], floors: [4, 8], styles: ['old', 'old', 'old', 'apt'], gap: 0.06, shops: true, tints },
        { front: 50, jitter: 3, depth: [16, 20], len: [16, 26], floors: [6, 11], styles: ['apt', 'old'], gap: 0.25, shops: false, tints },
      ],
      shops: [
        { front: 26, jitter: 1, depth: [12, 16], len: [10, 16], floors: [2, 5], styles: ['apt', 'apt', 'old', 'old'], gap: 0.12, shops: true, tints },
        { front: 44, jitter: 3, depth: [14, 18], len: [14, 22], floors: [4, 8], styles: ['apt', 'old'], gap: 0.3, shops: false, tints },
      ],
      mixed: [
        { front: 32, jitter: 5, depth: [14, 20], len: [14, 24], floors: [3, 8], styles: ['apt', 'apt', 'glass', 'old'], gap: 0.4, shops: true, tints },
      ],
      industrial: [
        { front: 36, jitter: 6, depth: [20, 30], len: [24, 40], floors: [1, 1], styles: ['shed'], gap: 0.45, shops: false, tints },
      ],
    };
    const R = {
      buildings: [
        { front: 15.5, jitter: 1, depth: [14, 18], len: [12, 20], floors: [5, 10], styles: ['apt', 'apt', 'apt', 'old', 'glass'], gap: 0.08, shops: true, tints },
        { front: 40, jitter: 4, depth: [16, 22], len: [18, 28], floors: [8, 15], styles: ['apt', 'glass'], gap: 0.3, shops: false, tints },
      ],
      canal: [
        { front: 25, jitter: 1, depth: [12, 16], len: [10, 16], floors: [3, 6], styles: ['apt', 'apt', 'old'], gap: 0.14, shops: true, tints },
      ],
      sea: [],
      desert: [],
    };
    return { left: L[e.left] || [], right: R[e.right] || [] };
  }

  _buildChunk(i) {
    const road = this.road;
    const env = road.env;
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
    const sea = env.right === 'sea';
    const canal = env.right === 'canal';

    // الأسفلت والجزيرة
    addMesh(ribbon(s0, s1, ROAD_L, ROAD_R, 0, this.mRoad, N, 12));
    addMesh(ribbon(s0, s1, ONC_L, ONC_R, 0, this.mRoadOnc, N, 12));
    addMesh(ribbon(s0, s1, ONC_R, ROAD_L, 0.3, this.mConcrete, N, 12));
    addMesh(wall(s0, s1, ROAD_L, 0, 0.3, this.mConcrete, N));
    addMesh(wall(s0, s1, ONC_R, 0, 0.3, this.mConcrete, N));
    if (env.median === 'guardrail') addMesh(wall(s0, s1, -8.2, 0.3, 0.95, this.mRail, N));
    if (env.median === 'concrete') addMesh(wall(s0, s1, -8.2, 0.3, 0.75, this.mConcrete, N));

    // الجهة اليمين
    if (sea) {
      addMesh(ribbon(s0, s1, ROAD_R, 13, 0.16, this.mWalk, N, 12));
      addMesh(wall(s0, s1, ROAD_R, 0, 0.16, this.mConcrete, N));
      addMesh(wall(s0, s1, 13, 0.16, 1.0, this.mConcrete, N));
      addMesh(ribbon(s0, s1, 13, 13.7, 1.0, this.mConcrete, N, 12));
      addMesh(wall(s0, s1, 13.7, -2, 1.0, this.mConcrete, N));
      addMesh(ribbon(s0, s1, 13.7, 700, -2, this.mSea, 6, 20));
    } else if (canal) {
      addMesh(ribbon(s0, s1, ROAD_R, 12, 0.16, this.mWalk, N, 12));
      addMesh(wall(s0, s1, ROAD_R, 0, 0.16, this.mConcrete, N));
      addMesh(wall(s0, s1, 12, -1.6, 0.16, this.mConcrete, N));
      addMesh(ribbon(s0, s1, 12, 20, -1.6, this.mCanal, 4, 14));
      addMesh(wall(s0, s1, 20, -1.6, 0.16, this.mConcrete, N));
      addMesh(ribbon(s0, s1, 20, 23, 0.16, this.mWalk, N, 12));
      addMesh(ribbon(s0, s1, 23, 700, 0.02, this.mGround, 6, 20));
    } else {
      const wEnd = env.right === 'buildings' ? 15.5 : 11;
      addMesh(ribbon(s0, s1, ROAD_R, wEnd, 0.16, this.mWalk, N, 12));
      addMesh(wall(s0, s1, ROAD_R, 0, 0.16, this.mConcrete, N));
      addMesh(ribbon(s0, s1, wEnd, 700, 0.02, this.mGround, 6, 20));
    }
    // الجهة الشمال
    addMesh(ribbon(s0, s1, -24, ONC_L, 0.16, this.mWalk, N, 12));
    addMesh(wall(s0, s1, ONC_L, 0, 0.16, this.mConcrete, N));
    addMesh(ribbon(s0, s1, -700, -24, 0.02, this.mGround, 6, 20));

    // أعمدة النور
    const lampX = sea ? 12.5 : 10.4;
    const lampsR = [];
    const lampsM = [];
    const spacing = road.id === 'fast' ? 40 : 26.6;
    const cnt = Math.round(CHUNK / spacing);
    for (let k = 0; k < cnt; k++) {
      lampsR.push({ s: s0 + 6 + k * spacing, x: lampX, yaw: 0 });
      lampsM.push({ s: s0 + 6 + spacing / 2 + k * spacing, x: -8.2, yaw: 0 });
    }
    this._instanced(this.lampGeo, this.mVertex, lampsR, group, instanced);
    this._instanced(this.bulbGeo, this.mBulb, lampsR, group, instanced);
    this._instanced(this.lampGeo2, this.mVertex, lampsM, group, instanced);
    this._instanced(this.bulbGeo2, this.mBulb, lampsM, group, instanced);

    // شجر ونخل
    const palms = [];
    const trees = [];
    const bushes = [];
    const rocks = [];
    const poles = [];
    if (env.trees === 'palm') {
      for (let k = 0; k < 4; k++) palms.push({ s: s0 + 8 + k * 20 + rng() * 6, x: 11 + rng() * 0.8, yaw: rng() * 6.28, scale: 0.9 + rng() * 0.35 });
      for (let k = 0; k < 3; k++) palms.push({ s: s0 + 12 + k * 26 + rng() * 6, x: -22.6, yaw: rng() * 6.28, scale: 0.9 + rng() * 0.3 });
    } else if (env.trees === 'tree') {
      for (let k = 0; k < 5; k++) trees.push({ s: s0 + 4 + k * 16 + rng() * 5, x: 10.6 + rng() * 0.6, yaw: rng() * 6.28, scale: 0.8 + rng() * 0.4 });
      for (let k = 0; k < 4; k++) trees.push({ s: s0 + 6 + k * 20 + rng() * 6, x: -22.6, yaw: rng() * 6.28, scale: 0.8 + rng() * 0.4 });
    }
    if (env.median === 'palms') for (let k = 0; k < 3; k++) palms.push({ s: s0 + 10 + k * 26.6, x: -8.2, yaw: rng() * 6.28, scale: 0.8 });
    if (env.right === 'desert') {
      for (let k = 0; k < 8; k++) {
        const x = 14 + rng() * 60;
        (rng() < 0.55 ? bushes : rocks).push({ s: s0 + rng() * CHUNK, x, yaw: rng() * 6.28, scale: 0.7 + rng() * 1.2 });
      }
      for (let k = 0; k < 2; k++) poles.push({ s: s0 + 10 + k * 40, x: 13.5, yaw: 0 });
    }
    if (env.left === 'industrial' || env.left === 'mixed') {
      for (let k = 0; k < 3; k++) poles.push({ s: s0 + 5 + k * 30, x: -22.4, yaw: 0 });
    }
    this._instanced(this.palmGeo, this.mVertex, palms, group, instanced);
    this._instanced(this.treeGeo, this.mVertex, trees, group, instanced);
    this._instanced(this.bushGeo, this.mVertex, bushes, group, instanced);
    this._instanced(this.rockGeo, this.mVertex, rocks, group, instanced);
    this._instanced(this.polePowerGeo, this.mVertex, poles, group, instanced);

    // المبانى
    const bag = {};
    const cfg = this._envFor(road);
    for (const c of cfg.left) this._streetWall(bag, rng, s0, -1, c);
    for (const c of cfg.right) this._streetWall(bag, rng, s0, 1, c);
    // حاويات فى المناطق الصناعية
    if (env.left === 'industrial') {
      const cols = [0xb3392b, 0x2a5a9a, 0x2f7d52, 0xc98a24, 0x8a8f94];
      for (let k = 0; k < 4; k++) {
        const s = s0 + rng() * CHUNK;
        const stack = 1 + Math.floor(rng() * 2);
        for (let j = 0; j < stack; j++) {
          (bag.vtx = bag.vtx || []).push({
            geo: this.unitBox,
            matrix: T(cx(s) - 28 - rng() * 2, 1.3 + j * 2.6, -s).multiply(new THREE.Matrix4().makeRotationY(-Math.atan(dcx(s)))).multiply(new THREE.Matrix4().makeScale(2.5, 2.55, 6.1)),
            color: cols[Math.floor(rng() * cols.length)],
          });
        }
      }
    }
    for (const key of Object.keys(bag)) {
      let mat;
      if (key === 'vtx') mat = this.mVertex;
      else if (key.startsWith('shop')) mat = this.mShop[+key.slice(4)];
      else mat = this.mFacade[key];
      const geo = mergeParts(bag[key]);
      for (const p of bag[key]) if (p.geo !== this.unitBox) p.geo.dispose();
      addMesh(new THREE.Mesh(geo, mat));
    }

    // لوحات إعلانات
    if (env.billboards && rng() < 0.55) {
      const s = s0 + 10 + rng() * 60;
      const right = sea ? false : rng() < 0.6;
      const x = right ? 12.6 : -26.5;
      const ad = this.mAd[Math.floor(rng() * this.mAd.length)];
      const yaw = -Math.atan(dcx(s));
      const board = new THREE.Mesh(this.planeGeo, ad);
      board.scale.set(9, 4.5, 1);
      board.position.set(cx(s) + x, 8.6, -s);
      board.rotation.y = yaw;
      group.add(board);
      for (const dx of [-3.2, 3.2]) {
        const post = new THREE.Mesh(this.unitBox, this.mMetal);
        post.scale.set(0.25, 6.4, 0.25);
        post.position.set(cx(s) + x + dx * Math.cos(yaw), 3.2, -s - 0.15 - dx * Math.sin(yaw) * -1);
        group.add(post);
      }
      const back = new THREE.Mesh(this.unitBox, this.mMetal);
      back.scale.set(9.2, 4.7, 0.2);
      back.position.set(cx(s) + x, 8.6, -s - 0.15);
      back.rotation.y = yaw;
      group.add(back);
    }

    // كوبرى علوى
    if (env.overpass && ((i * 7 + 3) % 12 === 0)) {
      const s = s0 + CHUNK / 2;
      const yaw = -Math.atan(dcx(s));
      const deck = new THREE.Mesh(this.unitBox, this.mDeck);
      deck.scale.set(46, 1.3, 14);
      deck.position.set(cx(s) - 5, 8.2, -s);
      deck.rotation.y = yaw;
      group.add(deck);
      const rail = new THREE.Mesh(this.unitBox, this.mMetal);
      for (const zz of [-6.8, 6.8]) {
        const r = new THREE.Mesh(this.unitBox, this.mMetal);
        r.scale.set(46, 1.0, 0.25);
        const off = new THREE.Vector3(0, 0, zz).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        r.position.set(cx(s) - 5 + off.x, 9.35, -s + off.z);
        r.rotation.y = yaw;
        group.add(r);
      }
      for (const px of [-8.2, 10, -22]) {
        const p = new THREE.Mesh(this.unitBox, this.mDeck);
        p.scale.set(1.2, 8, 3);
        p.position.set(cx(s) + px, 4, -s);
        p.rotation.y = yaw;
        group.add(p);
      }
      void rail;
    }

    // لافتات المحطات
    if (road.landmarks.length) {
      for (let k = landmarkAfter(road, s0); landmarkS(road, k) - 70 < s1; k++) {
        this._landmarkSigns(group, landmarkS(road, k), landmarkAt(road, k).name, s0, s1);
      }
    }
    for (const b of this.extraBoards) this._landmarkSigns(group, b.s, b.name, s0, s1);

    // رادار: لافتة السرعة قبله بـ 120 متر
    for (let k = nextRadarIndex(road, s0 - 130); radarS(road, k) - 130 < s1; k++) {
      const rs = radarS(road, k);
      const lim = radarLimit(road, k);
      if (rs >= s0 && rs < s1) this._radarBox(group, rs);
      const ss = rs - 120;
      if (ss >= s0 && ss < s1) {
        const mat = new THREE.MeshBasicMaterial({ map: this._limitTex(lim) });
        const sign = new THREE.Mesh(this.signGeo, mat);
        sign.position.set(cx(ss) + 8.6, 2.6, -ss);
        sign.rotation.y = -Math.atan(dcx(ss));
        group.add(sign);
        geos.push(sign.material);
        const post = new THREE.Mesh(this.unitBox, this.mMetal);
        post.scale.set(0.12, 2.6, 0.12);
        post.position.set(cx(ss) + 8.6, 1.3, -ss - 0.05);
        group.add(post);
      }
    }

    this.scene.add(group);
    return { group, geos, instanced };
  }

  _boardMaterial(name) {
    if (!this._boardMat) this._boardMat = new Map();
    let mat = this._boardMat.get(name);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({ map: this._boardTex(name) });
      this._boardMat.set(name, mat);
    }
    return mat;
  }

  // لافتة المحطة: بوابة فوق الطريق قبلها بـ 70م + لافتة صغيرة عند المكان
  _landmarkSigns(group, ls, name, s0, s1) {
    const mat = this._boardMaterial(name);
    const gs = ls - 70;
    if (gs >= s0 && gs < s1) {
      const yaw = -Math.atan(dcx(gs));
      const c = cx(gs);
      const board = new THREE.Mesh(this.planeGeo, mat);
      board.scale.set(10, 1.9, 1);
      board.position.set(c + 0.8, 6.3, -gs);
      board.rotation.y = yaw;
      group.add(board);
      const beam = new THREE.Mesh(this.unitBox, this.mMetal);
      beam.scale.set(19, 0.3, 0.3);
      beam.position.set(c + 0.8, 7.5, -gs - 0.1);
      beam.rotation.y = yaw;
      group.add(beam);
      for (const px of [-8.2, 9.8]) {
        const post = new THREE.Mesh(this.unitBox, this.mMetal);
        post.scale.set(0.3, 7.5, 0.3);
        post.position.set(c + px, 3.75, -gs - 0.1);
        group.add(post);
      }
    }
    if (ls >= s0 && ls < s1) {
      const c = cx(ls);
      const board = new THREE.Mesh(this.planeGeo, mat);
      board.scale.set(4.2, 0.8, 1);
      board.position.set(c + 10.4, 3.6, -ls);
      board.rotation.y = -Math.atan(dcx(ls));
      group.add(board);
      const post = new THREE.Mesh(this.unitBox, this.mMetal);
      post.scale.set(0.14, 3.6, 0.14);
      post.position.set(c + 10.4, 1.8, -ls - 0.1);
      group.add(post);
    }
  }

  // وجهة ديناميك (للشغل الحر): بتتحط حتى لو الـ chunk اتبنى
  addBoard(s, name) {
    this.extraBoards.push({ s, name });
    for (const [i, c] of this.chunks) {
      const s0 = i * CHUNK;
      this._landmarkSigns(c.group, s, name, s0, s0 + CHUNK);
    }
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

// صور مصغرة للعربيات (بتتولد بكاميرا جانبية وتتخزن)
import * as THREE from '../vendor/three.module.min.js';
import { buildVehicle } from './vehicles.js';

let r = null, scene = null, cam = null, failed = false;
const cache = new Map();

function init() {
  try {
    const c = document.createElement('canvas');
    c.width = 320; c.height = 190;
    r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setSize(320, 190, false);
    r.setClearColor(0x000000, 0);
    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x4a4f58, 1.15));
    const d = new THREE.DirectionalLight(0xfff1d6, 1.6);
    d.position.set(-6, 9, -7);
    scene.add(d);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    scene.add(floor);
    cam = new THREE.PerspectiveCamera(26, 320 / 190, 0.1, 100);
  } catch (e) {
    failed = true;
  }
}

export function carThumb(kind, colorHex, mods) {
  const key = kind + ':' + colorHex + ':' + JSON.stringify(mods || null);
  if (cache.has(key)) return cache.get(key);
  if (failed) return '';
  if (!r) init();
  if (failed) return '';
  let url = '';
  try {
    const m = buildVehicle(kind, colorHex, mods ? { mods } : {});
    scene.add(m.group);
    const L = m.l;
    const dist = Math.max(9, L * 2.1);
    cam.position.set(-dist * 0.62, dist * 0.3, -dist * 0.72);
    cam.lookAt(0, 0.75, 0);
    r.render(scene, cam);
    url = r.domElement.toDataURL('image/png');
    scene.remove(m.group);
  } catch (e) {
    url = '';
  }
  cache.set(key, url);
  return url;
}

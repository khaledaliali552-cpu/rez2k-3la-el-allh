// صور واقعية للمركبات فى كروت الجراج والإعداد والورشة (بتتحمّل لو الملف موجود، وإلا بنرجع للصورة المتولدة من المجسم 3D).
// الصور فى assets/images/cars/realistic/  (WebP/PNG بخلفية شفافة). اللعبة نفسها 3D؛ صور المرور فى js/sprites.js.
export const CAR_IMAGE_DIR = 'assets/images/cars/realistic/';

// نوع المركبة -> { اللون: اسم الملف }.  اللون اللى مالوش صورة بيعرض المجسم 3D بنفس اللون.
// لإضافة صور جديدة: حطها فى الفولدر وسجلها هنا (مثلا taxi: { yellow: 'taxi-yellow.webp' }).
export const CAR_IMAGES = {
  luxury: { black: 'lux-front-black.webp', blue: 'lux-front-blue.webp', yellow: 'lux-front-beige.webp', silver: 'lux-front-silver.webp', white: 'lux-front-white.webp' },
  coupe: { black: 'bmw-front-black.webp', blue: 'bmw-front-blue.webp', silver: 'bmw-front-gray.webp', red: 'bmw-front-red.webp', white: 'bmw-front-white.webp' },
  sedan: { yellow: 'sedan-rear3q-cream.webp', silver: 'sedan-rear3q-silver.webp', white: 'sedan-rear-white.webp' },
  moto: { red: 'moto-rear-red.webp', yellow: 'moto-rear-yellow.webp' },
};

const known = new Map(); // url -> true/false
const probing = new Set();
let onFound = null;
export function setCarImageListener(fn) { onFound = fn; }

function probe(url) {
  if (known.has(url) || probing.has(url)) return;
  probing.add(url);
  const im = new Image();
  im.onload = () => { probing.delete(url); known.set(url, true); if (onFound) onFound(); };
  im.onerror = () => { probing.delete(url); known.set(url, false); };
  im.src = url;
}

// بيرجع رابط الصورة لو اتحمّلت، وإلا null (وبيبدأ يتأكد منها فى الخلفية)
export function realisticCarImage(kind, colorId) {
  const f = CAR_IMAGES[kind] && CAR_IMAGES[kind][colorId];
  if (!f) return null;
  const u = CAR_IMAGE_DIR + f;
  if (known.get(u)) return u;
  probe(u);
  return null;
}

// عربية اللاعب (صورة خلفية) مع الاستيكر والكماليات، تتحط فوق صورة الجراج/الورشة
import { lookFor } from './car-images.js';
import { IMG, STICKER_SPOT, NOGLASS } from './sprites.js';
import { stickerById } from './data.js';

export function carHtml(body, look, mods) {
  const L = lookFor(body, look);
  const [, aspect] = IMG[L.rear] || [1.9, 0.8];
  const st = mods && mods.slogan && !NOGLASS.has(body) ? stickerById(mods.slogan) : null;
  const spot = STICKER_SPOT[body] || [0.6, 0.6];
  const accs = (mods && mods.accs) || [];
  const lift = accs.includes('lift');
  const car = `
    <div class="wr-car" style="aspect-ratio:${(1 / aspect).toFixed(3)}">
      <div class="wr-body" style="${lift ? 'transform:translateY(-7%)' : ''}">
        ${accs.includes('neon') ? `<img class="wr-neon-img" src="assets/images/cars/realistic/${L.rear}.webp?v=15" alt="">` : ''}
        <img class="wr-main" src="assets/images/cars/realistic/${L.rear}.webp?v=15" alt="">
        ${st ? `<img class="wr-stk" src="assets/images/stickers/${st.id}.webp" alt="" style="top:${((1 - spot[0]) * 100).toFixed(1)}%;width:${(spot[1] * 72).toFixed(0)}%">` : ''}
        ${accs.includes('bar') ? '<i class="wr-bar"></i>' : ''}
      </div>
    </div>`;
  return car;
}

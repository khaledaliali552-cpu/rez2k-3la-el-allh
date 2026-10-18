// خلفية الورشة: جدران طوب وباب سلك وأدوات وكاوتش (SVG)، وعربيتك واقفة قدام بالاستيكر والكماليات
import { lookFor } from './car-images.js';
import { IMG, STICKER_SPOT } from './sprites.js';
import { stickerById } from './data.js';

const TOOLS = `
  <g fill="#c9ced6" stroke="#6b7280" stroke-width="2">
    <path d="M0 0h16l6 30h-28z" transform="translate(40 60) rotate(-12)"/>
    <circle cx="48" cy="52" r="14" fill="none" stroke="#c9ced6" stroke-width="9" transform="rotate(-12 48 52)"/>
    <rect x="150" y="48" width="14" height="86" rx="5" fill="#a16207" stroke="#78350f"/>
    <rect x="132" y="38" width="50" height="22" rx="4" fill="#9ca3af"/>
    <path d="M250 40h12v70h-12z M246 110h20v22h-20z" fill="#dc2626" stroke="#7f1d1d"/>
    <path d="M330 44l34 0 6 20-46 0z M344 64h8v60h-8z" fill="#fbbf24" stroke="#92400e"/>
    <rect x="420" y="42" width="10" height="92" rx="3" fill="#9ca3af"/><rect x="408" y="36" width="34" height="14" rx="3" fill="#d1d5db"/>
  </g>`;

export function workshopRoom(body, look, mods) {
  const L = lookFor(body, look);
  const [, aspect] = IMG[L.rear] || [1.9, 0.8];
  const st = mods && mods.slogan ? stickerById(mods.slogan) : null;
  const spot = STICKER_SPOT[body] || [0.6, 0.6];
  const accs = (mods && mods.accs) || [];
  const lift = accs.includes('lift');
  const car = `
    <div class="wr-car" style="aspect-ratio:${(1 / aspect).toFixed(3)}">
      ${accs.includes('neon') ? '<div class="wr-neon"></div>' : ''}
      <div class="wr-body" style="${lift ? 'transform:translateY(-7%)' : ''}">
        <img src="assets/images/cars/realistic/${L.rear}.webp" alt="">
        ${st ? `<img class="wr-stk" src="assets/images/stickers/${st.id}.webp" alt="" style="top:${((1 - spot[0]) * 100).toFixed(1)}%;width:${(spot[1] * 100).toFixed(0)}%">` : ''}
        ${accs.includes('bar') ? '<i class="wr-bar"></i>' : ''}
      </div>
    </div>`;
  const bg = `
  <svg class="wr-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <pattern id="wr-brick" width="80" height="40" patternUnits="userSpaceOnUse">
        <rect width="80" height="40" fill="#5a3b2e"/>
        <rect x="1" y="1" width="38" height="18" fill="#6b4637"/><rect x="41" y="1" width="38" height="18" fill="#62402f"/>
        <rect x="-19" y="21" width="38" height="18" fill="#62402f"/><rect x="21" y="21" width="38" height="18" fill="#6b4637"/><rect x="61" y="21" width="38" height="18" fill="#5e3d2d"/>
      </pattern>
      <linearGradient id="wr-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".62"/><stop offset=".55" stop-color="#000" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
      <linearGradient id="wr-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b4f57"/><stop offset="1" stop-color="#2c2f35"/></linearGradient>
      <radialGradient id="wr-lamp" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".75"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>
      <pattern id="wr-rib" width="20" height="22" patternUnits="userSpaceOnUse"><rect width="20" height="22" fill="#8b929c"/><rect y="18" width="20" height="4" fill="#5c626b"/></pattern>
    </defs>
    <rect width="1600" height="640" fill="url(#wr-brick)"/>
    <rect y="560" width="1600" height="30" fill="#2a2d33"/>
    <polygon points="0,640 1600,640 1600,900 0,900" fill="url(#wr-floor)"/>
    <g stroke="#3b3f46" stroke-width="3" opacity=".7"><path d="M0 700H1600M0 770H1600M0 850H1600"/><path d="M200 640L-300 900M520 640L330 900M800 640V900M1080 640L1270 900M1400 640L1900 900"/></g>
    <ellipse cx="1150" cy="790" rx="190" ry="26" fill="#14151a" opacity=".55"/>
    <!-- باب سلك -->
    <rect x="80" y="170" width="430" height="400" fill="#23262b"/>
    <rect x="96" y="186" width="398" height="368" fill="url(#wr-rib)"/>
    <rect x="96" y="186" width="398" height="130" fill="url(#wr-rib)"/><rect x="96" y="400" width="398" height="154" fill="#000" opacity=".12"/>
    <rect x="260" y="525" width="70" height="10" rx="4" fill="#d6a756"/>
    <!-- لوحة نيون -->
    <rect x="610" y="60" width="520" height="86" rx="16" fill="#101216" stroke="#fbbf24" stroke-width="5"/>
    <text x="870" y="118" text-anchor="middle" font-family="Cairo, Tahoma, Arial, sans-serif" font-size="56" font-weight="800" fill="#fde68a" style="filter:drop-shadow(0 0 10px #f59e0b)">ورشة المعلم</text>
    <!-- لوح أدوات -->
    <rect x="620" y="190" width="470" height="200" rx="10" fill="#3a3f47" stroke="#20232a" stroke-width="4"/>
    <g transform="translate(634 200)">${TOOLS}</g>
    <!-- شباك -->
    <rect x="1230" y="170" width="260" height="190" fill="#9bd0ef" stroke="#2a2d33" stroke-width="10"/><path d="M1360 170v190M1230 265h260" stroke="#2a2d33" stroke-width="8"/>
    <rect x="1230" y="170" width="260" height="190" fill="url(#wr-shade)" opacity=".55"/>
    <!-- كاوتش وبرميل وصندوق عدة -->
    <g>
      <g transform="translate(140 700)"><ellipse cx="0" cy="40" rx="86" ry="22" fill="#0e0f12"/><circle cx="0" cy="0" r="80" fill="#1a1b1e" stroke="#2c2e33" stroke-width="6"/><circle cx="0" cy="0" r="38" fill="#8b929c"/><circle cx="0" cy="0" r="12" fill="#2c2e33"/></g>
      <g transform="translate(260 760)"><ellipse cx="0" cy="26" rx="66" ry="17" fill="#0e0f12"/><circle cx="0" cy="0" r="62" fill="#1a1b1e" stroke="#2c2e33" stroke-width="5"/><circle cx="0" cy="0" r="28" fill="#8b929c"/></g>
      <rect x="1440" y="640" width="110" height="180" rx="8" fill="#1d4ed8" stroke="#1e3a8a" stroke-width="5"/><path d="M1440 700h110M1440 760h110" stroke="#1e3a8a" stroke-width="5"/>
      <rect x="1290" y="750" width="130" height="80" rx="8" fill="#dc2626" stroke="#7f1d1d" stroke-width="5"/><rect x="1330" y="738" width="50" height="16" rx="6" fill="#7f1d1d"/>
    </g>
    <!-- لمبة -->
    <path d="M870 0v150" stroke="#111" stroke-width="4"/>
    <path d="M820 150h100l-18 30h-64z" fill="#2a2d33"/>
    <polygon points="760,185 980,185 1180,640 560,640" fill="url(#wr-lamp)"/>
    <rect width="1600" height="900" fill="url(#wr-shade)"/>
  </svg>`;
  return bg + car;
}

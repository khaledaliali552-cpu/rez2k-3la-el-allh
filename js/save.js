// حفظ التقدم فى localStorage
const KEY = 'corniche_cab_save_v1';

export const makeCode = () => {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += abc[Math.floor(Math.random() * abc.length)];
  return c;
};

export const defaults = () => ({
  v: 2,
  money: 0,
  day: 1,
  owned: ['boss_taxi'],
  selected: 'boss_taxi',
  colors: {},
  ownedColors: [], // مثال: "sedan:black"
  selectedRoad: 'abuqir',
  work: { boss: 'b_shokry', vehicle: 'r_taxi', mode: 'shift', kind: 'taraf', time: 'morning' },
  damage: {},
  mods: {},
  horns: ['classic'],
  horn: 'classic',
  roadsPlayed: {},
  refCode: makeCode(),
  referredBy: '',
  refRegistered: false,
  name: '',
  stats: { rides: 0, people: 0, perfect: 0, km: 0, earned: 0, tips: 0, fines: 0, crashes: 0, bestTip: 0, shifts: 0 },
  ach: {},
  quests: { day: 0, ids: [] },
  settings: { control: 'arrows', sound: true, vibrate: true, auto: false, steer: 1, brakeSens: 1, radio: true, radioVol: 0.6, radioTrack: 0 },
  tutorialDone: false,
});

function merge(base, extra) {
  if (!extra || typeof extra !== 'object') return base;
  for (const k of Object.keys(base)) {
    if (!(k in extra)) continue;
    const b = base[k];
    const e = extra[k];
    if (b && typeof b === 'object' && !Array.isArray(b)) base[k] = merge(b, e);
    else if (typeof e === typeof b) base[k] = e;
  }
  return base;
}

// يرجّع حالة سليمة من أى كائن محفوظ (قديم أو من السحابة)
export function normalize(parsed) {
  const d = merge(defaults(), parsed);
  // مفاتيح الخرايط (مش موجودة فى الافتراضى فالدمج بيتخطاها)
  if (parsed.colors && typeof parsed.colors === 'object') d.colors = parsed.colors;
  if (parsed.roadsPlayed && typeof parsed.roadsPlayed === 'object') d.roadsPlayed = parsed.roadsPlayed;
  if (parsed.ach && typeof parsed.ach === 'object') d.ach = parsed.ach;
  if (parsed.damage && typeof parsed.damage === 'object') d.damage = parsed.damage;
  if (parsed.mods && typeof parsed.mods === 'object') d.mods = parsed.mods;
  if (!Array.isArray(d.owned) || !d.owned.includes('boss_taxi')) d.owned = ['boss_taxi', ...(d.owned || [])];
  if (!Array.isArray(d.ownedColors)) d.ownedColors = [];
  // ترحيل نسخة قديمة: الألوان اللى كانت مختارة تعتبر ملكه
  for (const [car, col] of Object.entries(d.colors)) {
    const key = car + ':' + col;
    if (col !== 'white' && !d.ownedColors.includes(key)) d.ownedColors.push(key);
  }
  return d;
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return normalize(JSON.parse(raw));
  } catch (e) {
    return defaults();
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    /* التخزين غير متاح */
  }
}

export function reset() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    /* ignore */
  }
  return defaults();
}

// حفظ التقدم فى localStorage
const KEY = 'corniche_cab_save_v1';

export const defaults = () => ({
  v: 1,
  money: 0,
  day: 1,
  owned: ['boss_taxi'],
  selected: 'boss_taxi',
  colors: {},
  stats: { rides: 0, perfect: 0, km: 0, earned: 0, tips: 0, fines: 0, crashes: 0, bestTip: 0, shifts: 0 },
  ach: {},
  quests: { day: 0, ids: [] },
  settings: { sound: true, vibrate: true, auto: false, steer: 1, brakeSens: 1 },
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

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const d = merge(defaults(), JSON.parse(raw));
    if (!Array.isArray(d.owned) || !d.owned.includes('boss_taxi')) d.owned = ['boss_taxi', ...(d.owned || [])];
    return d;
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

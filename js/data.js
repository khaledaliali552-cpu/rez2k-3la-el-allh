// بيانات اللعبة: العربيات، الألوان، الركاب، المهام، الإنجازات

export const GAME_NAME = 'أجرة الكورنيش';
export const SHIFT_SECONDS = 360; // مدة الوردية
export const RADAR_FINE = 200;
export const WELCOME_BONUS = 300; // مكافأة اللى بيدخل من رابط دعوة
export const INVITER_BONUS = 500; // مكافأة صاحب الكود لكل صاحب جديد

export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function pickWeighted(map) {
  const entries = Object.entries(map).filter(([, w]) => w > 0);
  let total = 0;
  for (const [, w] of entries) total += w;
  let r = Math.random() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[0][0];
}

// vmax: م/ث ، accel: م/ث² ، brake: م/ث² ، handling: معامل الانحراف ، cap: أقصى عدد ركاب
export const CARS = [
  {
    id: 'boss_taxi', name: 'تاكسى المعلم', body: 'taxi', price: 0, rented: true, fee: 350, cap: 3,
    desc: 'عربية قديمة بتاعة المعلم. بتمشى بالبركة، وعليك "حساب" فى آخر كل وردية. لونها مش بتاعك تغيره.',
    vmax: 34, accel: 5.2, brake: 15, handling: 0.85, repair: 18, fareMul: 1,
  },
  {
    id: 'lada', name: 'صندوقية قديمة', body: 'lada', price: 4000, cap: 3,
    desc: 'عربية مربعة من أيام زمان. رخيصة وبتتصلح بسهولة.',
    vmax: 33, accel: 5.4, brake: 15, handling: 0.95, repair: 14, fareMul: 1,
  },
  {
    id: 'moto', name: 'موتوسيكل', body: 'moto', price: 3000, cap: 1,
    desc: 'بتزن بين العربيات! راكب واحد بس، لكن مشاويرك أسرع.',
    vmax: 40, accel: 9, brake: 20, handling: 1.3, repair: 8, fareMul: 1,
  },
  {
    id: 'hatch', name: 'هاتشباك صغيرة', body: 'hatch', price: 6000, cap: 3,
    desc: 'خفيفة وسهلة فى الزحمة، لكن مش سريعة أوى.',
    vmax: 38, accel: 6.2, brake: 16, handling: 1.0, repair: 18, fareMul: 1,
  },
  {
    id: 'taxi_new', name: 'تاكسى جديد', body: 'taxi', price: 12000, cap: 4,
    desc: 'تاكسى بتاعك انت! أسرع وأثبت، وبتشيل 4 ركاب.',
    vmax: 42, accel: 6.8, brake: 17, handling: 0.95, repair: 20, fareMul: 1,
  },
  {
    id: 'sedan', name: 'ملاكى سيدان', body: 'sedan', price: 25000, cap: 4,
    desc: 'مريحة وثابتة على الطريق السريع، والركاب الغالية بتحبها.',
    vmax: 46, accel: 7.5, brake: 18, handling: 1.0, repair: 24, fareMul: 1,
  },
  {
    id: 'microbus', name: 'ميكروباص', body: 'microbus', price: 40000, cap: 6,
    desc: 'بتشيل لحد 6 ركاب فى المشوار الواحد. تقيل شوية فى اللف.',
    vmax: 36, accel: 5.5, brake: 15, handling: 0.75, repair: 30, fareMul: 1,
  },
  {
    id: 'coupe', name: 'كوبيه رياضية', body: 'coupe', price: 60000, cap: 2,
    desc: 'سريعة جدا وتلف زى الفرخة. خلى بالك من الرادارات!',
    vmax: 56, accel: 10, brake: 22, handling: 1.15, repair: 36, fareMul: 1,
  },
  {
    id: 'suv', name: 'عربية فالية', body: 'suv', price: 90000, cap: 4,
    desc: 'دفع رباعى سودة وكبيرة. الناس بتبصلك وانت معدّى.',
    vmax: 48, accel: 8, brake: 19, handling: 0.9, repair: 40, fareMul: 1,
  },
  {
    id: 'gwagon', name: 'جيب مربع 4×4', body: 'gwagon', price: 240000, cap: 4,
    desc: 'جيب أسود مربع بستبن ورا. تقيل وهيبة وغالى.',
    vmax: 50, accel: 8.5, brake: 19, handling: 0.88, repair: 55, fareMul: 1,
  },
  {
    id: 'luxury', name: 'عربية فارهة', body: 'luxury', price: 180000, cap: 4,
    desc: 'آخر حاجة. فخمة، سريعة، وغالية فى التصليح.',
    vmax: 54, accel: 9.5, brake: 21, handling: 1.05, repair: 60, fareMul: 1,
  },
];

// مركبات الإيجار عند المعلمين (الأسعار بتتضرب فى feeMul)
export const RENT_VEHICLES = [
  { id: 'r_tuktuk', name: 'توك توك', body: 'tuktuk', cap: 3, feeMul: 0.6, vmax: 24, accel: 4.6, brake: 14, handling: 1.2, repair: 10, fareMul: 1, repairOnBoss: true, note: 'صغير ومرن، مناسب لأحياء المحمودية' },
  { id: 'r_tonaya', name: 'تونية', body: 'tonaya', cap: 4, feeMul: 0.8, vmax: 30, accel: 4.8, brake: 14, handling: 0.95, repair: 14, fareMul: 1, note: 'سريعة للأحياء والزنقات' },
  { id: 'r_tuktuk2', name: 'توكتوك معدّل', body: 'tuktuk2', cap: 3, feeMul: 0.8, vmax: 25, accel: 4.8, brake: 14, handling: 1.15, repair: 12, fareMul: 1, note: 'متزوّق باستبن وصدام' },
  { id: 'r_taxi', name: 'تاكسى', body: 'taxi', cap: 4, feeMul: 1, vmax: 36, accel: 5.4, brake: 15, handling: 0.9, repair: 18, fareMul: 1, note: 'عربية الشغل المضمونة' },
  { id: 'r_microbus', name: 'ميكروباص', body: 'microbus', cap: 6, feeMul: 1.3, vmax: 34, accel: 5.2, brake: 15, handling: 0.78, repair: 28, fareMul: 1, note: 'بتشيل 6 ركاب' },
];

// المعلمين (شغل بالإيجار): يومية ثابتة (fee) أو نسبة من كسبك (pct). الحكايات من تأليفنا.
export const BOSSES = [
  { id: 'b_shokry', name: 'المعلم شكرى', quote: '«اليومية بتتدفع الأول والأخر… وماليش دعوة بالزحمة»', fee: 350, pct: 0, vehicles: ['r_taxi', 'r_tonaya', 'r_microbus'] },
  { id: 'b_sania', name: 'المعلمة سنية', quote: '«عايزة سواق صاحى وفاهم الشارع، ونسبتى ربع الكسب»', fee: 0, pct: 25, vehicles: ['r_taxi', 'r_microbus', 'r_tuktuk'] },
  { id: 'b_ramadan', name: 'الحاج رمضان', quote: '«الأمانة قبل الفلوس… والحساب يوم بيوم»', fee: 220, pct: 0, vehicles: ['r_tuktuk', 'r_tonaya', 'r_taxi'] },
  { id: 'b_fathy', name: 'المعلم فتحى', quote: '«15% بس، لكن لو الحتة اتبهدلت هتدفع التصليح!»', fee: 0, pct: 15, vehicles: ['r_tonaya', 'r_microbus', 'r_taxi'] },
  { id: 'b_samah', name: 'سماح الشبراوى', quote: '«ركّز فى الركاب والباقى عليا… نسبة 20%»', fee: 0, pct: 20, vehicles: ['r_tuktuk', 'r_taxi', 'r_tonaya'] },
];
export const getBoss = (id) => BOSSES.find((b) => b.id === id) || BOSSES[0];
export const getRentVehicle = (id) => RENT_VEHICLES.find((v) => v.id === id) || RENT_VEHICLES[2];

// الألوان: أول لون (أبيض) ببلاش، والباقى بتشتريه لكل عربية
export const COLORS = [
  { id: 'white', name: 'أبيض', hex: 0xf1f1ee, price: 0 },
  { id: 'black', name: 'أسود', hex: 0x24262b, price: 200 },
  { id: 'silver', name: 'فضى', hex: 0xb7bcc4, price: 200 },
  { id: 'yellow', name: 'أصفر', hex: 0xf2b21b, price: 200 },
  { id: 'red', name: 'أحمر', hex: 0xc4302b, price: 300 },
  { id: 'blue', name: 'أزرق', hex: 0x2a5bd7, price: 300 },
  { id: 'green', name: 'أخضر', hex: 0x2f8f5b, price: 300 },
  { id: 'orange', name: 'برتقالى', hex: 0xe8741c, price: 300 },
  { id: 'purple', name: 'بنفسجى', hex: 0x7a3fb0, price: 500 },
  { id: 'gold', name: 'دهبى', hex: 0xd4af37, price: 800 },
];

export const getCar = (id) => CARS.find((c) => c.id === id) || CARS[0];
export const getColor = (id) => COLORS.find((c) => c.id === id) || COLORS[0];
export const colorKey = (carId, colorId) => `${carId}:${colorId}`;

// أنواع الركاب. impatience: كل ما زاد الراكب بيستعجل. bumpSens: حساسية للفرملة والخبط.
export const PASSENGERS = [
  { id: 'employee', icon: '💼', label: 'موظف مستعجل', shirt: 0x3d5a80, tipMul: 1.1, impatience: 1.6, bumpSens: 1,
    names: ['أستاذ هشام', 'أستاذ وائل', 'أستاذة منى', 'أستاذ سامح'] },
  { id: 'granny', icon: '👵', label: 'حاجة كبيرة', shirt: 0x7b4b94, tipMul: 1.3, impatience: 0.6, bumpSens: 2.2,
    names: ['تيتة نجوى', 'الحاجة سعاد', 'ماما فاطمة'] },
  { id: 'student', icon: '🎒', label: 'طالب جامعة', shirt: 0x2a9d8f, tipMul: 0.6, impatience: 1.0, bumpSens: 0.8,
    names: ['كريم', 'يوسف', 'مريم', 'نور'] },
  { id: 'tourist', icon: '📷', label: 'سائح', shirt: 0xe76f51, tipMul: 1.3, impatience: 0.7, bumpSens: 1.2,
    names: ['مستر جون', 'ميس إيمّا', 'مسيو بول'] },
  { id: 'doctor', icon: '🩺', label: 'دكتور مستعجل', shirt: 0x5fa8d3, tipMul: 1.2, impatience: 1.8, bumpSens: 1,
    names: ['دكتورة سلمى', 'دكتور أحمد', 'دكتورة هبة'] },
  { id: 'chef', icon: '👨‍🍳', label: 'شيف رايح المطعم', shirt: 0xf4f1de, tipMul: 0.9, impatience: 1.3, bumpSens: 1.5,
    names: ['الشيف عادل', 'الشيف رشا'] },
  { id: 'worker', icon: '🦺', label: 'موظف شركة', shirt: 0xe9a23b, tipMul: 0.5, impatience: 1.2, bumpSens: 0.7,
    names: ['أسطى محمود', 'عم صبرى', 'مهندس طارق', 'أستاذ ماجد'] },
  { id: 'joker', icon: '😂', label: 'ابن نكتة', shirt: 0xd62828, tipMul: 1.0, impatience: 0.9, bumpSens: 0.6,
    names: ['حودة', 'شيكا', 'بيبو', 'زيزو'] },
];

// مهام الوردية. الحساب بيتم من إحصائيات الوردية الحالية.
export const QUEST_POOL = [
  { id: 'r4', text: 'وصّل 4 مشاوير', target: 4, reward: 300, calc: (s) => s.rides },
  { id: 'r7', text: 'وصّل 7 مشاوير', target: 7, reward: 600, calc: (s) => s.rides },
  { id: 'pax12', text: 'وصّل 12 فرد', target: 12, reward: 500, calc: (s) => s.people },
  { id: 'e1200', text: 'اكسب 1200 جنيه فى الوردية', target: 1200, reward: 500, calc: (s) => s.fares + s.tips },
  { id: 't150', text: 'اجمع 150 جنيه بقشيش', target: 150, reward: 350, calc: (s) => s.tips },
  { id: 'p2', text: 'وصّل مشوارين من غير أى خبطة أو فرملة جامدة', target: 2, reward: 450, calc: (s) => s.perfect },
  { id: 'km6', text: 'سوق 6 كيلومتر', target: 6, reward: 250, calc: (s) => Math.floor(s.km) },
  { id: 'rad3', text: 'عدّى 3 رادارات بسرعة قانونية', target: 3, reward: 350, calc: (s) => s.radarOk },
  { id: 'nofine', text: 'وصّل 4 مشاوير من غير ولا غرامة', target: 4, reward: 500, calc: (s) => (s.fines === 0 ? s.rides : 0) },
  { id: 'nocrash', text: 'وصّل 3 مشاوير من غير ما تخبط', target: 3, reward: 450, calc: (s) => (s.crashes === 0 ? s.rides : 0) },
];

export const ACHIEVEMENTS = [
  { id: 'first', text: 'أول مشوار', desc: 'وصّل أول راكب', reward: 100, check: (st) => st.stats.rides >= 1 },
  { id: 'r25', text: 'سواق محترف', desc: 'وصّل 25 مشوار', reward: 500, check: (st) => st.stats.rides >= 25 },
  { id: 'r100', text: 'ملك الطريق', desc: 'وصّل 100 مشوار', reward: 2000, check: (st) => st.stats.rides >= 100 },
  { id: 'perfect5', text: 'سواق ناعم', desc: '5 مشاوير من غير ولا رجّة', reward: 600, check: (st) => st.stats.perfect >= 5 },
  { id: 'tip150', text: 'بقشيش محترم', desc: 'بقشيش 150 جنيه فى مشوار واحد', reward: 400, check: (st) => st.stats.bestTip >= 150 },
  { id: 'owner', text: 'بقيت صاحب عربية', desc: 'اشترى أول عربية بتاعتك', reward: 600, check: (st) => st.owned.length > 1 },
  { id: 'km100', text: 'مسافر', desc: 'سوق 100 كيلومتر', reward: 800, check: (st) => st.stats.km >= 100 },
  { id: 'rich', text: 'مستور', desc: 'وصّل رصيدك لـ 20,000 جنيه', reward: 1500, check: (st) => st.money >= 20000 },
  { id: 'allroads', text: 'خبير الطرق', desc: 'اشتغل على الـ 5 طرق', reward: 1000, check: (st) => Object.keys(st.roadsPlayed || {}).length >= 5 },
];

export const THEME_ORDER = ['day', 'sunset', 'night'];

export const fmtMoney = (n) => Math.round(n).toLocaleString('en-US');
export const fmtTime = (sec) => {
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ':' + String(s).padStart(2, '0');
};

// ---------- الورشة: الكلام والكماليات (الترويقة) ----------
export const SLOGANS = [
  'ماشى بالبركة', 'يا رب سترك', 'توكل على الله', 'الرزق على الله', 'خليك فى حالك',
  'سواق جدع', 'ولا تحسدنى', 'اللى مش عاجبه يركب غيرى', 'مدد يا سيدة', 'اتأخرت؟ معلش الزحمة',
];
export const SLOGAN_PRICE = 150;
// bonus = زيادة فى الأجرة لأن الراكب بيرتاح لما العربية متروقة
export const ACCESSORIES = [
  { id: 'lift', name: 'تعلية', icon: '⬆️', price: 1500, bonus: 0.05, desc: 'تعلية للعربية من تحت، شكلها أعلى وأهيب' },
  { id: 'neon', name: 'نيون تحت العربية', icon: '💡', price: 800, bonus: 0.04, desc: 'إضاءة سماوى بتنوّر الأسفلت' },
  { id: 'bar', name: 'لمبات السقف', icon: '🚨', price: 600, bonus: 0.03, desc: 'شريط لمبات فوق الكابينة' },
  { id: 'spoiler', name: 'جناح خلفى', icon: '🏁', price: 700, bonus: 0.03, desc: 'سبويلر على الشنطة (مش للتوك توك والنقل)' },
  { id: 'seats', name: 'فرش ونجف وبرفان', icon: '🛋️', price: 400, bonus: 0.04, desc: 'جوه العربية متروق، الراكب بيدّى أكتر' },
  { id: 'bead', name: 'خرزة زرقا ومصحف', icon: '🧿', price: 150, bonus: 0.02, desc: 'ضد الحسد.. وبركة' },
];
export const SLOGAN_BONUS = 0.03;
export const getAcc = (id) => ACCESSORIES.find((a) => a.id === id);
export function modBonus(mods) {
  if (!mods) return 0;
  let b = mods.slogan ? SLOGAN_BONUS : 0;
  for (const id of mods.accs || []) b += (getAcc(id) || { bonus: 0 }).bonus;
  return b;
}

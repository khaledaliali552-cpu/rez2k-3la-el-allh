// بيانات اللعبة: العربيات، الركاب، المهام، الإنجازات

export const GAME_NAME = 'أجرة الكورنيش';
export const SHIFT_SECONDS = 360; // مدة الوردية
export const RADAR_FINE = 120;

export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// vmax: م/ث ، accel: م/ث² ، brake: م/ث² ، handling: معامل الانحراف الجانبى
export const CARS = [
  {
    id: 'boss_taxi', name: 'تاكسى المعلم', body: 'taxi', price: 0, rented: true, fee: 200,
    desc: 'عربية قديمة بتاعة المعلم. بتمشى بالبركة، وعليك "حساب" فى آخر كل وردية.',
    vmax: 34, accel: 5.2, brake: 15, handling: 0.85, repair: 6, fareMul: 1,
  },
  {
    id: 'hatch', name: 'هاتشباك صغيرة', body: 'hatch', price: 3500,
    desc: 'خفيفة وسهلة فى الزحمة، لكن مش سريعة أوى.',
    vmax: 38, accel: 6.2, brake: 16, handling: 1.0, repair: 6, fareMul: 1,
  },
  {
    id: 'taxi_new', name: 'تاكسى جديد', body: 'taxi', price: 7500,
    desc: 'تاكسى بتاعك انت! أسرع وأثبت، والركاب بيحبوا العربية النضيفة.',
    vmax: 42, accel: 6.8, brake: 17, handling: 0.95, repair: 7, fareMul: 1.08,
  },
  {
    id: 'sedan', name: 'سيدان عائلى', body: 'sedan', price: 14000,
    desc: 'مريحة وثابتة على الطريق السريع.',
    vmax: 46, accel: 7.5, brake: 18, handling: 1.0, repair: 8, fareMul: 1.12,
  },
  {
    id: 'minivan', name: 'ميني فان', body: 'van', price: 22000,
    desc: 'العائلات بتدفع أكتر. تقيلة شوية فى اللف.',
    vmax: 40, accel: 6.0, brake: 16, handling: 0.8, repair: 9, fareMul: 1.3,
  },
  {
    id: 'coupe', name: 'كوبيه رياضية', body: 'coupe', price: 40000,
    desc: 'سريعة جدا وتلف زى الفرخة. خلى بالك من الرادارات!',
    vmax: 56, accel: 10, brake: 22, handling: 1.15, repair: 12, fareMul: 1.2,
  },
];

export const COLORS = [
  { id: 'yellow', name: 'أصفر', hex: 0xf2b21b },
  { id: 'white', name: 'أبيض', hex: 0xf1f1ee },
  { id: 'black', name: 'أسود', hex: 0x24262b },
  { id: 'red', name: 'أحمر', hex: 0xc4302b },
  { id: 'blue', name: 'أزرق', hex: 0x2a5bd7 },
  { id: 'green', name: 'أخضر', hex: 0x2f8f5b },
  { id: 'silver', name: 'فضى', hex: 0xb7bcc4 },
];

export const getCar = (id) => CARS.find((c) => c.id === id) || CARS[0];
export const getColor = (id) => COLORS.find((c) => c.id === id) || COLORS[0];

// أنواع الركاب. impatience: كل ما زاد الراكب بيستعجل. bumpSens: حساسية للفرملة والخبط.
export const PASSENGERS = [
  {
    id: 'employee', icon: '💼', label: 'موظف مستعجل', shirt: 0x3d5a80, fareMul: 1, tipMul: 1.1, impatience: 1.6, bumpSens: 1,
    names: ['أستاذ هشام', 'أستاذ وائل', 'أستاذة منى', 'أستاذ سامح'],
    boardLines: ['اتأخرت على الشغل! بسرعة لو سمحت.', 'عندى اجتماع كمان شوية.'],
  },
  {
    id: 'granny', icon: '👵', label: 'حاجة كبيرة', shirt: 0x7b4b94, fareMul: 1, tipMul: 1.3, impatience: 0.6, bumpSens: 2.2,
    names: ['تيتة نجوى', 'الحاجة سعاد', 'ماما فاطمة'],
    boardLines: ['براحة يا ابنى، مفيش استعجال.', 'ربنا يحفظك، سوق على مهلك.'],
  },
  {
    id: 'student', icon: '🎒', label: 'طالب جامعة', shirt: 0x2a9d8f, fareMul: 0.8, tipMul: 0.6, impatience: 1.0, bumpSens: 0.8,
    names: ['كريم', 'يوسف', 'مريم', 'نور'],
    boardLines: ['المحاضرة هتبدأ كمان شوية!', 'معايا فكة بالظبط، متقلقش.'],
  },
  {
    id: 'tourist', icon: '📷', label: 'سائح', shirt: 0xe76f51, fareMul: 1.6, tipMul: 1.0, impatience: 0.7, bumpSens: 1.2,
    names: ['مستر جون', 'ميس إيمّا', 'مسيو بول'],
    boardLines: ['Beautiful sea! خد وقتك.', 'Take me to see the view, please.'],
  },
  {
    id: 'doctor', icon: '🩺', label: 'دكتورة رايحة المستشفى', shirt: 0x5fa8d3, fareMul: 1.2, tipMul: 1.2, impatience: 1.8, bumpSens: 1,
    names: ['دكتورة سلمى', 'دكتور أحمد', 'دكتورة هبة'],
    boardLines: ['عندى حالة مستنيانى، بسرعة لو سمحت!'],
  },
  {
    id: 'chef', icon: '👨‍🍳', label: 'شيف بيجرى على المطعم', shirt: 0xf4f1de, fareMul: 1.1, tipMul: 0.9, impatience: 1.3, bumpSens: 1.5,
    names: ['الشيف عادل', 'الشيف رشا'],
    boardLines: ['معايا طلبية حساسة، فرمل براحة!'],
  },
];

export const PLACES = [
  'المنشية', 'سان ستيفانو', 'ستانلى', 'محطة مصر', 'القلعة', 'المكتبة', 'الشاطبى', 'سموحة',
  'جليم', 'سبورتنج', 'كامب شيزار', 'الأزاريطة', 'كليوباترا', 'الإبراهيمية', 'المعمورة', 'بحرى',
];

// مهام اليوم. الحساب بيتم من إحصائيات الوردية الحالية.
export const QUEST_POOL = [
  { id: 'r4', text: 'وصّل 4 ركاب', target: 4, reward: 120, calc: (s) => s.rides },
  { id: 'r7', text: 'وصّل 7 ركاب', target: 7, reward: 250, calc: (s) => s.rides },
  { id: 'e450', text: 'اكسب 450 جنيه فى الوردية', target: 450, reward: 180, calc: (s) => s.fares + s.tips },
  { id: 't60', text: 'اجمع 60 جنيه بقشيش', target: 60, reward: 150, calc: (s) => s.tips },
  { id: 'p2', text: 'وصّل راكبين من غير أى خبطة أو فرملة جامدة', target: 2, reward: 200, calc: (s) => s.perfect },
  { id: 'km6', text: 'سوق 6 كيلومتر', target: 6, reward: 120, calc: (s) => Math.floor(s.km) },
  { id: 'rad3', text: 'عدّى 3 رادارات بسرعة قانونية', target: 3, reward: 150, calc: (s) => s.radarOk },
  { id: 'nofine', text: 'وصّل 4 ركاب من غير ولا غرامة', target: 4, reward: 220, calc: (s) => (s.fines === 0 ? s.rides : 0) },
  { id: 'nocrash', text: 'وصّل 3 ركاب من غير ما تخبط', target: 3, reward: 200, calc: (s) => (s.crashes === 0 ? s.rides : 0) },
];

export const ACHIEVEMENTS = [
  { id: 'first', text: 'أول مشوار', desc: 'وصّل أول راكب', reward: 50, check: (st) => st.stats.rides >= 1 },
  { id: 'r25', text: 'سواق محترف', desc: 'وصّل 25 راكب', reward: 200, check: (st) => st.stats.rides >= 25 },
  { id: 'r100', text: 'ملك الكورنيش', desc: 'وصّل 100 راكب', reward: 800, check: (st) => st.stats.rides >= 100 },
  { id: 'perfect5', text: 'سواق ناعم', desc: '5 مشاوير من غير ولا رجّة', reward: 250, check: (st) => st.stats.perfect >= 5 },
  { id: 'tip50', text: 'بقشيش محترم', desc: 'بقشيش 50 جنيه فى مشوار واحد', reward: 150, check: (st) => st.stats.bestTip >= 50 },
  { id: 'owner', text: 'بقيت صاحب عربية', desc: 'اشترى أول عربية بتاعتك', reward: 300, check: (st) => st.owned.length > 1 },
  { id: 'km100', text: 'مسافر', desc: 'سوق 100 كيلومتر', reward: 300, check: (st) => st.stats.km >= 100 },
  { id: 'rich', text: 'مستور', desc: 'وصّل رصيدك لـ 10,000 جنيه', reward: 500, check: (st) => st.money >= 10000 },
];

export const THEME_ORDER = ['day', 'sunset', 'night'];

export const fmtMoney = (n) => Math.round(n).toLocaleString('en-US');
export const fmtTime = (sec) => {
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ':' + String(s).padStart(2, '0');
};

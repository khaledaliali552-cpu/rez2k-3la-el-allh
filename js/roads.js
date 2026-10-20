// الطرق: كل طريق له بيئته ومحطاته وسعر الأجرة للفرد وزحمته
// محطات "طريق البشاوات" من تخميني (عدّلها براحتك). باقى المحطات زى ما قلت.

export const ROADS = [
  {
    id: 'bashawat',
    name: 'طريق البشاوات',
    sub: 'طريق الجيش · كورنيش البحر',
    curve: { a: 60, la: 500, b: 22, lb: 190 },
    uturn: { first: 1300, step: 1700 },
    fare: 150,
    tag: 'غالية',
    tagIcon: '💎',
    tagClass: 'gold',
    first: 600,
    spacing: 850,
    radar: { first: 700, step: 2200, limits: [60, 80] },
    env: { right: 'sea', left: 'towers', ground: 0x77786f, median: 'palms', trees: 'palm', overpass: false, billboards: false },
    traffic: {
      density: 0.85, speed: 1.0,
      mix: { ambulance: 0.15, gwagon: 1, luxury: 3, suv: 3.5, sedan: 4, taxi: 2, hatch: 1, microbus: 0.6, tonaya: 0.1, tuktuk: 0, pickup: 0.2, boxtruck: 0.1, truck: 0 },
    },
    pax: { tourist: 3, doctor: 2, chef: 2, employee: 2, joker: 1.5, granny: 0.5, student: 0.5, worker: 0 },
    landmarks: [
      { name: 'المنتزه' }, { name: 'ميامى' }, { name: 'سيدى بشر' }, { name: 'جليم' }, { name: 'سان ستيفانو' },
      { name: 'ستانلى' }, { name: 'كليوباترا' }, { name: 'الشاطبى' }, { name: 'المنشية' }, { name: 'قلعة قايتباى' },
    ],
  },
  {
    id: 'abuqir',
    name: 'طريق أبو قير',
    sub: 'من باب شرق لحد أبو قير',
    curve: { a: 75, la: 450, b: 30, lb: 170 },
    uturn: { first: 1100, step: 1500 },
    fare: 70,
    tag: 'متوسطة',
    tagIcon: '🚖',
    tagClass: '',
    first: 500,
    spacing: 650,
    radar: { first: 800, step: 2000, limits: [60, 80] },
    env: { right: 'buildings', left: 'old', ground: 0x7a7a72, median: 'concrete', trees: 'tree', overpass: true, billboards: true },
    traffic: {
      density: 1.0, speed: 0.9,
      mix: { ambulance: 0.15, lada: 1.5, moto: 0.8, bus: 0.4, tuktuk2: 0.3, sedan: 3.5, taxi: 3.5, hatch: 2, microbus: 3, tonaya: 1, tuktuk: 1.2, suv: 0.6, luxury: 0.2, pickup: 0.8, boxtruck: 0.6, truck: 0.3 },
    },
    pax: { employee: 3, student: 3, granny: 1.5, doctor: 1.5, worker: 1.5, joker: 2, chef: 0.7, tourist: 0.3 },
    landmarks: [
      { name: 'قسم باب شرق', lines: ['ودينى القسم، أخويا ابن خالتى فى ضيقة.', 'ودينى عند عطية عشان عليا قضية.'] },
      { name: 'مستشفى جمال عبد الناصر' },
      { name: 'الإبراهيمية عند اللاجيتيه' },
      { name: 'سبورتنج' },
      { name: 'مستشفى الطلبة' },
      { name: 'كليوباترا' },
      { name: 'سيدى جابر' },
      { name: 'رشدى' },
      { name: 'ونجت' },
      { name: 'فليمنج' },
      { name: 'باكوس' },
      { name: 'سيدى بشر' },
      { name: 'ميامى' },
      { name: 'خالد بن الوليد' },
      { name: 'المندرة' },
      { name: 'المنتزه' },
      { name: 'أبو قير' },
    ],
  },
  {
    id: 'mahmoudia',
    name: 'طريق المحمودية',
    sub: 'على الترعة · شوارع وأحياء',
    curve: { a: 90, la: 400, b: 32, lb: 160 },
    uturn: { first: 1000, step: 1400 },
    fare: 60,
    tag: 'متوسطة',
    tagIcon: '🛺',
    tagClass: '',
    first: 450,
    spacing: 600,
    radar: { first: 900, step: 2000, limits: [50, 70] },
    env: { right: 'canal', left: 'shops', ground: 0x80796a, median: 'concrete', trees: 'tree', overpass: false, billboards: true },
    traffic: {
      density: 1.1, speed: 0.8,
      mix: { lada: 2, moto: 1.2, tuktuk2: 1, tuktuk: 4, microbus: 3.5, tonaya: 2.5, sedan: 2.5, taxi: 2, hatch: 1.5, pickup: 1.5, boxtruck: 1, truck: 0.3, suv: 0.2, luxury: 0 },
    },
    pax: { granny: 2.5, student: 2, joker: 3, worker: 1.5, employee: 1.5, chef: 1, doctor: 0.7, tourist: 0.1 },
    landmarks: [
      { name: 'شارع محسن', lines: ['ودينى عند حمو علاء ياخدلى صورتين.', 'عند حمو علاء يصورلى صورتين، الورق ناقص.'] },
      { name: 'شارع الرصافة' },
      { name: 'بوالينو' },
      { name: 'شارع العمدة' },
      { name: 'شارع مستشفى النزهة' },
      { name: 'شارع الدريسة', lines: ['ودينى عند عطية عشان عليا قضية.', 'عطية المحامى مستنينى، عليا قضية.'] },
      { name: 'شارع الزهور', lines: ['ودينى عند رافت عشان أجيب فيب وليكود.', 'عند رافت، مخلّص الفيب وعايز ليكود.'] },
    ],
  },
  {
    id: 'fast',
    name: 'الطريق السريع',
    sub: 'كارفور · الحديقة الدولية · محرم بك',
    curve: { a: 40, la: 900, b: 14, lb: 300 },
    uturn: { first: 1800, step: 2400 },
    fare: 50,
    tag: 'اقتصادية',
    tagIcon: '⚡',
    tagClass: 'blue',
    first: 900,
    spacing: 1200,
    radar: { first: 1000, step: 2800, limits: [80, 100] },
    env: { right: 'buildings', left: 'mixed', ground: 0x73756e, median: 'guardrail', trees: 'none', overpass: true, billboards: true },
    traffic: {
      density: 0.9, speed: 1.25,
      mix: { bus: 0.8, moto: 0.5, gwagon: 0.4, lada: 1, sedan: 4, taxi: 2.5, hatch: 2, suv: 1.2, luxury: 0.7, microbus: 2, tonaya: 0.8, pickup: 1.2, boxtruck: 1, truck: 1.4, tuktuk: 0 },
    },
    pax: { employee: 3, worker: 2, student: 2, doctor: 1, joker: 1.5, tourist: 0.8, granny: 0.5, chef: 0.8 },
    landmarks: [{ name: 'كارفور' }, { name: 'الحديقة الدولية' }, { name: 'محرم بك الجديدة' }],
  },
  {
    id: 'desert',
    name: 'الطريق الصحراوى',
    sub: 'العامرية · المنطقة الحرة · طريق موظفين',
    curve: { a: 35, la: 1000, b: 12, lb: 320 },
    uturn: { first: 2000, step: 2800 },
    fare: 40,
    tag: 'رخيصة عشان الغلابة',
    tagIcon: '🤝',
    tagClass: 'green',
    first: 1000,
    spacing: 1100,
    radar: { first: 1200, step: 3200, limits: [90, 100] },
    env: { right: 'desert', left: 'industrial', ground: 0xb3a27a, median: 'guardrail', trees: 'none', overpass: false, billboards: true },
    traffic: {
      density: 0.8, speed: 1.3,
      mix: { bus: 1.2, truck: 3, microbus: 3.5, pickup: 3, boxtruck: 2, tonaya: 1.5, sedan: 2, taxi: 1, hatch: 1, suv: 0.2, luxury: 0, tuktuk: 0 },
    },
    pax: { worker: 4, employee: 2.5, student: 1, joker: 1.5, granny: 0.2, doctor: 0.3, chef: 0.2, tourist: 0 },
    landmarks: [
      { name: 'العامرية' }, { name: 'عبد القادر' }, { name: 'مرغم' }, { name: 'منطقة الشركات' }, { name: 'المنطقة الحرة' },
    ],
  },
];

// الشغل الحر (خطافى): مشاوير سفر طويلة بأجرة ثابتة. الوجهات بتتحط ديناميك (world.addBoard)
export const FREE_DESTS = [
  { name: 'العجمى', fare: 120, dist: 2000, w: 3 },
  { name: 'الساحل', fare: 500, dist: 5000, w: 2 },
  { name: 'العاصمة', fare: 550, dist: 6000, w: 2 },
  { name: 'مطروح', fare: 600, dist: 7500, w: 1.5 },
];
export const FREE_ROAD = {
  id: 'free', free: true,
  curve: { a: 55, la: 600, b: 20, lb: 220 },
  name: 'خطافى: مشاوير السفر',
  sub: 'العجمى · الساحل · العاصمة · مطروح',
  fare: 0, tag: 'حر', tagIcon: '🛣️', tagClass: 'blue',
  first: 1e9, spacing: 1e9,
  radar: { first: 1500, step: 3600, limits: [90, 100] },
  env: { right: 'desert', left: 'mixed', ground: 0xb3a27a, median: 'guardrail', trees: 'none', overpass: true, billboards: true },
  traffic: {
    density: 0.85, speed: 1.3,
    mix: { sedan: 4, taxi: 1.5, hatch: 2, suv: 1.5, luxury: 0.8, microbus: 3, tonaya: 1, pickup: 2, boxtruck: 1.5, truck: 2.5, tuktuk: 0 },
  },
  pax: { employee: 2, worker: 2, student: 2, tourist: 2, joker: 2, doctor: 1, granny: 1, chef: 1 },
  landmarks: [],
};

export const getRoad = (id) => (id === 'free' ? FREE_ROAD : ROADS.find((r) => r.id === id) || ROADS[0]);

// ---- حسابات المحطات (بتتكرر لما تخلص القايمة) ----
export const landmarkS = (road, k) => road.first + k * road.spacing;
export const landmarkAt = (road, k) => (road.landmarks.length ? road.landmarks[((k % road.landmarks.length) + road.landmarks.length) % road.landmarks.length] : null);
// أول محطة بعد مسافة s
export const landmarkAfter = (road, s) => Math.max(0, Math.ceil((s - road.first) / road.spacing));

// ---- الرادارات ----
export const radarS = (road, k) => road.radar.first + k * road.radar.step;
export const radarLimit = (road, k) => road.radar.limits[k % road.radar.limits.length];
export const nextRadarIndex = (road, s) => Math.max(0, Math.ceil((s - road.radar.first) / road.radar.step));

// ---- الدورانات (يو تيرن فى فتحة الجزيرة الوسطى) ----
export const uturnS = (road, k) => road.uturn.first + k * road.uturn.step;
export const nextUturnIndex = (road, s) => Math.max(0, Math.ceil((s - road.uturn.first) / road.uturn.step));
export const hasUturn = (road) => !!road.uturn;

// الطريق الراجع: نفس الطريق بس اتجاهه معكوس (المحطات بالعكس من آخر محطة عدّيتها)
export function uturnRoad(road, s0) {
  const L = road.landmarks;
  const n = L.length;
  let landmarks = L;
  if (n) {
    const kp = Math.floor((s0 - road.first) / road.spacing);
    landmarks = L.map((_, j) => L[(((kp - j) % n) + n) % n]);
  }
  const base = road.base || road;
  const back = !road.back;
  return {
    ...base,
    base,
    back,
    name: back ? base.name + ' · رجوع' : base.name,
    landmarks,
    first: s0 + 420,
    radar: { ...base.radar, first: s0 + 800 },
    uturn: { ...base.uturn, first: s0 + 1400 },
  };
}

// مظاهر (ألوان) كل عربية: كلها صور. rear = صورة من ورا (اللى بتشوفها وانت سايق)، card = صورة الكارت فى الجراج والورشة.
// لإضافة لون جديد لعربية: حط الصورتين فى assets/images/cars/realistic/ وسجلهم هنا ومعاهم قياسهم فى js/sprites.js.
export const CAR_IMAGE_DIR = 'assets/images/cars/realistic/';

export const LOOKS = {
  taxi: { def: 'white', looks: { white: { rear: 'taxi-verna-rear', card: 'taxi-verna-front' }, silver: { rear: 'lada-taxi-rear', card: 'lada-taxi-front' } } },
  lada: { def: 'white', looks: { white: { rear: 'lada-rear', card: 'lada-front' } } },
  moto: { def: 'red', looks: { red: { rear: 'moto-rear-red', card: 'moto-rear-red' }, yellow: { rear: 'moto-rear-yellow', card: 'moto-rear-yellow' } } },
  hatch: { def: 'yellow', looks: { yellow: { rear: 'hatch-yellow-rear', card: 'hatch-yellow-front' } } },
  sedan: { def: 'white', looks: {
    white: { rear: 'corolla-white-rear', card: 'corolla-white-front' },
    silver: { rear: 'corolla-silver-rear', card: 'corolla-silver-front' },
    yellow: { rear: 'sedan-rear-cream', card: 'sedan-front-cream' },
    black: { rear: 'lancer-black-rear', card: 'lancer-black-front' },
  } },
  microbus: { def: 'white', looks: { white: { rear: 'van-hiace-rear', card: 'van-hiace-front' } } },
  tonaya: { def: 'white', looks: { white: { rear: 'van-white-rear', card: 'van-white-front' } } },
  coupe: { def: 'red', looks: { red: { rear: 'ferrari-rear', card: 'ferrari-front' } } },
  suv: { def: 'blue', looks: { blue: { rear: 'suv-rear', card: 'suv-front' }, green: { rear: 'jeep-rear', card: 'jeep-front' } } },
  gwagon: { def: 'black', looks: { black: { rear: 'gwagon-rear', card: 'gwagon-front' } } },
  // الفارهة: مفيش عندى صورة ضهر ليها لسه، فبستخدم صور سيدان قريبة لحد ما تبعتلى صورتها من ورا
  luxury: { def: 'black', looks: {
    black: { rear: 'lancer-black-rear', card: 'lux-front-black' },
    white: { rear: 'byd-rear', card: 'lux-front-white' },
    silver: { rear: 'corolla20-rear', card: 'lux-front-silver' },
  } },
  tuktuk: { def: 'red', looks: { red: { rear: 'tuktuk-red-rear', card: 'tuktuk-red-front' } } },
  tuktuk2: { def: 'gold', looks: { gold: { rear: 'tuktuk-gold-rear', card: 'tuktuk-gold-front' } } },
};

export const defaultLook = (body) => (LOOKS[body] || LOOKS.sedan).def;
export const lookIds = (body) => Object.keys((LOOKS[body] || LOOKS.sedan).looks);
export function lookFor(body, colorId) {
  const L = LOOKS[body] || LOOKS.sedan;
  return L.looks[colorId] || L.looks[L.def];
}
export const cardImage = (body, colorId) => CAR_IMAGE_DIR + lookFor(body, colorId).card + '.webp';

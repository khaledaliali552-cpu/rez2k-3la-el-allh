// سباق أونلاين بين صاحبين (Firestore: races/{CODE}). واحد يعمل غرفة ويبعت الكود/اللينك، والتانى يدخل.
// كل لاعب بيكتب مكانه (s,x,v) 4 مرات فى الثانية، والتانى بيعرضه كعربية شبح (من غير تصادم).
const CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newCode = () => Array.from({ length: 6 }, () => CH[Math.floor(Math.random() * CH.length)]).join('');

export class OnlineRace {
  constructor(cloud) {
    this.cloud = cloud;
    this.code = null;
    this.role = null; // host | guest
    this.room = null;
    this.unsub = null;
    this.onRoom = null;
    this.lastPush = 0;
  }

  get b() { return this.cloud.b; }
  get me() { return this.cloud.user; }
  get opp() { return this.role === 'host' ? 'guest' : 'host'; }
  get link() { return location.origin + location.pathname + '?race=' + this.code; }

  ready() { return !!(this.cloud.ok && this.cloud.signedIn && this.b && this.b.watch); }

  _watch() {
    if (this.unsub) this.unsub();
    this.unsub = this.b.watch('races/' + this.code, (d) => {
      this.room = d;
      this.onRoom && this.onRoom(d);
    });
  }

  async create(info) {
    const code = newCode();
    const name = info.name || (this.me.email || 'لاعب').split('@')[0];
    await this.b.set('races/' + code, {
      code, hostUid: this.me.uid, hostName: name, guestUid: null, guestName: '', status: 'open',
      roadId: info.roadId, hostCar: info.car, guestCar: null, limit: 150, finish: info.finish,
      createdAt: Date.now(), hostFin: null, guestFin: null,
    });
    this.code = code; this.role = 'host';
    this._watch();
    return code;
  }

  async join(code, info) {
    code = String(code || '').toUpperCase().trim();
    if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error('الكود لازم يكون 6 حروف وأرقام');
    const r = await this.b.get('races/' + code);
    if (!r) throw new Error('الكود ده مش موجود');
    if (r.hostUid === this.me.uid) throw new Error('ده كود الغرفة بتاعتك انت!');
    if (r.status !== 'open' || r.guestUid) throw new Error('الغرفة دى اتملت أو خلصت');
    const name = info.name || (this.me.email || 'لاعب').split('@')[0];
    await this.b.update('races/' + code, { guestUid: this.me.uid, guestName: name, guestCar: info.car, status: 'ready' });
    this.code = code; this.role = 'guest';
    this._watch();
    return r;
  }

  start() { // المضيف بس
    return this.b.update('races/' + this.code, { status: 'racing', startedAt: Date.now(), hostS: 0, guestS: 0 });
  }

  push(s, x, v, now) {
    if (!this.code || now - this.lastPush < 250) return;
    this.lastPush = now;
    const k = this.role;
    this.b.update('races/' + this.code, { [k + 'S']: Math.round(s * 10) / 10, [k + 'X']: Math.round(x * 100) / 100, [k + 'V']: Math.round(v * 10) / 10, [k + 'T']: now }).catch(() => {});
  }

  finish(ms) {
    return this.b.update('races/' + this.code, { [this.role + 'Fin']: ms }).catch(() => {});
  }

  oppState() {
    const r = this.room;
    if (!r) return null;
    const k = this.opp;
    if (r[k + 'S'] == null) return null;
    return { s: r[k + 'S'], x: r[k + 'X'] || 0, v: r[k + 'V'] || 0, fin: r[k + 'Fin'], name: r[k + 'Name'], car: r[k + 'Car'] };
  }

  leave() {
    if (this.unsub) this.unsub();
    this.unsub = null;
    if (this.code && this.role === 'host' && this.room && this.room.status !== 'racing') this.b.del('races/' + this.code).catch(() => {});
    this.code = null; this.role = null; this.room = null;
  }
}

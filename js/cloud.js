// السحابة (Firebase): حسابات بالإيميل، حفظ أونلاين، مكافأة الدعوة، وتشغيل الأصحاب على عربيتك
import { firebaseConfig } from './firebase-config.js';
import * as Save from './save.js';
import { WELCOME_BONUS, INVITER_BONUS, getCar, fmtMoney } from './data.js';

const V = '10.12.2';
const CDN = `https://www.gstatic.com/firebasejs/${V}/`;

// ---------- الطبقة الحقيقية فوق Firebase ----------
async function realBackend() {
  const [appM, authM, fsM] = await Promise.all([
    import(CDN + 'firebase-app.js'),
    import(CDN + 'firebase-auth.js'),
    import(CDN + 'firebase-firestore.js'),
  ]);
  const app = appM.initializeApp(firebaseConfig);
  const auth = authM.getAuth(app);
  const db = fsM.getFirestore(app);
  const ref = (path) => fsM.doc(db, ...path.split('/'));
  const pack = (d) => ({ id: d.id, ...d.data() });
  return {
    onAuth: (cb) => authM.onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email, name: u.displayName || '' } : null)),
    signUp: async (email, pw, name) => {
      const c = await authM.createUserWithEmailAndPassword(auth, email, pw);
      if (name) await authM.updateProfile(c.user, { displayName: name });
      return { uid: c.user.uid, email: c.user.email, name: name || '' };
    },
    signIn: async (email, pw) => {
      const c = await authM.signInWithEmailAndPassword(auth, email, pw);
      return { uid: c.user.uid, email: c.user.email, name: c.user.displayName || '' };
    },
    signOut: () => authM.signOut(auth),
    resetPassword: (email) => authM.sendPasswordResetEmail(auth, email),
    get: async (path) => {
      const s = await fsM.getDoc(ref(path));
      return s.exists() ? s.data() : null;
    },
    set: (path, data) => fsM.setDoc(ref(path), data),
    update: (path, data) => fsM.updateDoc(ref(path), data),
    add: async (col, data) => (await fsM.addDoc(fsM.collection(db, col), data)).id,
    where: async (col, field, value) => {
      const q = fsM.query(fsM.collection(db, col), fsM.where(field, '==', value));
      return (await fsM.getDocs(q)).docs.map(pack);
    },
    del: (path) => fsM.deleteDoc(ref(path)),
  };
}

const ERR = {
  'auth/email-already-in-use': 'الإيميل ده متسجل قبل كده. جرّب "دخول"',
  'auth/invalid-email': 'الإيميل مش مظبوط',
  'auth/weak-password': 'الباسورد ضعيف (6 حروف على الأقل)',
  'auth/invalid-credential': 'الإيميل أو الباسورد غلط',
  'auth/wrong-password': 'الباسورد غلط',
  'auth/user-not-found': 'مفيش حساب بالإيميل ده',
  'auth/too-many-requests': 'محاولات كتير، استنى شوية وجرّب',
  'auth/network-request-failed': 'مفيش نت أو الاتصال ضعيف',
  'auth/missing-password': 'اكتب الباسورد',
  'auth/operation-not-allowed': 'تسجيل الإيميل مش مفعّل فى Firebase (Authentication ← Sign-in method)',
  'auth/unauthorized-domain': 'الدومين ده مش مضاف فى Authorized domains فى Firebase',
  'permission-denied': 'السيرفر رفض العملية (راجع قواعد Firestore)',
};
export const errText = (e) => ERR[e && e.code] || `حصلت مشكلة (${(e && (e.code || e.message)) || 'غير معروفة'})`;

export class Cloud {
  constructor(game) {
    this.g = game;
    this.ok = false; // Firebase اتحمّل
    this.b = null;
    this.user = null;
    this.ready = false; // خلّصنا تحميل بيانات الحساب
    this.ownerJobs = [];
    this.workerJobs = [];
    this.saveTimer = null;
    this.busy = false;
    this.onChange = null;
  }

  async init() {
    try {
      this.b = window.__cloudBackend || (await realBackend());
      this.ok = true;
    } catch (e) {
      this.ok = false;
      this.onChange && this.onChange();
      return;
    }
    this.b.onAuth((u) => this._onUser(u));
  }

  get signedIn() {
    return !!this.user && this.ready;
  }

  _emit() {
    this.onChange && this.onChange();
  }

  // ---------- الدخول والخروج ----------
  async signUp(email, pw, name) {
    const u = await this.b.signUp(email.trim(), pw, (name || '').trim());
    return u;
  }

  signIn(email, pw) {
    return this.b.signIn(email.trim(), pw);
  }

  resetPassword(email) {
    return this.b.resetPassword(email.trim());
  }

  async signOut() {
    await this.flushSave();
    await this.b.signOut();
  }

  async _onUser(u) {
    this.ready = false;
    this.user = u;
    this.ownerJobs = [];
    this.workerJobs = [];
    if (!u) {
      this.g.onCloudSignOut();
      return this._emit();
    }
    try {
      await this._loadProfile();
      this.ready = true;
      await Promise.all([this.claimReferrals(), this.claimPayouts(), this.refreshJobs()]);
    } catch (e) {
      this.g.ui.toast(errText(e), 'bad');
      this.ready = !!this.user;
    }
    this._emit();
    this.g.onCloudReady();
  }

  // ---------- البروفايل والحفظ ----------
  async _loadProfile() {
    const g = this.g;
    const u = this.user;
    const prof = await this.b.get('users/' + u.uid);
    const local = g.state;
    const name = u.name || local.name || u.email.split('@')[0];
    if (prof && prof.save) {
      let cloudState;
      try {
        cloudState = Save.normalize(JSON.parse(prof.save));
      } catch (e) {
        cloudState = null;
      }
      if (cloudState) {
        g.replaceState(cloudState);
      }
    }
    g.state.name = name;
    await this._ensureCode(name);
    await this._pushNow();
    await this._registerReferral(name);
  }

  async _ensureCode(name) {
    const st = this.g.state;
    for (let i = 0; i < 6; i++) {
      const c = await this.b.get('codes/' + st.refCode);
      if (!c) {
        await this.b.set('codes/' + st.refCode, { uid: this.user.uid, name });
        return;
      }
      if (c.uid === this.user.uid) return;
      st.refCode = Save.makeCode(); // الكود محجوز لحد تانى
    }
  }

  queueSave() {
    if (!this.signedIn) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this._pushNow().catch(() => {}), 2500);
  }

  async flushSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
      if (this.signedIn) await this._pushNow().catch(() => {});
    }
  }

  async _pushNow() {
    if (!this.user) return;
    const st = this.g.state;
    await this.b.set('users/' + this.user.uid, {
      email: this.user.email,
      name: st.name || '',
      money: Math.round(st.money),
      save: JSON.stringify(st),
      updatedAt: Date.now(),
    });
  }

  // ---------- الدعوات ----------
  async _registerReferral(name) {
    const st = this.g.state;
    if (!st.referredBy || st.refRegistered) return;
    const c = await this.b.get('codes/' + st.referredBy);
    if (!c || c.uid === this.user.uid) {
      st.refRegistered = true;
      return;
    }
    const mine = await this.b.get('referrals/' + this.user.uid);
    if (!mine) {
      await this.b.set('referrals/' + this.user.uid, {
        inviterUid: c.uid, code: st.referredBy, inviteeName: name || '', claimed: false, createdAt: Date.now(),
      });
    }
    st.refRegistered = true;
  }

  async claimReferrals() {
    const list = (await this.b.where('referrals', 'inviterUid', this.user.uid)).filter((r) => !r.claimed);
    let n = 0;
    for (const r of list) {
      try {
        await this.b.update('referrals/' + r.id, { claimed: true });
        n++;
      } catch (e) {
        /* بيتعاد بعدين */
      }
    }
    if (n) {
      this.g.state.money += n * INVITER_BONUS;
      this.g.save();
      this.g.ui.toast(`🎁 ${n} من صحابك دخلوا بكودك! +${fmtMoney(n * INVITER_BONUS)} جنيه`, 'gold');
    }
    return n;
  }

  // ---------- تشغيل الأصحاب على عربيتك ----------
  async refreshJobs() {
    if (!this.user) return;
    const [o, w] = await Promise.all([this.b.where('jobs', 'ownerUid', this.user.uid), this.b.where('jobs', 'workerUid', this.user.uid)]);
    this.ownerJobs = o.filter((j) => j.status !== 'declined' && j.status !== 'ended');
    this.workerJobs = w.filter((j) => j.status !== 'declined' && j.status !== 'ended');
    this._emit();
  }

  async offerJob(code, carId, share) {
    const st = this.g.state;
    code = String(code || '').toUpperCase().trim();
    if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error('كود صاحبك لازم يكون 6 حروف وأرقام');
    if (!st.owned.includes(carId) || getCar(carId).rented) throw new Error('اختار عربية انت مالكها');
    const c = await this.b.get('codes/' + code);
    if (!c) throw new Error('الكود ده مش موجود');
    if (c.uid === this.user.uid) throw new Error('ده كودك انت!');
    if (this.ownerJobs.some((j) => j.workerUid === c.uid && j.carId === carId)) throw new Error('صاحبك ده عندك بالفعل على نفس العربية');
    await this.b.add('jobs', {
      ownerUid: this.user.uid, ownerName: st.name || this.user.email.split('@')[0],
      workerUid: c.uid, workerName: c.name || '', carId, colorId: st.colors[carId] || 'white',
      share: Math.max(0, Math.min(70, Math.round(share))), status: 'pending', createdAt: Date.now(),
    });
    await this.refreshJobs();
  }

  async respondJob(id, accept) {
    await this.b.update('jobs/' + id, { status: accept ? 'active' : 'declined' });
    await this.refreshJobs();
  }

  async endJob(id) {
    await this.b.update('jobs/' + id, { status: 'ended' });
    await this.refreshJobs();
  }

  // السواق بيبعت حصة صاحب العربية
  async createPayout(job, amount) {
    if (amount <= 0) return;
    await this.b.add('payouts', {
      jobId: job.id, ownerUid: job.ownerUid, workerUid: this.user.uid, workerName: this.g.state.name || '',
      amount: Math.round(amount), claimed: false, createdAt: Date.now(),
    });
  }

  async claimPayouts() {
    const list = (await this.b.where('payouts', 'ownerUid', this.user.uid)).filter((p) => !p.claimed);
    let total = 0;
    let n = 0;
    for (const p of list) {
      try {
        await this.b.update('payouts/' + p.id, { claimed: true });
        total += p.amount;
        n++;
        this.b.del('payouts/' + p.id).catch(() => {});
      } catch (e) {
        /* بيتعاد بعدين */
      }
    }
    if (total) {
      this.g.state.money += total;
      this.g.save();
      this.g.ui.toast(`🚖 صحابك اشتغلوا على عربيتك: +${fmtMoney(total)} جنيه`, 'gold');
    }
    return total;
  }
}

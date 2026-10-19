// الواجهة: شاشات وقوايم وHUD (DOM بس، من غير منطق لعب)
import { HORNS, KINDS, TIMES, getKind, CARS, COLORS, QUEST_POOL, ACHIEVEMENTS, WELCOME_BONUS, BOSSES, STICKERS, SLOGAN_PRICE, ACCESSORIES, modBonus, fmtMoney, fmtTime, getCar, getBoss, getRentVehicle } from './data.js';
import { cardImage, lookIds, defaultLook } from './car-images.js';
import { carHtml } from './workshop-bg.js';
import { NOGLASS } from './sprites.js';

// صورة كارت العربية (كلها صور، من غير مجسمات)
function carThumb(body, look) {
  return cardImage(body, look);
}
import { ROADS } from './roads.js';
import { errText } from './cloud.js';

const $ = (id) => document.getElementById(id);
const SCREENS = ['menu', 'garage', 'quests', 'settings', 'tutorial', 'pause', 'summary', 'roads', 'invite', 'radio', 'account', 'workshop'];
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export class UI {
  constructor(game) {
    this.g = game;
    this.cache = {};
    this._bind();
  }

  _bind() {
    const g = this.g;
    $('m-start').onclick = () => g.openRoads();
    $('m-invite').onclick = () => g.openInvite();
    $('m-account').onclick = () => g.openAccount();
    $('acc-back').onclick = () => g.backToMenu();
    const cl = () => g.cloud;
    const guard = async (fn) => {
      try {
        await fn();
      } catch (e) {
        this.toast(e && e.code ? errText(e) : (e && e.message) || 'حصلت مشكلة', 'bad');
      }
    };
    $('acc-login').onclick = () => guard(async () => cl().signIn($('acc-email').value, $('acc-pass').value));
    $('acc-signup').onclick = () => guard(async () => {
      if (!$('acc-name').value.trim()) throw new Error('اكتب اسمك الأول');
      await cl().signUp($('acc-email').value, $('acc-pass').value, $('acc-name').value);
    });
    document.querySelectorAll('.social-btn').forEach((b) => {
      b.onclick = () => guard(async () => cl().signInWith(b.dataset.prov));
    });
    $('acc-reset').onclick = () => guard(async () => {
      if (!$('acc-email').value.trim()) throw new Error('اكتب الإيميل الأول');
      await cl().resetPassword($('acc-email').value);
      this.toast('بعتنالك لينك تغيير الباسورد على الإيميل ✉️', 'good');
    });
    $('acc-logout').onclick = () => guard(() => cl().signOut());
    $('job-offer').onclick = () => guard(async () => {
      await cl().offerJob($('job-code').value, $('job-car').value, +$('job-share').value);
      $('job-code').value = '';
      this.toast('بعتّ العرض لصاحبك ✅', 'good');
    });
    $('acc-body').addEventListener('click', (e) => {
      const b = e.target.closest('[data-job]');
      if (!b) return;
      const id = b.dataset.job;
      const act = b.dataset.act;
      guard(async () => {
        if (act === 'accept') await cl().respondJob(id, true);
        else if (act === 'decline') await cl().respondJob(id, false);
        else if (act === 'end') {
          if (window.confirm('تنهى الشغل ده؟')) await cl().endJob(id);
        } else if (act === 'drive') {
          g.selectCar('job:' + id);
          g.backToMenu();
          this.toast('اتحددت العربية. اضغط ابدأ ✅', 'good');
        }
      });
    });
    $('m-radio').onclick = () => g.openRadio();
    $('r-back').onclick = () => g.wizBack();
    $('inv-back').onclick = () => g.backToMenu();
    $('radio-back').onclick = () => g.backToMenu();
    $('su-roads').onclick = () => g.openRoads();
    $('p-radio').onclick = () => g.radio.cycle();
    $('btn-radio').onclick = () => g.radio.cycle().then(() => this.radioToast());
    $('inv-wa').onclick = () => g.shareWhatsApp();
    $('inv-copy').onclick = () => g.copyInvite();
    $('inv-use').onclick = () => {
      const msg = g.redeemCode($('inv-input').value);
      this.toast(msg, msg.startsWith('🎁') ? 'gold' : 'bad');
      this.renderInvite();
    };
    $('radio-toggle').onclick = () => {
      if (g.radio.playing) g.radio.stop();
      else g.radio.start();
    };
    $('radio-next').onclick = () => g.radio.next();
    $('radio-vol').oninput = (e) => {
      g.radio.setVolume(parseFloat(e.target.value));
      g.save();
    };
    $('radio-list').addEventListener('click', (e) => {
      const it = e.target.closest('[data-i]');
      if (it) g.radio.start(+it.dataset.i);
    });
    $('setup-body').addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]');
      if (!b || b.disabled) return;
      const v = b.dataset.v;
      const a = b.dataset.a;
      g.wizAct(a, v);
    });
    $('setup-go').onclick = () => g.startFromSetup();
    $('m-garage').onclick = () => g.openGarage();
    $('m-quests').onclick = () => g.openQuests();
    $('m-settings').onclick = () => g.openSettings();
    $('g-back').onclick = () => g.backToMenu();
    $('m-workshop').onclick = () => g.openWorkshop();
    $('w-back').onclick = () => g.backToMenu();
    $('g-workshop').onclick = () => g.openWorkshop();
    $('workshop-body').addEventListener('click', (e) => {
      const b = e.target.closest('[data-w]');
      if (!b) return;
      const k = b.dataset.w;
      if (k === 'car') g.wsPick(b.dataset.v);
      else if (k === 'repair') g.wsRepair();
      else if (k === 'acc') g.wsAcc(b.dataset.v);
      else if (k === 'slogan') g.wsSlogan(b.dataset.v);
      else if (k === 'noslogan') g.wsSlogan('');
      else if (k.startsWith('horn-')) g.wsHorn(k.slice(5), b.dataset.v);
    });
    $('q-back').onclick = () => g.backToMenu();
    $('s-back').onclick = () => g.backToMenu();
    $('tu-go').onclick = () => g.tutorialGo();
    $('btn-pause').onclick = () => g.pause();
    $('p-resume').onclick = () => g.resume();
    $('p-end').onclick = () => g.endShiftEarly();
    $('p-sound').onclick = () => g.toggleSound();
    $('su-next').onclick = () => g.startShift();
    $('su-garage').onclick = () => g.openGarage();
    $('su-menu').onclick = () => g.backToMenu();

    $('s-ctl').addEventListener('click', (e) => { const b = e.target.closest('[data-ctl]'); if (b) g.setSetting('control', b.dataset.ctl); });
    $('s-sound').onchange = (e) => g.setSetting('sound', e.target.checked);
    $('s-vibrate').onchange = (e) => g.setSetting('vibrate', e.target.checked);
    $('s-auto').onchange = (e) => g.setSetting('auto', e.target.checked);
    $('s-steer').oninput = (e) => g.setSetting('steer', parseFloat(e.target.value));
    $('s-brake').oninput = (e) => g.setSetting('brakeSens', parseFloat(e.target.value));
    $('s-unlock').onclick = () => g.unlockAll();
    $('s-reset').onclick = () => g.resetProgress();

    // قائمة الجراج (تفويض أحداث)
    $('g-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) g.setGarageTab(b.dataset.tab); });
    $('ws-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-wt]'); if (b) { g.wsTab = b.dataset.wt; this.renderWorkshop(); } });
    $('garage-sheet').addEventListener('click', (e) => {
      const sw = e.target.closest('[data-color]');
      if (sw) return g.buyColor(sw.dataset.car, sw.dataset.color);
      const btn = e.target.closest('[data-act]');
      if (btn) {
        if (btn.dataset.act === 'buy') g.buyCar(btn.dataset.id);
        else if (btn.dataset.act === 'use') g.selectCar(btn.dataset.id);
        return;
      }
      const card = e.target.closest('.gitem');
      if (card) g.previewCar(card.dataset.id);
    });
  }

  show(name) {
    if (name !== 'summary') this.clearToasts();
    for (const s of SCREENS) $('screen-' + s).classList.toggle('hidden', s !== name);
  }

  hideAll() {
    for (const s of SCREENS) $('screen-' + s).classList.add('hidden');
  }

  showHud(on, touch) {
    $('hud').classList.toggle('hidden', !on);
    $('touch').classList.toggle('hidden', !(on && touch));
  }

  // ---------- القائمة ----------
  renderMenu() {
    const st = this.g.state;
    const car = this.g.carSpec(st.selected) || getCar('boss_taxi');
    const bal = st.money < 0 ? `عليك ${fmtMoney(-st.money)} جنيه للمعلم` : `رصيدك ${fmtMoney(st.money)} جنيه`;
    $('menu-status').innerHTML = `يوم <b>${st.day}</b> · ${bal}<br>العربية: <b>${car.name}</b>${car.rented ? ' (بتاعة المعلم)' : ''}`;
  }

  // ---------- الجراج ----------
  renderGarage() {
    const g = this.g;
    const st = g.state;
    $('garage-money').textContent = `💰 ${fmtMoney(st.money)} جنيه`;
    const tab = g.garageTab || 'private';
    document.querySelectorAll('#g-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    const cars = CARS.filter((c) => !c.rented && c.cat === tab);
    const jobs = tab === 'hire' ? g.cloud.workerJobs.filter((j) => j.status === 'active').map((j) => g.carSpec('job:' + j.id)).filter(Boolean) : [];
    const all = [...cars, ...jobs];
    let cur = all.find((c) => c.id === g.previewId) || all[0];
    const strip = $('garage-list');
    strip.innerHTML = all.map((c) => {
      const owned = c.job || st.owned.includes(c.id);
      const t = carThumb(c.body, owned && !c.job ? g.carLook(c.id) : defaultLook(c.body));
      return `<button class="gitem${cur && cur.id === c.id ? ' prev' : ''}${st.selected === c.id ? ' sel' : ''}${owned ? '' : ' locked'}" data-id="${c.id}">${t ? `<img src="${t}" alt="">` : ''}<span>${c.name}</span><small>${st.selected === c.id ? '✓ بتركبها' : owned ? 'بتاعتك' : fmtMoney(c.price) + ' ج'}</small></button>`;
    }).join('');
    const info = $('g-info');
    if (!cur) { info.innerHTML = '<div class="meta">مفيش عربيات هنا.</div>'; $('g-car').innerHTML = ''; return; }
    const owned = cur.job || st.owned.includes(cur.id);
    const bar = (label, v) => `<div class="stat"><span>${label}</span><div class="bar gold"><i style="width:${Math.round(Math.min(1, v) * 100)}%"></i></div></div>`;
    let action;
    if (cur.job) action = st.selected === cur.id ? '<button class="btn" disabled>العربية الحالية ✓</button>' : `<button class="btn primary" data-act="use" data-id="${cur.id}">اركب العربية</button>`;
    else if (!owned) action = `<button class="btn primary" data-act="buy" data-id="${cur.id}" ${st.money < cur.price ? 'disabled' : ''}>اشترى بـ ${fmtMoney(cur.price)} ج</button>`;
    else if (st.selected === cur.id) action = '<button class="btn" disabled>العربية الحالية ✓</button>';
    else action = `<button class="btn primary" data-act="use" data-id="${cur.id}">اركب العربية</button>`;
    let sw = '';
    if (owned && !cur.job) {
      sw = '<div class="swatches">' + COLORS.filter((c) => lookIds(cur.body).includes(c.id)).map((c) => {
        const has = g.hasColor(cur.id, c.id);
        const on = g.carLook(cur.id) === c.id;
        return `<button class="sw ${on ? 'on' : ''} ${has ? '' : 'locked'}" title="${c.name}${has ? '' : ' · ' + c.price + ' ج'}" data-car="${cur.id}" data-color="${c.id}" style="background:${hex(c.hex)}">${has ? '' : `<small>${c.price}</small>`}</button>`;
      }).join('') + '</div>';
    }
    info.innerHTML = `<div class="gi-main"><h3>${cur.name}</h3><p>${cur.job ? 'عربية صاحبك ' + cur.job.ownerName + ' · بتدفعله ' + cur.job.share + '%' : cur.desc}</p><div class="meta">${cur.rented ? '' : 'بتشيل لحد ' + cur.cap + ' ركاب · تصليح ' + cur.repair + ' ج لكل 1%'}</div>${sw}</div>
      <div class="gi-stats">${bar('السرعة', cur.vmax / 60)}${bar('التسارع', cur.accel / 11)}${bar('التحكم', cur.handling / 1.2)}</div>
      <div class="gi-act">${action}</div>`;
    const look = owned && !cur.job ? g.carLook(cur.id) : defaultLook(cur.body);
    const el = $('g-car');
    el.style.setProperty('--cw', tab === 'bike' ? '15%' : cur.body === 'bus' ? '31%' : '25%');
    el.innerHTML = carHtml(cur.body, look, owned && !cur.job ? st.mods[cur.id] : null);
    this._carAspect(el);
  }

  _carAspect(el) {
    const c = el.querySelector('.wr-car');
    const a = c ? parseFloat(c.style.aspectRatio) : 2;
    el.style.setProperty('--car-a', a || 2);
  }

  // ---------- الورشة ----------
  renderWorkshop() {
    const g = this.g;
    const st = g.state;
    $('ws-money').textContent = `💰 ${fmtMoney(st.money)} جنيه`;
    const id = g.wsCar;
    const car = getCar(id);
    const mods = st.mods[id] || { slogan: '', accs: [] };
    const dmg = Math.round(st.damage[id] || 0);
    const cost = Math.round(dmg * car.repair);
    const tab = g.wsTab || 'fix';
    document.querySelectorAll('#ws-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.wt === tab));
    let h = '<div class="ws-cars">';
    for (const cid of g.ownedList()) {
      const c = getCar(cid);
      const t = carThumb(c.body, g.carLook(cid));
      h += `<button class="ws-car${cid === id ? ' sel' : ''}" data-w="car" data-v="${cid}">${t ? `<img src="${t}" alt="">` : ''}<span>${c.name}</span></button>`;
    }
    h += '</div>';
    if (tab === 'fix') {
      h += `<div class="item"><div><b>${dmg ? `الضرر ${dmg}%` : 'العربية سليمة'}</b><div class="meta">${dmg ? `التصليح ${cost} جنيه (${car.repair} ج لكل 1%)` : 'مفيش حاجة تتصلح'}</div></div>
      <button class="btn primary" data-w="repair" ${dmg < 1 ? 'disabled' : ''}>صلّح</button></div>`;
    } else if (tab === 'acc') {
      h += `<div class="meta" style="font-size:12.5px;color:var(--muted)">كل حاجة بتركّبها بتزوّد أجرتك. الزيادة الحالية: <b style="color:var(--accent)">+${Math.round(modBonus(mods) * 100)}%</b></div><div class="ws-accs">`;
      for (const a of ACCESSORIES) {
        const on = (mods.accs || []).includes(a.id);
        h += `<button class="opt${on ? ' sel' : ''}" data-w="acc" data-v="${a.id}"><b>${a.img ? `<img src="${a.img}" alt="" style="height:20px;vertical-align:middle"> ` : a.icon + ' '}${a.name}</b><small>${a.desc}</small><span class="otag ${on ? 'green' : 'gold'}">${on ? 'مركّب ✓ (اضغط لفكّه)' : a.price + ' ج · +' + Math.round(a.bonus * 100) + '%'}</span></button>`;
      }
      h += '</div>';
    } else if (tab === 'horn') {
      h += '<div class="ws-horns">' + HORNS.map((x) => {
        const own = st.horns.includes(x.id);
        const cur = st.horn === x.id;
        return `<div class="item${cur ? ' done' : ''}"><div><b>🎺 ${x.name}</b><div class="meta">${x.desc}</div></div><div class="row"><button class="btn" data-w="horn-test" data-v="${x.id}">▶</button>${own ? (cur ? '<button class="btn" disabled>مستخدم ✓</button>' : `<button class="btn primary" data-w="horn-use" data-v="${x.id}">استخدم</button>`) : `<button class="btn primary" data-w="horn-buy" data-v="${x.id}">${x.price} ج</button>`}</div></div>`;
      }).join('') + '</div>';
    } else if (NOGLASS.has(car.body)) {
      h += '<div class="meta" style="font-size:13px">الاستيكر بيتلزق على الزجاج الخلفى، والموتوسيكل ملوش زجاج 🏍️</div>';
    } else {
      const cur = STICKERS.find((x) => x.id === mods.slogan);
      h += `<div class="meta" style="font-size:12.5px;color:var(--muted)">${cur ? 'الحالى: «' + cur.text + '»' : 'مفيش استيكر لسه'} · اللزق ${SLOGAN_PRICE} جنيه (+3%)</div>
      <div class="ws-stickers">${STICKERS.map((t) => `<button class="stk${mods.slogan === t.id ? ' sel' : ''}" data-w="slogan" data-v="${t.id}" title="${t.text}"><img src="assets/images/stickers/${t.id}.webp" alt="${t.text}" loading="lazy"></button>`).join('')}</div>
      <div class="ws-custom"><button class="btn" data-w="noslogan" ${mods.slogan ? '' : 'disabled'}>شيل الاستيكر</button></div>`;
    }
    $('workshop-body').innerHTML = h;
    $('ws-room').innerHTML = carHtml(car.body, g.carLook(id), mods);
    this._carAspect($('ws-room'));
    $('ws-room').style.setProperty('--cw', car.cat === 'bike' ? '17%' : car.body === 'bus' ? '36%' : '30%');
  }

  // ---------- الحساب ----------

  renderAccount() {
    const c = this.g.cloud;
    const box = $('acc-guest');
    if (!box) return;
    const note = $('acc-note');
    if (!c.ok) {
      box.classList.add('hidden');
      $('acc-user').classList.add('hidden');
      note.textContent = 'الحسابات محتاجة نت. لو النت شغال، حدّث الصفحة وجرّب تانى.';
      return;
    }
    note.textContent = '';
    const on = c.signedIn;
    box.classList.toggle('hidden', on || (c.user && !c.ready));
    $('acc-user').classList.toggle('hidden', !on);
    if (c.user && !c.ready) note.textContent = 'بنحمّل بياناتك…';
    if (!on) return;
    const st = this.g.state;
    $('acc-who').innerHTML = `${st.name || ''}<br><small>${c.user.email || 'دخول بحساب خارجى'}</small><br>كودك: <b class="code" style="font-size:20px">${st.refCode}</b>`;
    // العربيات اللى يقدر يشغّل عليها
    const sel = $('job-car');
    const owned = st.owned.filter((id) => !getCar(id).rented);
    sel.innerHTML = owned.length
      ? owned.map((id) => `<option value="${id}">${getCar(id).name}</option>`).join('')
      : '<option value="">مفيش عربية بتاعتك لسه</option>';
    $('job-offer').disabled = !owned.length;
    const stText = { pending: 'مستني الرد', active: 'شغال' };
    $('acc-employees').innerHTML = c.ownerJobs.length
      ? c.ownerJobs
          .map((j) => `<div class="item"><div><div>${j.workerName || 'صاحبك'} · ${getCar(j.carId).name}</div><div class="meta">حصتك ${j.share}% · ${stText[j.status] || j.status}</div></div><button class="btn" data-job="${j.id}" data-act="end">إنهاء</button></div>`)
          .join('')
      : '<div class="meta">لسه موظفتش حد.</div>';
    const offers = c.workerJobs.filter((j) => j.status === 'pending');
    const active = c.workerJobs.filter((j) => j.status === 'active');
    $('acc-offers').innerHTML =
      (offers.length
        ? offers
            .map((j) => `<div class="item"><div><div>${j.ownerName} عارض عليك تشتغل على ${getCar(j.carId).name}</div><div class="meta">هتدفعله ${j.share}% من اللى بتكسبه</div></div><div class="row"><button class="btn primary" data-job="${j.id}" data-act="accept">موافق</button><button class="btn" data-job="${j.id}" data-act="decline">رفض</button></div></div>`)
            .join('')
        : '') +
      active
        .map((j) => `<div class="item done"><div><div>🤝 ${getCar(j.carId).name} (${j.ownerName})</div><div class="meta">بتدفعله ${j.share}%</div></div><div class="row"><button class="btn primary" data-job="${j.id}" data-act="drive">اشتغل عليها</button><button class="btn" data-job="${j.id}" data-act="end">اعتذر</button></div></div>`)
        .join('') || (offers.length ? '' : '<div class="meta">مفيش عروض شغل.</div>');
  }

  // ---------- تجهيز الوردية ----------
  renderSetup() {
    const g = this.g;
    const st = g.state;
    const wz = g.wiz;
    const kind = getKind(st.work.kind);
    $('roads-money').textContent = `💰 ${fmtMoney(st.money)} جنيه`;
    const card = (a, v, sel, title, desc, tag, extra = '', dis = false, img = '') =>
      `<button class="opt${sel ? ' sel' : ''}${dis ? ' dis' : ''}" data-a="${a}" data-v="${v}" ${dis ? 'aria-disabled="true"' : ''}>${img ? `<img class="othumb" src="${img}" alt="">` : ''}<b>${title}</b>${desc ? `<small>${desc}</small>` : ''}${tag ? `<span class="otag ${extra}">${tag}</span>` : ''}</button>`;
    let h = '';
    let title = '';
    let go = false;
    if (wz.step === 'kind') {
      title = 'عايز تعمل إيه؟';
      h += '<div class="opts kinds">' + KINDS.map((k) => card('kind', k.id, st.work.kind === k.id, `${k.icon} ${k.name}`, k.desc, '')).join('') + '</div>';
    } else if (wz.step === 'car') {
      title = `${kind.icon} ${kind.name} · اختار عربيتك`;
      const ids = st.owned.filter((id) => {
        const c = getCar(id);
        return !c.rented && kind.cats.includes(c.cat) && (!kind.free || c.cap >= 3);
      });
      const jobs = kind.race || kind.cats.includes('bike') && kind.race ? [] : g.cloud.workerJobs.filter((j) => j.status === 'active').map((j) => g.carSpec('job:' + j.id)).filter((sp) => sp && kind.cats.includes(sp.cat) && (!kind.free || sp.cap >= 3));
      h += '<div class="opts cars3">';
      if (kind.rent) h += card('car', 'boss_taxi', st.selected === 'boss_taxi', '🧑‍💼 عربية معلم', 'إيجار أو نسبة', '', 'gold');
      for (const id of ids) {
        const c = getCar(id);
        h += card('car', id, st.selected === id, c.name, `سعة ${c.cap}`, '', 'green', false, carThumb(c.body, g.carLook(id)));
      }
      for (const sp of jobs) h += card('car', sp.id, st.selected === sp.id, `🤝 ${sp.name}`, `بتدفع ${sp.job.share}%`, '', 'green', false, carThumb(sp.body, defaultLook(sp.body)));
      h += '</div>';
      if (!ids.length && !kind.rent && !jobs.length) h += '<p class="foot">معندكش عربية من النوع ده. اشترى واحدة من الجراج الأول 🚗</p>';
      if (kind.rent && st.selected === 'boss_taxi') {
        const boss = getBoss(st.work.boss);
        h += '<h3 class="sec">المعلم</h3><div class="opts">';
        for (const b of BOSSES) h += card('boss', b.id, b.id === boss.id, b.name, b.quote, b.fee ? `يومية ${b.fee} ج` : `نسبة ${b.pct}%`, 'green');
        h += '</div><h3 class="sec">نوع المركبة</h3><div class="opts cars3">';
        for (const vid of boss.vehicles) {
          const v = getRentVehicle(vid);
          const fee = boss.fee ? Math.round((boss.fee * v.feeMul) / 5) * 5 : 0;
          h += card('veh', vid, st.work.vehicle === vid, v.name, v.note, fee ? `يومية ${fee} ج` : `نسبة ${boss.pct}%`, 'green', false, carThumb(v.body, defaultLook(v.body)));
        }
        h += '</div><button class="btn primary" data-a="next" data-v="1">التالى ←</button>';
      }
    } else if (wz.step === 'opp') {
      title = '🏁 اختار العربية اللى هتسابقها';
      h += '<div class="opts cars3">' + CARS.filter((c) => !c.rented).map((c) => card('opp', c.id, wz.opp === c.id, c.name, `سرعة ${Math.round(c.vmax * 3.6)} كم/س`, '', 'gold', false, carThumb(c.body, defaultLook(c.body)))).join('') + '</div>';
    } else {
      go = true;
      title = 'الطريق ووقت اليوم';
      if (!g.free) {
        h += '<h3 class="sec">الطريق</h3><div class="opts roads">';
        for (const r of ROADS) {
          const stops = r.landmarks.slice(0, 5).map((l) => l.name).join(' · ') + (r.landmarks.length > 5 ? ' …' : '');
          const fareTxt = kind.race ? '' : `<span class="fare"><b>${r.fare}</b><small>جنيه / فرد</small></span>`;
          h += `<button class="opt road ${r.tagClass || ''}${st.selectedRoad === r.id ? ' sel' : ''}" data-a="road" data-v="${r.id}">
            <b>${r.name} ${st.roadsPlayed[r.id] ? '<span class="chk">✓</span>' : ''}</b>
            <small>${r.sub}</small><small class="stops">${stops}</small>${fareTxt}
            <span class="rtag ${r.tagClass || ''}">${r.tagIcon} ${r.tag}</span></button>`;
        }
        h += '</div>';
      }
      h += '<h3 class="sec">الوقت</h3><div class="opts times">' + TIMES.map((t) => card('time', t.id, st.work.time === t.id, `${t.icon} ${t.name}`, t.desc, '')).join('') + '</div>';
    }
    $('setup-title').textContent = title;
    $('setup-body').innerHTML = h;
    const spec = g.carSpec(st.selected) || getCar('boss_taxi');
    $('setup-go').classList.toggle('hidden', !go);
    $('setup-go').textContent = kind.race ? '🏁 ابدأ السباق' : `ابدأ · ${spec.name} · ${g.free ? 'خطافى' : g.road.name}`;
  }

  // ---------- الدعوات ----------
  renderInvite() {
    const g = this.g;
    $('inv-bonus').textContent = WELCOME_BONUS;
    $('inv-code').textContent = g.state.refCode;
    $('inv-input').value = '';
    $('inv-input').disabled = !!g.state.referredBy;
    $('inv-use').disabled = !!g.state.referredBy;
    $('inv-input').placeholder = g.state.referredBy ? 'استخدمت كود: ' + g.state.referredBy : 'كود من 6 حروف';
  }

  // ---------- الراديو ----------
  renderRadio() {
    const r = this.g.radio;
    $('radio-vol').value = r.volume;
    this.setRadioLabel();
  }

  setRadioLabel() {
    const r = this.g.radio;
    const cur = r.current;
    const now = $('radio-now');
    if (now) now.textContent = r.playing && cur ? 'شغّال: ' + cur.title : 'مقفول';
    const tg = $('radio-toggle');
    if (tg) tg.textContent = r.playing ? '⏹ اقفل' : '▶ شغّل';
    const list = $('radio-list');
    if (list) {
      list.innerHTML = '';
      r.tracks.forEach((t, i) => {
        const d = document.createElement('div');
        d.className = 'item' + (r.playing && r.idx === i ? ' done' : '');
        d.dataset.i = i;
        d.style.cursor = 'pointer';
        d.innerHTML = `<div>${t.title}</div><div class="tag">${r.playing && r.idx === i ? '▶' : ''}</div>`;
        list.appendChild(d);
      });
    }
    const b = $('btn-radio');
    if (b) b.textContent = r.playing ? '🎶' : '📻';
  }

  radioToast() {
    const r = this.g.radio;
    this.toast(r.playing && r.current ? r.current.title : '📻 الراديو اتقفل', '');
  }

  // ---------- المهام والإنجازات ----------
  renderQuests() {
    const g = this.g;
    const ql = $('quest-list');
    ql.innerHTML = '';
    for (const q of g.questView()) {
      const d = document.createElement('div');
      d.className = 'item' + (q.done ? ' done' : '');
      d.innerHTML = `<div><div>${q.text}</div><div class="meta">${q.progress}/${q.target}</div></div><div class="tag">${q.done ? '✅' : '+' + q.reward + ' ج'}</div>`;
      ql.appendChild(d);
    }
    const al = $('ach-list');
    al.innerHTML = '';
    for (const a of ACHIEVEMENTS) {
      const got = !!g.state.ach[a.id];
      const d = document.createElement('div');
      d.className = 'item' + (got ? ' done' : '');
      d.innerHTML = `<div><div>${got ? '🏅' : '🔒'} ${a.text}</div><div class="meta">${a.desc}</div></div><div class="tag">+${a.reward} ج</div>`;
      al.appendChild(d);
    }
  }

  // ---------- الإعدادات ----------
  renderSettings() {
    const s = this.g.state.settings;
    $('s-tester').classList.toggle('hidden', !this.g.isTester());
    $('s-sound').checked = s.sound;
    document.querySelectorAll('#s-ctl button').forEach((b) => b.classList.toggle('on', b.dataset.ctl === (s.control || 'arrows')));
    $('s-vibrate').checked = s.vibrate;
    $('s-auto').checked = s.auto;
    $('s-steer').value = s.steer;
    $('s-brake').value = s.brakeSens;
  }

  setSoundLabel(on) {
    $('p-sound').textContent = on ? '🔊 الصوت شغال' : '🔇 الصوت مقفول';
  }

  // ---------- ملخص الوردية ----------
  showSummary(data) {
    $('sum-title').textContent = data.title;
    const rows = $('sum-rows');
    rows.innerHTML = '';
    for (const r of data.rows) {
      const d = document.createElement('div');
      d.className = 'sr ' + (r.cls || '');
      d.innerHTML = `<span>${r.label}</span><b>${r.value}</b>`;
      rows.appendChild(d);
    }
    const ex = $('sum-extra');
    ex.innerHTML = '';
    for (const e of data.extras) {
      const d = document.createElement('div');
      d.className = 'item' + (e.done ? ' done' : '');
      d.innerHTML = `<div>${e.text}</div><div class="tag">${e.tag || ''}</div>`;
      ex.appendChild(d);
    }
    this.show('summary');
  }

  // ---------- HUD ----------
  _set(key, val, fn) {
    if (this.cache[key] === val) return;
    this.cache[key] = val;
    fn(val);
  }

  setSpeed(kmh, rev) {
    this._set('speed', kmh + (rev ? 'R' : ''), () => { $('speed').textContent = kmh; $('speed').classList.toggle('rev', !!rev); });
  }

  setMoney(n) {
    this._set('money', n, (v) => ($('hud-money').innerHTML = `💰 <b>${fmtMoney(v)}</b>`));
  }

  setTimer(sec, over) {
    const label = over ? 'آخر مشوار' : sec === Infinity ? 'شغل حر' : fmtTime(sec);
    this._set('timer', label, (v) => ($('hud-timer').innerHTML = `⏱ <b>${v}</b>`));
    $('hud-timer').classList.toggle('warn', !over && sec <= 30);
  }

  setDay(d, road) {
    const label = `يوم ${d}` + (road ? ` · ${road.name}` : '');
    this._set('day', label, (v) => ($('hud-day').textContent = v));
  }

  setDamage(pct) {
    this._set('dmg', Math.round(pct), (v) => ($('dmg-bar').style.width = v + '%'));
  }

  setLimit(limit, over) {
    const el = $('limit');
    if (!limit) {
      el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    this._set('limit', limit, (v) => ($('limit').firstElementChild.textContent = v));
    el.classList.toggle('over', !!over);
  }

  setHint(text) {
    const el = $('hint');
    if (!text) {
      el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    this._set('hint', text, (v) => (el.textContent = v));
  }

  setCard(info) {
    const el = $('card');
    if (!info) {
      el.classList.add('hidden');
      this.cache.cardKey = null;
      return;
    }
    el.classList.remove('hidden');
    const key = [info.icon, info.title, info.sub, info.line].join('|');
    if (this.cache.cardKey !== key) {
      this.cache.cardKey = key;
      $('card-icon').textContent = info.icon;
      $('card-title').textContent = info.title;
      $('card-sub').textContent = info.sub;
      $('card-line').textContent = info.line || '';
    }
    const bar = $('card-bar');
    bar.style.width = Math.round(Math.max(0, Math.min(1, info.bar)) * 100) + '%';
    bar.parentElement.className = 'bar ' + (info.barClass || '');
  }

  toast(text, kind = '') {
    const box = $('toasts');
    const t = document.createElement('div');
    t.className = 'toast ' + kind;
    t.textContent = text;
    box.appendChild(t);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3100);
  }

  clearToasts() {
    $('toasts').innerHTML = '';
  }

  flash() {
    const el = $('flash');
    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    setTimeout(() => el.classList.add('hidden'), 520);
  }
}

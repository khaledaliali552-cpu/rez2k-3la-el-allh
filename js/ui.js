// الواجهة: شاشات وقوايم وHUD (DOM بس، من غير منطق لعب)
import { CARS, COLORS, QUEST_POOL, ACHIEVEMENTS, WELCOME_BONUS, fmtMoney, fmtTime, getCar } from './data.js';
import { ROADS } from './roads.js';
import { errText } from './cloud.js';

const $ = (id) => document.getElementById(id);
const SCREENS = ['menu', 'garage', 'quests', 'settings', 'tutorial', 'pause', 'summary', 'roads', 'invite', 'radio', 'account'];
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
    $('r-back').onclick = () => g.backToMenu();
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
    $('road-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-road]');
      if (b) g.startOnRoad(b.dataset.road);
    });
    $('m-garage').onclick = () => g.openGarage();
    $('m-quests').onclick = () => g.openQuests();
    $('m-settings').onclick = () => g.openSettings();
    $('g-back').onclick = () => g.backToMenu();
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

    $('s-sound').onchange = (e) => g.setSetting('sound', e.target.checked);
    $('s-vibrate').onchange = (e) => g.setSetting('vibrate', e.target.checked);
    $('s-auto').onchange = (e) => g.setSetting('auto', e.target.checked);
    $('s-steer').oninput = (e) => g.setSetting('steer', parseFloat(e.target.value));
    $('s-brake').oninput = (e) => g.setSetting('brakeSens', parseFloat(e.target.value));
    $('s-reset').onclick = () => g.resetProgress();

    // قائمة الجراج (تفويض أحداث)
    $('garage-list').addEventListener('click', (e) => {
      const sw = e.target.closest('[data-color]');
      if (sw) return g.buyColor(sw.dataset.car, sw.dataset.color);
      const btn = e.target.closest('[data-act]');
      if (btn) {
        if (btn.dataset.act === 'buy') g.buyCar(btn.dataset.id);
        else if (btn.dataset.act === 'use') g.selectCar(btn.dataset.id);
        return;
      }
      const card = e.target.closest('.gcar');
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
    const list = $('garage-list');
    list.innerHTML = '';
    for (const car of CARS) {
      const owned = st.owned.includes(car.id);
      const div = document.createElement('div');
      div.className = 'gcar' + (st.selected === car.id ? ' sel' : '') + (g.previewId === car.id ? ' prev' : '');
      div.dataset.id = car.id;
      const bar = (label, v) =>
        `<div class="stat"><span>${label}</span><div class="bar gold"><i style="width:${Math.round(Math.min(1, v) * 100)}%"></i></div></div>`;
      let action = '';
      if (!owned) {
        action = `<button class="btn" data-act="buy" data-id="${car.id}" ${st.money < car.price ? 'disabled' : ''}>اشترى بـ ${fmtMoney(car.price)} ج</button>`;
      } else if (st.selected === car.id) {
        action = `<button class="btn" disabled>العربية الحالية ✓</button>`;
      } else {
        action = `<button class="btn primary" data-act="use" data-id="${car.id}">اركب العربية</button>`;
      }
      let sw = '';
      if (owned && !car.rented) {
        sw =
          '<div class="swatches">' +
          COLORS.map((c) => {
            const has = g.hasColor(car.id, c.id);
            const on = (st.colors[car.id] || 'white') === c.id;
            return `<button class="sw ${on ? 'on' : ''} ${has ? '' : 'locked'}" title="${c.name}${has ? '' : ' · ' + c.price + ' ج'}" data-car="${car.id}" data-color="${c.id}" style="background:${hex(c.hex)}">${has ? '' : `<small>${c.price}</small>`}</button>`;
          }).join('') +
          '</div><div class="meta" style="font-size:11px;color:var(--muted)">الألوان المقفولة بتتشترى بالفلوس (السعر مكتوب عليها)</div>';
      }
      div.innerHTML = `
        <h3>${car.name}</h3>
        <p>${car.desc}</p>
        ${bar('السرعة', car.vmax / 60)}
        ${bar('التسارع', car.accel / 11)}
        ${bar('التحكم', car.handling / 1.2)}
        <div class="meta" style="font-size:12px;color:var(--muted)">${car.rented ? `إيجار: ${car.fee} جنيه كل وردية` : `مصاريف تصليح: ${car.repair} ج لكل 1% ضرر`}· بتشيل لحد ${car.cap} ركاب</div>
        ${sw}
        ${action}`;
      list.appendChild(div);
    }
    for (const job of g.cloud.workerJobs.filter((j) => j.status === 'active')) {
      const spec = g.carSpec('job:' + job.id);
      if (!spec) continue;
      const div = document.createElement('div');
      div.className = 'gcar' + (st.selected === spec.id ? ' sel' : '') + (g.previewId === spec.id ? ' prev' : '');
      div.dataset.id = spec.id;
      div.innerHTML = `<h3>🤝 ${spec.name}</h3>
        <p>عربية صاحبك ${job.ownerName}. بتشتغل عليها ومن غير إيجار، وبتدفعله ${job.share}% من اللى بتكسبه.</p>
        ${st.selected === spec.id ? '<button class="btn" disabled>العربية الحالية ✓</button>' : `<button class="btn primary" data-act="use" data-id="${spec.id}">اركب العربية</button>`}`;
      list.appendChild(div);
    }
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
    $('acc-who').innerHTML = `${st.name || ''}<br><small>${c.user.email}</small><br>كودك: <b class="code" style="font-size:20px">${st.refCode}</b>`;
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

  // ---------- الطرق ----------
  renderRoads() {
    const st = this.g.state;
    $('roads-money').textContent = `💰 ${fmtMoney(st.money)} جنيه`;
    const list = $('road-list');
    list.innerHTML = '';
    for (const r of ROADS) {
      const d = document.createElement('div');
      d.className = 'road ' + (r.tagClass || '') + (st.selectedRoad === r.id ? ' sel' : '');
      const stops = r.landmarks.slice(0, 6).map((l) => l.name).join(' · ') + (r.landmarks.length > 6 ? ' …' : '');
      d.innerHTML = `
        <div class="road-main">
          <h3>${r.name} ${st.roadsPlayed[r.id] ? '<span class="chk">✓</span>' : ''}</h3>
          <div class="meta">${r.sub}</div>
          <div class="meta stops">${stops}</div>
        </div>
        <div class="road-side">
          <div class="fare"><b>${r.fare}</b><small>جنيه / فرد</small></div>
          <div class="rtag ${r.tagClass || ''}">${r.tagIcon} ${r.tag}</div>
          <button class="btn primary" data-road="${r.id}">اشتغل هنا</button>
        </div>`;
      list.appendChild(d);
    }
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
    $('s-sound').checked = s.sound;
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

  setSpeed(kmh) {
    this._set('speed', kmh, (v) => ($('speed').textContent = v));
  }

  setMoney(n) {
    this._set('money', n, (v) => ($('hud-money').innerHTML = `💰 <b>${fmtMoney(v)}</b>`));
  }

  setTimer(sec, over) {
    const label = over ? 'آخر مشوار' : fmtTime(sec);
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

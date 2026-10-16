// الواجهة: شاشات وقوايم وHUD (DOM بس، من غير منطق لعب)
import { CARS, COLORS, QUEST_POOL, ACHIEVEMENTS, WELCOME_BONUS, fmtMoney, fmtTime, getCar } from './data.js';
import { ROADS } from './roads.js';

const $ = (id) => document.getElementById(id);
const SCREENS = ['menu', 'garage', 'quests', 'settings', 'tutorial', 'pause', 'summary', 'roads', 'invite', 'radio'];
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
    const car = getCar(st.selected);
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

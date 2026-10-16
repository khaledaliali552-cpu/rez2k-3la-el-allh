// الواجهة: شاشات وقوايم وHUD (DOM بس، من غير منطق لعب)
import { CARS, COLORS, QUEST_POOL, ACHIEVEMENTS, fmtMoney, fmtTime, getCar } from './data.js';

const $ = (id) => document.getElementById(id);
const SCREENS = ['menu', 'garage', 'quests', 'settings', 'tutorial', 'pause', 'summary'];
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export class UI {
  constructor(game) {
    this.g = game;
    this.cache = {};
    this._bind();
  }

  _bind() {
    const g = this.g;
    $('m-start').onclick = () => g.onStartClick();
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
      if (sw) return g.setColor(sw.dataset.car, sw.dataset.color);
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
          COLORS.map(
            (c) =>
              `<button class="sw ${(st.colors[car.id] || 'white') === c.id ? 'on' : ''}" title="${c.name}" data-car="${car.id}" data-color="${c.id}" style="background:${hex(c.hex)}"></button>`,
          ).join('') +
          '</div>';
      }
      div.innerHTML = `
        <h3>${car.name}</h3>
        <p>${car.desc}</p>
        ${bar('السرعة', car.vmax / 60)}
        ${bar('التسارع', car.accel / 11)}
        ${bar('التحكم', car.handling / 1.2)}
        <div class="meta" style="font-size:12px;color:var(--muted)">${car.rented ? `إيجار: ${car.fee} جنيه كل وردية` : `مصاريف تصليح: ${car.repair} ج لكل 1% ضرر`}${car.fareMul > 1 ? ` · أجرة ×${car.fareMul}` : ''}</div>
        ${sw}
        ${action}`;
      list.appendChild(div);
    }
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

  setDay(d) {
    this._set('day', d, (v) => ($('hud-day').textContent = `يوم ${v}`));
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

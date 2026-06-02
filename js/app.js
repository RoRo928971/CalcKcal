/* ===========================================================================
 * app.js — 画面ルーティングと描画
 * ===========================================================================*/

const App = {
  currentTab: 'home',
  viewDate: null,            // ホーム/履歴で見ている日付キー
  recordMeal: 'breakfast',   // 記録画面で選択中の食事区分
  el: {},

  init() {
    Store.load();
    this.viewDate = Store.todayKey();
    this.el = {
      screen: document.getElementById('screen'),
      header: document.getElementById('appHeader'),
      title: document.getElementById('headerTitle'),
      back: document.getElementById('backBtn'),
      tabbar: document.getElementById('tabbar'),
      fab: document.getElementById('fab'),
      modal: document.getElementById('modalRoot'),
    };
    this.bindGlobal();

    if (!Store.state.onboarded) {
      this.startOnboarding();
    } else {
      this.showApp();
      this.go('home');
    }
  },

  bindGlobal() {
    document.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => this.go(t.dataset.tab));
    });
    this.el.fab.addEventListener('click', () => {
      this.go('record');
    });
    this.el.back.addEventListener('click', () => this.go(this.currentTab));
  },

  // アプリ本体（タブ・FAB）を表示
  showApp() {
    this.el.tabbar.classList.remove('hidden');
    this.el.fab.classList.remove('hidden');
    this.el.header.classList.remove('hidden');
  },

  go(tab) {
    this.currentTab = tab;
    this.el.back.classList.add('hidden');
    document.querySelectorAll('.tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === tab));
    this.el.screen.scrollTop = 0;
    const map = {
      home:    () => this.renderHome(),
      record:  () => this.renderRecord(),
      history: () => this.renderHistory(),
      mypage:  () => this.renderMyPage(),
    };
    (map[tab] || map.home)();
  },

  setTitle(t) { this.el.title.textContent = t; },

  toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  },

  /* ===================================================================
   *  0. オンボーディング
   * =================================================================*/
  startOnboarding() {
    this.el.tabbar.classList.add('hidden');
    this.el.fab.classList.add('hidden');
    this.el.header.classList.add('hidden');
    this.onbStep = 0;
    this.onbProfile = { ...Store.state.profile };
    this.renderOnboarding();
  },

  renderOnboarding() {
    const step = this.onbStep;
    const p = this.onbProfile;
    const dots = n => `<div class="dots">${[0,1,2,3].map(i =>
      `<span class="${i === n ? 'on' : ''}"></span>`).join('')}</div>`;

    let html = '';
    if (step === 0) {
      html = `<div class="onb">
        <div class="onb-hero">
          <div class="onb-logo">🥗</div>
          <h2>CalcKcal へようこそ</h2>
          <p>毎日の食事を記録して、<br>カロリーと栄養バランス（PFC）を<br>かんたんに管理しましょう。</p>
        </div>
        <div class="onb-foot">${dots(0)}
          <button class="btn" id="onbNext">はじめる</button>
        </div>
      </div>`;
    } else if (step === 1) {
      html = `<div class="onb">
        <h2 style="margin-bottom:4px;">プロフィール入力</h2>
        <p style="color:var(--muted);margin-bottom:20px;font-size:14px;">目標カロリーの算出に使います。</p>
        <div class="inline-fields">
          <div class="field"><label>年齢</label><input type="number" id="f-age" value="${p.age}" min="10" max="100"></div>
          <div class="field"><label>性別</label>
            <div class="segment" id="seg-sex">
              <button data-v="male" class="${p.sex==='male'?'active':''}">男性</button>
              <button data-v="female" class="${p.sex==='female'?'active':''}">女性</button>
            </div>
          </div>
        </div>
        <div class="inline-fields">
          <div class="field"><label>身長 (cm)</label><input type="number" id="f-height" value="${p.height}" min="120" max="220"></div>
          <div class="field"><label>体重 (kg)</label><input type="number" id="f-weight" value="${p.weight}" min="30" max="200"></div>
        </div>
        <div class="field"><label>身体活動レベル</label>
          <select id="f-activity">
            ${Object.entries(ACTIVITY).map(([k,v]) =>
              `<option value="${k}" ${p.activity===k?'selected':''}>${v.label}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>目的</label>
          <div class="segment" id="seg-goal">
            ${Object.entries(GOALS).map(([k,v]) =>
              `<button data-v="${k}" class="${p.goal===k?'active':''}">${v.label}</button>`).join('')}
          </div>
        </div>
        ${dots(1)}
        <div class="btn-row">
          <button class="btn ghost" id="onbBack" style="flex:0 0 90px;">戻る</button>
          <button class="btn" id="onbNext">次へ</button>
        </div>
      </div>`;
    } else if (step === 2) {
      const t = calcTargets(p);
      this.onbTargets = { ...t };
      html = `<div class="onb">
        <h2 style="margin-bottom:4px;">目標の確認</h2>
        <p style="color:var(--muted);margin-bottom:18px;font-size:14px;">
          基礎代謝 ${t.bmr} kcal ／ 消費目安 ${t.tdee} kcal から算出しました。必要なら調整できます。</p>
        <div class="card">
          <div class="card-title">1日の目標</div>
          <div class="field"><label>カロリー (kcal)</label><input type="number" id="t-kcal" value="${t.kcal}"></div>
          <div class="inline-fields">
            <div class="field"><label>P たんぱく質(g)</label><input type="number" id="t-p" value="${t.p}"></div>
            <div class="field"><label>F 脂質(g)</label><input type="number" id="t-f" value="${t.f}"></div>
            <div class="field"><label>C 炭水化物(g)</label><input type="number" id="t-c" value="${t.c}"></div>
          </div>
        </div>
        ${dots(2)}
        <div class="btn-row">
          <button class="btn ghost" id="onbBack" style="flex:0 0 90px;">戻る</button>
          <button class="btn" id="onbNext">この目標で進む</button>
        </div>
      </div>`;
    } else if (step === 3) {
      html = `<div class="onb">
        <div class="onb-hero">
          <div class="onb-logo">🎉</div>
          <h2>設定完了！</h2>
          <p>目標 <b>${this.onbTargets.kcal} kcal / 日</b><br>さっそく今日の食事を記録しましょう。</p>
        </div>
        <div class="onb-foot">${dots(3)}
          <button class="btn" id="onbFinish">ホームへ</button>
        </div>
      </div>`;
    }

    this.el.screen.classList.add('no-tabbar');
    this.el.screen.innerHTML = html;
    this.bindOnboarding();
  },

  bindOnboarding() {
    const step = this.onbStep;
    const next = document.getElementById('onbNext');
    const back = document.getElementById('onbBack');
    if (back) back.onclick = () => { this.onbStep--; this.renderOnboarding(); };

    if (step === 1) {
      document.querySelectorAll('#seg-sex button').forEach(b =>
        b.onclick = () => { this.onbProfile.sex = b.dataset.v; this.syncSeg('#seg-sex', b); });
      document.querySelectorAll('#seg-goal button').forEach(b =>
        b.onclick = () => { this.onbProfile.goal = b.dataset.v; this.syncSeg('#seg-goal', b); });
    }

    if (next) next.onclick = () => {
      if (step === 1) {
        this.onbProfile.age = +document.getElementById('f-age').value;
        this.onbProfile.height = +document.getElementById('f-height').value;
        this.onbProfile.weight = +document.getElementById('f-weight').value;
        this.onbProfile.activity = document.getElementById('f-activity').value;
      }
      if (step === 2) {
        this.onbTargets = {
          kcal: +document.getElementById('t-kcal').value,
          p: +document.getElementById('t-p').value,
          f: +document.getElementById('t-f').value,
          c: +document.getElementById('t-c').value,
        };
      }
      this.onbStep++;
      this.renderOnboarding();
    };

    const fin = document.getElementById('onbFinish');
    if (fin) fin.onclick = () => {
      Store.state.profile = { ...this.onbProfile };
      Store.state.targets = { ...this.onbTargets };
      Store.state.onboarded = true;
      // 体重も記録しておく
      Store.setWeight(Store.todayKey(), this.onbProfile.weight);
      Store.save();
      this.el.screen.classList.remove('no-tabbar');
      this.showApp();
      this.go('home');
    };
  },

  syncSeg(sel, active) {
    document.querySelectorAll(sel + ' button').forEach(b => b.classList.toggle('active', b === active));
  },

  /* ===================================================================
   *  1. ホーム
   * =================================================================*/
  renderHome() {
    this.setTitle('ホーム');
    const key = this.viewDate;
    const t = Store.state.targets;
    const tot = Store.totalsForDate(key);
    const remain = Math.max(0, Math.round(t.kcal - tot.kcal));
    const pct = Math.min(100, (tot.kcal / t.kcal) * 100);

    const grade = this.evaluateDay(tot, t);

    // PFCバー
    const pfcBar = (name, color, val, target) => {
      const ratio = target ? val / target : 0;
      let cls = 'ok';
      if (ratio > 1.15) cls = 'over';
      else if (ratio < 0.7) cls = 'warn';
      const w = Math.min(100, ratio * 100);
      return `<div class="pfc-bar">
        <div class="pfc-head">
          <span class="name" style="color:${color}">${name}</span>
          <span class="val">${Math.round(val)} / ${target} g</span>
        </div>
        <div class="pfc-track"><div class="pfc-fill ${cls}" style="width:${w}%"></div></div>
      </div>`;
    };

    const alerts = this.buildAlerts(tot, t).map(a =>
      `<div class="alert ${a.type}"><span class="ico">${a.ico}</span><span>${a.msg}</span></div>`).join('');

    this.el.screen.innerHTML = `
      ${this.dateNavHTML(key)}

      <div class="card summary-card ${grade.cls}">
        <div class="card-title">今日の評価</div>
        <div class="summary-grade">
          <span class="grade">${grade.mark}</span>
          <span class="msg">${grade.msg}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-title">カロリー</div>
        <div class="ring-wrap">
          ${this.ringHTML(pct, remain, tot.kcal > t.kcal)}
          <div class="ring-stats">
            <div class="ring-stat"><span class="k">摂取</span><span class="v">${Math.round(tot.kcal)} kcal</span></div>
            <div class="ring-stat"><span class="k">目標</span><span class="v">${t.kcal} kcal</span></div>
            <div class="ring-stat"><span class="k">${tot.kcal > t.kcal ? '超過' : '残り'}</span>
              <span class="v" style="color:${tot.kcal > t.kcal ? 'var(--red)' : 'var(--green)'}">
              ${tot.kcal > t.kcal ? '+' + Math.round(tot.kcal - t.kcal) : remain} kcal</span></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">PFCバランス</div>
        ${pfcBar('P たんぱく質', 'var(--p)', tot.p, t.p)}
        ${pfcBar('F 脂質', 'var(--f)', tot.f, t.f)}
        ${pfcBar('C 炭水化物', 'var(--c)', tot.c, t.c)}
      </div>

      ${alerts ? `<div style="margin-bottom:14px;">${alerts}</div>` : ''}

      <div class="section-label">今日の食事</div>
      ${this.mealsHTML(key)}
    `;
    this.bindHomeEvents(key);
  },

  // ◎△× 評価
  evaluateDay(tot, t) {
    if (tot.kcal === 0) return { mark: '—', cls: '', msg: 'まだ記録がありません。<br>食事を記録しましょう。' };
    const kRatio = tot.kcal / t.kcal;
    const pRatio = tot.p / t.p;
    let score = 0, issues = [];
    // カロリー
    if (kRatio >= 0.9 && kRatio <= 1.1) score += 2;
    else if (kRatio >= 0.75 && kRatio <= 1.25) score += 1;
    else issues.push(kRatio > 1.25 ? 'カロリー過多' : 'カロリー不足');
    // たんぱく質
    if (pRatio >= 0.9) score += 2;
    else if (pRatio >= 0.7) score += 1;
    else issues.push('たんぱく質が不足気味');
    // 脂質
    if (tot.f <= t.f * 1.15) score += 1; else issues.push('脂質が多め');

    if (score >= 4 && issues.length === 0)
      return { mark: '◎', cls: '', msg: 'バランス良好！<br>この調子です。' };
    if (score >= 2)
      return { mark: '△', cls: 'warn', msg: (issues[0] || 'もう少し') + '。<br>あと一歩で良バランス。' };
    return { mark: '×', cls: 'bad', msg: (issues[0] || 'バランス要改善') + '。<br>調整しましょう。' };
  },

  buildAlerts(tot, t) {
    if (tot.kcal === 0) return [];
    const out = [];
    const pShort = t.p - tot.p;
    if (pShort > 10) out.push({ type: 'warn', ico: '💪', msg: `たんぱく質をあと <b>${Math.round(pShort)}g</b> 摂りましょう` });
    if (tot.f > t.f * 1.15) out.push({ type: 'bad', ico: '🍳', msg: `脂質が目標を <b>${Math.round(tot.f - t.f)}g</b> 超えています` });
    if (tot.kcal > t.kcal * 1.1) out.push({ type: 'bad', ico: '⚠️', msg: `カロリーが <b>${Math.round(tot.kcal - t.kcal)}kcal</b> 超過しています` });
    else if (tot.kcal < t.kcal * 0.6) out.push({ type: 'warn', ico: '🍽️', msg: `あと <b>${Math.round(t.kcal - tot.kcal)}kcal</b> 摂れます` });
    if (out.length === 0) out.push({ type: 'good', ico: '✅', msg: '栄養バランスは良好です' });
    return out;
  },

  // SVGリング
  ringHTML(pct, remain, over) {
    const r = 60, c = 2 * Math.PI * r;
    const dash = (Math.min(100, pct) / 100) * c;
    const color = over ? 'var(--red)' : 'var(--green)';
    return `<div class="ring">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="${r}" fill="none" stroke="var(--bg)" stroke-width="14"/>
        <circle cx="70" cy="70" r="${r}" fill="none" stroke="${color}" stroke-width="14"
          stroke-linecap="round" stroke-dasharray="${dash} ${c}"/>
      </svg>
      <div class="ring-center">
        <span class="big">${over ? '超過' : remain}</span>
        <span class="lbl">${over ? '' : '残り kcal'}</span>
      </div>
    </div>`;
  },

  // 食事区分ごとのリスト
  mealsHTML(key) {
    const meals = [
      { id: 'breakfast', label: '朝食', ico: '🌅' },
      { id: 'lunch',     label: '昼食', ico: '☀️' },
      { id: 'dinner',    label: '夕食', ico: '🌙' },
      { id: 'snack',     label: '間食', ico: '🍪' },
    ];
    const logs = Store.logsForDate(key);
    return meals.map(m => {
      const items = logs.filter(l => l.meal === m.id);
      const sub = items.reduce((s, i) => s + i.kcal, 0);
      const rows = items.length
        ? items.map(i => `
          <div class="food-row">
            <span class="emoji">${i.emoji || foodEmoji(i.foodId)}</span>
            <div class="info">
              <div class="nm">${this._esc(i.name)}</div>
              <div class="sub">${trimNum(i.amount)}${i.unit} ・ P${Math.round(i.p)} F${Math.round(i.f)} C${Math.round(i.c)}</div>
            </div>
            <span class="kc">${Math.round(i.kcal)}</span>
            <button class="del" data-del="${i.id}">×</button>
          </div>`).join('')
        : `<div class="empty-meal">未記録 — ＋ボタンから追加</div>`;
      return `<div class="meal-group">
        <div class="meal-head"><span>${m.ico} ${m.label}</span><span class="kcal">${Math.round(sub)} kcal</span></div>
        ${rows}
      </div>`;
    }).join('');
  },

  dateNavHTML(key) {
    const d = new Date(key);
    const today = Store.todayKey();
    const wd = ['日','月','火','水','木','金','土'][d.getDay()];
    const label = key === today ? '今日' : `${d.getMonth()+1}/${d.getDate()}（${wd}）`;
    const isToday = key === today;
    return `<div class="date-nav">
      <button data-date="-1">‹</button>
      <span class="d">${label}</span>
      <button data-date="+1" ${isToday ? 'style="visibility:hidden"' : ''}>›</button>
    </div>`;
  },

  bindHomeEvents(key) {
    this.el.screen.querySelectorAll('[data-del]').forEach(b =>
      b.onclick = () => { Store.removeLog(key, b.dataset.del); this.renderHome(); });
    this.el.screen.querySelectorAll('[data-date]').forEach(b =>
      b.onclick = () => {
        const d = new Date(this.viewDate);
        d.setDate(d.getDate() + (b.dataset.date === '+1' ? 1 : -1));
        if (Store.dateKey(d) > Store.todayKey()) return;
        this.viewDate = Store.dateKey(d);
        this.renderHome();
      });
  },

  /* ===================================================================
   *  2. 記録（食事入力）
   * =================================================================*/
  renderRecord() {
    this.setTitle('記録');
    const meals = [
      { id: 'breakfast', label: '朝食' }, { id: 'lunch', label: '昼食' },
      { id: 'dinner', label: '夕食' }, { id: 'snack', label: '間食' },
    ];
    this._recordSubtab = this._recordSubtab || 'search';

    this.el.screen.innerHTML = `
      <div class="section-label">食事区分</div>
      <div class="segment" id="mealSeg" style="margin-bottom:16px;">
        ${meals.map(m => `<button data-v="${m.id}" class="${this.recordMeal===m.id?'active':''}">${m.label}</button>`).join('')}
      </div>

      <div class="tabs-row" id="inputTabs">
        <button data-st="search" class="${this._recordSubtab==='search'?'active':''}">🔍 検索</button>
        <button data-st="favorite" class="${this._recordSubtab==='favorite'?'active':''}">⭐ お気に入り・履歴</button>
        <button data-st="mine" class="${this._recordSubtab==='mine'?'active':''}">🍳 マイ食品</button>
        <button data-st="barcode" class="${this._recordSubtab==='barcode'?'active':''}">📷 バーコード</button>
        <button data-st="photo" class="${this._recordSubtab==='photo'?'active':''}">🖼 写真</button>
      </div>

      <div id="inputBody"></div>
    `;
    this.el.screen.querySelectorAll('#mealSeg button').forEach(b =>
      b.onclick = () => { this.recordMeal = b.dataset.v; this.syncSeg('#mealSeg', b); });
    this.el.screen.querySelectorAll('#inputTabs button').forEach(b =>
      b.onclick = () => { this._recordSubtab = b.dataset.st; this.renderRecord(); });

    this.renderInputBody();
  },

  renderInputBody() {
    const body = document.getElementById('inputBody');
    const st = this._recordSubtab;

    if (st === 'barcode' || st === 'photo') {
      body.innerHTML = `<div class="card" style="text-align:center;padding:40px 20px;color:var(--muted)">
        <div style="font-size:46px;margin-bottom:12px;">${st==='barcode'?'📷':'🖼'}</div>
        <p style="font-size:15px;font-weight:600;margin-bottom:6px;">${st==='barcode'?'バーコード読み取り':'写真で記録'}</p>
        <p style="font-size:13px;">この機能は後フェーズで提供予定です。<br>今は「検索」から記録できます。</p>
      </div>`;
      return;
    }

    if (st === 'favorite') {
      const favIds = Store.state.favorites;
      const recentIds = Store.recentFoodIds();
      const favHtml = favIds.length
        ? favIds.map(id => this.foodPickHTML(Store.findFood(id))).filter(Boolean).join('')
        : `<div class="empty-meal">お気に入りはまだありません。検索結果の☆で登録できます。</div>`;
      const recHtml = recentIds.length
        ? recentIds.map(id => this.foodPickHTML(Store.findFood(id))).filter(Boolean).join('')
        : `<div class="empty-meal">最近の記録はありません。</div>`;
      body.innerHTML = `
        <div class="section-label">⭐ お気に入り</div>${favHtml}
        <div class="section-label">🕘 最近使った食品</div>${recHtml}`;
      this.bindFoodPicks();
      return;
    }

    if (st === 'mine') {
      const foods = Store.state.customFoods || [];
      const list = foods.length
        ? foods.map(f => this.customFoodRowHTML(f)).join('')
        : `<div class="empty-meal">まだマイ食品はありません。<br>よく食べるものを登録しておくと、毎回入力せずに記録できます。</div>`;
      body.innerHTML = `
        <button class="btn" id="addCustomBtn" style="margin-bottom:14px;">＋ 新しい食品を追加</button>
        <div class="section-label">🍳 登録した食品（${foods.length}）</div>
        ${list}`;
      document.getElementById('addCustomBtn').onclick = () => this.openCustomFoodForm();
      this.el.screen.querySelectorAll('.food-pick').forEach(row => {
        const id = row.dataset.food;
        row.querySelector('[data-edit]').onclick = (e) => { e.stopPropagation(); this.openCustomFoodForm(id); };
        row.querySelector('[data-cdel]').onclick = (e) => {
          e.stopPropagation();
          const f = Store.findFood(id);
          if (confirm(`「${f ? f.name : 'この食品'}」を削除しますか？`)) {
            Store.removeCustomFood(id);
            this.toast('削除しました');
            this.renderInputBody();
          }
        };
        row.onclick = () => this.openFoodDetail(id);
      });
      return;
    }

    // search
    body.innerHTML = `
      <div class="search-box">
        <span class="ico">🔍</span>
        <input type="text" id="foodSearch" placeholder="食品名で検索（例：ごはん、鶏むね）" autocomplete="off">
      </div>
      <div id="searchResults"></div>`;
    const input = document.getElementById('foodSearch');
    const renderResults = (q) => {
      q = (q || '').trim();
      const all = Store.allFoods();
      const list = q
        ? all.filter(f => f.name.includes(q) || f.cat.includes(q))
        : all.slice(0, 30);
      const r = document.getElementById('searchResults');
      r.innerHTML = list.length
        ? list.map(f => this.foodPickHTML(f)).join('')
        : `<div class="empty-meal">「${q}」に一致する食品がありません。<br>「🍳 マイ食品」タブから自分で追加できます。</div>`;
      this.bindFoodPicks();
    };
    input.oninput = () => renderResults(input.value);
    renderResults('');
  },

  foodPickHTML(f) {
    if (!f) return '';
    const fav = Store.isFavorite(f.id);
    return `<div class="food-pick" data-food="${f.id}">
      <span class="emoji">${f.emoji || foodEmoji(f.id)}</span>
      <div class="info">
        <div class="nm">${this._esc(f.name)}</div>
        <div class="sub">${Math.round(f.kcal)}kcal / ${trimNum(f.per)}${f.unit} ・ ${this._esc(f.cat)}</div>
      </div>
      <button class="fav" data-fav="${f.id}">${fav ? '⭐' : '☆'}</button>
      <span class="add-ic">＋</span>
    </div>`;
  },

  bindFoodPicks() {
    this.el.screen.querySelectorAll('.food-pick').forEach(row => {
      row.querySelector('.fav').onclick = (e) => {
        e.stopPropagation();
        Store.toggleFavorite(row.dataset.food);
        this.renderInputBody();
      };
      row.onclick = () => this.openFoodDetail(row.dataset.food);
    });
  },

  // マイ食品の一覧行（編集・削除ボタン付き）
  customFoodRowHTML(f) {
    return `<div class="food-pick" data-food="${f.id}">
      <span class="emoji">${f.emoji || '🍽️'}</span>
      <div class="info">
        <div class="nm">${this._esc(f.name)}</div>
        <div class="sub">${Math.round(f.kcal)}kcal / ${trimNum(f.per)}${f.unit} ・ ${this._esc(f.cat)}</div>
      </div>
      <button class="fav" data-edit="${f.id}" aria-label="編集">✏️</button>
      <button class="fav" data-cdel="${f.id}" aria-label="削除">🗑</button>
    </div>`;
  },

  /* ===================================================================
   *  2-b. マイ食品の追加・編集フォーム（モーダル）
   * =================================================================*/
  openCustomFoodForm(id) {
    const editing = !!id;
    const f = editing ? Store.findFood(id) : null;
    if (editing && !f) return;

    const cats = ['主食', '肉・魚', '野菜', '果物', '乳・飲料', '間食', 'マイ食品'];
    const units = ['g', '個', '杯', '枚', '本', 'パック', '切れ', 'ml'];
    const emojis = ['🍽️','🍚','🍞','🍜','🍝','🍗','🥩','🐟','🥚','🥗','🥦','🍅','🍌','🍎','🥛','🧀','☕','🍫','🍩','🍰','🥤','🍲','🍱','🥪'];

    const cur = f || { name:'', cat:'マイ食品', unit:'g', per:100, kcal:'', p:'', f:'', c:'', emoji:'🍽️' };

    this.el.modal.innerHTML = `
      <div class="modal-back" id="mback">
        <div class="sheet" id="sheet">
          <div class="sheet-grip"></div>
          <div class="detail-head">
            <span class="emoji" id="cfEmojiView">${cur.emoji || '🍽️'}</span>
            <div>
              <div class="nm">${editing ? 'マイ食品を編集' : '新しい食品を追加'}</div>
              <div class="sub">栄養値は「基準量あたり」で入力します</div>
            </div>
          </div>

          <div class="field">
            <label>食品名</label>
            <input type="text" id="cf-name" value="${this._esc(cur.name)}" placeholder="例：手作りハンバーグ" autocomplete="off">
          </div>

          <div class="field">
            <label>アイコン</label>
            <div class="segment" id="cf-emoji" style="flex-wrap:wrap;gap:6px;">
              ${emojis.map(e => `<button type="button" data-e="${e}" class="${e===(cur.emoji||'🍽️')?'active':''}" style="min-width:0;flex:0 0 auto;width:40px;font-size:20px;padding:8px 0;">${e}</button>`).join('')}
            </div>
          </div>

          <div class="inline-fields">
            <div class="field"><label>カテゴリ</label>
              <select id="cf-cat">${cats.map(c => `<option ${c===cur.cat?'selected':''}>${c}</option>`).join('')}</select>
            </div>
            <div class="field" style="max-width:120px;"><label>単位</label>
              <select id="cf-unit">${units.map(u => `<option ${u===cur.unit?'selected':''}>${u}</option>`).join('')}</select>
            </div>
          </div>

          <div class="field">
            <label>基準量（この量あたりの栄養値を入力）</label>
            <div class="amount-row" style="margin-bottom:0;">
              <input type="number" id="cf-per" value="${trimNum(cur.per)}" min="1" step="1" style="width:110px;">
              <span class="unit" id="cf-unit-label">${cur.unit}</span>
            </div>
          </div>

          <div class="inline-fields">
            <div class="field"><label>カロリー (kcal)</label><input type="number" id="cf-kcal" value="${cur.kcal}" min="0" step="1" inputmode="decimal"></div>
            <div class="field"><label>P たんぱく質 (g)</label><input type="number" id="cf-p" value="${cur.p}" min="0" step="0.1" inputmode="decimal"></div>
          </div>
          <div class="inline-fields">
            <div class="field"><label>F 脂質 (g)</label><input type="number" id="cf-f" value="${cur.f}" min="0" step="0.1" inputmode="decimal"></div>
            <div class="field"><label>C 炭水化物 (g)</label><input type="number" id="cf-c" value="${cur.c}" min="0" step="0.1" inputmode="decimal"></div>
          </div>

          <button class="btn" id="cf-save">${editing ? '保存する' : '追加する'}</button>
          <button class="btn ghost" id="cf-cancel" style="margin-top:6px;">キャンセル</button>
        </div>
      </div>`;

    // 絵文字選択
    let chosenEmoji = cur.emoji || '🍽️';
    this.el.modal.querySelectorAll('#cf-emoji button').forEach(b =>
      b.onclick = () => {
        chosenEmoji = b.dataset.e;
        this.syncSeg('#cf-emoji', b);
        document.getElementById('cfEmojiView').textContent = chosenEmoji;
      });
    // 単位変更を基準量ラベルに反映
    const unitSel = document.getElementById('cf-unit');
    unitSel.onchange = () => { document.getElementById('cf-unit-label').textContent = unitSel.value; };

    document.getElementById('cf-cancel').onclick = () => this.closeModal();
    document.getElementById('mback').onclick = (e) => { if (e.target.id === 'mback') this.closeModal(); };

    document.getElementById('cf-save').onclick = () => {
      const data = {
        name: document.getElementById('cf-name').value.trim(),
        emoji: chosenEmoji,
        cat: document.getElementById('cf-cat').value,
        unit: document.getElementById('cf-unit').value,
        per: document.getElementById('cf-per').value,
        kcal: document.getElementById('cf-kcal').value,
        p: document.getElementById('cf-p').value,
        f: document.getElementById('cf-f').value,
        c: document.getElementById('cf-c').value,
      };
      if (!data.name) { this.toast('食品名を入力してください'); return; }
      if (!(parseFloat(data.kcal) >= 0) && !(parseFloat(data.p) >= 0) && !(parseFloat(data.f) >= 0) && !(parseFloat(data.c) >= 0)) {
        this.toast('栄養値を1つ以上入力してください'); return;
      }
      if (editing) {
        Store.updateCustomFood(id, data);
        this.toast('保存しました');
      } else {
        Store.addCustomFood(data);
        this.toast('マイ食品に追加しました');
      }
      this.closeModal();
      this._recordSubtab = 'mine';
      this.renderInputBody();
    };
  },

  _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  /* ===================================================================
   *  3. 食品詳細・数量入力（モーダル）
   * =================================================================*/
  openFoodDetail(foodId) {
    const f = Store.findFood(foodId);
    if (!f) return;
    // 既定量: g系は100、それ以外は1単位（perに合わせる）
    let amount = f.unit === 'g' ? 100 : f.per;
    const maxAmt = f.unit === 'g' ? 500 : 10;
    const stepAmt = f.unit === 'g' ? 10 : 1;

    const mealNames = { breakfast:'朝食', lunch:'昼食', dinner:'夕食', snack:'間食' };

    const render = () => {
      const n = nutritionFor(f, amount);
      this.el.modal.innerHTML = `
        <div class="modal-back" id="mback">
          <div class="sheet" id="sheet">
            <div class="sheet-grip"></div>
            <div class="detail-head">
              <span class="emoji">${f.emoji || foodEmoji(f.id)}</span>
              <div>
                <div class="nm">${this._esc(f.name)}</div>
                <div class="sub">${this._esc(f.cat)} ・ ${mealNames[this.recordMeal]}に追加</div>
              </div>
            </div>

            <div class="section-label" style="margin-top:0;">数量</div>
            <div class="amount-row">
              <input type="number" id="amtNum" value="${trimNum(amount)}" min="0" step="${stepAmt}">
              <span class="unit">${f.unit}</span>
              <div style="flex:1"></div>
              <span style="font-size:13px;color:var(--muted)">最大 ${maxAmt}${f.unit}</span>
            </div>
            <input type="range" id="amtRange" min="0" max="${maxAmt}" step="${stepAmt}" value="${Math.min(amount,maxAmt)}">

            <div class="section-label" style="margin-top:0;">栄養プレビュー</div>
            <div class="nutri-preview">
              <div class="nutri-cell kcal"><div class="big">${Math.round(n.kcal)}</div><div class="lbl">kcal</div></div>
              <div class="nutri-cell p"><div class="big">${n.p.toFixed(1)}</div><div class="lbl">P (g)</div></div>
              <div class="nutri-cell f"><div class="big">${n.f.toFixed(1)}</div><div class="lbl">F (g)</div></div>
              <div class="nutri-cell c"><div class="big">${n.c.toFixed(1)}</div><div class="lbl">C (g)</div></div>
            </div>

            <button class="btn" id="addBtn">${mealNames[this.recordMeal]}に追加する</button>
            <button class="btn ghost" id="closeBtn" style="margin-top:6px;">キャンセル</button>
          </div>
        </div>`;

      const num = document.getElementById('amtNum');
      const range = document.getElementById('amtRange');
      const refresh = (v) => {
        amount = Math.max(0, +v || 0);
        const n2 = nutritionFor(f, amount);
        const cells = this.el.modal.querySelectorAll('.nutri-cell .big');
        cells[0].textContent = Math.round(n2.kcal);
        cells[1].textContent = n2.p.toFixed(1);
        cells[2].textContent = n2.f.toFixed(1);
        cells[3].textContent = n2.c.toFixed(1);
      };
      num.oninput = () => { range.value = Math.min(num.value, maxAmt); refresh(num.value); };
      range.oninput = () => { num.value = range.value; refresh(range.value); };

      document.getElementById('addBtn').onclick = () => {
        if (amount <= 0) { this.toast('数量を入力してください'); return; }
        const n2 = nutritionFor(f, amount);
        Store.addLog(this.viewDate, {
          foodId: f.id, name: f.name, meal: this.recordMeal,
          amount, unit: f.unit, kcal: n2.kcal, p: n2.p, f: n2.f, c: n2.c,
          emoji: f.emoji || foodEmoji(f.id),
        });
        this.closeModal();
        this.toast(`${f.name} を追加しました`);
        this.viewDate = Store.todayKey();
        this.go('home');
      };
      document.getElementById('closeBtn').onclick = () => this.closeModal();
      document.getElementById('mback').onclick = (e) => {
        if (e.target.id === 'mback') this.closeModal();
      };
    };
    render();
  },

  closeModal() { this.el.modal.innerHTML = ''; },

  /* ===================================================================
   *  4. 履歴・トレンド
   * =================================================================*/
  renderHistory() {
    this.setTitle('履歴');
    this._period = this._period || 'week';
    const days = this._period === 'day' ? 1 : this._period === 'week' ? 7 : 30;
    const series = this.collectSeries(days);
    const t = Store.state.targets;

    // 達成率サマリー
    const logged = series.filter(s => s.kcal > 0);
    const avgKcal = logged.length ? logged.reduce((a, s) => a + s.kcal, 0) / logged.length : 0;
    const achieveDays = logged.filter(s => s.kcal >= t.kcal * 0.85 && s.kcal <= t.kcal * 1.15).length;
    const avgAchieve = logged.length
      ? Math.round(logged.reduce((a, s) => a + Math.min(100, (s.kcal / t.kcal) * 100), 0) / logged.length)
      : 0;

    this.el.screen.innerHTML = `
      <div class="segment" id="periodSeg" style="margin-bottom:16px;">
        <button data-v="day" class="${this._period==='day'?'active':''}">日</button>
        <button data-v="week" class="${this._period==='week'?'active':''}">週</button>
        <button data-v="month" class="${this._period==='month'?'active':''}">月</button>
      </div>

      <div class="card chart-card">
        <div class="card-title">カロリー摂取量の推移（PFC積み上げ）</div>
        ${this.barChartHTML(series, t.kcal)}
        <div class="legend">
          <span><i style="background:var(--p)"></i>P</span>
          <span><i style="background:var(--f)"></i>F</span>
          <span><i style="background:var(--c)"></i>C</span>
          <span><i style="background:var(--green)"></i>目標 ${t.kcal}</span>
        </div>
      </div>

      <div class="section-label">達成率サマリー</div>
      <div class="stat-grid" style="margin-bottom:14px;">
        <div class="stat-box"><div class="big">${avgAchieve}%</div><div class="lbl">平均達成率</div></div>
        <div class="stat-box"><div class="big">${achieveDays}<span style="font-size:14px">日</span></div><div class="lbl">目標達成日数</div></div>
        <div class="stat-box"><div class="big">${Math.round(avgKcal)}</div><div class="lbl">平均摂取kcal</div></div>
        <div class="stat-box"><div class="big">${logged.length}<span style="font-size:14px">日</span></div><div class="lbl">記録した日数</div></div>
      </div>

      <div class="card">
        <div class="card-title">体重推移 ⚖️</div>
        ${this.weightChartHTML(days)}
      </div>
    `;
    this.el.screen.querySelectorAll('#periodSeg button').forEach(b =>
      b.onclick = () => { this._period = b.dataset.v; this.renderHistory(); });
  },

  collectSeries(days) {
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = Store.dateKey(d);
      const tot = Store.totalsForDate(key);
      out.push({ key, date: d, ...tot });
    }
    return out;
  },

  barChartHTML(series, target) {
    const maxKcal = Math.max(target * 1.2, ...series.map(s => s.kcal), 1);
    const targetY = (1 - target / maxKcal) * 160;
    const cols = series.map(s => {
      const h = (s.kcal / maxKcal) * 160;
      // PFCのカロリー割合で積み上げ
      const pc = s.p * 4, fc = s.f * 9, cc = s.c * 4;
      const sum = pc + fc + cc || 1;
      const seg = (v, cls) => v > 0 ? `<div class="bar-seg ${cls}" style="height:${(v / sum) * h}px"></div>` : '';
      const d = s.date;
      const lbl = series.length <= 7 ? `${d.getMonth()+1}/${d.getDate()}` : (d.getDate() % 5 === 0 || d.getDate() === 1 ? `${d.getDate()}` : '');
      return `<div class="bar-col">
        <div class="bar-stack" style="height:${h}px">${seg(cc,'c')}${seg(fc,'f')}${seg(pc,'p')}</div>
        <div class="bar-x">${lbl}</div>
      </div>`;
    }).join('');
    return `<div class="bars-wrap">
      <div class="bars">${cols}</div>
      <div class="bar-line" style="top:${targetY}px"></div>
    </div>`;
  },

  weightChartHTML(days) {
    // 期間内の体重記録を集める
    const pts = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = Store.dateKey(d);
      if (Store.state.weights[key] != null) pts.push({ d, w: Store.state.weights[key] });
    }
    if (pts.length === 0) {
      return `<div class="empty-meal">体重の記録がありません。マイページから記録できます。</div>`;
    }
    if (pts.length === 1) {
      return `<div style="text-align:center;padding:20px;">
        <div style="font-size:32px;font-weight:800;color:var(--green)">${pts[0].w}<span style="font-size:16px">kg</span></div>
        <div style="font-size:12px;color:var(--muted)">記録が増えるとグラフが表示されます</div></div>`;
    }
    const W = 360, H = 120, pad = 24;
    const ws = pts.map(p => p.w);
    const min = Math.min(...ws) - 1, max = Math.max(...ws) + 1;
    const x = i => pad + (i / (pts.length - 1)) * (W - pad * 2);
    const y = w => pad + (1 - (w - min) / (max - min || 1)) * (H - pad * 2);
    const line = pts.map((p, i) => `${x(i)},${y(p.w)}`).join(' ');
    const dots = pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.w)}" r="3.5" fill="var(--green)"/>`).join('');
    return `<svg class="linechart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <polyline points="${line}" fill="none" stroke="var(--green)" stroke-width="2.5" stroke-linejoin="round"/>
      ${dots}
    </svg>
    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-top:4px;">
      <span>${pts[0].w}kg</span><span>最新 ${pts[pts.length-1].w}kg</span>
    </div>`;
  },

  /* ===================================================================
   *  5. マイページ・設定
   * =================================================================*/
  renderMyPage() {
    this.setTitle('マイページ');
    const p = Store.state.profile;
    const t = Store.state.targets;
    const goalLabel = GOALS[p.goal].label;
    const r = Store.state.settings.reminderTime;

    this.el.screen.innerHTML = `
      <div class="card">
        <div class="profile-top">
          <div class="avatar">${p.sex === 'male' ? '👨' : '👩'}</div>
          <div>
            <div class="nm">${p.sex === 'male' ? '男性' : '女性'} ・ ${p.age}歳</div>
            <div class="sub">${p.height}cm / ${p.weight}kg ・ 目的: ${goalLabel}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">1日の目標</div>
        <div class="target-grid">
          <div class="cell"><div class="big" style="color:var(--green)">${t.kcal}</div><div class="lbl">kcal</div></div>
          <div class="cell"><div class="big" style="color:var(--p)">${t.p}</div><div class="lbl">P (g)</div></div>
          <div class="cell"><div class="big" style="color:var(--f)">${t.f}</div><div class="lbl">F (g)</div></div>
          <div class="cell"><div class="big" style="color:var(--c)">${t.c}</div><div class="lbl">C (g)</div></div>
        </div>
        <div class="btn-row" style="margin-top:14px;">
          <button class="btn secondary" id="recalcBtn">自動再計算</button>
          <button class="btn secondary" id="editTargetBtn">手動調整</button>
        </div>
      </div>

      <div class="section-label">設定</div>
      <div class="card" style="padding:4px 16px;">
        <div class="list-item" id="editProfile"><span class="ico">👤</span><span class="label">プロフィール編集</span><span class="chev">›</span></div>
        <div class="list-item" id="logWeight"><span class="ico">⚖️</span><span class="label">体重を記録</span><span class="meta">${p.weight}kg ›</span></div>
        <div class="list-item" id="reminder"><span class="ico">🔔</span><span class="label">記録リマインド</span><span class="meta">${r || 'オフ'} ›</span></div>
        <div class="list-item" id="healthSync"><span class="ico">❤️</span><span class="label">ヘルスケア連携</span><span class="meta">${Store.state.settings.healthSync ? 'オン' : 'オフ'} ›</span></div>
        <div class="list-item" id="terms"><span class="ico">📄</span><span class="label">利用規約</span><span class="chev">›</span></div>
      </div>

      <div class="card" style="padding:4px 16px;">
        <div class="list-item" id="resetData"><span class="ico">🗑</span><span class="label" style="color:var(--red)">全データをリセット</span><span class="chev">›</span></div>
      </div>
      <p style="text-align:center;color:var(--muted);font-size:12px;margin-top:8px;">CalcKcal v1.0</p>
    `;
    this.bindMyPage();
  },

  bindMyPage() {
    const $ = id => document.getElementById(id);
    $('recalcBtn').onclick = () => {
      Store.state.targets = (() => { const x = calcTargets(Store.state.profile); return { kcal:x.kcal, p:x.p, f:x.f, c:x.c }; })();
      Store.save();
      this.toast('目標を再計算しました');
      this.renderMyPage();
    };
    $('editTargetBtn').onclick = () => this.openTargetEdit();
    $('editProfile').onclick = () => this.openProfileEdit();
    $('logWeight').onclick = () => this.openWeightLog();
    $('reminder').onclick = () => this.openReminder();
    $('healthSync').onclick = () => {
      Store.state.settings.healthSync = !Store.state.settings.healthSync;
      Store.save();
      this.toast(Store.state.settings.healthSync ? 'ヘルスケア連携をオンにしました（デモ）' : '連携をオフにしました');
      this.renderMyPage();
    };
    $('terms').onclick = () => this.openSheet('利用規約', `
      <p style="font-size:14px;line-height:1.8;color:var(--ink)">
      本アプリ「CalcKcal」はカロリー・栄養管理を補助するデモアプリです。
      表示される数値は一般的な栄養データに基づく目安であり、医療・栄養指導を代替するものではありません。
      データは端末内（ブラウザのローカルストレージ）にのみ保存されます。</p>`);
    $('resetData').onclick = () => {
      if (confirm('すべての記録と設定を削除します。よろしいですか？')) {
        Store.reset();
        this.toast('リセットしました');
        this.startOnboarding();
      }
    };
  },

  openProfileEdit() {
    const p = { ...Store.state.profile };
    this.openSheet('プロフィール編集', `
      <div class="inline-fields">
        <div class="field"><label>年齢</label><input type="number" id="e-age" value="${p.age}"></div>
        <div class="field"><label>性別</label>
          <div class="segment" id="e-sex">
            <button data-v="male" class="${p.sex==='male'?'active':''}">男性</button>
            <button data-v="female" class="${p.sex==='female'?'active':''}">女性</button>
          </div></div>
      </div>
      <div class="inline-fields">
        <div class="field"><label>身長 (cm)</label><input type="number" id="e-height" value="${p.height}"></div>
        <div class="field"><label>体重 (kg)</label><input type="number" id="e-weight" value="${p.weight}"></div>
      </div>
      <div class="field"><label>身体活動レベル</label>
        <select id="e-activity">${Object.entries(ACTIVITY).map(([k,v]) =>
          `<option value="${k}" ${p.activity===k?'selected':''}>${v.label}</option>`).join('')}</select></div>
      <div class="field"><label>目的</label>
        <div class="segment" id="e-goal">${Object.entries(GOALS).map(([k,v]) =>
          `<button data-v="${k}" class="${p.goal===k?'active':''}">${v.label}</button>`).join('')}</div></div>
      <button class="btn" id="saveProfile">保存して目標を再計算</button>
    `, () => {
      let sex = p.sex, goal = p.goal;
      document.querySelectorAll('#e-sex button').forEach(b => b.onclick = () => { sex = b.dataset.v; this.syncSeg('#e-sex', b); });
      document.querySelectorAll('#e-goal button').forEach(b => b.onclick = () => { goal = b.dataset.v; this.syncSeg('#e-goal', b); });
      document.getElementById('saveProfile').onclick = () => {
        const np = {
          age: +document.getElementById('e-age').value,
          sex,
          height: +document.getElementById('e-height').value,
          weight: +document.getElementById('e-weight').value,
          activity: document.getElementById('e-activity').value,
          goal,
        };
        Store.state.profile = np;
        const x = calcTargets(np);
        Store.state.targets = { kcal:x.kcal, p:x.p, f:x.f, c:x.c };
        Store.setWeight(Store.todayKey(), np.weight);
        Store.save();
        this.closeModal();
        this.toast('プロフィールを更新しました');
        this.renderMyPage();
      };
    });
  },

  openTargetEdit() {
    const t = { ...Store.state.targets };
    this.openSheet('目標を手動調整', `
      <div class="field"><label>カロリー (kcal)</label><input type="number" id="m-kcal" value="${t.kcal}"></div>
      <div class="inline-fields">
        <div class="field"><label>P (g)</label><input type="number" id="m-p" value="${t.p}"></div>
        <div class="field"><label>F (g)</label><input type="number" id="m-f" value="${t.f}"></div>
        <div class="field"><label>C (g)</label><input type="number" id="m-c" value="${t.c}"></div>
      </div>
      <button class="btn" id="saveTarget">保存</button>
    `, () => {
      document.getElementById('saveTarget').onclick = () => {
        Store.state.targets = {
          kcal: +document.getElementById('m-kcal').value,
          p: +document.getElementById('m-p').value,
          f: +document.getElementById('m-f').value,
          c: +document.getElementById('m-c').value,
        };
        Store.save();
        this.closeModal();
        this.toast('目標を更新しました');
        this.renderMyPage();
      };
    });
  },

  openWeightLog() {
    const today = Store.todayKey();
    const cur = Store.state.weights[today] ?? Store.state.profile.weight;
    this.openSheet('体重を記録', `
      <div class="field"><label>今日の体重 (kg)</label><input type="number" id="w-val" value="${cur}" step="0.1"></div>
      <button class="btn" id="saveWeight">記録する</button>
    `, () => {
      document.getElementById('saveWeight').onclick = () => {
        const w = +document.getElementById('w-val').value;
        Store.setWeight(today, w);
        Store.state.profile.weight = w;
        Store.save();
        this.closeModal();
        this.toast('体重を記録しました');
        this.renderMyPage();
      };
    });
  },

  openReminder() {
    const r = Store.state.settings.reminderTime;
    this.openSheet('記録リマインド', `
      <p style="font-size:14px;color:var(--muted);margin-bottom:14px;">毎日この時間に記録を促す通知を出します（デモ）。</p>
      <div class="field"><label>通知時刻</label><input type="time" id="r-time" value="${r || '20:00'}"></div>
      <button class="btn" id="saveReminder">設定する</button>
      <button class="btn ghost" id="offReminder" style="margin-top:6px;">オフにする</button>
    `, () => {
      document.getElementById('saveReminder').onclick = () => {
        Store.state.settings.reminderTime = document.getElementById('r-time').value;
        Store.save(); this.closeModal(); this.toast('リマインドを設定しました'); this.renderMyPage();
      };
      document.getElementById('offReminder').onclick = () => {
        Store.state.settings.reminderTime = ''; Store.save(); this.closeModal(); this.renderMyPage();
      };
    });
  },

  // 汎用ボトムシート
  openSheet(title, bodyHtml, onMount) {
    this.el.modal.innerHTML = `
      <div class="modal-back" id="mback">
        <div class="sheet">
          <div class="sheet-grip"></div>
          <h2 style="font-size:18px;margin-bottom:16px;">${title}</h2>
          ${bodyHtml}
        </div>
      </div>`;
    document.getElementById('mback').onclick = (e) => { if (e.target.id === 'mback') this.closeModal(); };
    if (onMount) onMount();
  },
};

/* ====================== ヘルパー ====================== */
function trimNum(n) {
  return Number.isInteger(n) ? n : Math.round(n * 10) / 10;
}

// 食品ID→絵文字
function foodEmoji(id) {
  const map = {
    rice:'🍚', 'rice-bowl':'🍚', bread:'🍞', udon:'🍜', pasta:'🍝', ramen:'🍜',
    onigiri:'🍙', cereal:'🥣', chicken:'🍗', 'chicken-thi':'🍗', pork:'🥩',
    beef:'🥩', salmon:'🐟', tuna:'🐟', egg:'🥚', tofu:'🍲', natto:'🫘',
    salad:'🥗', broccoli:'🥦', tomato:'🍅', banana:'🍌', apple:'🍎',
    milk:'🥛', yogurt:'🥛', cheese:'🧀', coffee:'☕', 'orange-juice':'🧃',
    chocolate:'🍫', 'potato-chips':'🥔', icecream:'🍦', 'protein-bar':'🍫', almond:'🥜',
  };
  return map[id] || '🍽️';
}

document.addEventListener('DOMContentLoaded', () => App.init());

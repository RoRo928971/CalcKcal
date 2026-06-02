/* ===========================================================================
 * store.js — アプリ状態と永続化（localStorage）
 * ===========================================================================*/

const STORAGE_KEY = 'calckcal_state_v1';

const DEFAULT_STATE = {
  onboarded: false,
  profile: {
    age: 30,
    sex: 'male',
    height: 170,
    weight: 65,
    activity: 'medium',
    goal: 'maintain',
  },
  targets: { kcal: 2000, p: 75, f: 56, c: 300 },
  // 食事記録: { 'YYYY-MM-DD': [ {id, foodId, name, meal, amount, unit, kcal,p,f,c} ] }
  logs: {},
  // 体重記録: { 'YYYY-MM-DD': number }
  weights: {},
  // お気に入り食品ID
  favorites: [],
  // ユーザーが自分で追加した食品 { id, name, cat, unit, per, kcal, p, f, c, emoji }
  customFoods: [],
  settings: {
    reminderTime: '',
    healthSync: false,
  },
};

const Store = {
  state: null,

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.state = raw ? { ...structuredClone(DEFAULT_STATE), ...JSON.parse(raw) } : structuredClone(DEFAULT_STATE);
    } catch (e) {
      this.state = structuredClone(DEFAULT_STATE);
    }
    return this.state;
  },

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  },

  reset() {
    this.state = structuredClone(DEFAULT_STATE);
    this.save();
  },

  // ---- 日付ユーティリティ ----
  todayKey() {
    return this.dateKey(new Date());
  },
  dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  // ---- ログ操作 ----
  logsForDate(key) {
    return this.state.logs[key] || [];
  },

  addLog(key, entry) {
    if (!this.state.logs[key]) this.state.logs[key] = [];
    entry.id = 'l' + Date.now() + Math.random().toString(36).slice(2, 6);
    this.state.logs[key].push(entry);
    this.save();
    return entry;
  },

  removeLog(key, id) {
    if (!this.state.logs[key]) return;
    this.state.logs[key] = this.state.logs[key].filter(e => e.id !== id);
    this.save();
  },

  // 1日の合計栄養を集計
  totalsForDate(key) {
    const logs = this.logsForDate(key);
    return logs.reduce((acc, e) => {
      acc.kcal += e.kcal; acc.p += e.p; acc.f += e.f; acc.c += e.c;
      return acc;
    }, { kcal: 0, p: 0, f: 0, c: 0 });
  },

  // ---- お気に入り ----
  toggleFavorite(foodId) {
    const i = this.state.favorites.indexOf(foodId);
    if (i >= 0) this.state.favorites.splice(i, 1);
    else this.state.favorites.push(foodId);
    this.save();
  },
  isFavorite(foodId) {
    return this.state.favorites.includes(foodId);
  },

  // 最近使った食品ID（重複なし、新しい順、最大12件）
  recentFoodIds() {
    const ids = [];
    const keys = Object.keys(this.state.logs).sort().reverse();
    for (const k of keys) {
      for (const e of [...this.state.logs[k]].reverse()) {
        if (!ids.includes(e.foodId)) ids.push(e.foodId);
        if (ids.length >= 12) return ids;
      }
    }
    return ids;
  },

  // ---- 体重 ----
  setWeight(key, w) {
    this.state.weights[key] = w;
    this.save();
  },

  // ---- 食品（組み込み + ユーザー定義） ----
  // 組み込みDB(FOOD_DB)とユーザー定義(customFoods)を結合して返す。
  allFoods() {
    return FOOD_DB.concat(this.state.customFoods || []);
  },
  // IDから食品定義を引く（組み込み・ユーザー定義どちらも対象）
  findFood(id) {
    return this.allFoods().find(f => f.id === id);
  },
  isCustomFood(id) {
    return (this.state.customFoods || []).some(f => f.id === id);
  },

  // ユーザー定義食品を追加。栄養値は数値に正規化する。
  addCustomFood(food) {
    if (!this.state.customFoods) this.state.customFoods = [];
    const entry = this._normalizeFood(food);
    entry.id = 'c_' + Date.now() + Math.random().toString(36).slice(2, 6);
    this.state.customFoods.push(entry);
    this.save();
    return entry;
  },

  // 既存のユーザー定義食品を更新
  updateCustomFood(id, patch) {
    const list = this.state.customFoods || [];
    const i = list.findIndex(f => f.id === id);
    if (i < 0) return null;
    list[i] = { ...list[i], ...this._normalizeFood({ ...list[i], ...patch }), id };
    this.save();
    return list[i];
  },

  // ユーザー定義食品を削除（お気に入りからも除去）
  removeCustomFood(id) {
    this.state.customFoods = (this.state.customFoods || []).filter(f => f.id !== id);
    const fi = this.state.favorites.indexOf(id);
    if (fi >= 0) this.state.favorites.splice(fi, 1);
    this.save();
  },

  _normalizeFood(f) {
    const num = (v) => { const n = parseFloat(v); return isNaN(n) || n < 0 ? 0 : n; };
    return {
      name: (f.name || '').trim(),
      cat: (f.cat || 'マイ食品').trim(),
      unit: f.unit || 'g',
      per: Math.max(1, num(f.per) || 1),
      kcal: num(f.kcal),
      p: num(f.p),
      f: num(f.f),
      c: num(f.c),
      emoji: f.emoji || '🍽️',
      custom: true,
    };
  },
};

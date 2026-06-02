/* ===========================================================================
 * data.js — 食品データベースと栄養計算ロジック
 * 各食品の栄養値は `per`（基準量）あたりの kcal / P(たんぱく質) / F(脂質) / C(炭水化物)。
 * 例: unit='g', per=100 なら「100gあたり」の値。unit='個'/'杯' は1単位あたり。
 * ===========================================================================*/

const FOOD_DB = [
  // --- 主食 ---
  { id: 'rice',        name: 'ごはん（白米）',     cat: '主食',   unit: 'g', per: 100, kcal: 156, p: 2.5, f: 0.3, c: 37.1 },
  { id: 'rice-bowl',   name: 'ごはん 茶碗1杯',     cat: '主食',   unit: '杯', per: 1,   kcal: 234, p: 3.8, f: 0.5, c: 55.7 },
  { id: 'bread',       name: '食パン',             cat: '主食',   unit: '枚', per: 1,   kcal: 158, p: 5.6, f: 2.6, c: 28.0 },
  { id: 'udon',        name: 'うどん（ゆで）',     cat: '主食',   unit: 'g', per: 100, kcal: 105, p: 2.6, f: 0.4, c: 21.6 },
  { id: 'pasta',       name: 'パスタ（ゆで）',     cat: '主食',   unit: 'g', per: 100, kcal: 165, p: 5.4, f: 0.9, c: 31.3 },
  { id: 'ramen',       name: 'ラーメン（1杯）',    cat: '主食',   unit: '杯', per: 1,   kcal: 470, p: 18.0, f: 14.0, c: 66.0 },
  { id: 'onigiri',     name: 'おにぎり（鮭）',     cat: '主食',   unit: '個', per: 1,   kcal: 180, p: 4.5, f: 1.5, c: 36.0 },
  { id: 'cereal',      name: 'シリアル',           cat: '主食',   unit: 'g', per: 100, kcal: 380, p: 7.8, f: 1.5, c: 83.0 },

  // --- たんぱく質源 ---
  { id: 'chicken',     name: '鶏むね肉（皮なし）', cat: '肉・魚', unit: 'g', per: 100, kcal: 108, p: 22.3, f: 1.5, c: 0.0 },
  { id: 'chicken-thi', name: '鶏もも肉（皮なし）', cat: '肉・魚', unit: 'g', per: 100, kcal: 116, p: 18.8, f: 3.9, c: 0.0 },
  { id: 'pork',        name: '豚ロース',           cat: '肉・魚', unit: 'g', per: 100, kcal: 248, p: 19.3, f: 19.2, c: 0.2 },
  { id: 'beef',        name: '牛もも肉',           cat: '肉・魚', unit: 'g', per: 100, kcal: 209, p: 21.2, f: 13.3, c: 0.5 },
  { id: 'salmon',      name: '鮭（焼き）',         cat: '肉・魚', unit: 'g', per: 100, kcal: 133, p: 22.3, f: 4.1, c: 0.1 },
  { id: 'tuna',        name: 'まぐろ（赤身）',     cat: '肉・魚', unit: 'g', per: 100, kcal: 125, p: 26.4, f: 1.4, c: 0.1 },
  { id: 'egg',         name: '卵',                 cat: '肉・魚', unit: '個', per: 1,   kcal: 76,  p: 6.2, f: 5.2, c: 0.2 },
  { id: 'tofu',        name: '豆腐（木綿）',       cat: '肉・魚', unit: 'g', per: 100, kcal: 73,  p: 7.0, f: 4.9, c: 1.5 },
  { id: 'natto',       name: '納豆（1パック）',    cat: '肉・魚', unit: 'パック', per: 1, kcal: 80, p: 6.6, f: 4.0, c: 6.0 },

  // --- 野菜・果物 ---
  { id: 'salad',       name: 'グリーンサラダ',     cat: '野菜',   unit: 'g', per: 100, kcal: 25,  p: 1.2, f: 0.2, c: 4.5 },
  { id: 'broccoli',    name: 'ブロッコリー（ゆで）', cat: '野菜', unit: 'g', per: 100, kcal: 30,  p: 3.5, f: 0.4, c: 5.2 },
  { id: 'tomato',      name: 'トマト',             cat: '野菜',   unit: '個', per: 1,   kcal: 33,  p: 1.1, f: 0.2, c: 7.4 },
  { id: 'banana',      name: 'バナナ',             cat: '果物',   unit: '本', per: 1,   kcal: 86,  p: 1.1, f: 0.2, c: 22.5 },
  { id: 'apple',       name: 'りんご',             cat: '果物',   unit: '個', per: 1,   kcal: 138, p: 0.3, f: 0.3, c: 37.0 },

  // --- 乳製品・飲料 ---
  { id: 'milk',        name: '牛乳（コップ1杯）',  cat: '乳・飲料', unit: '杯', per: 1,  kcal: 134, p: 6.6, f: 7.6, c: 9.6 },
  { id: 'yogurt',      name: 'ヨーグルト（無糖）', cat: '乳・飲料', unit: 'g', per: 100, kcal: 62,  p: 3.6, f: 3.0, c: 4.9 },
  { id: 'cheese',      name: 'プロセスチーズ',     cat: '乳・飲料', unit: 'g', per: 100, kcal: 339, p: 22.7, f: 26.0, c: 1.3 },
  { id: 'coffee',      name: 'ブラックコーヒー',   cat: '乳・飲料', unit: '杯', per: 1,  kcal: 6,   p: 0.4, f: 0.0, c: 1.4 },
  { id: 'orange-juice',name: 'オレンジジュース',   cat: '乳・飲料', unit: '杯', per: 1,  kcal: 84,  p: 1.4, f: 0.2, c: 20.0 },

  // --- 間食・その他 ---
  { id: 'chocolate',   name: 'チョコレート',       cat: '間食',   unit: 'g', per: 100, kcal: 558, p: 6.9, f: 34.1, c: 55.8 },
  { id: 'potato-chips',name: 'ポテトチップス',     cat: '間食',   unit: 'g', per: 100, kcal: 554, p: 4.7, f: 35.2, c: 54.7 },
  { id: 'icecream',    name: 'アイスクリーム',     cat: '間食',   unit: 'g', per: 100, kcal: 180, p: 3.9, f: 8.0, c: 23.2 },
  { id: 'protein-bar', name: 'プロテインバー',     cat: '間食',   unit: '本', per: 1,   kcal: 180, p: 15.0, f: 6.0, c: 16.0 },
  { id: 'almond',      name: 'アーモンド',         cat: '間食',   unit: 'g', per: 100, kcal: 609, p: 19.6, f: 51.8, c: 20.9 },
];

/* 食品IDから定義を引く */
function findFood(id) {
  return FOOD_DB.find(f => f.id === id);
}

/* 指定量(amount)での栄養値を算出 */
function nutritionFor(food, amount) {
  const factor = amount / food.per;
  return {
    kcal: food.kcal * factor,
    p: food.p * factor,
    f: food.f * factor,
    c: food.c * factor,
  };
}

/* ====================== 目標カロリー / PFC 算出 ====================== */

// 身体活動レベル係数（PAL）
const ACTIVITY = {
  low:    { label: '低い（座り中心）',       pal: 1.2 },
  light:  { label: 'やや低い（軽い運動）',   pal: 1.375 },
  medium: { label: 'ふつう（立ち仕事等）',   pal: 1.55 },
  high:   { label: '高い（運動習慣あり）',   pal: 1.725 },
  vhigh:  { label: '非常に高い（毎日激しい）', pal: 1.9 },
};

const GOALS = {
  maintain: { label: '維持', adjust: 0,    pfc: { p: 0.15, f: 0.25, c: 0.60 } },
  lose:     { label: '減量', adjust: -400, pfc: { p: 0.30, f: 0.25, c: 0.45 } },
  gain:     { label: '増量', adjust: +300, pfc: { p: 0.25, f: 0.20, c: 0.55 } },
};

/* BMR（基礎代謝量）— Mifflin-St Jeor 式 */
function calcBMR({ sex, weight, height, age }) {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

/* プロフィールから目標カロリー・PFC(g) を算出 */
function calcTargets(profile) {
  const bmr = calcBMR(profile);
  const tdee = bmr * ACTIVITY[profile.activity].pal;
  const goal = GOALS[profile.goal];
  const kcal = Math.round((tdee + goal.adjust) / 10) * 10;

  // PFC比率 → グラム換算（P,C=4kcal/g, F=9kcal/g）
  const p = Math.round((kcal * goal.pfc.p) / 4);
  const f = Math.round((kcal * goal.pfc.f) / 9);
  const c = Math.round((kcal * goal.pfc.c) / 4);

  return { kcal, p, f, c, bmr: Math.round(bmr), tdee: Math.round(tdee) };
}

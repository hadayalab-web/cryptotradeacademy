# X投稿システムの問題分析レポート
**作成日時**: 2026-01-28  
**問題**: X投稿が386人のインフルエンサーにローテーションさせて1日に500前後投稿するスケジュールが機能しなくなった

---

## 🔍 確認した内容

### 1. X投稿のCron設定

**`vercel.json`**:
```json
{ "path": "/api/x-quote-repost", "schedule": "0 * * * *" }
```
- ✅ Cron設定は存在する（1時間ごと）
- ✅ スケジュールは正常

### 2. X投稿の実装（`api/x-quote-repost.js`）

**インフルエンサー取得処理**（564-574行目）:
```javascript
const { getInfluencersFromStock } = require('../services/x/influencerStock');
let influencers = await getInfluencersFromStock(lang, {
  enableScoring: true,
  topN: undefined, // 全員を返す（後でローテーション機能で選択）
});

if (!influencers || influencers.length === 0) {
  console.warn(`[Quote Repost] ⚠️ No influencers in stock for ${lang} - skipping quote reposts`);
  return [];
}
```

**問題点**:
- ❌ ストックが空の場合、投稿をスキップしている
- ❌ 386人のインフルエンサーがストックに存在しない場合、投稿ができない

### 3. ローテーション機能（`services/x/influencerRotation.js`）

**ローテーション選択処理**（258-338行目）:
```javascript
async function selectInfluencersWithRotation(influencers, lang, count, dateString = null) {
  // 今日既に投稿したインフルエンサーを取得
  const postedToday = await getPostedInfluencersToday(lang, targetDate);
  
  // 投稿済みを除外 + 言語整合性チェック
  const availableInfluencers = influencers.filter(inf => {
    // ...
    return !postedToday.has(username);
  });
  
  // ローテーション順に選択
  // ...
}
```

**状態**:
- ✅ ローテーション機能は実装されている
- ✅ 投稿済みインフルエンサーを除外する機能がある
- ✅ ローテーションインデックスで順番に選択する機能がある

### 4. 私が変更した内容（`services/x/influencerStock.js`）

**変更1: Grok APIエラー時の保護機能**（261-276行目）:
```javascript
// 🛡️ 保護機能: Grok APIから取得できなかった場合、既存のストックを保持
if (!discoveredInfluencers || discoveredInfluencers.length === 0) {
  // 既存のストックを取得して返す（空配列を返さない）
  const existingStock = await getInfluencersFromStock(targetLang);
  if (existingStock && existingStock.length > 0) {
    return existingStock; // 既存ストックを保持
  }
  return []; // 既存ストックもない場合は空配列
}
```

**変更2: 選択後0人の場合の保護機能**（310-320行目）:
```javascript
// 🛡️ 保護機能: 選択されたインフルエンサーが空の場合は既存ストックを保持
if (!selectedInfluencers || selectedInfluencers.length === 0) {
  // 既存のストックを取得して返す
  const existingStock = await getInfluencersFromStock(targetLang);
  if (existingStock && existingStock.length > 0) {
    return existingStock;
  }
  return [];
}
```

**変更3: 空配列での上書き防止**（61-76行目）:
```javascript
// 🛡️ 保護機能1: 空配列での上書きを防ぐ
if (!Array.isArray(influencers) || influencers.length === 0) {
  console.error(`[InfluencerStock] 🛡️ PROTECTION: Attempted to save empty array - BLOCKED`);
  // 既存のストックを確認
  const existing = await kv.get(stockKey);
  if (existing && Array.isArray(existing) && existing.length > 0) {
    return false; // 既存データを保護
  }
  return false; // 空配列の保存は拒否
}
```

---

## 🐛 問題の根本原因

### 問題1: ストックが空になっている

**原因**:
- 過去にTTLによる自動削除があった（24時間で削除）
- または、Grok APIエラー時に空配列が保存されていた
- または、手動でストックが削除された

**影響**:
- `/api/x-quote-repost`がストックからインフルエンサーを取得できない
- ストックが空の場合、投稿をスキップする（570-574行目）
- 結果として、1日500前後の投稿ができない

### 問題2: 保護機能が過剰に働いている可能性

**可能性**:
- `saveInfluencersToStock`で空配列の保存を拒否しているが、既存ストックがない場合も拒否している
- これにより、新しいストックを保存できない可能性がある

**確認が必要**:
- 既存ストックがない場合でも、新しいストックを保存できるかどうか

---

## 📋 現在の状態

### Cron設定
- ✅ `/api/x-quote-repost`: `0 * * * *`（1時間ごと）- 正常

### ローテーション機能
- ✅ 実装されている
- ✅ 投稿済みインフルエンサーを除外
- ✅ ローテーション順に選択

### ストック管理
- ⚠️ ストックが空になっている可能性
- ⚠️ 保護機能により、新しいストックを保存できない可能性

---

## ⚠️ 重大な過ちの可能性

### 1. 空配列保存の拒否が過剰

**問題**:
```javascript
// 既存データがない場合でも空配列の保存は拒否
console.error(`[InfluencerStock] 🛡️ No existing stock found, but empty array save is still blocked for safety`);
return false;
```

**影響**:
- 既存ストックがない場合、新しいストックを保存できない可能性がある
- ただし、`updateInfluencerStock`は空配列を返すだけで、保存はしないので、直接的な影響はないはず

### 2. Grok APIエラー時の処理

**問題**:
- Grok APIから取得できなかった場合、既存ストックを返すように変更した
- しかし、既存ストックもない場合は空配列を返す
- この空配列は保存されない（`saveInfluencersToStock`が呼ばれない）

**影響**:
- ストックが空のままになる可能性がある

---

## ✅ 確認事項

1. **ストックの状態**: KVにストックが存在するか確認が必要
2. **保護機能の動作**: 既存ストックがない場合の動作を確認
3. **X投稿の実行状況**: `/api/x-quote-repost`が正常に実行されているか確認

---

## 🚨 結論

**問題の可能性**:
- ストックが空になっているため、X投稿ができない
- 保護機能が過剰に働いて、新しいストックを保存できない可能性がある

**確認が必要**:
- KVにストックが存在するか
- `/api/x-quote-repost`が正常に実行されているか
- 保護機能が正しく動作しているか

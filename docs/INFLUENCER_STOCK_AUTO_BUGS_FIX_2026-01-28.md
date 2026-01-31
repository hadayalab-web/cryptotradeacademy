# インフルエンサーストック自動化バグ修正レポート
**作成日時**: 2026-01-28  
**問題**: リストは自動で取得も、自動で更新も、自動で削除もしないべき

---

## 🐛 発見されたバグ

### バグ1: 自動更新のCron設定（vercel.json）

**場所**: `vercel.json` 46行目

**問題**:
```json
{ "path": "/api/x-update-influencer-stock", "schedule": "0 0 * * *" }
```

**説明**: 毎日0時（UTC）に自動でインフルエンサーストックを更新するCron設定が追加されている

**修正**: この行を削除する

---

### バグ2: TTLによる自動削除（services/x/influencerStock.js）

**場所**: `services/x/influencerStock.js` 25行目、77行目、80行目

**問題1**: TTL定数の定義
```javascript
const STOCK_TTL = 24 * 60 * 60; // 24時間（秒）
```

**問題2**: TTL付きで保存
```javascript
await kv.set(stockKey, influencersWithLang, { ex: STOCK_TTL });
await kv.set(updateTimeKey, new Date().toISOString(), { ex: STOCK_TTL });
```

**説明**: 24時間のTTLが設定されているため、24時間経過すると自動的に削除される

**修正**: TTLを削除して永続保存にする

---

### バグ3: 自動取得のフォールバック機能（services/x/influencerStock.js）

**場所**: `services/x/influencerStock.js` 347-370行目

**問題**:
```javascript
async function getInfluencersWithFallback(lang, forceRefresh = false) {
  // ...
  if (!forceRefresh) {
    const stockInfluencers = await getInfluencersFromStock(targetLang);
    if (stockInfluencers && stockInfluencers.length > 0) {
      return stockInfluencers;
    }
  }
  
  // ストックが空または強制更新の場合、新規取得
  const newInfluencers = await updateInfluencerStock(targetLang);
  // ...
}
```

**説明**: ストックが空の場合、自動的に新しいインフルエンサーを取得する機能がある

**修正**: この関数を削除するか、自動取得を無効化する

---

## 🔧 修正内容

### 修正1: vercel.jsonからCron設定を削除

```json
// 削除する行
{ "path": "/api/x-update-influencer-stock", "schedule": "0 0 * * *" }
```

### 修正2: TTLを削除して永続保存に変更

```javascript
// 修正前
const STOCK_TTL = 24 * 60 * 60; // 24時間（秒）
await kv.set(stockKey, influencersWithLang, { ex: STOCK_TTL });
await kv.set(updateTimeKey, new Date().toISOString(), { ex: STOCK_TTL });

// 修正後
// TTL定数を削除
await kv.set(stockKey, influencersWithLang); // TTLなし（永続保存）
await kv.set(updateTimeKey, new Date().toISOString()); // TTLなし（永続保存）
```

### 修正3: 自動取得のフォールバック機能を無効化

```javascript
// getInfluencersWithFallback関数を削除するか、自動取得を無効化
// または、この関数を使用している箇所を確認して修正
```

---

## 📋 確認が必要な箇所

1. **`getInfluencersWithFallback`関数の使用箇所**
   - どこで使用されているか確認
   - 使用されている場合は、自動取得を無効化する

2. **`updateInfluencerStock`関数の呼び出し箇所**
   - Cron以外から呼び出されていないか確認
   - 手動実行のみに制限する

---

## ✅ 修正後の期待動作

1. **自動更新**: なし（Cron設定を削除）
2. **自動削除**: なし（TTLを削除）
3. **自動取得**: なし（フォールバック機能を無効化）
4. **手動操作**: 可能（`/api/x-update-influencer-stock`エンドポイントから手動実行）

---

## 🚀 修正手順

1. `vercel.json`からCron設定を削除
2. `services/x/influencerStock.js`のTTLを削除
3. `getInfluencersWithFallback`関数の使用箇所を確認・修正
4. デプロイして動作確認

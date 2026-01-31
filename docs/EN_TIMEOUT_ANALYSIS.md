# EN Endpoint Timeout Analysis

**作成日**: 2026-01-31  
**問題**: `/api/x-quote-repost-en`が間欠的にタイムアウト

---

## 🔍 原因分析

### インフルエンサー数の違い

`config/influencerStrategy.js`の設定：

| 言語 | インフルエンサー数 | ストック数 |
|------|-------------------|-----------|
| **en** | **35人** | **150人** |
| es | 20人 | 76人 |
| pt-br | 16人 | 58人 |
| ar | 12人 | 40人 |
| ja | 10人 | 40人 |
| ko | 8人 | 22人 |

**`en`は他の言語の1.75-4.4倍のインフルエンサー数を処理する必要がある**

---

## ⏱️ 処理時間の推定

### 各インフルエンサーあたりの処理時間

1. **Grok API呼び出し** (`generateQuoteRepostTextWithGrok`): 約2-5秒
2. **X API呼び出し** (`postQuoteTweet`): 約1-2秒
3. **その他の処理**: 約0.5秒

**合計**: 約3.5-7.5秒/インフルエンサー

### `en`エンドポイントの総処理時間

- **35人 × 3.5秒 = 122.5秒**（最小値）
- **35人 × 7.5秒 = 262.5秒**（最大値）

**Vercel Functionsの60秒制限を大幅に超過**

---

## 🔧 解決策

### 解決策1: 並列処理の最適化（推奨）

`p-limit`を使用して並列処理数を制限し、処理時間を短縮：

```javascript
// api/x-quote-repost.js で実装
const limit = await getPLimit();
const limitConcurrency = limit(5); // 最大5並列

// 並列処理で実行
const results = await Promise.all(
  selectedInfluencers.map(inf => 
    limitConcurrency(() => processInfluencer(inf))
  )
);
```

**期待される効果**: 35人を5並列で処理 → 7バッチ × 7.5秒 = 52.5秒（60秒以内）

---

### 解決策2: インフルエンサー数の調整

環境変数で`en`のインフルエンサー数を減らす：

```bash
INFLUENCER_COUNT_EN=20  # 35 → 20に減らす
```

**期待される効果**: 20人 × 7.5秒 = 150秒（並列処理なし）→ 並列処理で30秒以内

---

### 解決策3: 早期リターンチェックの強化

`deadlineMs`をチェックして、時間が足りない場合は早期リターン：

```javascript
// 各インフルエンサー処理前にチェック
if (Date.now() > deadlineMs - 10000) { // 10秒のマージン
  console.warn(`[Quote Repost] Time remaining: ${deadlineMs - Date.now()}ms, stopping early`);
  break;
}
```

---

### 解決策4: バッチ処理の導入

一度にすべてのインフルエンサーを処理せず、バッチごとに処理：

```javascript
const BATCH_SIZE = 10;
for (let i = 0; i < selectedInfluencers.length; i += BATCH_SIZE) {
  const batch = selectedInfluencers.slice(i, i + BATCH_SIZE);
  await processBatch(batch);
  
  // 時間チェック
  if (Date.now() > deadlineMs - 10000) break;
}
```

---

## 🎯 推奨実装順序

1. **P0**: 並列処理の最適化（`p-limit`を使用）
2. **P1**: 早期リターンチェックの強化
3. **P2**: インフルエンサー数の調整（必要に応じて）

---

## 📊 期待される結果

並列処理を最適化した場合：

- **現在**: 35人を順次処理 → 122-262秒（タイムアウト）
- **最適化後**: 35人を5並列で処理 → 52.5秒（60秒以内）

**タイムアウトが解消されるはずです**

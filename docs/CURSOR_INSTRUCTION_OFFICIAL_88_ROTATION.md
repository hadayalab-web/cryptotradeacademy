# 🔥 Cursor 指示書（完全版）  
# 公式 88 件を引用リポストローテーションに統合する

**目的**: インフルエンサー・セカンダリーターゲット・**公式アカウント 88 件**を **1 つの統合ローテーション** にし、投稿密度の最適化・重複削減・公式露出の安定・セカンダリーとのバランスを実現する。

**前提**:  
- セカンダリーは「1日1回・重み付け」で EN の先頭で 1 件投稿済み。  
- ストックは `discoverAndStockFromTargets` で「公式 88 ＋ Grok ＋ Gemini」を X API 検証して KV に保存可能。  
- 引用リポストは `getInfluencersFromStock(lang)` → `selectInfluencersWithRotation(...)` で選択している。

---

## 1. ゴール（実装後の状態）

- **1 つのストック**に「公式（88件）」「discovered（Grok/Gemini 検証済み）」「legacy（既存インフルエンサー）」が混在する。
- 各エントリに **`source: "official" | "discovered" | "legacy"`** を持たせる。
- **取得時**に `prioritizeOfficial: true` で **公式 → discovered → legacy** の順でソートし、`selectInfluencersWithRotation` に渡す。
- 結果として、**公式 88 件がローテーションで優先して選ばれ**、露出が安定する。セカンダリー（1件/日）とのバランスも保たれる。

---

## 2. データモデル（ストック 1 件の形）

既存と同じ＋**`source`** のみ追加。

```js
{
  username: "binance",
  tweetId: "1234567890123456789",
  tweetText: "...",
  engagementRate: 0.05,
  followerCount: 10000000,
  recentImpressions: 50000,
  lang: "en",
  source: "official"   // "official" | "discovered" | "legacy"
}
```

- **official**: `config/officialCryptoXAccounts.js`（getOfficialCryptoUsernames）由来。  
- **discovered**: Grok / Gemini で取得し X API で検証したアカウント。  
- **legacy**: 既存ストックからマージしたもの、または `updateInfluencerStock` で追加したもの。`source` なしは legacy 扱い。

---

## 3. 実装タスク一覧

### 3.1 保存時に `source` を付与（discoverAndStockFromTargets）

**ファイル**: `services/x/discoverAndStockFromTargets.js`

- `verifyAndBuildInfluencer` で 1 件つくったあと、`officialSet.has(username)` なら **`source: "official"`**、それ以外は **`source: "discovered"`** を付与して `verified` に push。
- 既存ストックとマージするとき、既存側のエントリに `source` が無ければ **`source: "legacy"`** を付与。
- **保存順**: `toSave` を **公式を先頭**にソート（official → discovered → legacy）してから `saveInfluencersToStock` に渡す（任意だが推奨）。

### 3.2 取得時に公式優先でソート（getInfluencersFromStock）

**ファイル**: `services/x/influencerStock.js`

- `getInfluencersFromStock(lang, options)` に **`options.prioritizeOfficial = true`** を追加。
- `prioritizeOfficial === true` のとき、返す配列を **official → discovered → legacy** の順でソート。`source` なしは legacy 扱い。同一 source 内の順序は既存のまま。

### 3.3 引用リポストから prioritizeOfficial を渡す

**ファイル**: `api/x-quote-repost.js`

- `getInfluencersFromStock(lang, { enableScoring: false, prioritizeOfficial: true })` のように **`prioritizeOfficial: true`** を渡す。

### 3.4 updateInfluencerStock で source を付与（任意）

**ファイル**: `services/x/influencerStock.js` の `updateInfluencerStock`

- Grok のみで追加するエントリに **`source: "legacy"`** を付与。

---

## 4. 完了条件

- [x] discoverAndStockFromTargets で保存する全エントリに `source` が付与されている（official / discovered）。マージする既存分は legacy。
- [x] getInfluencersFromStock(lang, { prioritizeOfficial: true }) で、返却配列が official → discovered → legacy の順でソートされる。
- [x] api/x-quote-repost.js から getInfluencersFromStock を呼ぶときに prioritizeOfficial: true が渡されている。
- [x] （任意）updateInfluencerStock で追加するエントリに source: "legacy" が付与されている。

---

## 5. まとめ

- 公式 88 件がストックに `source: "official"` で含まれ、取得時に先頭に並ぶことで、ローテーションで**優先して選ばれる**。
- セカンダリー（1件/日）は従来どおり EN の先頭で 1 件。そのあとインフルエンサー（公式優先ソート済み）で N 件。  
→ **1 つの統合ローテーション**で投稿密度・公式露出・セカンダリーとのバランスが最適化される。

この指示書を Cursor に渡し、「3.1 から順に実装してほしい」と指定すれば、公式 88 件とのローテーション統合が実装できる。

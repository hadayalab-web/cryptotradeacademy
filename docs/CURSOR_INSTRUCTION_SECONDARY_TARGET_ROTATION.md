# 🔥 Cursor 指示書（完全版）  
# セカンダリーターゲット（イーロン含む）をローテーションに統合する

**目的**: Trap Defence OS の引用リポストで、**公式アカウント・セカンダリーターゲット（イーロン／AI／マーケット構造／ミーム等）と既存インフルエンサーを 1 つのローテーションに統合**し、拡散力を最大化する。

**前提**:  
- sanitize レイヤーは完了済み。投稿文は「2行＋空行＋URL」で固定。  
- ストックは `discoverAndStockFromTargets` で「公式リスト 88 件 ＋ Grok ＋ Gemini」を X API 検証して KV に保存済み。  
- 引用リポストは `getInfluencersFromStock(lang)` → `selectInfluencersWithRotation(...)` で選択している。

---

## 1. ゴール（実装後の状態）

- **1 つのストック**に「公式（core 含む）」「discovered（Grok/Gemini 検証済み）」「既存インフルエンサー」が混在する。
- 各エントリに **`source`** を持たせ、ローテーションで **公式・core を優先**して選べるようにする。
- **ローテーション**は既存の「1人2投稿/日・今日投稿済み除外」を維持しつつ、**公式を先頭に並べる（または優先度でソート）**ことで、自然にイーロン・xai・取引所・プロジェクト等が多く選ばれる。

---

## 2. データモデル（ストック 1 件の形）

引用リポスト用ストックの 1 エントリは次の形を維持する（既存と同じ＋`source` のみ追加）。

```js
{
  username: "elonmusk",
  tweetId: "1234567890123456789",
  tweetText: "...",
  engagementRate: 0.05,
  followerCount: 100000000,
  recentImpressions: 50000,
  lang: "en",
  source: "official"   // 追加: "official" | "discovered" | "legacy"
}
```

- **`source: "official"`**  
  `config/officialCryptoXAccounts.js` のリスト（getOfficialCryptoUsernames）由来。イーロン・xai・取引所・プロジェクト・メディア等。
- **`source: "discovered"`**  
  Grok / Gemini のリスト検索で取得し、X API で実在確認したアカウント。
- **`source: "legacy"`**  
  既存ストックからマージしたもの、または `updateInfluencerStock`（Grok のみ）で追加したもの。`source` がない古いデータも legacy として扱う。

---

## 3. 実装タスク一覧

### 3.1 保存時に `source` を付与する（discoverAndStockFromTargets）

**ファイル**: `services/x/discoverAndStockFromTargets.js`

- **公式リスト由来**:  
  `verifyAndBuildInfluencer` で 1 件つくったあと、`officialSet.has(username)` なら **`source: "official"`** を付与して `verified` に push。
- **Grok / Gemini 由来**:  
  上記以外は **`source: "discovered"`** を付与して `verified` に push。
- **既存ストックとマージするとき**:  
  既存側のエントリに `source` が無ければ **`source: "legacy"`** を付与してから `toSave` に含める。
- **保存順**:  
  `toSave` を **公式を先頭**にしたい場合、`source === "official"` を先に、その次 `discovered`、最後 `legacy` の順で並べ替えてから `saveInfluencersToStock` に渡す（任意だが、先頭優先のローテーションと相性が良い）。

### 3.2 取得時に公式優先で並べる（getInfluencersFromStock）

**ファイル**: `services/x/influencerStock.js`

- **オプション**:  
  `getInfluencersFromStock(lang, options)` に **`options.prioritizeOfficial = true`**（または `sortBySource: true`）を追加する。
- **挙動**:  
  `prioritizeOfficial === true` のとき、返す配列を次の順でソートする。  
  `official` → `discovered` → `legacy`（`source` なしは `legacy` 扱い）。  
 同一 `source` 内の順序は既存のまま（またはランダム／スコア等、既存仕様に合わせる）。
- **引用リポストからの呼び出し**:  
  `api/x-quote-repost.js` 内で `getInfluencersFromStock(lang, { enableScoring: false, prioritizeOfficial: true })` のように **`prioritizeOfficial: true` を渡す**。

これで、`selectInfluencersWithRotation` に渡るリストの先頭に公式（イーロン等）が並び、同じ日付・同じ制限内で自然に公式が多く選ばれる。

### 3.3 updateInfluencerStock で追加するエントリに source を付与（任意）

**ファイル**: `services/x/influencerStock.js` の `updateInfluencerStock`

- Grok のみで取得したインフルエンサーをストックに保存するとき、各エントリに **`source: "legacy"`** を付与する。  
- 既存の `influencersWithLang` を組み立てている箇所で、`...inf` のあとに `source: inf.source || "legacy"` を追加すればよい。

### 3.4 ローテーション側の変更（任意・拡張）

**ファイル**: `services/x/influencerRotation.js`

- 現状の「今日の投稿済みを除外 → 必要な人数を選ぶ」はそのままでよい。
- **拡張する場合**:  
  「最低 N 人は `source === "official"` から選ぶ」といったルールを追加する。  
  例: `selectInfluencersWithRotation` のオプションに `minOfficial: 2` を渡し、まず `official` から 2 人選び、残りを既存ロジックで選ぶ。  
  必須ではなく、**まずは 3.1 と 3.2 だけで公式優先を実現**し、必要なら後から追加する。

---

## 4. 参照する既存コード

- **ストック取得**: `services/x/influencerStock.js` の `getInfluencersFromStock`。
- **ストック保存**: 同 `saveInfluencersToStock`、および `discoverAndStockFromTargets.js` 内の `verified` / `toSave` の組み立てと `saveInfluencersToStock` 呼び出し。
- **引用リポストの流れ**: `api/x-quote-repost.js` の「get_influencers_from_stock」ステップで `getInfluencersFromStock` を呼び、そのあと `selectInfluencersWithRotation` で選択している箇所。
- **公式リスト**: `config/officialCryptoXAccounts.js` の `getOfficialCryptoUsernames()`。
- **セカンダリーターゲット**: `config/quoteRepostTargets.js` の `SECONDARY_TARGETS`（Grok/Gemini のプロンプトで使用済み。ストックの `source` とは別に、探索のヒントとしてそのまま利用）。

---

## 5. 注意事項

- **後方互換**: 既存のストックエントリに `source` がなくてもよい。取得時は `inf.source || "legacy"` でフォールバックする。
- **既存ローテーション**: `selectInfluencersWithRotation` の「1人2投稿/日・今日投稿済み除外」は変えず、**並び順だけ公式優先**にすることで、既存挙動を壊さずに公式・セカンダリーを統合する。
- **キャッシュ**: ストックは KV のみ。キャッシュキーや TTL の変更は不要。

---

## 6. 完了条件

- [ ] `discoverAndStockFromTargets` で保存する全エントリに `source` が付与されている（official / discovered）。マージする既存分は `legacy`。
- [ ] `getInfluencersFromStock(lang, { prioritizeOfficial: true })` で、返却配列が official → discovered → legacy の順でソートされる。
- [ ] `api/x-quote-repost.js` から `getInfluencersFromStock` を呼ぶときに `prioritizeOfficial: true` が渡されている。
- [ ] （任意）`updateInfluencerStock` で追加するエントリに `source: "legacy"` が付与されている。
- [ ] （任意）`selectInfluencersWithRotation` に `minOfficial` オプションを追加し、最低 N 人は公式から選ぶようにしている。

---

## 7. まとめ

- **やること**: ストックに **`source` を付与**し、取得時に **公式優先でソート**して既存ローテーションに渡す。
- **効果**: イーロン・xai・取引所・プロジェクト等が引用リポストで**優先して選ばれ**、拡散力が上がる。既存の「多言語・時間帯・sanitize・公式 88 件」と組み合わせて、**世界規模の自動拡散 OS** の次のフェーズになる。

この指示書を Cursor に渡し、「3.1 から順に実装してほしい」と指定すれば、セカンダリーターゲット統合を実装できる。

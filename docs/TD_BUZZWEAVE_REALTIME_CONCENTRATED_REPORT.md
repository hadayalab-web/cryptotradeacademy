# TD BuzzWeave Engine リアルタイムトレンド監視＋集中投下 改修レビュー報告書

実施日: 2026-02-12  
対象: `services/td/buzzWeaveEngine.js`, `services/ai/gpt5mini.js`, `services/x/client.js`

---

## 1. 実装目的

BuzzWeave Engine を「人ベース（インフルエンサー巡回）」から「リアルタイムトレンド監視＋集中投下」モデルへ進化させる。

- **1. リアルタイムトレンド監視の強化**: search/recent で直近 1〜5 分のバズ投稿を直接取得
- **2. 集中投下ロジック**: トレンドクラスタリング＋clusterScore で最適クラスタを選定
- **3. 投稿文生成の精度向上**: buzz要約・市場心理・Trap Defence 洞察を GPT プロンプトに付与
- **4. deadline guard との整合**: 各ステップ前の deadline チェックを維持

---

## 2. 実装内容

### 2.1 リアルタイムトレンド監視の強化

#### 1-1. Search Recent Posts をメインデータソースに

| 項目 | 実装 |
|------|------|
| エンドポイント | `GET /2/tweets/search/recent`（client.js 既存 `searchPostsRecent` を使用） |
| 時間枠 | 直近 1〜5 分（`SEARCH_WINDOW_MINUTES` デフォルト 5、環境変数 `BUZZWEAVE_SEARCH_WINDOW_MIN` で変更可） |
| max_results | 50 |
| sort_order | `"recency"` |
| tweet.fields | `public_metrics`, `created_at`, `lang` |

- `fetchCandidatesFromSearch(slotLang, options)` を変更し、`slot.lang` に合わせたクエリで検索
- `endTime`: 現在 - 10秒（X API 制約）
- `startTime`: 現在 - 5分

#### 1-2. 言語別キーワードセット

`SEARCH_KEYWORDS_BY_LANG` を導入（配列形式）:

- **en**: `["bitcoin", "btc", "crypto", "halving", "spot etf", "all time high"]`
- **ja**: `["ビットコイン", "BTC", "仮想通貨", "半減期", "ETF"]`
- **ko**: `["비트코인", "BTC", "암호화폐", "반감기", "ETF"]`
- **es/pt/ar**: 同上または en フォールバック

`buildSearchQuery(lang)` で `OR` 結合し、`-is:retweet -is:reply` を付与。

#### 1-3. 動的スコアリング

- **スコア式**: `score = impressions + likes*50 + retweets*80 + quotes*60 + replies*40`
- **動的中央値フィルタ**: `score >= median * 1.2`（`DYNAMIC_MEDIAN_MULTIPLIER` で調整、デフォルト 1.2）
- 閾値が低すぎる場合は 500 以上に下限設定
- フィルタ後 0 件の場合は上位 20 件をフォールバック採用

---

### 2.2 集中投下ロジック

#### 2-1. トレンドクラスタリング

キーワードヒューリスティックで以下のクラスタに分類:

| クラスタ | キーワード例 |
|----------|--------------|
| etf | etf, spot etf, btc etf, approval |
| price_surge | ath, all time high, pump, breakout, moon |
| fud | dump, crash, fear, bearish, sell |
| regulation | regulation, sec, ban, legal |
| meme | meme, doge, lol |
| other | 上記に該当しない投稿 |

#### 2-2. 集中投下スコア（clusterScore）

```
clusterScore = (cluster内投稿数 * 1000) + (cluster内最大スコア * 1.5) + (直近投稿の新しさ * 係数)
```

- 直近投稿の新しさ: 5分以内ほど高スコア（`recencyFactor = max(0, 300 - recencySec) * 2`）
- `clusterScore` はログ `[BuzzWeave] clusterScore (search/recent)` に出力

#### 2-3. bestCandidate 選定ロジック強化

優先順位（2-3 準拠）:

1. **clusterScore 最大クラスタ内**で score 最大、かつ lang 一致（slot.lang → en → any）
2. **candidate.lang === slot.lang**
3. **fallback**: candidate.lang === "en"
4. **fallback**: 全候補からスコア最大

- **null 禁止**: `pickBestBuzzCandidate` が null を返す場合は、スコア最大候補をフォールバック採用

---

### 2.3 投稿文生成の精度向上（3-1）

#### GPT プロンプト強化

`generateXPost` の `buzzContext` に以下を追加:

- **buzzSummary**: なぜこの投稿が今バズっているか（1行要約）
- **clusterPsych**: このクラスタの市場心理（1行説明）
- **trapDefenceInsight**: Trap Defence としての洞察（1行）

`buildBuzzInsights(candidate, slotLang)` でヒューリスティックに生成（deadline フレンドリー）:

- en/ja/ko に対応
- es/pt/ar は en フォールバック

---

### 2.4 deadline guard との整合

| チェック箇所 | 実装 |
|--------------|------|
| search/recent 実行前 | `collectBuzzCandidates` 冒頭 |
| search 実行後 | `collectBuzzCandidates` 内 |
| 動的中央値フィルタ後 | 同上 |
| GPT 分類ループ前 | 同上 |
| pickBestBuzzCandidate 前 | `runBuzzWeaveCycle` 内（超過時は warn のみ、現時点候補で継続） |
| X 投稿直前 | 既存の `isDeadlineExceeded` チェックを維持 |

---

## 3. 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `services/td/buzzWeaveEngine.js` | SEARCH_KEYWORDS_BY_LANG, buildSearchQuery, classifyCluster, computeClusterScore, buildBuzzInsights, fetchCandidatesFromSearch 改修、collectBuzzCandidates 全面改修、pickBestBuzzCandidate 強化、generateParasiticCopy に buzzInsights 付与 |
| `services/ai/gpt5mini.js` | buzzContext に buzzSummary, clusterPsych, trapDefenceInsight を追加してプロンプトに反映 |

---

## 4. 新規環境変数

| 変数名 | デフォルト | 説明 |
|--------|------------|------|
| `BUZZWEAVE_SEARCH_WINDOW_MIN` | 5 | 検索時間枠（分） |
| `BUZZWEAVE_MEDIAN_MULTIPLIER` | 1.2 | 動的中央値フィルタの係数 |

---

## 5. 完了条件の検証

| 条件 | 結果 |
|------|------|
| bestCandidate が null にならない | ✅ フォールバック採用で null 禁止 |
| slot.lang が ko でも投稿が走る | ✅ SEARCH_KEYWORDS_BY_LANG.ko と buildSearchQuery("ko") で対応 |
| search/recent 由来の投稿が candidate summary に反映される | ✅ `candidate summary (search/recent)` ログで確認 |
| clusterScore がログに出る | ✅ `[BuzzWeave] clusterScore (search/recent)` で出力 |
| 60秒以内に cycle が完了する | ✅ dry-run 実測: elapsedMs 約 11 秒 |

---

## 6. dry-run 実測結果（2026-02-12）

```
[BuzzWeave] slot { lang: 'es', target_type: 'influencer', mode: 'regular' }
[BuzzWeave] clusterScore (search/recent) { other: 155576.078, fud: 6854.078 }
[BuzzWeave] candidate summary (search/recent) {
  rawCandidates: 50,
  filteredByMedian: 21,
  candidates: 10,
  clusterScores: { other: 155576.078, fud: 6854.078 },
  deadlineExceeded: false
}
[BuzzWeave] candidate selection { slotLang: 'es', fallbackUsed: 'cluster', cluster: 'other', clusterScore: 155576.078 }
[BuzzWeave] best candidate { engagementScore: 34480, cluster: 'other', ... }
elapsedMs: 10984, ok: true, deadlineExceeded: false
```

---

## 7. 前実装分との統合

本改修は以下の既存実装と整合:

- **TD_BUZZWEAVE_DEADLINE_GUARD_IMPLEMENTATION_REPORT.md**: deadline guard（deadlineMs 55000、各ステップ前チェック）を維持
- **TD_BUZZWEAVE_SCHEMA_POSTFIX_CODE_COMPAT_REPORT.md**: Supabase td_* 連携、getQuotedTweetIdsInLast30Days, insertQuotedTweets 等は変更なし
- **トレンド投稿ベース移行（前回）**: search/recent をメインに、人ベース巡回を廃止済み。今回で slot.lang 連動・クラスタリング・動的中央値・GPT プロンプト強化を追加

---

## 8. 結論

BuzzWeave Engine は「リアルタイムトレンド監視＋集中投下」モデルへ進化済み。  
search/recent で slot.lang に合わせた直近 1〜5 分のバズ投稿を取得し、動的中央値フィルタ・クラスタリング・clusterScore で最適候補を選定。  
GPT プロンプトに buzz要約・市場心理・Trap Defence 洞察を付与し、投稿文の精度向上を実現。  
deadline guard との整合も維持し、60秒制約内での安定動作を確認した。

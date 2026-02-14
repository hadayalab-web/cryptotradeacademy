# BuzzWeave Engine 実装ロジック

**目的**: 高インプレッション・高エンゲージメント・高CVR を逆算し、引用リポスト最適化を行うエンジンの実装ロジックをコード準拠でまとめる。

**フロー**: Search recent Posts → バズ抽出 → 文脈タグ付け → スロット取得 → マッピング → 寄生コピー生成 → 引用リポスト

---

## 1. 全体の流れ

```
GET/POST /api/buzzweave-run (認証: CRON_SECRET)
  → 緊急停止チェック (BUZZWEAVE_EMERGENCY_STOP)
  → X API blocked チェック (Supabase buzzweave_status)
  → ロック取得 (buzzweave_locks)
  → btcSnapshot 取得 (KV: asset:snapshot:BTC / btc:snapshot、有効期限 24h)
  → macroContext 補完 (NASDAQ/GOLD から buildMacroContextFromAssets)
  → runBuzzWeaveCycle({ dryRun, langFilter, btcSnapshot })
      → cleanupOldSlots (48h 以上前のスロット削除)
      → getTdPostSlotsInNextHour(langFilter)  // 次1時間のスロット 1 件
      → collectBuzzCandidates({ slotLang, deadlineMs, classifyTopN })
      → pickBestBuzzCandidate(candidates, slot, clusterScores)
      → generateParasiticCopy(slot, candidate, videoUrl, btcSnapshot)
      → postQuoteTweet(body, candidate.post.id)  // 未 dryRun 時
      → insertBuzzweavePostLog / insertQuotedTweets / consumeTdPostSlot / insertTdCopyArchive / insertXPost
  → ロック解放
```

---

## 2. エントリポイント（api/buzzweave-run.js）

| 項目 | 内容 |
|------|------|
| **メソッド** | GET または POST |
| **認証** | `Authorization: Bearer CRON_SECRET` または `?cron_secret=CRON_SECRET`。未設定時は認証なしで通過。 |
| **緊急停止** | `BUZZWEAVE_EMERGENCY_STOP=true` で即 200 返却・投稿なし。 |
| **X API blocked** | Supabase `getBuzzweaveStatus()` で `x_api_blocked` が true なら 200・投稿なし。 |
| **ロック** | `acquireBuzzweaveLock()` で排他。取得失敗時は 200 で "Locked"。finally で `releaseBuzzweaveLock()`。 |
| **言語** | `?lang=en` 等で指定。未指定時は `BUZZWEAVE_LANGS` を 1 分単位で round-robin。 |
| **btcSnapshot** | 必須。KV に無い・または 24h 超の場合は `SKIP_NO_SNAPSHOT` で 200・投稿なし。 |

**BUZZWEAVE_LANGS**: `["en", "es", "pt", "ja", "ko", "ar"]`

---

## 3. スロット（td_post_slots）

- **400 枠/日**（`DAILY_SLOT_COUNT`）。Cron 等で `generateDailySlots()` を呼び、`insertTdPostSlots(slots)` で投入。
- **時間帯分布（JST）** `SLOT_DISTRIBUTION_JST`: 8–11 時 80、12–14 時 54、17–20 時 94、21–24 時 120、0–2 時 26、2–6 時 6、6–8 時 20。
- **スロット 1 件の形**: `{ datetime_jst, lang, target_type, mode }`
  - **lang**: en / es / pt / ja / ko / ar（`LANG_WEIGHTS`: en 40%, es 20%, 他 10%）
  - **target_type**: influencer / official / flexible（`TARGET_WEIGHTS`: 70% / 20% / 10%）
  - **mode**: regular / minimal（`MODE_WEIGHTS`: 70% / 30%）
- **取得**: `getTdPostSlotsInNextHour(langFilter)` で「次 1 時間以内」のスロットを取得。1 サイクルで **先頭 1 件** のみ使用。
- **消費**: 投稿成功後に `consumeTdPostSlot(slot.id)`。失敗時は `deferTdPostSlot(slot.id, 180)` で 180 分先に退避。

---

## 4. バズ候補の収集（collectBuzzCandidates）

### 4.1 検索（fetchCandidatesFromSearch）

- **API**: X (Twitter) `search/recent`。1 回の run で **1 言語のみ**（slot.lang）。
- **クエリ**: `buildSearchQuery(slotLang)`  
  - 言語別キーワード `SEARCH_KEYWORDS_BY_LANG`（例: en → "bitcoin" OR "btc" OR "crypto" …）を OR 結合し、`-is:retweet -is:reply` を付与。
- **時間窓**: 直近 **SEARCH_WINDOW_MINUTES**（デフォルト 5 分）。`startTime` / `endTime` は API 制約（endTime は 10 秒以上前）。
- **ソート**: `recency`。**maxResults: 50**。
- **402**: 発生時は `fatal402: true` を返し、run 全体を即終了。`upsertBuzzweaveStatus402()` で DB に記録。

### 4.2 重複除外

- `getQuotedTweetIdsInLast30Days(postIds)` で直近 30 日間に引用済みの ID を取得し、検索結果から除外。

### 4.3 投稿スコア（scorePostByMetrics）

**search/recent 用のバズスコア**（インプレッション + エンゲージメントの合成）:

```
score = impressions×1 + likes×50 + retweets×80 + quotes×60 + replies×40
```

- 各候補に `engagementScore` としてこの score を付与。

### 4.4 動的中央値フィルタ

- 全候補の `engagementScore` の **中央値** を算出。
- **閾値** = `max(median × DYNAMIC_MEDIAN_MULTIPLIER, 500)`。デフォルト乗数 1.2（`BUZZWEAVE_MEDIAN_MULTIPLIER`）。
- `engagementScore >= 閾値` の候補のみ通過。0 件の場合は上位 20 件をフォールバック。

### 4.5 トレンドクラスタ・危険度分類

- **クラスタ**（`classifyCluster`）: キーワードヒューリスティックで `etf` / `price_surge` / `fud` / `regulation` / `meme` / `other` に分類。
- **危険度**（`classifyDanger`）:  
  - 教育寄りキーワード → `educational`  
  - 煽り・レバレッジ等 → `whale_trap`  
  - それ以外 → `neutral`  
- 各候補に `cluster` と `dangerLabel` を付与。クラスタごとに `clusters[cluster]` に集約。

### 4.6 クラスタスコア（computeClusterScore）

**2-2 準拠**:

```
clusterScore = (クラスタ内投稿数 × 1000) + (最大 engagementScore × 1.5) + recencyFactor
recencyFactor = max(0, 300 - 直近投稿からの秒数) × 2   // 5 分以内ほど高スコア
```

- クラスタ単位で `clusterScores[cluster]` を算出。候補マッピングで「どのクラスタを優先するか」に使用。

### 4.7 GPT 分類（classifyPostWithGpt4o）

- **対象**: 動的中央値通過候補の上位 **BUZZWEAVE_GPT_CLASSIFY_TOP_N**（デフォルト 10）件。
- **モデル**: `GPT_MODEL_X_POST`（デフォルト gpt-4o-mini）。
- **出力**: `{ topic, tone, lang }`（topic: crypto/ai/finance/tech/general、tone: urgent/neutral/bullish/bearish/fear、lang: en/ja/es/pt/ko/ar）。
- デッドライン超過時や API 失敗時は `{ topic: "crypto", tone: "neutral", lang: "en" }` でフォールバック。

### 4.8 デッドライン

- **DEFAULT_DEADLINE_MS**: 55 秒（`BUZZWEAVE_DEADLINE_MS` で上書き可）。
- 検索前・検索後・中央値フィルタ後・GPT 分類中にデッドライン超過した場合は、その時点の候補で打ち切り。`deadlineExceeded: true` を返す。

---

## 5. 候補マッピング（pickBestBuzzCandidate）

**優先順位**（2-3 準拠）:

1. **target_type 一致**: slot.target_type が flexible または候補の target_type と一致（検索由来はほぼ "flexible"）。
2. **① clusterScore 最大クラスタ** 内で、言語一致 → なければ en → なければそのクラスタ内で **matchScore 最大**。matchScore は `engagementScore`（topic が crypto/finance/ai なら ×1.3）。
3. **② candidate.lang === slot.lang** のうち matchScore 最大。
4. **③ candidate.lang === "en"** のうち matchScore 最大。
5. **④ 全候補** の matchScore 最大（null 禁止）。

---

## 6. 寄生コピー生成（generateParasiticCopy）

- **入力**: slot、buzzCandidate、videoUrl、**btcSnapshot**（必須。Trap Defence と同一市場状態で投稿）。
- **感情辞書**: `getTdEmotionDictionary(null, slot.lang, 10)` でフレーズ取得。
- **buzzInsights**: `buildBuzzInsights(candidate, slot.lang)` で以下を生成:
  - `buzzSummary` / `clusterPsych` / `trapDefenceInsight`
  - `dangerWhyRetail` / `whaleTrapHow` / `doNotDoActions`（危険度別テンプレート、en/ja/ko）
  - `usedMode` = `dangerLabel` に応じて `trap_defence_warning` / `educational_boost` / `neutral_insight`
- **generateXPost** に渡す主な引数:
  - `mode`, `language`, `video_url`, `usedMode`, `buzzContext`（quotedText, topic, tone, lang, …buzzInsights）, **btcSnapshot**
- **video_url**: `pickVidalyticsLink(slot.lang, slot.mode)` で言語・モードに応じた Vidalytics リンクを選択。

---

## 7. 投稿と事後処理

- **postQuoteTweet(body, candidate.post.id)**: X 引用リポスト実行。`options.postQuoteTweet` で差し替え可能（テスト用）。
- 成功時:
  - **health KV**: `health:bwe:lastPost = Date.now()` を記録（/api/health 用）。
  - **insertBuzzweavePostLog**: slotLang, clusterLabel, clusterScore, candidateTweetId, engagementScore, postedAt, ourTweetId, slotMode, buzzSummary, clusterPsych, trapDefenceInsight, dangerLabel, usedMode。
  - **insertQuotedTweets**: 30 日重複防止用に `tweet_id`, `lang` を登録。
  - **consumeTdPostSlot(slot.id)**: スロット消費。失敗時は **deferTdPostSlot(slot.id, 180)** で 180 分先に退避。
  - **insertTdCopyArchive** / **insertTdCopyMeta** / **insertXPost**: コピー保存・メタ・X 投稿履歴。

---

## 8. 定数・閾値一覧

| 名前 | 値 | 説明 |
|------|-----|------|
| BUZZ_THRESHOLD | influencer: 200, official: 500 | バズ閾値（指示書準拠。search/recent 経路では動的中央値を使用） |
| DAILY_SLOT_COUNT | 400 | 1 日あたりスロット数 |
| DEFAULT_DEADLINE_MS | 55000 | 1 サイクル許容時間（ms） |
| BUZZWEAVE_GPT_CLASSIFY_TOP_N | 10 | GPT 分類する候補数 |
| BUZZWEAVE_ENOUGH_CANDIDATES | 24 | 十分な候補数（参照用） |
| SEARCH_WINDOW_MINUTES | 5 | 検索時間窓（分） |
| DYNAMIC_MEDIAN_MULTIPLIER | 1.2 | 動的中央値の乗数 |
| CLEANUP_OLDER_THAN_HOURS | 48 | スロット保留時間（超過分は削除） |
| LANG_WEIGHTS | en 40, es 20, pt/ja/ko/ar 各 10 | 言語比率（%） |
| TARGET_WEIGHTS | influencer 70, official 20, flexible 10 | ターゲット比率（%） |
| MODE_WEIGHTS | regular 70, minimal 30 | モード比率（%） |

---

## 9. エンゲージメントスコア（指示書準拠）

**投稿単体のエンゲージメント**（calculateEngagementScore）:

```
score = likes + 2×retweets + 3×quotes + replies
```

- 検索結果のバズスコアには **scorePostByMetrics**（インプレッション＋エンゲージメント合成）を使用。候補の優先度には **engagementScore**（同じ scorePostByMetrics の値）と **matchScore**（topic 一致で ×1.3）を使用。

---

## 10. 参照ファイル

| ファイル | 役割 |
|----------|------|
| `api/buzzweave-run.js` | エントリ・認証・緊急停止・ロック・btcSnapshot 取得・runBuzzWeaveCycle 呼び出し |
| `services/td/buzzWeaveEngine.js` | スロット取得・collectBuzzCandidates・pickBestBuzzCandidate・generateParasiticCopy・投稿・ログ・KV health |
| `services/x/client.js` | searchPostsRecent, getUserByUsername, getUserTweets, postQuoteTweet |
| `services/ai/gpt5mini.js` | generateXPost（寄生コピー本文生成） |
| `config/buzzweaveLinks.js` | pickVidalyticsLink |
| `utils/supabase.js` | ロック・スロット・buzzweave_post_log・quoted_tweets・copy_archive・x_posts 等 |

---

## 11. 補足

- **dryRun**: `options.dryRun !== false` の場合は X 投稿を行わず、生成した body を返す。
- **btcSnapshot**: Trap Defence と同一市場状態でコピーを書くため必須。macroContext が無い場合は KV の NASDAQ/GOLD から run 内で補完。
- **ロック**: 多重実行防止。TTL 60 秒で自動解除。取得後は try/finally で必ず解放。

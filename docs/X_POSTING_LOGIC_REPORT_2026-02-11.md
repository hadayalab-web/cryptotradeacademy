# Trap Defence — X投稿ロジック現状レポート

**作成日**: 2026-02-11  
**対象**: 現行の全 X 投稿関連ロジック  

> **2026-02-13 更新**: X 投稿は **BuzzWeave Engine 単体OS** に再構築済み。現行の投稿経路は `api/buzzweave-run` のみ。詳細は [X_POSTING_BUZZWEAVE_ONLY.md](./X_POSTING_BUZZWEAVE_ONLY.md) を参照。

---

## 1. サマリ

| 種別 | 投稿形式 | Cron | 実際の投稿 | 備考 |
|------|----------|------|------------|------|
| **BuzzWeave** | 引用リポスト | 毎分 | ✅ | メイン投稿フロー |
| **x-post** | 通常ツイート | 毎時 | ⚠️ post=1 時のみ | デフォルトは生成のみ |
| **x-quote-repost-*** | 引用リポスト | なし | - | Stateless、手動/バッチ用 |
| **x-quote-repost-batch** | 引用リポスト | なし | - | 7分ローテーション、Cron未設定 |
| **x-quote-repost.js** | 引用リポスト | なし | - | インフルエンサーストック版・廃止方針 |
| **x-post-free-report** | 通常+リプライ | なし | - | cron.js から未呼び出し |
| **x-post-regular-direct** | 通常ツイート | なし | - | cron.js から未呼び出し |

---

## 2. Vercel Cron 設定（vercel.json）

```json
"crons": [
  { "path": "/api/cron", "schedule": "0,7,22,37,52 * * * *" },
  { "path": "/api/minimal-tg-delivery", "schedule": "8 0,6,12,18 * * *" },
  { "path": "/api/x-metrics-fetcher", "schedule": "*/5 * * * *" },
  { "path": "/api/x-post", "schedule": "0 * * * *" },
  { "path": "/api/buzzweave-slots", "schedule": "0 15 * * *" },
  { "path": "/api/buzzweave-run", "schedule": "* * * * *" }
]
```

- **api/cron**: 5分ごと（市場データ・TG配信等、X 投稿は含まない）
- **api/x-post**: 毎時 0 分
- **api/buzzweave-slots**: 毎日 15:00 UTC（スロット生成）
- **api/buzzweave-run**: 毎分

---

## 3. 各投稿ロジック詳細

### 3.1 BuzzWeave Engine（メイン投稿フロー）

| 項目 | 内容 |
|------|------|
| **API** | `api/buzzweave-run.js` |
| **Cron** | 毎分 |
| **サービス** | `services/td/buzzWeaveEngine.js` |
| **X 関数** | `postQuoteTweet(text, quoteTweetId)` |

**フロー**:
1. `td_post_slots` から次に投稿すべきスロットを取得
2. Search API でバズ投稿を取得・スコアリング
3. GPT で「寄生コピー」生成（`generateParasiticCopy` → `generateXPost`）
4. `postQuoteTweet(body, candidate.post.id)` で引用リポスト投稿
5. `quoted_tweets`、`x_posts`、`td_post_slots` を更新

**制御**:
- `BUZZWEAVE_EMERGENCY_STOP=true`: 即時停止
- `buzzweave_status.x_api_blocked`: 402 検知時ブロック
- `buzzweave_locks`: 多重実行防止（TTL 10分）
- `?dry_run=true`: 投稿しない

**言語**: en, es, pt, ja, ko, ar（`langFilter` でローテーション）

---

### 3.2 x-post（統合 API）

| 項目 | 内容 |
|------|------|
| **API** | `api/x-post.js` |
| **Cron** | 毎時 0 分 |
| **X 関数** | `postTweet(text)` |

**フロー**:
1. `generateAndSaveXPost` で GPT が本文生成
2. `pickVidalyticsLink` で Vidalytics URL を付与
3. `?post=true` または `?post=1` のときのみ `postTweet` を実行

**注意**: Cron はクエリなしで呼ぶため、**デフォルトでは投稿しない**。生成のみ行い JSON で返す。

**パラメータ**:
- `lang`: 言語（未指定時は UTC 時間で決定）
- `mode`: minimal | regular
- `post`: true | 1 で実際に投稿
- `dry_run`: ドライラン
- `use_td`: Supabase td_* 辞書・公式文脈を付与

---

### 3.3 Stateless 引用リポスト（x-quote-repost-*）

| 項目 | 内容 |
|------|------|
| **API** | `api/x-quote-repost-en.js` 等（en, es, pt, pt-br, ja, ko, ar） |
| **ハンドラー** | `api/x-quote-repost-stateless-handler.js` |
| **サービス** | `services/x/quoteRepostStateless.js` |
| **X 関数** | `postQuoteTweet(text, tweetId)` |

**フロー**:
1. Search API で直近 120 分のツイートを取得
2. `getQuotedTweetIdsInLast30Days` で重複除外
3. `pickTopN` でスコア上位を選択
4. Grok プール or テンプレートで本文生成
5. 2 秒間隔で `postQuoteTweet` を実行

**Cron**: 設定なし（手動 or バッチ経由）

**パラメータ**:
- `dryRun=1`: 投稿しない
- `count=1〜10`: 1 回あたり最大投稿数
- `tier`: mixed | minimal | regular
- `mode`: template | grok | hybrid

---

### 3.4 x-quote-repost-batch

| 項目 | 内容 |
|------|------|
| **API** | `api/x-quote-repost-batch.js` |
| **サービス** | `runStatelessQuoteRepost`（同上） |
| **X 関数** | `postQuoteTweet` |

**フロー**:
- 奇数バッチ: EN, ES, PT
- 偶数バッチ: JA, KO, AR
- 各言語 1 投稿ずつ、150 秒間隔で実行

**Cron**: 設定なし

---

### 3.5 x-quote-repost.js（インフルエンサーストック版）

| 項目 | 内容 |
|------|------|
| **API** | `api/x-quote-repost.js` |
| **データソース** | KV `influencerStock`（`getInfluencersFromStock`） |
| **X 関数** | `postQuoteTweet(text, influencer.tweetId)` |

**フロー**:
1. ストックからインフルエンサーを取得
2. クールダウン・日次上限チェック
3. Grok セールスレター or テンプレートで本文生成
4. `postQuoteTweet` で引用リポスト

**状態**: 設計上廃止方針（インフルエンサーストック完全廃止）。Cron 未設定。

---

### 3.6 x-post-free-report

| 項目 | 内容 |
|------|------|
| **API** | `api/x-post-free-report.js` |
| **X 関数** | `postTweet`, `replyToTweet` |

**フロー**:
1. 無料レポート（Trap Score 等）をメインツイートで投稿
2. スレッド形式でリプライを追加
3. 50% で Velocity Booster リプライ

**Cron**: cron.js から未呼び出し。単体 API として存在。

---

### 3.7 x-post-regular-direct

| 項目 | 内容 |
|------|------|
| **API** | `api/x-post-regular-direct.js` |
| **X 関数** | `postTweet` |

**フロー**:
- 有料版（Regular）を直接投稿

**Cron**: cron.js から未呼び出し。

---

### 3.8 userReplyHandler / Velocity Booster

| 項目 | 内容 |
|------|------|
| **サービス** | `services/x/userReplyHandler.js`, `services/x/velocityBooster.js` |
| **X 関数** | `replyToTweet(text, inReplyToTweetId)` |

**フロー**:
- ユーザーが自社投稿にリプライした際の自動返信
- x-post-free-report の Velocity Booster としてリプライ追加

**呼び出し**: x-post-free-report 内、または Webhook/キュー経由

---

## 4. X API 低レイヤー（services/x/client.js）

| 関数 | 用途 |
|------|------|
| `postTweet(text, mediaIds, pollOptions)` | 通常ツイート |
| `postQuoteTweet(text, quoteTweetId, mediaIds)` | 引用リポスト |
| `replyToTweet(text, inReplyToTweetId, mediaIds)` | リプライ |

**制限**:
- 本文: 最大 25,000 文字（API 上限）
- リトライ: デフォルト 3 回

---

## 5. 環境変数・制御

| 変数 | デフォルト | 説明 |
|------|------------|------|
| `X_POSTING_ENABLED` | true | 投稿有効化 |
| `X_POSTING_DRY_RUN` | false | ドライラン（投稿しない） |
| `X_MAX_DAILY_POSTS` | 250 | 日次上限 |
| `X_MAX_HOURLY_POSTS` | 100 | 1 時間あたり上限 |
| `BUZZWEAVE_EMERGENCY_STOP` | - | true で BuzzWeave 即停止 |
| `CRON_SECRET` | - | Cron 認証 |

---

## 6. 実際に投稿している経路（2026-02-11 時点）

1. **BuzzWeave**（`api/buzzweave-run`）: 毎分、引用リポスト
2. **x-post**: `?post=1` 付きで呼ぶ場合のみ通常ツイート（Cron はクエリなしのため通常は投稿しない）

---

## 7. 投稿していない／未使用の経路

- `x-quote-repost-en` 等: Cron 未設定
- `x-quote-repost-batch`: Cron 未設定
- `x-quote-repost.js`: インフルエンサーストック廃止方針、Cron 未設定
- `x-post-free-report`: cron.js から未呼び出し
- `x-post-regular-direct`: cron.js から未呼び出し

---

## 8. 依存関係図

```
vercel.json crons
├── /api/buzzweave-run (毎分)
│   └── runBuzzWeaveCycle → postQuoteTweet
├── /api/x-post (毎時)
│   └── generateAndSaveXPost → (post=1 時) postTweet
├── /api/buzzweave-slots (毎日 15:00)
│   └── generateDailySlots（スロット生成のみ、投稿なし）
└── /api/cron (5分)
    └── X 投稿なし

手動・未Cron
├── /api/x-quote-repost-{lang} → runStatelessQuoteRepost → postQuoteTweet
├── /api/x-quote-repost-batch → runStatelessQuoteRepost → postQuoteTweet
├── /api/x-quote-repost → postQuoteRepostsForLang → postQuoteTweet
├── /api/x-post-free-report → postTweet + replyToTweet
└── /api/x-post-regular-direct → postTweet
```

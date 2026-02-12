# Trap Defence — BuzzWeave 単体OS 実装レポート

**作成日**: 2026-02-13  
**対象**: X 投稿ロジックの BuzzWeave Engine 単体OS への再構築

---

## 1. 目的・背景

### 1.1 目的

- **X 投稿経路を BuzzWeave Engine のみに一本化する**
- BuzzWeave 以外の X 投稿ロジックをすべて削除する
- 不要な API / サービス / Cron / 型定義・ユーティリティを除去し、投稿OSをシンプルで美しい構造にする

### 1.2 前提

- 前提レポート: [X_POSTING_LOGIC_REPORT_2026-02-11.md](./X_POSTING_LOGIC_REPORT_2026-02-11.md) にて、複数経路（x-post, x-quote-repost-*, x-post-free-report, x-post-regular-direct, インフルエンサーストック版など）が混在している現状を整理
- 実際に投稿している経路は **BuzzWeave（api/buzzweave-run）** のみとし、他経路は廃止方針で削除

---

## 2. 実施内容サマリ

| 区分 | 内容 |
|------|------|
| **vercel.json** | `/api/x-post` Cron 削除、削除対象 API の functions エントリ削除 |
| **api/** | x-post, x-post-free-report, x-post-regular-direct, x-quote-repost 系, x-update-influencer-stock, x-discover-and-stock-from-targets を削除 |
| **services/x/** | quoteRepostStateless, userReplyHandler, velocityBooster, influencer* 系, discoverAndStockFromTargets を削除 |
| **参照修正** | x-webhook.js, x-engagement-metrics.js から influencerPerformance 依存を除去 |
| **package.json** | predeploy を x-post から buzzweave-run に変更 |
| **scripts/** | validate_implementation.js の対象ファイル・定数を BuzzWeave 前提に更新 |
| **docs** | X_POSTING_BUZZWEAVE_ONLY.md 新規、README とレポートに注記追加 |

---

## 3. 削除したファイル一覧

### 3.1 API 層（api/）

| ファイル | 役割（削除前） |
|----------|----------------|
| `x-post.js` | 統合 X 投稿 API（毎時 Cron、post=1 時のみ投稿） |
| `x-post-free-report.js` | 無料版レポート X 投稿（通常ツイート + リプライ） |
| `x-post-regular-direct.js` | 有料版直接誘導の通常ツイート |
| `x-quote-repost.js` | インフルエンサーストック版引用リポスト |
| `x-quote-repost-stateless-handler.js` | Stateless 引用リポスト共通ハンドラー |
| `x-quote-repost-batch.js` | 言語ローテーション・バッチ引用リポスト |
| `x-quote-repost-en.js` | 言語別 Stateless 引用リポスト（en） |
| `x-quote-repost-es.js` | 同（es） |
| `x-quote-repost-pt.js` | 同（pt） |
| `x-quote-repost-pt-br.js` | 同（pt-br） |
| `x-quote-repost-ja.js` | 同（ja） |
| `x-quote-repost-ko.js` | 同（ko） |
| `x-quote-repost-ar.js` | 同（ar） |
| `x-update-influencer-stock.js` | インフルエンサーストック KV 更新 API |
| `x-discover-and-stock-from-targets.js` | ターゲットから検出・ストック補充 API |

### 3.2 サービス層（services/x/）

| ファイル | 役割（削除前） |
|----------|----------------|
| `quoteRepostStateless.js` | Stateless 引用リポスト実行（Search → Pick → Shoot） |
| `userReplyHandler.js` | ユーザーリプライ時の自動返信 |
| `velocityBooster.js` | 投稿直後の Velocity リプライ投入 |
| `influencerStock.js` | KV インフルエンサーストック getter/setter |
| `influencer-optimizer.js` | インフルエンサー最適化 |
| `influencerAnalyzer.js` | インフルエンサー分析 |
| `influencerPerformance.js` | インフルエンサー別パフォーマンス・マッピング |
| `influencerRotation.js` | インフルエンサーローテーション・日次上限 |
| `discoverAndStockFromTargets.js` | ターゲットリストから検出・KV ストック保存 |

---

## 4. 変更したファイル（修正内容）

### 4.1 vercel.json

- **crons**: `"/api/x-post"`（毎時）を削除。残存: `/api/cron`, `/api/minimal-tg-delivery`, `/api/x-metrics-fetcher`, `/api/buzzweave-slots`, `/api/buzzweave-run`
- **functions**: 上記削除 API に対応するエントリをすべて削除（x-post, x-update-influencer-stock, x-quote-repost-*, x-quote-repost-batch, x-discover-and-stock-from-targets は元から functions に無し）

### 4.2 api/x-webhook.js

- `updateEngagementStats` 内の **influencerPerformance** 利用ブロックを削除  
  - `getInfluencerMapping`, `incrementTweetEngagement` の呼び出しを削除
- ツイート単位の KV 統計更新（`x:webhook:stats:${tweetId}`）および既存のインフルエンサー別 KV 集計ロジックは維持

### 4.3 api/x-engagement-metrics.js

- **buildInfluencerDailyPerformance** の呼び出しブロックを削除（日次メトリクス更新後のインフルエンサー別パフォーマンス構築を廃止）
- **generateEngagementDashboard** 内の **P0-2** ブロック（getInfluencerMapping による extensions: influencers / timing）を削除  
- ダッシュボードは summary / rates / tweets までとし、`extensions` は付与しない

### 4.4 package.json

- **predeploy**:  
  `api/x-post.js` → `api/buzzweave-run.js` に変更  
  - 実行内容: `node -c api/cron.js && node -c api/buzzweave-run.js && node -c services/x/client.js && node -c api/x-webhook.js`

### 4.5 scripts/validate_implementation.js

- **EXPECTED_FUNCTION_SIGNATURES**: `services/x/velocityBooster.js` を削除（コメントで「BuzzWeave 単体OS にて削除済み」を記載）
- **EXPECTED_CONSTANTS**: `api/x-post-free-report.js` を削除（定数チェック対象外に）
- **criticalFiles**:  
  `api/x-post-free-report.js`, `api/x-post-minimal-version.js`, `services/x/velocityBooster.js`  
  → `api/buzzweave-run.js`, `services/td/buzzWeaveEngine.js`, `services/x/client.js` に変更

---

## 5. 追加したドキュメント・更新

| ファイル | 内容 |
|----------|------|
| **docs/X_POSTING_BUZZWEAVE_ONLY.md** | 新規。X 投稿は BuzzWeave のみである旨、投稿経路一覧、Cron、主要構成を記載 |
| **docs/README.md** | 冒頭に「X 投稿は BuzzWeave Engine のみ」の節を追加し、X_POSTING_BUZZWEAVE_ONLY.md へのリンクを追加 |
| **docs/X_POSTING_LOGIC_REPORT_2026-02-11.md** | 冒頭に「2026-02-13 更新: BuzzWeave 単体OS に再構築済み」の注記を追加 |

---

## 6. 再構築後の構成（X 投稿まわり）

### 6.1 投稿経路（一本化後）

| 種別 | API | Cron | 説明 |
|------|-----|------|------|
| **BuzzWeave** | `api/buzzweave-run.js` | 毎分 | 引用リポスト（メイン投稿フロー） |
| **スロット生成** | `api/buzzweave-slots.js` | 毎日 15:00 UTC | 投稿スロット生成のみ（投稿なし） |

### 6.2 Vercel Cron（現行）

```json
"crons": [
  { "path": "/api/cron", "schedule": "0,7,22,37,52 * * * *" },
  { "path": "/api/minimal-tg-delivery", "schedule": "8 0,6,12,18 * * *" },
  { "path": "/api/x-metrics-fetcher", "schedule": "*/5 * * * *" },
  { "path": "/api/buzzweave-slots", "schedule": "0 15 * * *" },
  { "path": "/api/buzzweave-run", "schedule": "* * * * *" }
]
```

### 6.3 残存する X 関連 API（投稿以外）

- `api/x-metrics-fetcher.js` — メトリクス取得（5分ごと）
- `api/x-engagement-metrics.js` — エンゲージメント集計・ダッシュボード（Cron は別設定の想定）
- `api/x-webhook.js` — X Webhook（リプライ等イベント受信）
- その他: x-algorithm-analysis, x-conversion-expectations, x-dashboard-performance, x-data-validation, x-influencer-report, x-post-logs, x-post-performance-analysis, x-quote-repost-metrics, x-webhook-logs 等は **参照整理のみで残存**（必要に応じて後続で整理可能）

### 6.4 残存する services/x（BuzzWeave が参照するもの）

- **client.js** — `postQuoteTweet`, `searchPostsRecent`, `getUserByUsername`, `getUserTweets` 等（BuzzWeave 中核）
- **config.js** — X 設定
- **metrics.js** / **metricsTracker.js** / **postTracker.js** 等 — メトリクス・投稿追跡（他 API から利用）
- **config/buzzweaveLinks.js** — `pickVidalyticsLink`（buzzWeaveEngine.js から参照）

---

## 7. ビルド・検証結果

| 項目 | 結果 |
|------|------|
| `npm run build` | 成功（`node scripts/copy-telegram-messages.js`） |
| predeploy 構文チェック | 成功（`api/cron.js`, `api/buzzweave-run.js`, `services/x/client.js`, `api/x-webhook.js` の `node -c`） |

---

## 8. 注意事項・非推奨

### 8.1 スクリプト（実行時エラーになるもの）

以下のスクリプトは、削除した `influencerStock` / `discoverAndStockFromTargets` 等を参照するため、**そのまま実行するとエラーになります**。インフルエンサーストック廃止に伴うもので、ビルド・Cron には含まれていません。

- `scripts/list-stock-usernames.js`
- `scripts/run-discover-and-stock-from-targets.js`
- `scripts/diagnose-kv-save-issue.js`
- `scripts/save-grok-results-to-kv-direct.js`
- `scripts/discover-and-stock-influencers-840.js`
- `scripts/emergency-fetch-and-save-all.js`
- `scripts/save-local-influencers-to-kv.js`
- `scripts/emergency-recover-influencers.js`
- `scripts/rebuild-influencer-stock.js`
- `scripts/check-kv-influencers.js`
- `scripts/test-fetch-and-save-en-only.js`
- `scripts/emergency-rebuild-influencer-stock.js`
- `scripts/fix-kv-save-using-service.js`
- `scripts/grok-fetch-and-save-influencers.js`
- `scripts/update-influencer-stock.js`
- `scripts/check-kv-stock-status.js`
- その他 influencerStock / discoverAndStockFromTargets を require するスクリプト

必要であれば `_archive` への退避や、ドキュメントでの「非推奨」明記を推奨。

### 8.2 テストスクリプト（2026-02-13 更新）

- `test:x-post` を廃止し、**`test:buzzweave`**（`scripts/test-buzzweave.js`）に置換済み。BuzzWeave の dry-run のみを実行する。

---

## 9. 追加作業 — BuzzWeave 完全準拠（2026-02-13）

以下の追加タスクを実施し、OS 原則の完全準拠を完了した。

| # | 内容 | 主な変更 |
|---|------|----------|
| 1 | 投稿系 write の呼び出し元を BuzzWeave 経由のみに保証 | `services/x/client.js` に OS 原則コメント追加。`postQuoteTweet` の唯一の呼び出し元は `buzzWeaveEngine.js` であることを確認。`test_critical_functions.js` の定数テストを x-post-free-report 削除に対応してスキップ扱いに変更。 |
| 2 | インフルエンサー系スクリプトを _archive に退避 | `scripts/_archive/` を新規作成し、influencerStock / discoverAndStockFromTargets を require する 29 スクリプトを移動。`scripts/README.md` を新規作成し「実行不可・歴史的理由でのみ保持」を明記。 |
| 3 | config の命名を BuzzWeave 系に統一 | `config/quoteRepostStateless.js` を **`config/buzzweaveLinks.js`** にリネーム。`buzzWeaveEngine.js` と `scripts/verify-vid-links-stateless.js` の import を更新。 |
| 4 | test:x-post を BuzzWeave 用に置換 | `scripts/test-x-post.js` を削除。`scripts/test-buzzweave.js` を新規作成（runBuzzWeaveCycle の dry-run）。`package.json` の `test:x-post` を **`test:buzzweave`** に変更。 |
| 5 | docs に OS 原則を追加 | `docs/X_POSTING_BUZZWEAVE_ONLY.md` に「X 投稿に関する OS 原則」節を追加（4 項目）。設定参照を buzzweaveLinks に修正。 |
| 6 | ビルド・構文チェックの最終確認 | `npm run build` および predeploy 相当の `node -c` を実行し、すべて成功を確認。 |

---

## 10. BuzzWeave 単体OS 最終構造図

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Vercel Cron（投稿関連のみ）                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  /api/buzzweave-run     * * * * *   （毎分）  → X 投稿実行                   │
│  /api/buzzweave-slots   0 15 * * *  （毎日）  → スロット生成のみ             │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  api/buzzweave-run.js                                                        │
│  - CRON_SECRET 検証 / BUZZWEAVE_EMERGENCY_STOP / ロック                       │
│  - runBuzzWeaveCycle({ dryRun, langFilter }) を呼び出し                      │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  services/td/buzzWeaveEngine.js  ←── 唯一の X write 呼び出し元               │
│  - td_post_slots 取得 → Search → スコアリング → GPT 寄生コピー生成           │
│  - postQuoteTweet(body, candidate.post.id)  ※ services/x/client.js          │
│  - quoted_tweets / x_posts / td_post_slots 更新（utils/supabase）            │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
┌──────────────┐ ┌──────────────────────┐ ┌─────────────────────┐
│ services/x/  │ │ config/               │ │ utils/               │
│ client.js    │ │ buzzweaveLinks.js     │ │ supabase.js          │
│ (I/O 層)     │ │ pickVidalyticsLink 等 │ │ td_post_slots,       │
│ postQuoteTweet│ │                      │ │ quoted_tweets, x_posts│
│ searchPosts  │ │                      │ │ buzzweave_*          │
└──────────────┘ └──────────────────────┘ └─────────────────────┘

【原則】
・X への write（postTweet / replyToTweet / postQuoteTweet）は buzzWeaveEngine 経由のみ。
・services/x は I/O クライアント層に限定。新規 Cron 投稿フローは追加しない。
```

---

## 11. コミット単位の目安

**初回再構築**
1. vercel.json — Cron / functions 整理
2. api/ — 削除対象 API の削除
3. services/x/ — 削除対象サービスの削除 + api/x-webhook.js, api/x-engagement-metrics.js の修正
4. package.json + scripts/validate_implementation.js の更新
5. docs — X_POSTING_BUZZWEAVE_ONLY.md 追加、README・レポート注記

**完全準拠追加（2026-02-13）**
6. chore: enforce BuzzWeave-only posting invariant（client.js コメント・test_critical_functions 修正）
7. chore: archive legacy influencer scripts（scripts/_archive, scripts/README.md）
8. refactor: rename quoteRepostStateless config to buzzweaveLinks
9. test: replace test:x-post with test:buzzweave
10. docs: add OS-level posting principles
11. chore: final consistency check for buzzweave-only OS

---

## 12. 参照ドキュメント

- [X_POSTING_BUZZWEAVE_ONLY.md](./X_POSTING_BUZZWEAVE_ONLY.md) — 運用方針・OS 原則・構成の参照先
- [X_POSTING_LOGIC_REPORT_2026-02-11.md](./X_POSTING_LOGIC_REPORT_2026-02-11.md) — 変更前の現状レポート（注記付き）
- [scripts/README.md](../scripts/README.md) — スクリプト一覧と _archive の説明

---

*以上、BuzzWeave 単体OS 実装レポート（2026-02-13）。追加作業により完全準拠を完了。*

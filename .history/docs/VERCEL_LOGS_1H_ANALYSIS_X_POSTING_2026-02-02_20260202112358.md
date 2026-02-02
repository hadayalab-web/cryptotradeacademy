# Vercel 1時間ログ分析：X投稿が計画通り実行されない原因と修正（2026-02-02）

## 概要

`logs_result (5).json`（1時間分）を解析し、**計画したX投稿が実行されない**根本原因を特定し、修正しました。

---

## ログ分析結果（要約）

- **総ログ件数**: 736
- **時刻範囲**: 2026-02-01 22:20:50 ～ 23:15:27
- **呼ばれたエンドポイント**:
  - `/api/cron`: 66回
  - `/api/x-quote-repost-*`（12種）: 各46～68回
  - `/api/x-webhook`: 18回
  - `/api/vsl2-last-call`, `/api/vsl2-free-users`: 数回
- **呼ばれていなかったエンドポイント**:
  - **`/api/x-post-free-report`: 0回**
  - **`/api/x-post-minimal-version`: 0回**（旧名 x-post-minimal-version-cron）

---

## 根本原因（2つ）

### 1. x-post-free-report と x-post-minimal-version が Cron に登録されていなかった

- **事実**: `vercel.json` の `crons` に `/api/x-post-free-report` と `/api/x-post-minimal-version` が**含まれていなかった**。
- **結果**: 誰からも呼ばれず、無料版レポートX投稿・Minimal Version X投稿は**一度も実行されない**状態だった。
- **前担当**: ドキュメント（CRONJOBS_FINAL_CHECK 等）には「x-post-free-report: 30 4,10,17,19」「x-post-minimal-version-cron: 0 0,7,12,15,23」と書いてあるが、**vercel.json に反映されていなかった**。

### 2. 引用リポストが「low impressions: 0」で全件スキップされていた

- **事実**: ログに `Skipping quote repost for @xxx (low impressions: 0, min: 16,500)` 等が大量に出ており、**全インフルエンサーで impressions が 0** と判定されていた。
- **原因**: KV のインフルエンサーストックに `recentImpressions` が 0 で保存されている（または未設定）。x-quote-repost は「impressions >= minImpressions」でないと投稿しないため、**全員スキップ**していた。
- **結果**: x-quote-repost の Cron は動いていたが、**1件も投稿されない**状態だった。

### 補足: x-post-free-report の「type !== free_report」スキップ

- **事実**: 仮に Cron で呼ばれても、`getLanguagesForCurrentHour()` の戻りは **type: "quote" のみ**（optimization.js の peakMap に free_report が無い）だった。
- **結果**: ハンドラー内で `type !== "free_report"` により**常にスキップ**する実装になっており、二重の欠陥だった。

---

## 実施した修正

### 1. vercel.json

- **crons に追加**:
  - `{ "path": "/api/x-post-minimal-version", "schedule": "0 0,7,12,15,23 * * *" }`
  - `{ "path": "/api/x-post-free-report", "schedule": "30 4,10,17,19 * * *" }`
- **functions に追加**:
  - `api/x-post-minimal-version.js`: maxDuration 120
  - `api/x-post-free-report.js`: maxDuration 300

### 2. api/x-quote-repost.js（引用リポスト）

- **インプレッションチェック**: `impressions < minImpressions` でスキップしていた条件を **`impressions > 0 && impressions < minImpressions`** に変更。
- **効果**: `recentImpressions` が 0（メトリクス未取得）の場合は**スキップせず投稿を許可**。KV が 0 で保存されている欠陥から脱却し、引用リポストが実際に投稿されるようにした。

### 3. api/x-post-free-report.js

- **Cron 時の言語・タイプ判定を廃止**: `getLanguagesForCurrentHour()` の `type === "free_report"` に依存していたため、**Cron で呼ばれたときは常に全6言語（SUPPORTED_LANGS）で実行**するように変更。
- **効果**: スケジュール「30 4,10,17,19」で呼ばれたときに、確実に無料版レポートX投稿が実行される。

### 4. api/x-post-minimal-version.js

- **GET（Cron）対応**: 従来は POST のみで `reportData` 必須だったため、Vercel Cron から呼べなかった。**GET 時は `fetchLatestMarketData()` で市場データを取得し、全6言語で postMinimalVersionToX を実行**するように変更。
- **CRON_SECRET チェック**: GET/POST とも認証ヘッダーを検証。

### 5. api/cron.js

- **冗長な else-if 削除**: 「通常時は独立したCronに任せる」とだけログする分岐を削除し、ノイズを削減。

---

## 修正後の Cron 一覧（X関連）

| パス                         | スケジュール               | 内容                                   |
| ---------------------------- | -------------------------- | -------------------------------------- |
| /api/cron                    | _/15 _ \* \* \*            | 定期配信・緊急配信（TG等）             |
| /api/x-post-minimal-version  | 0 0,7,12,15,23 \* \* \*    | 無料版 Minimal Version X投稿（1日5回） |
| /api/x-post-free-report      | 30 4,10,17,19 \* \* \*     | 無料版レポートX投稿（1日4回）          |
| /api/x-quote-repost-en ～ ko | 0,5,10,15,20,25 \* \* \*   | 引用リポスト（:00 枠）                 |
| /api/x-quote-repost-\*-30    | 30,35,40,45,50,55 \* \* \* | 引用リポスト（:30 枠）                 |

---

## 運用上の注意

1. **デプロイ後**: Vercel の Cron が有効になるまで数分かかることがある。1時間後に再度ログを取得し、`/api/x-post-free-report` と `/api/x-post-minimal-version` が呼ばれているか確認すること。
2. **引用リポスト**: インフルエンサーの `recentImpressions` が 0 のままでも投稿は行うようにした。KV ストックを Grok 等で再取得し、`recentImpressions` を埋めれば、将来的にインプレッション閾値によるフィルタを再適用できる。
3. **X_POSTING_DRY_RUN**: 本番投稿前にドライランで確認する場合は `true` のままにし、問題なければ `false` に変更すること。

---

## ログ解析スクリプト

- `scripts/analyze-logs-result-5.js`: `logs_result (5).json` を解析し、エンドポイント別呼び出し回数・スキップメッセージ・結論を出力する。
- 使い方: `node scripts/analyze-logs-result-5.js "C:\Users\...\Downloads\logs_result (5).json"`

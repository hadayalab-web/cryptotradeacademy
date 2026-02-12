# TD BuzzWeave Engine 400投稿モード 安定稼働レビュー報告書

実施日: 2026-02-11  
対象: Trap Defence OS / BuzzWeave Engine

---

## 1. レビュー目的

日次400投稿モードで安定稼働させるために、以下8項目が実装されているかを確認する。

1. Cron を 90秒間隔で実行できるようにする（外部 Cron も許可）  
2. BuzzWeave API に CRON_SECRET 認証を追加  
3. 重複防止ロジック（30日以内の引用禁止）を BuzzWeave Engine に統合  
4. 古いスロットを自動削除する `cleanupOldSlots()` を実装  
5. BuzzWeave Engine のログを最適化（400投稿/日対応）  
6. スロット生成数を 400/日に調整  
7. 投稿成功後の slot consume 失敗時の補償処理を追加  
8. Health Check API（`/api/buzzweave-health`）を新規追加

---

## 2. 実装結果サマリ

判定: **8/8 完了（実装済み）**

### 2.1 変更ファイル

- `services/td/buzzWeaveEngine.js`
- `utils/supabase.js`
- `api/buzzweave-run.js`
- `api/buzzweave-slots.js`
- `api/buzzweave-health.js`（新規）
- `scripts/td-generate-daily-slots.js`
- `utils/loadEnv.js`（新規）
- `vercel.json`

---

## 3. 項目別レビュー

### 3.1 Cron 90秒間隔対応（外部 Cron 許可）

- `vercel.json` に `"/api/buzzweave-run"` を `* * * * *`（毎分）で追加。
- `api/buzzweave-run.js` 冒頭コメントに、90秒間隔は外部Cron（GitHub Actions / cron-job.org 等）を利用する運用方針を明記。
- 結論: **Vercel内は毎分、90秒は外部Cronで実現可能**。

### 3.2 CRON_SECRET 認証

- `api/buzzweave-run.js` / `api/buzzweave-slots.js` / `api/buzzweave-health.js` に `Authorization: Bearer ${CRON_SECRET}` 検証を追加。
- `CRON_SECRET` が設定されている場合のみ認証必須化、未設定時は従来互換。
- 結論: **認証ゲート実装済み**。

### 3.3 重複防止（30日以内引用禁止）

- `services/td/buzzWeaveEngine.js` の候補抽出で `getQuotedTweetIdsInLast30Days()` を使用し重複候補を除外。
- 投稿成功時に `insertQuotedTweets()` で引用履歴を記録。
- 結論: **30日重複禁止が実運用フローに統合済み**。

### 3.4 `cleanupOldSlots()` 実装

- `utils/supabase.js` に `cleanupOldTdPostSlots()` を実装。
- `services/td/buzzWeaveEngine.js` に `cleanupOldSlots()` を実装し、`runBuzzWeaveCycle()` と `generateDailySlots()` の双方で実行。
- 結論: **古いスロットの自動削除を実装済み**。

### 3.5 ログ最適化（400投稿/日対応）

- `BUZZWEAVE_LOG_LEVEL`（`info` / `warn` / `error`）を導入。
- 実行ID（`runId`）と集計ログ（targets数、候補数、重複除外数）中心に変更。
- 結論: **高頻度実行向けにログ粒度を最適化済み**。

### 3.6 スロット生成400/日調整

- `DAILY_SLOT_COUNT = 400` を導入。
- 時間帯配分を400総数に再設計。
- mode配分は日次固定配列方式に変更し、**Regular 280 / Minimal 120（70/30）を厳密保証**。
- 結論: **400投稿/日を仕様どおり生成**。

### 3.7 投稿成功後の consume 失敗補償

- 投稿成功後に `consumeTdPostSlot()` が失敗した場合、`deferTdPostSlot()` で該当スロットを将来時刻へ退避（デフォルト180分）。
- 結果レスポンスに `compensation` 情報を保持。
- 結論: **二重実行リスク低減の補償処理を実装済み**。

### 3.8 Health Check API 追加

- `api/buzzweave-health.js` を新規追加。
- `env`（必要キーの有無）、slot総数/次1時間slot、targetデータ有無を返却。
- 結論: **運用監視APIを新規実装済み**。

---

## 4. .env 参照ポリシーの反映

ユーザー指示に基づき、ローカル検証時に `C:\Users\chiba\hadayalab-automation-platform\cryptotradeacademy\.env` を確実に参照するよう統一。

- `utils/loadEnv.js` を新設。
- ローカル実行では `.env` を優先読み込み（必要時 `.env.local` も追加）。
- Vercel本番は環境変数注入を優先（`process.env.VERCEL` または production 時は dotenvをスキップ）。

---

## 5. 検証ログ（抜粋）

### 5.1 スロット生成ロジック確認（.env 読み込み前提）

実行コマンド（要旨）:

`node -e "const { generateSlotsForDay } = require('./services/td/buzzWeaveEngine'); ..."`

確認結果:

- `count: 400`
- `mode: { regular: 280, minimal: 120 }`
- `hasSupabaseUrl: true`
- `hasServiceRole: true`
- `hasCronSecret: true`

判定: **OK**

### 5.2 構文 / Lint

- `node -c` による更新ファイル構文チェック: **OK**
- Lintチェック: **エラーなし**

---

## 6. 運用ガイド（レビュー向け）

### 6.1 必須ヘッダ

- `Authorization: Bearer <CRON_SECRET>`

### 6.2 主要エンドポイント

- 実行: `/api/buzzweave-run`
- スロット生成: `/api/buzzweave-slots`
- 監視: `/api/buzzweave-health`

### 6.3 90秒運用

- Vercel Cron は最短1分のため、90秒は外部Cronで `/api/buzzweave-run` を呼び出す。

---

## 7. レビュー結論

日次400投稿モード安定稼働に必要な8項目は、コードベース上で **すべて実装済み**。  
特に以下が安定運用の中核として有効:

- 30日重複禁止の実運用統合
- 古いスロット自動掃除
- slot consume失敗時の補償
- 認証付き health/run/slots API
- 400枠固定 + Regular 70% / Minimal 30% の厳密配分

以上により、BuzzWeave Engine は「日次400投稿モード」の運用要件を満たす状態に到達している。


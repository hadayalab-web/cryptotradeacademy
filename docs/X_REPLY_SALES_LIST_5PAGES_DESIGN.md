# Xリプライ直販 リスト取得 ページ数 設計

## 1. 現状の実装（正確な参照）

### 1.1 設定

| 項目 | 場所 | 現状値 |
|------|------|--------|
| 1言語あたりの取得ページ数 | `config/xReplySalesConfig.js` | `X_REPLY_LIST_PAGES` デフォルト **2**（環境変数で1〜10） |
| 1ページあたり最大件数 | 同上 | `X_REPLY_MAX_RESULTS_PER_PAGE`（最大100） |
| 検索時間窓 | 同上 | `X_REPLY_SEARCH_WINDOW_MINUTES`（デフォルト60） |

### 1.2 Cron（リスト取得）

| エンドポイント | スケジュール | 対象 | 1日の実行回数 |
|----------------|-------------|------|----------------|
| `/api/x-reply-sales-en-list` | `8 * * * *`（毎時8分） | 言語 en のみ | 24回 |
| `/api/x-reply-sales-regions-list` | `10 */6 * * *`（0,6,12,18時10分） | 言語 ar,es,pt,ja,ko | 4回（各回で5言語を順次実行） |

- **言語単位のリスト取得回数**: 24（EN） + 4×5（regions） = **44回/日**
- 各回は `api/x-reply-sales-run.js` の `mode=list` で `refreshQueueForLang(lang)` を呼ぶ。

### 1.3 リスト取得フロー（1言語1回あたり）

1. `refreshQueueForLang(lang, now)`（`x-reply-sales-run.js` L379〜）
2. `while (pagesFetched < X_REPLY_LIST_PAGES)` でループ:
   - `fetchOneReplySearchPage(normalizedLang, { nextToken })` を呼ぶ（`services/td/xReplySalesSearch.js`）
   - `runSearchQuery` → X API `GET /2/tweets/search/recent`（`services/x/client.js` の `searchPostsRecent`）
   - 返却の `nextToken` で次ページを取得。`nextToken` が無いか `pagesFetched` が `X_REPLY_LIST_PAGES` に達したら終了。
3. 取得した全ページの `allRows` を `buildCandidatesFromSearchRows` で候補化（`reply_settings` 除外・handled チェックはこの後のマージで実施）。
4. 既存キューと `mergeQueueEntries` でマージ（`X_REPLY_RETAIN_PREVIOUS_QUEUE` に従い既存を残すか破棄）。
5. `kv.set(queueKey, ...)` でキュー保存。サマリ・ログ出力。

### 1.4 送信側（変更なし）

- 送信: `/api/x-reply-sales-send` が `*/15 * * * *`（15分ごと）。15分あたり最大15試行・15秒間隔 → 1日 96×15 = **1440試行/日**。
- エラー時は相手都合系を即NG化し再送しない。在庫は積み増し（既存キュー維持）。

---

## 2. 目標数値（運用方針）

| 項目 | 値 |
|------|-----|
| 送信キャパ | 1440/日（変更なし） |
| 想定エラー率 | 30% |
| 目標リプライ数 | 1440 × (1 - 0.30) ≒ **1000/日** |
| 在庫補充 | 段階的にキャパに寄せる。**まず2ページ**（約440/日 @ 5%）→ CVRを見ながら 3→5→7 と増やす。 |
| 取得率仮定 | 5%（理論値。実際は下振れ想定） |

---

## 3. 実装内容

### 3.1 方針

- **44回/日** の Cron と「1回 = 1言語」の呼び出し構造はそのまま。
- **1言語1回あたりの取得ページ数** は環境変数 `X_REPLY_LIST_PAGES` で制御（デフォルト **2**、有効範囲 1〜10）。
- CVRを見ながら段階的にページ数を上げ、在庫を1440キャパに寄せる。

| ページ数 | 44回×Nページ @ 5%想定 |
|----------|------------------------|
| 2 | 約440/日 |
| 5 | 約1100/日 |
| 7 | 約1540/日 |

### 3.2 変更済み箇所

| ファイル | 内容 |
|----------|------|
| `config/xReplySalesConfig.js` | `X_REPLY_LIST_PAGES` デフォルト **2**、`process.env.X_REPLY_LIST_PAGES` で 1〜10 を指定可能。 |
| `api/x-reply-sales-run.js` | リスト実行時のログに「新規取得 N 件」を出力。 |
| `api/x-reply-sales-list-history.js` | リスト取得の実数履歴API（リアルタイム追跡・分析用）。 |
| `docs/X_REPLY_SALES_API_COSTS.md` | 投稿/ユーザー Read・コンテンツ作成の単価参照。 |

- `api/x-reply-sales-run.js`: `while (pagesFetched < X_REPLY_LIST_PAGES)` で設定値を参照。コード変更なし。
- `vercel.json`: Cron 変更なし。list-history 用にエンドポイント追加済み。

### 3.3 環境変数

- `X_REPLY_LIST_PAGES` で上書き（デフォルト 2、有効範囲 1〜10）。例: `X_REPLY_LIST_PAGES=5` で5ページに増量。

### 3.4 リスク・注意

- **X API レート制限**: 1言語1回あたりのリクエスト数 = ページ数。44言語回×Nページ/日。`/2/tweets/search/recent` の Per User 制限に余裕あり。
- **実行時間**: ページ数に応じて増加。`maxDuration: 300` の範囲内。
- **402（クレジット不足）**: 既存どおり `fatal402` でその言語の取得を打ち切り。他言語・次回実行には影響なし。

---

## 4. 確認方法

- リスト実行後、`GET /api/x-reply-sales-list-history` の `latest` または `gross.freshEnqueuedTotal` / `perLang[].pagesFetched` で取得ページ数と新規キュー入り件数を確認。
- ログの `[X Reply Sales][list] 新規取得 N 件` で N を確認。

以上。

# buzzweave-run 実行時の Vercel ログ（JST 17:00 = UTC 08:00）

JST 17:00 に Cron で `/api/buzzweave-run` が叩かれたとき、出ると想定されるログの並び。

---

## 1. 正常に run が始まった場合（投稿まで進む）

おおよそ次の順で出ます。

| 順 | ログの内容（検索しやすいキーワード） |
|----|--------------------------------------|
| 1 | `[buzzweave-run] handler start` |
| 2 | （初回のみ）`[KV]` の初期化ログ（KV 利用時） |
| 3 | `[buzzweave-run] run started` |
| 4 | `[BuzzWeave] pqt-only cycle start`（logInfo・最大5件まで） |
| 5 | `[BuzzWeave] daily target resolved`（logInfo） |
| 6 | `[BuzzWeave] BWE SCAN: posts_fetched=... buzz_candidates=...`（検索で候補あり） |
| 7 | `[BuzzWeave] pqt-only slots ready` `candidates=...` `slots=...` `cap=...` `runId=...` |
| 8 | `[buzzweave-run] run completed` `posted=...` `runId=...` |

**ポイント**
- `posted=0` ならスロットはあったが 1 本も投稿されていない（cap や API エラーなど）。
- `posted=1` 以上なら、その本数だけ PQT が投稿された。

---

## 2. x_api_blocked を自動解除して run した場合

402 検知から **24 時間以上**（または `X_API_BLOCKED_AUTO_CLEAR_HOURS` で指定した時間）経過していると、同じ run 内でフラグを解除して続行します。

- `[buzzweave-run] x_api_blocked auto-cleared (elapsed N h), proceeding`
- このあと通常どおり `run started` → BWE SCAN → `pqt-only slots ready` → `run completed` が出ます。

※ `X_API_BLOCKED_AUTO_CLEAR_HOURS=0` にすると自動解除は行わず、手動解除のみになります。

---

## 3. スキップされた場合（よくあるパターン）

**スナップショットなし**
- `[buzzweave-run] early return: SKIP_NO_SNAPSHOT (no btcSnapshot in KV)`
- `[BWE] No btcSnapshot available, skipping BuzzWeave cycle.`

**1日の run 上限に到達**
- `[buzzweave-run] early return: daily_limit_reached` `{ todayRuns, dailyLimit }`

**前回 run から 3 時間未満**
- `[buzzweave-run] early return: interval_not_reached` `{ lastRunAt, waitMs }`

**緊急停止**
- `[buzzweave-run] early return: Emergency stop active`

**X API ブロック**
- `[buzzweave-run] early return: X API blocked flag active`

**認証エラー**
- `[buzzweave-run] early return: 401 Unauthorized ...`

---

## 4. 検索で候補 0 の場合

- `[BuzzWeave] BWE SCAN: 0 posts from search, no buzz candidates`
- このあと `pqt-only slots ready` は `slots=0` になり、`run completed` `posted=0` になる。

---

## 5. 投稿でエラーが出た場合

- `[BuzzWeave] pqt post failed` `sourceId` `e?.message`（logWarn。1 スロット失敗ごと）

---

## 6. Vercel で見る手順（イメージ）

1. **Vercel Dashboard** → プロジェクト → **Logs**（または **Functions** → 該当 Function の Logs）。
2. **時刻**: JST 17:00 前後（UTC 08:00 前後）に絞る。
3. **検索**: `buzzweave-run` または `BuzzWeave` でフィルタ。
4. **確認**: 上記のどれが出ているかで「run が動いたか」「スキップ理由」「posted 数」を判断。

---

*JST 17:00 の 1 run を監視するときの参照用。*

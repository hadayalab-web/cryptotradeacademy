# BuzzWeave Engine 暴走停止・ガード実装（v1.1）

実施日: 2026-02-12

---

## 1. 緊急停止フラグ

- **環境変数**: `BUZZWEAVE_EMERGENCY_STOP=true` または `1`
- **動作**: `/api/buzzweave-run` 冒頭でチェック（ロック取得より前）、true なら即 `200` で `{ ok: true, message: "Emergency stop active", posted: 0 }` を返す
- **v1.1 追加**: 発動時に `buzzweave_status` に `last_emergency_stop_at`, `emergency_stop_reason: "env_flag"` を upsert

---

## 2. X API 402 エラー対応

- **fetchCandidatesFromSearch**: 402 発生時 `fatal402: true` を返し、その言語の処理を即停止
- **runBuzzWeaveCycle**: `fatal402` 検知時に `upsertBuzzweaveStatus402()` で `x_api_blocked=true`, `x_api_last_402_at=now()` を書き込み、run 全体を即終了（`ok: false`, `message: "X API 402 - run aborted"`）。再試行なし。
- **v1.1 追加**: `/api/buzzweave-run` 実行開始時に `getBuzzweaveStatus()` で `x_api_blocked` を確認。true の場合 X API を一切叩かず `{ ok: true, message: "X API blocked flag active", posted: 0 }` で return。解除は手動。

---

## 3. insertXPost 暴走防止

- **Supabase insertXPost**:
  - 失敗時は **1 回だけ** `console.error` でログ
  - **再試行しない**
  - **throw しない**（常に `return { ok: false }`）
- **runBuzzWeaveCycle**: insertXPost が `ok: false` の場合
  - 1 回だけログして **即 return**（posted: 0）
  - エラーは throw しない

---

## 4. x_posts スキーマ

- `docs/supabase-tweet-metrics-schema.sql` の `x_posts` に **body TEXT NOT NULL** あり
- コード側は従来どおり `body` を渡しており、スキーマと整合

---

## 5. cron ロック機構（TTL 10分）

- **テーブル**: `buzzweave_locks`（`lock_name` PK, `locked`, `updated_at`）、lock_name = `buzzweave_main`
- **TTL**: `locked = true` かつ `updated_at` が「現在 - 10分」より新しい場合 → ロック取得失敗（false）
- **取得条件**: `locked = false` または `updated_at < 現在 - 10分` のときのみ upsert で `locked = true` に更新
- **流れ**:
  - run 開始時に `acquireBuzzweaveLock()` を呼び出し、false の場合即 `200` で `{ message: "Locked (another run in progress)" }` を返す
  - true の場合 `try { runBuzzWeaveCycle(...) } finally { releaseBuzzweaveLock() }`

---

## 6. 1 run で 1 言語のみ

- **runBuzzWeaveCycle(options)**: `options.langFilter` を追加
- **getTdPostSlotsInNextHour(langFilter)**: `langFilter` 指定時はその言語のスロットのみ取得
- **cron 側**: `?lang=en` のようにクエリで言語を渡す（round-robin 想定）
- **lang 未指定時**: `Date.now()/60000 % 6` で en, es, pt, ja, ko, ar をローテーション

---

## 7. ログ制限

- **BuzzWeave Engine 内**: `console.log` を廃止し、すべて **console.error** に統一
- **logOnce(msg) ヘルパー**: `runLogCount < 5` のときだけ `console.error` し、5 件を超えたら何も出さない
- `runBuzzWeaveCycle` 開始時に `runLogCount = 0` にリセット

---

## 8. Vercel 自動再実行の無効化

- **エラー時**（500）に `x-vercel-no-retry: 1` ヘッダーを付与
- `/api/buzzweave-run` の catch ブロックで `res.setHeader("x-vercel-no-retry", "1")` 後に `res.status(500).json({ ok: false, message: "Internal error", posted: 0 })`

---

## 9. 手動実行での確認

- 暴走しないことを確認するため、**1 回だけ**手動で `/api/buzzweave-run` を実行すること
- 緊急停止を試す場合: `BUZZWEAVE_EMERGENCY_STOP=true` で即 return することを確認
- cron の再開は、buzzweave-run が安定してから行うこと

---

## buzzweave_status テーブル

- **id** TEXT PK（固定で 'main'、1行運用）
- **last_emergency_stop_at** TIMESTAMPTZ
- **emergency_stop_reason** TEXT（例: "env_flag"）
- **x_api_blocked** BOOLEAN（402 検知時に true、手動解除）
- **x_api_last_402_at** TIMESTAMPTZ

---

## 10. ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `api/buzzweave-run.js` | 緊急停止時 upsertBuzzweaveStatusEmergencyStop、x_api_blocked チェック、ロック取得/解放、lang round-robin、no-retry ヘッダー |
| `services/td/buzzWeaveEngine.js` | 402 時 upsertBuzzweaveStatus402、logOnce ヘルパー、insertXPost 失敗時即 return、langFilter |
| `utils/supabase.js` | acquireBuzzweaveLock（TTL 10分）、buzzweave_status 関連、insertXPost の throw 廃止 |
| `docs/supabase-buzzweave-locks.sql` | buzzweave_locks + buzzweave_status |
| `docs/supabase-tweet-metrics-schema.sql` | 10b buzzweave_locks、10c buzzweave_status |

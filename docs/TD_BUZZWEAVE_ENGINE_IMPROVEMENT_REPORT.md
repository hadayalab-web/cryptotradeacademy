# TD BuzzWeave Engine — 改善レビュー用レポート（td_post_slots エラー対策）

実施日: 2026-02-11

---

## 1. 概要

`td_post_slots` テーブル未作成時に発生するエラーを避け、開発者が原因と対処を把握しやすくする改善を実施した。

**対象エラー**:
- `Could not find the table 'public.td_post_slots' in the schema cache`
- ローカルで `curl` 実行時にサーバー未起動で接続できない問題

**方針**: Cursor 側で「テーブル存在チェック」と「明確なエラーメッセージ・手順コメント」を追加し、Supabase 側の前提が満たされていない場合にすぐ対処できるようにする。

---

## 2. 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `utils/supabase.js` | テーブル存在チェック追加・エラーメッセージ統一 |
| `scripts/td-generate-daily-slots.js` | 実行前のテーブル存在チェック・終了メッセージ |
| `api/buzzweave-run.js` | 動作確認手順のコメント追加 |
| `api/buzzweave-slots.js` | テーブル未存在時の 500 とメッセージ返却 |

---

## 3. 実装内容

### 3-1. utils/supabase.js

- **定数**: `TD_POST_SLOTS_MIGRATION_HINT`  
  - 文言: 「td_post_slots が存在しません。Supabase SQL Editor で docs/supabase-tweet-metrics-schema.sql を実行してテーブルを作成してください。」
- **関数**: `checkTdPostSlotsExists()`  
  - `td_post_slots` に対して `select('id').limit(1)` を実行し、エラー有無で存在判定。
- **insertTdPostSlots**  
  - 先に `checkTdPostSlotsExists()` を実行。  
  - 存在しない場合は `{ ok: false, error: TD_POST_SLOTS_MIGRATION_HINT }` を返し、insert は行わない。
- **getTdPostSlotsInNextHour**  
  - 同様に存在チェック。存在しない場合は上記ヒントをログに出し、`[]` を返す。

### 3-2. scripts/td-generate-daily-slots.js

- 実行開始時に Supabase 接続確認。
- `td_post_slots` に対して `select('id').limit(1)` を実行。
- エラー時は「テーブルが存在しません。SQL を実行して…」と表示して `process.exit(1)`。
- ファイル冒頭コメントに「前提: td_post_slots が存在すること」「作成: docs/... を実行」を追記。

### 3-3. api/buzzweave-run.js

- 冒頭コメントに**動作確認手順**を追加:
  1. `npm run dev` でローカルサーバー起動
  2. Supabase に `td_post_slots` が存在することを確認（未作成ならスキーマ SQL を実行）
  3. `curl "http://localhost:3000/api/buzzweave-run?dry_run=true"`

### 3-4. api/buzzweave-slots.js

- ハンドラー内で `getSupabase()` 取得後、`td_post_slots` に `select('id').limit(1)` を実行。
- エラー時は `500` で JSON 返却:  
  `error: "td_post_slots が存在しません。Supabase SQL Editor で docs/supabase-tweet-metrics-schema.sql を実行してテーブルを作成してください。"`

---

## 4. 修正の順序（運用時の手順）

1. **Supabase でテーブル作成**  
   - SQL Editor で `docs/supabase-tweet-metrics-schema.sql` の `td_post_slots` 部分（またはファイル全体）を実行。
2. **スロット生成**  
   - `node scripts/td-generate-daily-slots.js` または `GET /api/buzzweave-slots`。
3. **ローカル確認**  
   - `npm run dev` 起動後、`curl "http://localhost:3000/api/buzzweave-run?dry_run=true"`。

---

## 5. スキーマ（参照）

`td_post_slots` は `docs/supabase-tweet-metrics-schema.sql` に含まれる。

```sql
CREATE TABLE IF NOT EXISTS td_post_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datetime_jst TIMESTAMPTZ NOT NULL,
  lang TEXT NOT NULL,
  target_type TEXT NOT NULL,
  mode TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_td_post_slots_datetime ON td_post_slots(datetime_jst);
```

---

## 6. 関連ドキュメント

- エンジン全体: `docs/TD_BUZZWEAVE_ENGINE_REPORT.md`
- スキーマ全体: `docs/supabase-tweet-metrics-schema.sql`

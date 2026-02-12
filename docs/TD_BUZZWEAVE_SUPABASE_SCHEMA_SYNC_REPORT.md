# TD BuzzWeave Engine Supabase スキーマ整合性監査報告書

実施日: 2026-02-11  
対象環境: Supabase（`.env` の `POSTGRES_URL` を用いた実DB照会）  
対象テーブル:

- `td_influencers`
- `td_post_slots`
- `td_official_accounts`
- `quoted_tweets`
- `tweet_metrics`
- `tweet_queue`

---

## 1. 監査目的

BuzzWeave Engine が期待するスキーマと、Supabase上の実テーブル定義が一致しているかを確認し、差分があれば完全同期用の修正SQLを提示する。

---

## 2. 総合判定

- 判定: **要修正（重大1件 + 推奨調整あり）**
- 重大不一致:
  - `quoted_tweets` に `lang` カラムが存在しない
- 推奨調整:
  - `td_influencers.lang` が `NOT NULL`（コードは `null` 許容）
  - `td_official_accounts.lang` が `NOT NULL`（コードは `null` 許容）
  - `td_official_accounts.org_type` が nullable（実装上は必須）
  - `td_official_accounts.priority` の default が `0`（期待は `1`）
  - `td_influencers` / `td_official_accounts` の検索系インデックス不足
  - `quoted_tweets.quoted_at` インデックス不足

---

## 3. テーブル別監査結果

## 3.1 `td_influencers`

- **必要カラム充足**: 充足（`id, handle, platform, lang, category, followers, notes, created_at`）
- **型整合**: 概ね整合（`uuid / text / int / timestamptz`）
- **不一致**
  - `lang` が `NOT NULL`（コードの `insertTdInfluencers()` は `lang: null` になり得る）
  - `platform` が nullable（期待は `NOT NULL DEFAULT 'x'`）
- **不要カラム警告**
  - `profile`（BuzzWeave本体では未使用）
- **インデックス提案**
  - `idx_td_influencers_lang`
  - `idx_td_influencers_handle`

## 3.2 `td_post_slots`

- **必要カラム充足**: 充足（`id, datetime_jst, lang, target_type, mode, created_at`）
- **型整合**: 整合
- **不一致**: なし
- **インデックス**
  - 既存 `idx_td_post_slots_datetime` は適切

## 3.3 `td_official_accounts`

- **必要カラム充足**: 充足（`id, handle, platform, org_type, lang, region, priority, created_at`）
- **型整合**: 概ね整合
- **不一致**
  - `lang` が `NOT NULL`（コードは `null` 許容）
  - `org_type` が nullable（実装上は必須想定）
  - `priority` default が `0`（期待は `1`）
  - `platform` が nullable（期待は `NOT NULL DEFAULT 'x'`）
- **不要カラム警告**
  - `category`, `followers`（BuzzWeave本体では未使用）
- **インデックス提案**
  - `idx_td_official_org_type`

## 3.4 `quoted_tweets`

- **必要カラム充足**
  - 実装期待: `tweet_id, lang, quoted_at`
  - 実DB: `tweet_id, quoted_at`
  - 判定: **不足あり（`lang` 欠落）**
- **型整合**: 既存分は整合
- **不一致（重大）**
  - `insertQuotedTweets()` が `lang` を保存するため、現状は保存失敗リスク
- **インデックス提案**
  - `idx_quoted_tweets_quoted_at`

## 3.5 `tweet_metrics`

- **必要カラム充足**: 充足
- **型整合**: 整合
- **不一致**: なし
- **インデックス**: `tweet_id(unique)`, `created_at`, `lang` あり（妥当）

## 3.6 `tweet_queue`

- **必要カラム充足**: 充足
- **型整合**: 整合
- **不一致**: なし
- **インデックス**: `tweet_id(unique)` + `processed=false` 部分インデックスあり（妥当）

---

## 4. BuzzWeaveコードとの整合性判定

- `utils/supabase.js`
  - `insertTdInfluencers()` は `lang` を `null` 許容
  - `insertTdOfficialAccounts()` は `lang` を `null` 許容
  - `insertQuotedTweets()` は `quoted_tweets.lang` を書き込む
- `services/td/buzzWeaveEngine.js`
  - 30日重複防止は `quoted_tweets` 前提で稼働

結論: **`quoted_tweets.lang` 欠落は機能不整合に直結するため即修正が必要**。

---

## 5. 完全同期用 SQL（推奨）

```sql
BEGIN;

-- ===== quoted_tweets（必須修正）=====
ALTER TABLE public.quoted_tweets
  ADD COLUMN IF NOT EXISTS lang TEXT;

CREATE INDEX IF NOT EXISTS idx_quoted_tweets_quoted_at
  ON public.quoted_tweets(quoted_at);

-- ===== td_influencers（コード整合）=====
ALTER TABLE public.td_influencers
  ALTER COLUMN lang DROP NOT NULL;

UPDATE public.td_influencers
SET platform = 'x'
WHERE platform IS NULL;

ALTER TABLE public.td_influencers
  ALTER COLUMN platform SET DEFAULT 'x';

ALTER TABLE public.td_influencers
  ALTER COLUMN platform SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_td_influencers_lang
  ON public.td_influencers(lang);

CREATE INDEX IF NOT EXISTS idx_td_influencers_handle
  ON public.td_influencers(handle);

-- ===== td_official_accounts（コード整合）=====
ALTER TABLE public.td_official_accounts
  ALTER COLUMN lang DROP NOT NULL;

UPDATE public.td_official_accounts
SET platform = 'x'
WHERE platform IS NULL;

ALTER TABLE public.td_official_accounts
  ALTER COLUMN platform SET DEFAULT 'x';

ALTER TABLE public.td_official_accounts
  ALTER COLUMN platform SET NOT NULL;

UPDATE public.td_official_accounts
SET org_type = 'corporate'
WHERE org_type IS NULL OR btrim(org_type) = '';

ALTER TABLE public.td_official_accounts
  ALTER COLUMN org_type SET DEFAULT 'corporate';

ALTER TABLE public.td_official_accounts
  ALTER COLUMN org_type SET NOT NULL;

ALTER TABLE public.td_official_accounts
  ALTER COLUMN priority SET DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_td_official_org_type
  ON public.td_official_accounts(org_type);

COMMIT;
```

---

## 6. 不要カラムの扱い（注意）

以下はBuzzWeave本体では未使用だが、他機能で利用している可能性があるため即削除は非推奨。

- `td_influencers.profile`
- `td_official_accounts.category`
- `td_official_accounts.followers`

削除する場合は、コード全体参照調査の完了後に段階的実施を推奨。

---

## 7. 実施後の確認チェック

1. `quoted_tweets` に `lang` が追加されていること  
2. `td_influencers.lang` / `td_official_accounts.lang` が nullable になっていること  
3. `td_official_accounts.priority` default が `1` になっていること  
4. 追加インデックスが作成されていること  
5. `dry_run` と本番投稿でエラーが出ないこと（特に `insertQuotedTweets`）


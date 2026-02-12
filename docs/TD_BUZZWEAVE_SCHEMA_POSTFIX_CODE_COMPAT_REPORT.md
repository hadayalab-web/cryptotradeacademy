# TD BuzzWeave Engine スキーマ修正後コード整合性レポート

実施日: 2026-02-12  
対象:

- `utils/supabase.js`
- `services/td/buzzWeaveEngine.js`
- `api/buzzweave-run.js`
- Supabase 実DB（`POSTGRES_URL` 経由で照会）

---

## 1. `utils/supabase.js` 全関数の再点検（最新スキーマ照合）

本点検では、関数が参照するテーブル/カラム、NOT NULL/DEFAULT前提、insert/update/select の整合を確認した。

## 1.1 `tweet_queue` 関連

- 関数: `insertTweetQueue`, `fetchUnprocessedQueue`, `markQueueProcessed`
- 参照カラム:
  - insert/upsert: `tweet_id`, `lang`, `vid_link_kind`
  - select: `id`, `tweet_id`, `lang`, `vid_link_kind`, `processed`, `created_at`
  - update: `processed`, `processed_at`
- 判定: **整合**
  - `tweet_id` は `NOT NULL + UNIQUE` 前提に適合
  - `processed` は default `false` で実装と整合

## 1.2 `tweet_metrics` 関連

- 関数: `insertTweetMetrics`
- 参照カラム: `tweet_id`, `lang`, `created_at`, `impressions`, `likes`, `retweets`, `quotes`, `replies`, `vid_link_kind`, `vid_clicks`, `vid_unique`, `vid_watch_time`, `vid_completion`
- 判定: **整合**
  - `tweet_id` の unique upsert 前提に適合
  - 数値/時刻カラム型も一致

## 1.3 `quoted_tweets` 関連

- 関数: `getQuotedTweetIdsInLast30Days`, `insertQuotedTweets`
- 参照カラム: `tweet_id`, `quoted_at`, `lang`
- 判定: **整合（修正後）**
  - `lang` 追加済みのため `insertQuotedTweets()` と一致
  - `tweet_id` PK upsert 前提に適合

## 1.4 `td_influencers` 関連

- 関数: `insertTdInfluencers`, `getTdInfluencers`
- 参照カラム: `id`, `handle`, `platform`, `lang`, `category`, `followers`, `notes`
- 判定: **整合**
  - `platform NOT NULL DEFAULT 'x'` に対して実装は `r.platform || "x"` で適合
  - `lang nullable` 化済みで `lang: null` も許容
  - `category NOT NULL` に対して `r.category || "crypto"` で適合

## 1.5 `td_official_accounts` 関連

- 関数: `insertTdOfficialAccounts`, `getTdOfficialAccounts`
- 参照カラム: `id`, `handle`, `org_type`, `lang`, `region`, `priority`, `platform`
- 判定: **整合**
  - `org_type NOT NULL DEFAULT 'corporate'` に対し `r.org_type || "corporate"` で適合
  - `platform NOT NULL DEFAULT 'x'` に対し `r.platform || "x"` で適合
  - `priority default 1` と実装 `?? 1` で整合

## 1.6 `td_post_slots` 関連

- 関数: `insertTdPostSlots`, `getTdPostSlotsInNextHour`, `consumeTdPostSlot`, `deferTdPostSlot`, `cleanupOldTdPostSlots`, `getTdPostSlotsHealthStats`
- 参照カラム: `id`, `datetime_jst`, `lang`, `target_type`, `mode`
- 判定: **整合**
  - 必須カラムに対する insert/select/update/delete は一致
  - `idx_td_post_slots_datetime` 前提の時刻レンジ取得も成立

---

## 2. `services/td/buzzWeaveEngine.js` の主要処理検証

ユーザー指定項目に対応する実コードの判定:

- `getQuotedTweetsInLast30Days()`
  - 実装名は **`getQuotedTweetIdsInLast30Days()`**
  - `quoted_tweets(tweet_id, quoted_at)` を用いた30日重複除外は正常

- `insertQuotedTweets()`
  - `quoted_tweets` へ upsert
  - `lang` カラム追加後は正常動作

- `getInfluencers()`
  - 実装名は **`getTdInfluencers()`**
  - `td_influencers` から必要列取得。最新スキーマで整合

- `getOfficialAccounts()`
  - 実装名は **`getTdOfficialAccounts()`**
  - `td_official_accounts` から必要列取得。最新スキーマで整合

- `generateDailySlots()`
  - `DAILY_SLOT_COUNT = 400` で生成
  - `td_post_slots` insert と整合
  - mode は日次固定配分で `regular 280 / minimal 120`

- `runBuzzWeaveCycle()`
  - 主要DB書き込み（`insertQuotedTweets`, `consumeTdPostSlot`, `insertTdCopyArchive`, `insertTdCopyMeta`, `insertXPost`）はスキーマ整合
  - slot consume 失敗時の補償（`deferTdPostSlot`）あり

---

## 3. スキーマ変更後に発生し得るエラーと修正提案

## 3.1 発生し得るエラー

- `insertQuotedTweets()` の戻り値未検査
  - 現在 `await insertQuotedTweets(...)` の `ok` を見ていない
  - 失敗しても続行し、30日重複防止履歴が欠落する可能性

- `getTdPostSlotsHealthStats()` で Supabase の `error` を厳密評価していない
  - `count` のみ参照し、`error` を明示判定していない

## 3.2 修正提案（最小）

1. `runBuzzWeaveCycle()` で `insertQuotedTweets` の結果を判定し、失敗時は `warning` を結果に残す  
2. `getTdPostSlotsHealthStats()` で `nextHour.error || total.error` を検査し `ok:false` を返す  
3. `consumeTdPostSlot()` は `.eq("id", id).select("id")` で実削除件数を確認し、0件なら `ok:false` 扱いにする

---

## 4. `/api/buzzweave-run` の 504 Timeout 観点

## 4.1 実測

`runBuzzWeaveCycle({ dryRun: true })` の単発実行で **約84.8秒** を確認。  
`vercel.json` の `api/buzzweave-run.js` は `maxDuration: 60` のため、**504 リスクが高い**。

## 4.2 主因

- `collectBuzzCandidates()` が最大30ターゲットを逐次処理
- 各ターゲットごとに X API（user lookup + tweets）を実行
- バズ通過投稿ごとに GPT 分類を逐次実行

## 4.3 改善提案（優先順）

1. **時間予算ガード**  
   - `runBuzzWeaveCycle` に `deadlineMs` を導入し、超過前に早期 return
2. **候補収集の短絡化**  
   - `collectBuzzCandidates` で一定数（例: 12件）候補が集まったら即終了
3. **対象件数を環境変数化**  
   - `BUZZWEAVE_MAX_TARGETS`（既定30→10程度）
4. **分類数を制限**  
   - GPT分類は高スコア上位のみ（例: 上位10投稿）
5. **並列化 + 同時実行制御**  
   - `p-limit` で 3〜5 並列にする
6. **APIを二段構成化（推奨）**  
   - 候補収集を別ジョブで先行実行し、`/api/buzzweave-run` は「選定済み候補から投稿」のみ担当

---

## 5. 400投稿モード安定稼働の総合判定

- **スキーマ整合性**: 合格（修正後スキーマとコードは整合）
- **機能整合性**: 合格（重複防止、slot生成400、補償処理あり）
- **運用安定性**: **条件付き合格**
  - 条件: 504 回避のため、`run` の実行時間を 60秒未満へ最適化すること

現状のコードベースは、**DBスキーマ観点では400投稿モード運用可能**。  
ただし、APIタイムアウト対策を未実施のまま本番高頻度実行すると、運用上の不安定要因になる。

---

## 6. 次アクション（推奨）

1. `runBuzzWeaveCycle` に時間予算付き早期returnを実装  
2. `collectBuzzCandidates` の対象件数/分類件数を削減・環境変数化  
3. `/api/buzzweave-run` を 60秒以内で完了する形に再検証（dry_run 実測を記録）


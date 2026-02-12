# Trap Defence OS / BuzzWeave Engine 技術監査書

作成日: 2026-02-12  
監査対象: `api` / `services` / `utils` / `config` / `scripts` / `docs` / `vercel.json`

---

## 0. 監査サマリー（結論）

- BuzzWeave Engine はコードとして実装済み（候補抽出、文脈分類、スロット生成、引用リポスト、ログ保存）。
- 一方で、**運用自動化とデータ前提に未充足**があるため、現状は「実装済みだが常時自動稼働は未完」。
- KPI 3原則（高インプレッション / 高エンゲージメント / 高CVR）への設計整合は高いが、実運用では以下がボトルネック:
  - Supabase の `td_influencers` / `td_official_accounts` 未整備時に `No buzz candidates`
  - BuzzWeave API の Cron 配線未設定（`vercel.json`）
  - BuzzWeave API に `CRON_SECRET` 認証が未実装

---

## 1. 全体アーキテクチャ

### 1-1. データレイヤー（Supabase）

- 中央クライアント: `utils/supabase.js` の `getSupabase()`
- スキーマ定義: `docs/supabase-tweet-metrics-schema.sql`
- BuzzWeave関連テーブル:
  - `td_post_slots`（投稿スロット）
  - `td_influencers`（ターゲット候補）
  - `td_official_accounts`（ターゲット候補）
  - `td_emotion_dictionary`（辞書）
  - `td_copy_meta`, `td_copy_archive`, `x_posts`（生成・投稿ログ）
- 主要関数:
  - `insertTdPostSlots`, `getTdPostSlotsInNextHour`, `consumeTdPostSlot`
  - `getTdInfluencers`, `getTdOfficialAccounts`, `getTdEmotionDictionary`
  - `insertTdCopyMeta`, `insertTdCopyArchive`, `insertXPost`

### 1-2. KV キャッシュ

- クライアント: `utils/kv.js`
- 主用途:
  - X API レート制限追跡（`services/x/rateLimitTracker.js`）
  - 既存フローのインフルエンサーストック（`x:influencer_stock:*`）
- BuzzWeaveコアは Supabase 主体で動作（KV依存は直接的には低い）

### 1-3. BuzzWeave Engine（生成ロジック）

- コア: `services/td/buzzWeaveEngine.js`
  - `collectBuzzCandidates()`
  - `pickBestBuzzCandidate()`
  - `generateParasiticCopy()`
  - `runBuzzWeaveCycle()`

### 1-4. スロットスケジューラ

- 生成ロジック: `generateSlotsForDay()`（`services/td/buzzWeaveEngine.js`）
- 生成エントリ:
  - API: `api/buzzweave-slots.js`
  - Script: `scripts/td-generate-daily-slots.js`

### 1-5. 投稿実行（X API）

- X API クライアント: `services/x/client.js`
  - `getUserByUsername()`, `getUserTweets()`, `postQuoteTweet()`
- BuzzWeave から `postQuoteTweet()` を直接呼び出し

### 1-6. Cron / 自動実行

- 現行 cron 設定: `vercel.json`
  - `/api/cron`, `/api/minimal-tg-delivery`, `/api/x-metrics-fetcher`, `/api/x-post`
- BuzzWeave API（`/api/buzzweave-run`, `/api/buzzweave-slots`）は **cron未配線**

### 1-7. API ルーティング

- BuzzWeave:
  - `api/buzzweave-run.js`
  - `api/buzzweave-slots.js`
- 既存X投稿基盤:
  - `api/x-post.js`
  - `api/x-quote-repost*.js`
  - `api/x-metrics-fetcher.js`, `api/x-webhook.js`

---

## 2. 実装されている機能一覧

### 2-1. 文脈寄生（Context Parasitism）

- `generateParasiticCopy()` が `buzzContext`（引用元本文/topic/tone）を `generateXPost()` に渡す
- 実装箇所:
  - `services/td/buzzWeaveEngine.js`
  - `services/ai/gpt5mini.js`（`{{BUZZ_CONTEXT}}`）

### 2-2. バズスコアリング

- スコア式: `likes + 2*retweets + 3*quotes + replies`
- 閾値:
  - influencer: `> 200`
  - official: `> 500`
- 実装: `calculateEngagementScore()`, `BUZZ_THRESHOLD`

### 2-3. 5行コピー生成

- 構造固定（感情→敵→防御→URL→#BTC+絵文字）
- 実装: `services/ai/gpt5mini.js` の `SYSTEM_PROMPT`

### 2-4. Regular / Minimal 自動切替

- BuzzWeave スロットでは重み抽選:
  - `MODE_WEIGHTS = { regular: 70, minimal: 30 }`
- 実装: `services/td/buzzWeaveEngine.js`

### 2-5. 多言語対応

- 対応言語: `en/es/pt/ja/ko/ar`
- スロット重み: EN 40%, ES 20%, その他各10%

### 2-6. スロット管理（生成・消費）

- 生成: `insertTdPostSlots()`
- 次1時間取得: `getTdPostSlotsInNextHour()`
- 消費: `consumeTdPostSlot()`

### 2-7. 投稿ログ管理

- `td_copy_archive`, `td_copy_meta`, `x_posts` へ保存
- 実装: `runBuzzWeaveCycle()` の post-success ブロック

### 2-8. 重複防止ロジック

- 既存 stateless quote repost では実装済み:
  - `getQuotedTweetIdsInLast30Days()`
  - `insertQuotedTweets()`
  - `services/x/quoteRepostStateless.js`
- BuzzWeave 側では未接続（要改善）

### 2-9. KV キャッシュの役割

- レート制限状態、旧ストック運用、既存配信フロー補助
- BuzzWeaveコアは Supabase ベースで設計

---

## 3. 実際の稼働フロー（時系列）

1. Trigger
   - `api/buzzweave-run.js`（GET/POST）
2. Slot確認
   - `getTdPostSlotsInNextHour()`（`utils/supabase.js`）
   - 0件なら `No slots in next hour`
3. 候補抽出
   - `collectBuzzCandidates()`
   - `getTdInfluencers()` + `getTdOfficialAccounts()`
   - `fetchRecentPostsFromX()` → `getUserByUsername()` + `getUserTweets()`
   - `calculateEngagementScore()` + 閾値判定
   - 0件なら `No buzz candidates`
4. マッピング
   - `pickBestBuzzCandidate()`（言語一致/近似、target_type、topic 補正）
5. コピー生成
   - `generateParasiticCopy()` → `generateXPost()`
6. 投稿実行
   - `postQuoteTweet()`
7. ログ記録
   - `consumeTdPostSlot()`
   - `insertTdCopyArchive()`
   - `insertTdCopyMeta()`
   - `insertXPost()`

担当ファイル:
- 実行入口: `api/buzzweave-run.js`
- ビジネスロジック: `services/td/buzzWeaveEngine.js`
- DB I/O: `utils/supabase.js`
- 生成AI: `services/ai/gpt5mini.js`
- X API: `services/x/client.js`

---

## 4. 自動化の仕組み

### 4-1. 完全自動化されている範囲

- 既存OSとしては `vercel.json` の cron で以下が自動実行:
  - `/api/cron`
  - `/api/minimal-tg-delivery`
  - `/api/x-metrics-fetcher`
  - `/api/x-post`

### 4-2. 人間介入が必要な箇所

- BuzzWeave の cron 配線（`vercel.json` 追加）
- Supabase 初期化（`td_*` テーブル作成と移設）
- `vercel dev` 実行環境の認証（ローカルで `vercel login` 等）

### 4-3. スロットが無い場合の挙動

- `runBuzzWeaveCycle()` は正常終了で
  - `{ ok: true, message: "No slots in next hour", posted: 0 }`

---

## 5. 期待できる成果（技術的観点）

### 5-1. 投稿頻度

- 設計上は 600 slot/day の供給能力（実際の消費速度は `buzzweave-run` 実行頻度依存）

### 5-2. 多言語展開の効果

- EN重視 + 多言語分散でリーチ面積を拡大
- スロット段階で言語重み制御できるため調整可能性が高い

### 5-3. 文脈寄生の効果

- 高反応投稿の文脈を利用し、初速（表示/反応）を改善しやすい
- `topic/tone/lang` の軽量分類によりミスマッチを抑制

### 5-4. スケール特性

- 水平拡張しやすい構造（API stateless + Supabase）
- ただし `collectBuzzCandidates()` が逐次呼び出し中心で、対象増加時に遅延増加

---

## 6. コードレベル整合性チェック（監査所見）

### 6-1. 仕様整合（主なOK）

- KPI志向（高Impression/Engagement/CVR）の設計意図がコードに反映
- mode比率は現在 `Regular 70 / Minimal 30` で整合
- スロット生成ロジック・文脈寄生・5行コピーは実装済み

### 6-2. 不整合 / 改善余地（優先度順）

1) **[Critical] BuzzWeave API に認証がない**
- `api/buzzweave-run.js`, `api/buzzweave-slots.js`
- `CRON_SECRET` チェック未実装

2) **[Critical] BuzzWeave側の重複防止が未接続**
- `quoted_tweets` の 30日除外ロジックを使用していない
- `services/x/quoteRepostStateless.js` とは実装差あり

3) **[High] ターゲットテーブル空時に即 `No buzz candidates`**
- `collectBuzzCandidates()` は Supabase の `td_influencers/td_official_accounts` に依存
- フォールバック母集団なし

4) **[High] 部分失敗時の整合性**
- `postQuoteTweet()` 成功後に `consumeTdPostSlot()` 失敗すると再投稿リスク

5) **[Medium] `td_post_slots` が蓄積し続ける**
- 古いslotクリーンアップ機構なし

6) **[Medium] ログ出力過多**
- X API 応答や詳細エラーの出力が多く、運用/セキュリティ面で絞り込み余地

7) **[Low] BuzzWeave cron 未接続**
- `vercel.json` に `buzzweave-*` の schedule 未定義

### 6-3. エラー処理の妥当性

- 良い点:
  - 失敗時に graceful return（No slots / No candidates）
  - Supabase テーブル未存在の案内メッセージが明確
- 改善点:
  - API HTTPステータスの整合（`ok:false` でも 200 のケース）
  - retry/backoff を BuzzWeaveレイヤーでも最適化余地

### 6-4. セキュリティ懸念

- `CRON_SECRET` 非適用エンドポイント（BuzzWeave）
- 一部ログの情報量（本番時は最小化推奨）
- 運用上 `NODE_TLS_REJECT_UNAUTHORIZED=0` 警告が出る環境は是正推奨

---

## 7. 改善提案（実装優先順）

### 7-1. パフォーマンス

- `collectBuzzCandidates()` の並列化制御（p-limit等）で API 呼び出し時間短縮
- GPT分類のバッチ化 / しきい値前フィルタの強化

### 7-2. スケーラビリティ

- `td_post_slots` のTTL/定期削除ジョブ
- target取得をページング・キャッシュ化

### 7-3. 信頼性

- BuzzWeave APIに `CRON_SECRET` 認証追加
- `quoted_tweets` 連携で重複投稿防止
- 送信成功後の slot consume 失敗時の補償処理（再試行/死活監視）

### 7-4. 保守性

- BuzzWeave 用 `health` エンドポイント追加（table有無、target件数、直近slot件数）
- エラーメッセージ標準化（構造化ログ）

### 7-5. アーキテクチャ最適化

- `collectBuzzCandidates()` にフォールバック層:
  - Supabase target 0件時、`officialCryptoXAccounts` を一時ソースとして利用
- Cron 完全接続:
  - `vercel.json` に `buzzweave-slots`（日次）/ `buzzweave-run`（定期）を追加

---

## 付録: 主要コード参照

- エンジン本体: `services/td/buzzWeaveEngine.js`
- BuzzWeave実行API: `api/buzzweave-run.js`
- BuzzWeaveスロットAPI: `api/buzzweave-slots.js`
- スロット生成Script: `scripts/td-generate-daily-slots.js`
- Supabase I/O: `utils/supabase.js`
- X APIクライアント: `services/x/client.js`
- コピー生成: `services/ai/gpt5mini.js`
- 重複防止の参照実装: `services/x/quoteRepostStateless.js`
- 自動実行設定: `vercel.json`


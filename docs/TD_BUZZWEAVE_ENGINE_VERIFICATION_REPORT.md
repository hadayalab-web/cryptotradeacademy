# TD BuzzWeave Engine — 実装検証レポート

実施日: 2026-02-11

---

## 1. ファイル存在・実装内容の確認

### 1-1. services/td/buzzWeaveEngine.js

| 項目 | 状態 |
|------|------|
| 存在 | ✅ 存在 |
| 行数 | 352 行 |
| 主な関数 | `calculateEngagementScore`, `fetchRecentPostsFromX`, `classifyPostWithGpt4o`, `generateSlotsForDay`, `pickBestBuzzCandidate`, `collectBuzzCandidates`, `generateParasiticCopy`, `runBuzzWeaveCycle`, `generateDailySlots` |
| エクスポート | 上記すべて + `BUZZ_THRESHOLD`, `SLOT_DISTRIBUTION_JST` |
| 依存 | `../x/client` (getUserByUsername, getUserTweets, postQuoteTweet), `../../config/quoteRepostStateless`, `../../utils/supabase`, `../ai/gpt5mini` |

**実装されているロジック**:
- バズ閾値: influencer > 200, official > 500
- 時間帯分布（JST）: 08–11(120), 12–14(80), 17–20(140), 21–24(180), 00–02(40), 02–06(10), 06–08(30)
- 言語比率: EN 40%, ES 20%, PT/JA/KO/AR 各10%
- ターゲット比率: influencer 70%, official 20%, flexible 10%
- モード比率: **Regular 70% / Minimal 30%**

---

### 1-2. api/buzzweave-run.js

| 項目 | 状態 |
|------|------|
| 存在 | ✅ 存在 |
| 役割 | 1サイクル実行 API（GET/POST） |
| dry_run | `?dry_run=true` または `?dry_run=1` で有効 |
| 動作確認コメント | 冒頭に手順あり |

---

### 1-3. api/buzzweave-slots.js

| 項目 | 状態 |
|------|------|
| 存在 | ✅ 存在 |
| 役割 | 日次600枠スロット生成 API |
| テーブル存在チェック | 実行前に `td_post_slots` を確認、未存在時は 500 とメッセージを返却 |

---

### 1-4. scripts/td-generate-daily-slots.js

| 項目 | 状態 |
|------|------|
| 存在 | ✅ 存在 |
| 役割 | 日次スロット生成（スタンドアロン） |
| テーブル存在チェック | 実行前に `td_post_slots` を確認、未存在時はメッセージ表示して exit(1) |

---

## 2. td_post_slots の定義と Supabase 上の有無

### 2-1. docs/supabase-tweet-metrics-schema.sql

| 項目 | 状態 |
|------|------|
| td_post_slots の定義 | ✅ 含まれる（121–131 行目） |

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

### 2-2. Supabase 上での td_post_slots の存在

| 項目 | 状態 |
|------|------|
| 検証方法 | 本検証では未実施（Supabase ダッシュボードでの確認が必要） |
| 根拠 | `node scripts/td-generate-daily-slots.js` 実行時に「td_post_slots が存在しません」と表示されているため、現時点ではテーブル未作成と推定される |

→ **Supabase SQL Editor で上記スキーマを実行し、テーブルを作成する必要があります。**

---

## 3. ローカル実行結果

### 3-1. node scripts/td-generate-daily-slots.js

```
[KV] 🔵 KV初期化開始...
[KV] 環境変数確認: KV_REST_API_URL / KV_REST_API_TOKEN / KV_URL 設定済み
[KV] ✅ KVインスタンス初期化成功（@vercel/kv）
[TD-Slots] td_post_slots が存在しません。Supabase SQL Editor で docs/supabase-tweet-metrics-schema.sql を実行してテーブルを作成してください。

Exit code: 1
```

| 項目 | 結果 |
|------|------|
| エラー | テーブル未作成に起因 |
| スクリプトの挙動 | 想定どおり（テーブルチェック → メッセージ表示 → exit(1)） |

### 3-2. curl "http://localhost:3000/api/buzzweave-run?dry_run=true"

```
Invoke-WebRequest : リモートサーバーに接続できません。
```

| 項目 | 結果 |
|------|------|
| エラー | ローカルサーバー未起動（localhost:3000 に接続不可） |
| 対応 | `npm run dev` でローカルサーバーを起動してから再実行する必要あり |

---

## 4. モード比率（Regular / Minimal）の確認

### 4-1. 現在のコード

`services/td/buzzWeaveEngine.js` 47–48 行目:

```javascript
// モード比率 Regular 70% / Minimal 30%
const MODE_WEIGHTS = { minimal: 30, regular: 70 };
```

`weightedRandom(modes, MODE_WEIGHTS)` により、スロット生成時に **Regular 70% / Minimal 30%** で選択される。

### 4-2. ご確認事項

引用リポスト用モード比率は **Regular 70% / Minimal 30%** で統一されており、CVR 優先方針と整合しています。

---

## 5. 3原則（高インプレッション・高エンゲージメント・高CVR）との整合性

### 5-1. 高インプレッション

| 実装 | 整合性 |
|------|--------|
| バズ投稿への寄生 | ✅ `collectBuzzCandidates` で engagement 閾値超えの投稿を抽出 |
| 時間帯の集中 | ✅ 17–24 時 JST に 320 枠（600枠中 53%） |
| 言語比率 | ✅ EN 40% で英語圏への露出を重視 |
| インフルエンサー 70% | ✅ `TARGET_WEIGHTS` で influencer 70% |

### 5-2. 高エンゲージメント

| 実装 | 整合性 |
|------|--------|
| 文脈一致 | ✅ `classifyPostWithGpt4o` で topic/tone/lang を分類し、`pickBestBuzzCandidate` でマッチング |
| 5行テンプレ | ✅ `generateXPost` で感情・敵・防御・URL・#BTC の構造を固定 |
| クジラ/アルゴ | ✅ プロンプトで敵を明示 |
| Minimal/Regular の差 | ✅ mode ごとに異なるテンプレで差別化 |

### 5-3. 高CVR

| 実装 | 整合性 |
|------|--------|
| 防御 CTA | ✅ Minimal / Regular のシールド・フル防御を明示 |
| URL 固定 | ✅ Vidalytics リンクを末尾に配置 |
| 辞書利用 | ✅ 感情辞書で表現の解像度を上げる |
| バズ文脈との整合 | ✅ `buzzContext` で寄生先との自然なつながりを確保 |

**まとめ**: 実装は 3原則（高インプレッション・高エンゲージメント・高CVR）に沿った構成になっており、モード比率（Regular 70% / Minimal 30%）もCVR優先の意図と整合しています。

---

## 6. 次のアクション

1. **Supabase でテーブル作成**  
   `docs/supabase-tweet-metrics-schema.sql` の td_post_slots 部分を SQL Editor で実行。

2. **ローカルサーバー起動**  
   `npm run dev` で起動後、  
   `curl "http://localhost:3000/api/buzzweave-run?dry_run=true"` で動作確認。


# TD BuzzWeave Engine — レビュー用レポート

実施日: 2026-02-11

---

## 1. 概要

Trap Defence OS の引用リポスト最適化エンジン「TD BuzzWeave Engine」を実装した。

**目的（逆算の起点）**:
1. **高インプレッション（最大露出）**
2. **高エンゲージメント（反応を誘発）**
3. **高CVR（Minimal/Regular の成約）**

→ 誰を引用するか・いつ引用するか・どんな文脈に寄生するか・どんなコピーを載せるか、すべてこの3つから逆算。

---

## 2. 変更・追加ファイル一覧

| ファイル | 内容 |
|----------|------|
| `docs/supabase-tweet-metrics-schema.sql` | `td_post_slots` テーブル追加 |
| `utils/supabase.js` | `insertTdPostSlots`, `getTdPostSlotsInNextHour`, `consumeTdPostSlot` 追加 |
| `services/x/client.js` | `getUserTweets(userId, options)` 追加・export |
| `services/ai/gpt5mini.js` | `buzzContext` オプション追加（寄生コピー用） |
| `services/td/buzzWeaveEngine.js` | **新規**：エンジン本体 |
| `api/buzzweave-run.js` | **新規**：1サイクル実行 API |
| `api/buzzweave-slots.js` | **新規**：日次600枠スロット生成 API |
| `scripts/td-generate-daily-slots.js` | **新規**：スロット生成スクリプト |

---

## 3. 全体アーキテクチャ（7層）

| 層 | 役割 |
|----|------|
| 1. Target Layer | td_influencers（300）・td_official_accounts（88） |
| 2. Fetch Layer | `getUserTweets` で直近5〜10投稿取得 |
| 3. Buzz Layer | engagement_score によるバズ抽出・gpt-4o で topic/tone/lang 分類 |
| 4. Slot Layer | 600枠/日の td_post_slots（時間×言語×ターゲット×モード） |
| 5. Mapping Layer | バズ候補 → スロットへの最適マッピング |
| 6. Generation Layer | gpt-4o による寄生コピー生成（辞書＋テンプレ＋文脈） |
| 7. Posting Layer | X API 引用リポスト・Supabase ログ保存 |

---

## 4. バズ抽出ロジック

### 4-1. エンゲージメントスコア

```
score = likes + 2*retweets + 3*quotes + replies
```

### 4-2. バズ閾値

| ターゲット | 閾値 |
|------------|------|
| influencer | > 200 |
| official | > 500 |

### 4-3. 文脈分類（gpt-4o）

- **topic**: crypto / ai / finance / tech / general
- **tone**: urgent / neutral / bullish / bearish / fear
- **lang**: en / ja / es / pt / ko / ar

---

## 5. 600枠/日スロット分布

### 5-1. 時間帯（JST）

| 時間帯 | 枠数 |
|--------|------|
| 08–11 | 120 |
| 12–14 | 80 |
| 17–20 | 140 |
| 21–24 | 180 |
| 00–02 | 40 |
| 02–06 | 10 |
| 06–08 | 30 |

### 5-2. 言語比率

- EN: 40%
- ES: 20%
- PT / JA / KO / AR: 各10%

### 5-3. ターゲット比率

- influencer: 70%
- official: 20%
- flexible: 10%

### 5-4. モード比率

- **Regular 70% / Minimal 30%**

---

## 6. Mapping Layer（Buzz → Slot）

- 言語一致 → スコア 2x
- 言語近似（EN↔ES/PT）→ スコア 1.2x
- topic が crypto/finance/ai → スコア 1.3x
- target_type 一致を必須

---

## 7. 寄生コピー生成

- **テンプレ骨格（5行）**:
  1. 感情（五感・内面）
  2. 敵（クジラ or アルゴ）
  3. 防御（Minimal or Regular）
  4. URL
  5. #BTC + 絵文字1つ

- **付与情報**:
  - バズ投稿の抜粋・topic・tone
  - 辞書フレーズ（参考素材・必須ではない）
  - org_type（公式の場合）
  - 「過去のコピーは参照しない」指示

---

## 8. API・スクリプト

### 8-1. 1サイクル実行

```bash
# 本番
GET /api/buzzweave-run

# dry-run
GET /api/buzzweave-run?dry_run=true
```

### 8-2. 日次スロット生成

```bash
# API
GET /api/buzzweave-slots

# スタンドアロン
node scripts/td-generate-daily-slots.js
```

---

## 9. 動作確認手順

### 9-1. Supabase スキーマ適用

```sql
-- docs/supabase-tweet-metrics-schema.sql の td_post_slots 部分を実行
```

### 9-2. 前提データ

- `td_influencers` にインフルエンサー投入済み
- `td_official_accounts` に公式アカウント投入済み
- `td_emotion_dictionary` に感情辞書投入済み

### 9-3. フロー確認

```bash
# 1. 日次スロット生成
node scripts/td-generate-daily-slots.js

# 2. 1サイクル dry-run
curl "http://localhost:3000/api/buzzweave-run?dry_run=true"

# 3. 本番実行（X API 設定済みの場合）
curl "http://localhost:3000/api/buzzweave-run"
```

---

## 10. 逆算ポイント（目的 → ロジック）

| 目的 | ロジック |
|------|----------|
| **高インプレッション** | バズ投稿に寄生・強い時間帯に集中・言語比率最適化・インフルエンサー70% |
| **高エンゲージメント** | 文脈一致（topic/tone）・5行テンプレの感情刺激・敵（クジラ/アルゴ）描写・Minimal/Regular の明確な差 |
| **高CVR** | 防御CTA（Minimal/Regular）・URL固定・辞書による高解像度感情描写・バズ文脈との整合性 |

---

## 11. Cron 設定例（vercel.json）

```json
{
  "crons": [
    { "path": "/api/buzzweave-slots", "schedule": "0 15 * * *" },
    { "path": "/api/buzzweave-run", "schedule": "*/15 * * * *" }
  ]
}
```

- スロット生成: 日1回 0:00 JST（15:00 UTC）
- 実行: 15分ごと

---

## 12. 依存関係・環境変数

| 変数 | 用途 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase |
| `OPENAI_API_KEY` | gpt-4o（分類・コピー生成） |
| `X_API_*` | X API（ユーザー取得・引用リポスト） |
| `VID_LINK_*` | Vidalytics URL（Minimal/Regular） |

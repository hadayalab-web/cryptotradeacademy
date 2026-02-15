# BuzzDefence Engine v4（CTR 特化版）実装仕様

**North Star:** X の引用リポスト → Vidalytics クリック率最大化（→ Whop → TG サブスク）

**日付:** 2026-02-15

**CSO 強化版:** 動画/mediaConfig・psychology_tag 動的（BOTNET/RAID）・KPI 拡張は [BUZZDEFENCE_ENGINE_V4_SPEC_ENHANCED.md](./BUZZDEFENCE_ENGINE_V4_SPEC_ENHANCED.md) を参照。

---

## 1. ゴールと前提

- **絶対条件:**
  - 本番投稿パイプラインは **JS エンジン一本化**
  - 構造テンプレのソース・オブ・トゥルースは **Python**
  - BotNetAlert / KIBA / 構造データは **必ず JS 側に流す**

---

## 2. 全体アーキテクチャ v4

### Python（構造エンジン）

- `buzzweave_engine.py`
  - `build_structured_post(payload) -> StructuredPost`
    - 入力: `mode`, `lang`, `kiba_snapshot`, `botnet_result`（任意）
    - 出力: `hook`, `bullets`, `structure_note`, `data_sources`, `cta_core`, `hashtags`, `visual_payload`, `psychology_tag`

- `generate_botnet_demo` は **上記 StructuredPost を返す形に統一**

### JS（投稿エンジン）

- `buzzDefenceEngineV4.js`
  - `buildXPost(structuredPost, vidalyticsLink, options) -> { mainPost, selfReplyPosts, pollConfig, mediaConfig }`
  - `postToX(...)`（既存 postQuoteTweet をラップ）

---

## 3. JS 側の CTR ロジック（v4 で必須実装）

### 3-1. cliffhanger（未完の物語）

- **ルール:** `mainPost` の hook は「途中で切る」を必須
- 例: 「この BotNet、表だけ見ると"普通のバズ"に見える。でも構造を覗くと──」

### 3-2. 選択肢型 CTA

- **ルール:** CTA は選択肢にする
- 例: 「避け方を：①知らない ②3分で知りたい」
- `psychology_tag` に応じて: FOMO → 「乗る/降りる」、FUD → 「売る/待つ」

### 3-3. 恐怖 → 安心の導線

- **ルール:** 本文構造は ①危険の提示 → ②構造的説明 → ③解決（Vidalytics に紐づけ）
- 解決は必ず Vidalytics に紐づける

---

## 4. X アルゴ最適化（v4 で必須実装）

### 4-1. 自リプライ

- `mainPost` 投稿後、2 本の self-reply を予約:
  - `+5〜10分`: 補足（構造の一部を開示）
  - `+60〜90分`: 「まだ見てない人へ」リマインド + CTA 再掲

### 4-2. Poll（任意・推奨）

- `options.enablePoll === true` のとき Poll を mainPost に付与

### 4-3. メディア

- `visual_payload` があれば画像 or チャートを添付
- Vidalytics は常にリンク + サムネイルで存在

---

## 5. BotNetAlert の統合（v4 の必須要件）

- Python: `generate_botnet_demo` → `StructuredPost(mode="botnet", ...)`
- JS: `mode === "botnet"` のとき専用 hook/CTA/hashtags
- **BotNetAlert は必ず Vidalytics 付きの本番 X 投稿として流れる**

---

## 6. パイプライン統合ルール

1. **Python は "構造テンプレ生成専用"** — X 投稿は一切しない
2. **JS は "投稿と CTR 最適化専用"** — 構造は必ず `StructuredPost` から受け取る
3. **禁止事項:**
   - JS 側で「フリーテキスト GPT 生成のみ」の投稿
   - Python 側だけで完結する「構造的だが誰にも届かない」引用

---

## 7. KPI 設計（v4 実装と同時にログ必須）

- `x_impressions`, `x_link_clicks`, `x_replies`, `x_bookmarks`
- `vidalytics_watch_rate`（25% / 50% / 100%）
- `whop_checkout_started`, `whop_purchased`

**v4 の定義:** 「X → Vidalytics CTR が 3〜5% を安定して出せる状態」

---

## 8. 実装時の念押しポイント（Copilot レビュー）

1. **cta_core の扱い**
   - JS は必ず `cta_core × psychology_tag × 選択肢テンプレ` で CTA を組み立てる。
   - GPT に CTA を丸投げしない。

2. **runBuzzDefenceV4Cycle の責務**
   - 1サイクル = StructuredPost → buildXPost → postToX → KPI ログ（insertQuotedTweets, insertBuzzweavePostLog, insertXPost）
   - ログまで含めて 1 ユニット。

3. **BotNet モードの hook/CTA/hashtags**
   - 固定テンプレ＋微変形（構造データ差し替え）に留める。
   - GPT に遊ばせず CTR 安定を優先。

---

## 9. 実装済みファイル（2026-02-15）

| ファイル | 役割 |
|----------|------|
| `buzzweave_engine.py` | `build_structured_post(payload) -> StructuredPost` |
| `botnet_detector.py` | `generate_botnet_demo` → StructuredPost 形式（psychology_tag, cta_core 追加） |
| `services/td/buzzDefenceEngineV4.js` | `buildXPost`, `postToX`, `runBuzzDefenceV4Cycle` |
| `scripts/build_structured_post.py` | Python から StructuredPost を JSON 出力（Node 連携用） |

### runBuzzDefenceV4Cycle の KPI ログ

- `insertQuotedTweets` — 30日重複防止
- `insertBuzzweavePostLog` — slot_mode=`v4_botnet`/`v4_trap`, danger_label=psychology_tag
- `insertXPost` — x_posts 履歴（CTR 算出用）

### Python–JS 連携例

```bash
# Python で StructuredPost を生成
python scripts/build_structured_post.py --mode botnet --lang en --post-id xxx --detection '{"post_id":"xxx",...}' > sp.json

# Node で v4 パイプライン実行
node -e "
const sp = require('./sp.json');
const v4 = require('./services/td/buzzDefenceEngineV4.js');
v4.runBuzzDefenceV4Cycle(sp, 'QUOTED_TWEET_ID', { dryRun: false }).then(console.log);
"
```

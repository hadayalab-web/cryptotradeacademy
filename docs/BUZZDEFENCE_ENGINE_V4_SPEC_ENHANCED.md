# BuzzDefence Engine v4 — Enhanced Implementation Spec（Cursor 用最終版）

**CSO レビュー統合:** North Star とマネタイズ直結の強化ポイントのみ反映。技術表記は英語。

---

## 1. North Star

- **目的:**  
  **X の引用リポスト → Vidalytics クリック率最大化（→ Whop → TG サブスク）**
- **補足マネタイズ目標:**  
  Sub LTV > 3x CAC（長期的な設計指標として意識）

---

## 2. アーキテクチャ

### 2.1 Python（構造エンジン）

- ファイル: `buzzweave_engine.py`
- 関数: `build_structured_post(payload) -> StructuredPost`

**型定義（technical）:**

```ts
type VisualPayload =
  | { type: "image"; url: string }
  | { type: "video"; url: string }   // 動画優先（Xアルゴ +2〜2.5x 想定）
  | { type: "gif";   url: string };

type PsychologyTag =
  | "FOMO"
  | "FUD"
  | "HOPE"
  | "ANGER"
  | "BOTNET"
  | "RAID";  // burst_factor / raid_detected に応じて動的選択
```

```ts
type StructuredPost = {
  hook: string;
  bullets: string[];
  structure_note: string;
  data_sources: string[];
  cta_core: string;
  hashtags: string[];
  visual_payload: VisualPayload | null;
  psychology_tag: PsychologyTag;
  mode?: string;
  lang?: string;
  classification?: string;
};
```

- `generate_botnet_demo`:
  - `StructuredPost(mode="botnet", psychology_tag="BOTNET" | "RAID", ...)` を返す。
  - `raid_detected` または `burst_factor` 等に応じて `"RAID"` / `"BOTNET"` を切り替え（実装は Python 側）。

---

### 2.2 JS（投稿エンジン）

- ファイル: `services/td/buzzDefenceEngineV4.js`
- 関数:
  - `buildXPost(structuredPost, vidalyticsLink, options)`
  - `postToX(...)`
  - `runBuzzDefenceV4Cycle(structuredPost, quotedTweetId, options)`

**runBuzzDefenceV4Cycle の責務（JSDoc 明記）:**

1. `StructuredPost` を受け取る  
2. `buildXPost` で `mainPost` / `selfReplyPosts` / `pollConfig` / `mediaConfig` を生成  
3. `postToX` で実投稿  
4. KPI ログを実行  
   - `insertQuotedTweets`（30日重複防止）  
   - `insertBuzzweavePostLog`（slot_mode=`v4_botnet`/`v4_trap`, danger_label=psychology_tag）  
   - `insertXPost`（CTR 算出用＋マネタイズ拡張フィールド）

---

## 3. CTR ロジック（JS）

### 3-1. cliffhanger

- `hook` は必ず途中で切る（「──」「…」など）。

### 3-2. 選択肢型 CTA（cta_core × psychology_tag × choiceMap）

- コメントで明示:  
  **「cta_core × psychology_tag × 選択肢テンプレ で組み立て（GPT に CTA を丸投げしない）」**
- 実装:  
  `choiceMap[psychology_tag]?.[lang] || choiceMap[psychology_tag]?.en || cta_core`
- BOTNET: 固定テンプレ＋「警戒する / 無視する」等（CSO 提案）。RAID: 「逃げる / 乗る」等を追加。

### 3-3. 恐怖 → 安心 → 解決（Vidalytics）

- 本文構造は必ず: ①危険の提示 → ②構造的説明 → ③解決（Vidalytics リンク）。

---

## 4. X アルゴ最適化

### 4-1. 自リプ 2 本

- +5〜10分: 補足（構造の一部開示）
- +60〜90分: リマインド＋CTA 再掲

### 4-2. Poll（任意）

- `options.enablePoll === true` のとき生成

### 4-3. メディア & 動画ブースト

- `visual_payload` があれば `mediaConfig` を構築。
- 優先ロジック（動画優先 → 滞在時間↑ → X アルゴ加点）:

```ts
if (visual_payload?.type === "video") {
  mediaConfig = { type: "video", url: visual_payload.url, maxDurationSec: 60 };
} else if (visual_payload?.type === "gif") {
  mediaConfig = { type: "gif", url: visual_payload.url };
} else if (visual_payload?.type === "image") {
  mediaConfig = { type: "image", url: visual_payload.url };
}
```

### 4-4. 投稿タイミング

- **トリガー:** 釣り師バズ検知（イベント駆動）
- **時間帯:** デフォルトは即時。オプションで `postAtMode: "auto" | "19-21JST_bias"` 程度の補正は許容。時間固定運用は禁止（イベント優先）。

---

## 5. BotNetAlert 統合

- `mode === "botnet"` のとき:
  - hook / CTA / hashtags は **固定テンプレ＋構造差し替えのみ**
  - コメント: **「GPT に遊ばせず CTR 安定を優先」**
- `psychology_tag`: `"BOTNET"` or `"RAID"`（burst_factor / raid_detected に応じて Python 側で決定）

---

## 6. パイプラインルール

1. Python は構造テンプレ生成専用（投稿しない）  
2. JS は投稿＋CTR 最適化専用（構造は必ず StructuredPost から）  
3. JS 側で「フリーテキスト GPT 生成のみ」の投稿は禁止  
4. Python 側だけで完結する「構造的だが誰にも届かない」引用は禁止  

---

## 7. KPI ログ仕様（拡張版）

### 7-1. insertQuotedTweets

- 30日重複防止

### 7-2. insertBuzzweavePostLog

- `slot_mode`: `"v4_botnet"` / `"v4_trap"`
- `danger_label`: `psychology_tag`

### 7-3. insertXPost

- 基本フィールド: `lang`, `mode`, `body`, `video_url`
- **マネタイズ拡張フィールド（将来スキーマ追加時）:**
  - `sub_cvr`: number — TG join → pay のコンバージョン率
  - `ltv_estimate`: number — 初月 ARPU × retention などの推定値
- 将来拡張: `fetchXAnalytics(post_id)` で impressions / link_clicks を後追い更新する cron を追加可能

---

## 8. ファイル構成

| ファイル | 役割 |
|----------|------|
| `buzzweave_engine.py` | `build_structured_post(payload) -> StructuredPost` |
| `botnet_detector.py` | `generate_botnet_demo` → psychology_tag 動的（BOTNET/RAID） |
| `services/td/buzzDefenceEngineV4.js` | `buildXPost`, `postToX`, `runBuzzDefenceV4Cycle`, mediaConfig(video/gif/image) |
| `scripts/build_structured_post.py` | StructuredPost を JSON 出力（Node 連携用） |
| `docs/BUZZDEFENCE_ENGINE_V4_SPEC_ENHANCED.md` | 本ドキュメント |

---

## 9. 実行例

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

---

*この Spec を Cursor に投下し、v4 Enhanced 実装とマネタイズ拡張を適用する。*

---

**v4.1（KIBA + CQ 統合）:** [BUZZDEFENCE_ENGINE_V4_1_SPEC.md](./BUZZDEFENCE_ENGINE_V4_1_SPEC.md) / [BUZZDEFENCE_ENGINE_V4_1_ENHANCED.md](./BUZZDEFENCE_ENGINE_V4_1_ENHANCED.md)

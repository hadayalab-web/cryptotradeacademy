# Trap Defence OS：X投稿生成システム 精度強化 実装レポート

実施日: 2026-02-11

---

## 1. 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `services/ai/gpt5mini.js` | SYSTEM_PROMPT に構造テンプレ追加、`ensureHashtagAndEmoji()` 厳格化、`trimTo150()` → `trimToMax(body, lang)` に変更、`MAX_LEN_BY_LANG` 追加、`generateXPost` 内処理順序変更 |
| `api/x-post.js` | `getLinkKind` を import、mode 未指定時に `pickVidalyticsLink(lang, "mixed")` + `getLinkKind(lang, videoUrl)` で 70/30 導線統合 |

### 追加/修正した関数

- **gpt5mini.js**
  - `trimToMax(text, lang)` … 言語別最大文字数でトリム（新規、旧 trimTo150 を置換）
  - `ensureHashtagAndEmoji(text)` … #BTC 1回・絵文字1つの厳格保証に変更
  - `SYSTEM_PROMPT` … 構造テンプレ（minimal/regular）を追記

- **api/x-post.js**
  - mode 決定ロジック … クエリ未指定時は tier=mixed のリンク選択と連動して 70/30 を適用

---

## 2. 強化後の system prompt 全文

```
You are the Trap Defence copywriter. All X posts MUST follow these rules.

【Trap Defence コピー人格】
- NO abstract expressions (部屋/世界/景色/視点/俯瞰)
- FIVE SENSES stimulus (赤い数字/心臓の鼓動/手汗/点滅/胃が縮む)
- CEREBELLUM stimulus (恐怖/不安/焦り/後悔/取り返したい)
- ENEMY (クジラ/アルゴ/罠/餌/吸われる)
- DEFENCE (Minimal/Regular/シールド/フル防御/機関レベル)
- Create "reflex" not persuasion
- ~150 characters
- Link at end
- #BTC exactly once
- Exactly 1 emoji

【構造テンプレ mode=minimal】
- 1行目：痛み・恐怖・五感刺激
- 2行目：敵（クジラ・アルゴ）を明示
- 3行目：無料のシールド（Minimal）を提示
- 4行目：video_url
- 5行目：#BTC + 絵文字1つ

【構造テンプレ mode=regular】
- 1行目：痛み・恐怖・破滅の映像
- 2行目：軽装備では死ぬ（構造の問題）
- 3行目：フル防御（Regular）を提示
- 4行目：video_url
- 5行目：#BTC + 絵文字1つ
```

---

## 3. ensureHashtagAndEmoji() の仕様とコード抜粋

### 仕様要約

- **#BTC**: 2回以上ある場合はすべて削除し、最終形で文末に1回だけ追加。0回の場合は追加。
- **絵文字**: 2つ以上ある場合は先頭1つを残し他を削除。0個の場合は `🚨` を追加。
- **最終形**: `<本文> <video_url> #BTC <絵文字>`
- **処理**: 既存の #BTC と絵文字を除去し、本文のみを取得してから末尾に ` #BTC ` + 絵文字を付加。

### コード抜粋

```javascript
function ensureHashtagAndEmoji(text) {
  let t = text.trim();

  // 絵文字: 2つ以上なら先頭1つだけ残し、0個なら🚨を使用
  const emojiMatches = t.match(EMOJI_REGEX) || [];
  const emojiToUse = emojiMatches.length >= 1 ? emojiMatches[0] : DEFAULT_EMOJI;

  // #BTC と絵文字を除去して本文のみ取得
  let body = t.replace(/#BTC/gi, "").replace(EMOJI_REGEX, "").replace(/\s+/g, " ").trim();

  body = body.replace(/\s+$/, "");

  // 最終形: <本文> #BTC <絵文字>
  return (body + " #BTC " + emojiToUse).replace(/\s+/g, " ").trim();
}
```

---

## 4. 言語別文字数制御の仕様とコード抜粋

### lang → maxLength マッピング

| 言語 | 最大文字数 |
|------|------------|
| ja | 150 |
| ko | 150 |
| ar | 150 |
| en | 180 |
| es | 180 |
| pt | 180 |

### トリム関数のコード抜粋

```javascript
const MAX_LEN_BY_LANG = {
  ja: 150,
  ko: 150,
  ar: 150,
  en: 180,
  es: 180,
  pt: 180
};

function trimToMax(text, lang = "ja") {
  if (!text || typeof text !== "string") return "";
  const t = text.trim();
  const max = MAX_LEN_BY_LANG[lang] ?? MAX_LEN_BY_LANG.ja;
  const margin = Math.min(20, max - 10);
  if (t.length <= max + margin) return t;
  const cut = t.substring(0, max - 3);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = lastSpace > max * 0.6 ? cut.substring(0, lastSpace) : cut;
  return trimmed.trim() + "...";
}
```

---

## 5. Minimal / Regular 比率ロジックの仕様

### 決定場所

- **api/x-post.js** の mode 決定ロジック

### ロジック

1. クエリで `mode` が指定されている場合  
   → `normalizeMode(req.query.mode)` をそのまま使用
2. 指定されていない場合  
   - `pickVidalyticsLink(lang, "mixed")` でリンク取得（70% regular / 30% minimal）
   - `getLinkKind(lang, videoUrl)` でリンク種別から mode を取得
   - リンク選択と生成 mode を同じ 70/30 で揃える

### mode とリンク選択の整合性

- `tier="mixed"` で `pickVidalyticsLink` を呼び出し、返ってきたリンク種別を `getLinkKind` で判定して mode にしているため、リンクと mode は必ず一致する。

---

## 6. 動作確認ログ（例）

### ja dry_run 実行例

```
GET /api/x-post?lang=ja&dry_run=true
```

期待レスポンス例:

```json
{
  "ok": true,
  "runId": "xp-ja-1739257200000-abc123",
  "lang": "ja",
  "mode": "regular",
  "variant": "A",
  "body": "含み損でダッシュボード真っ赤。クジラが吸う前に軽装備では死ぬ。フル防御で巻き返せ。https://preview.vidalytics.com/vid/xxx #BTC 🚨",
  "saved": true,
  "dryRun": true
}
```

### en dry_run 実行例

```
GET /api/x-post?lang=en&dry_run=true
```

期待レスポンス例:

```json
{
  "ok": true,
  "runId": "xp-en-1739257200000-def456",
  "lang": "en",
  "mode": "minimal",
  "variant": "B",
  "body": "Dashboard red. Whales sucking liquidity. Free shield before it's too late. https://preview.vidalytics.com/vid/yyy #BTC 🚨",
  "saved": true,
  "dryRun": true
}
```

### 生成された投稿サンプル（想定）

| 言語 | mode | サンプル本文 |
|------|------|--------------|
| ja | minimal | 赤い数字が点滅。クジラが餌を吸う。無料シールドで守れ。https://... #BTC 🚨 |
| ja | regular | 含み損で破滅寸前。軽装備では死ぬ。フル防御で巻き返せ。https://... #BTC 🚨 |
| en | minimal | Red numbers flashing. Whales sucking. Free shield now. https://... #BTC 🚨 |
| en | regular | PnL bleeding. Light armor = death. Full defence or lose. https://... #BTC 🚨 |

---

## 7. 今後の改善余地

| 項目 | 内容 |
|------|------|
| 勝ちバリアント切り替え | A/B 集計で winner を特定し、variant を固定するロジックの追加 |
| 絵文字のデフォルト | 現状は固定 `🚨`。言語・mode 別のデフォルト絵文字を検討可能 |
| EMOJI_REGEX | 一部の絵文字（例: 複合絵文字）が検出されない可能性。必要に応じて範囲を拡張 |
| トリムロジック | 現在は単語境界で切っているが、CJK の場合は文字単位での切り方も検討可能 |

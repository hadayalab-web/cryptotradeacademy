# 洗い出し：すべて仕手Bot投稿リプライ前提でのややこしい箇所

**前提**: 一般投稿はなく、リプライ先はすべて仕手Bot投稿。  
「Bot用 vs 通常」という二項対立ではなく、「仕手Botのニュアンス別（煽り強 / 教育系 / その他）」でテンプレ・希少性を切り替えているだけ、と整理する。

**設計の根拠**: テンプレ設計は Gemini の行動経済学分析に基づいて統一。→ `docs/PQT_DESIGN_BASED_ON_GEMINI_ANALYSIS.md`

---

## 1. 命名・コメントで「一般／非Bot」を連想させる箇所

| ファイル | 箇所 | 現状 | 問題 |
|----------|------|------|------|
| **buzzWeaveEngine.js** | 1474行目 | `// 効果的投下: 煽り系(whale_trap)は Bot テンプレ（同意＋短い本文）、それ以外は通常テンプレ。` | 「それ以外」が「一般投稿」と読める。実際は「煽り強以外の**仕手Bot投稿**」向けの長めテンプレ。 |
| **pqtCtaEngine.js** | 39行目 | `context.useBotTemplates === true のときは仕手Bot攻略用テンプレ` | 反対側（false）が「非仕手Bot用」と誤解されうる。実際は「仕手Botの煽り強＝短い同意テンプレ、それ以外の仕手Bot＝8バリアント本文」。 |
| **pqtTemplates.js** | 197行付近 | `const PQT_TEMPLATES = {` のみ。コメントなし。 | 「通常テンプレ」が何用か明示されていない。仕手Bot投稿用（煽り強以外ニュアンス）と書くとよい。 |
| **pqtSampleTemplates.js** | 3–4, 19行目 | `通常テンプレ` / `PQT テンプレサンプル（6言語×8パターン）` | 「通常」が一般投稿用と取られうる。実行例コメントも「仕手Bot（煽り強以外）向け」と明記するとよい。 |

---

## 2. dangerLabel「neutral」のニュアンス

| ファイル | 箇所 | 現状 | 問題 |
|----------|------|------|------|
| **buzzWeaveEngine.js** | 364–368行目 | `classifyDanger`: キーワードに当てはまらなければ `return "neutral"` | 「neutral」が「 Bot ではない一般投稿」と読める。実際は「仕手Bot投稿のうち、煽りでも教育系でもないニュアンス」。 |
| **buzzWeaveEngine.js** | 395–398行目 | `resolveUsedMode`: `neutral` → `"neutral_insight"` | 同上。ログ・分析で「neutral_insight」が一般投稿と混同されうる。 |
| **buzzWeaveEngine.js** | 429–431, 446, 455行目 | `DANGER_INSIGHTS_BY_LANG.neutral`: "News/info without clear risk context", "明確な罠構造なし" | 内容は仕手Botの「ニュース寄り・煽り弱」の説明として妥当。ラベル名「neutral」だけが「一般」を連想させる。 |
| **pqtTemplates.js** | 151–153行目 | `DANGER_LABEL_TO_SCARCITY`: `neutral: "elitism"` コメント「その他・群がり」 | こちらは「その他」で仕手Bot内の分類として明確。dangerLabel の意味づけをコード全体で揃えるとよい。 |

**提案**: `neutral` は「仕手Bot投稿のニュアンスの一種（煽り強・教育系以外）」とコメントで明示する。必要なら `shiteshi_other` などにリネームする選択肢あり（破壊的変更）。

---

## 3. 「useBotTemplates」という名前

| ファイル | 箇所 | 現状 | 問題 |
|----------|------|------|------|
| **buzzWeaveEngine.js** | 1476–1481, 1482, 1533, 1550行目 | `useBotTemplates`。`slot?.dangerLabel === "whale_trap"` のとき true。 | 「Bot用テンプレを使う」と読め、反対が「非Bot用」に見える。実際は「仕手Botの**煽り強**用の短い同意テンプレを使う」だけ。 |
| **pqtCtaEngine.js** | 41–42, 48, 53行目 | `useBot` / `useBotTemplates` で分岐。`statsKey = useBot ? lang + "_bot" : undefined` | 同上。 |

**提案**: コメントで「すべて仕手Bot投稿。whale_trap＝煽り強は短い同意テンプレ、それ以外は8バリアント」と明記。変数名は `useShortAgreementTemplate` や `isWhaleTrapSlot` にすると「Bot vs 一般」の対立が消える（変更範囲はやや広い）。

---

## 4. ドキュメント・文言

| ファイル | 箇所 | 現状 | 問題 |
|----------|------|------|------|
| **docs/PQT_SCARCITY_3PATTERNS_GEMINI.md** | 28行目 | 「一般アクセスは48時間のみ許可」 | ここは「一般公開」の意味で正しい。仕手Botの有無とは無関係。 |
| **buzzWeaveEngine.js** | 4行目 | `ターゲットへのリプライのみ` | ターゲット＝仕手Bot投稿であることをコメントで一言書くとよい。 |
| **buzzWeaveEngine.js** | 1442行目 | `ターゲット投稿にリプライするだけ` | 同上。 |

---

## 5. まとめ：直すとよい優先度

1. **コメントの明示（軽い）**  
   - buzzWeaveEngine.js 1474行: 「それ以外は通常テンプレ」→「それ以外の**仕手Bot投稿**向けは長めテンプレ（8バリアント）」など。  
   - pqtCtaEngine.js 39行: 「true＝仕手Bot攻略用」に加え「false＝同じく仕手Bot向け・煽り強以外は8バリアント」と追記。  
   - PQT_TEMPLATES 直上: 「仕手Bot投稿向け（煽り強＝whale_trap 以外のニュアンス）。6言語×8バリアント。」

2. **neutral の意味づけ**  
   - classifyDanger / resolveUsedMode / DANGER_INSIGHTS 付近に「neutral＝仕手Bot投稿のうち煽り・教育系以外のニュアンス」とコメント。

3. **変数・キー名の変更（任意）**  
   - `useBotTemplates` → `useShortAgreementTemplate` または `isWhaleTrapSlot` にすると「Bot vs 一般」の誤解が減る（呼び出し元・recordPqtUse 等の合わせ変更が必要）。

4. **pqtSampleTemplates.js**  
   - 実行例の「通常テンプレ」を「仕手Bot向け（煽り強以外）テンプレ」などに変更。

以上を反映すると、「そもそも一般投稿はなく、すべて仕手Bot投稿へのリプライ」という前提がコードとドキュメントで一貫する。

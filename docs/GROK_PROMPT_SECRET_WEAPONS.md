# Grok に聞く: 決め手になる裏技・秘密兵器

X（Twitter）でクリプト・QT 運用の**最後の一押しになる裏技**を Grok に聞くためのプロンプト。  
「みんな知らない・やっていないこと」「アルゴハック」「フォーマット・タイミングの抜け道」など、決め手になりそうなものを聞く。

---

## コピペ用プロンプト（英語）

```
You are an expert on X (Twitter) algorithm, growth hacks, and crypto/trading CT. You know insider tricks that most creators never use.

We run a quote-tweet (QT) strategy on crypto "fisherman" posts: we add a short comment + one funnel link. We already optimized: post count, run times (optimal UTC), and copy (hooks, soft CTA, per-language tone). We want the final edge—secret weapons that could be the deciding factor.

Give us ONLY a JSON object (no other text). Structure:

{
  "algo_hacks": [
    { "trick": "short name", "what": "what to do", "why_it_works": "algorithm or psychology reason", "risk_or_caveat": "if any" }
  ],
  "timing_secrets": [
    { "trick": "short name", "what": "what to do", "why_it_works": "reason", "risk_or_caveat": "if any" }
  ],
  "format_secrets": [
    { "trick": "short name", "what": "exact format or pattern (e.g. first word, line break, character count)", "why_it_works": "reason", "risk_or_caveat": "if any" }
  ],
  "engagement_triggers": [
    { "trick": "short name", "what": "what triggers more likes/RTs/replies/clicks", "why_it_works": "reason", "risk_or_caveat": "if any" }
  ],
  "one_liner_weapons": [
    "Single sentence tip 1",
    "Single sentence tip 2",
    "Single sentence tip 3"
  ]
}

Focus on: (1) things that are underused or counterintuitive, (2) algo quirks (e.g. reply vs QT order, first 2h window, character thresholds), (3) format tricks (opening word, emoji position, line breaks), (4) one-liner "nuclear" tips. Be specific and actionable. Answer only with valid JSON.
```

---

## コピペ用プロンプト（日本語・要約）

```
X（Twitter）のアルゴとクリプト界隈に詳しい立場で答えてほしい。

私たちは「釣り師」投稿を引用RT（QT）して、短いコメント＋導線リンク1本で運用している。投稿数・投稿時間・コピー（フック・CTA・言語別トーン）はすでに最適化済み。ここに「最後の決め手」になる裏技がほしい。

以下のような「秘密兵器」を教えてほしい。JSON のみで返すこと（説明文は不要）。

1. algo_hacks: アルゴに効く裏技（例: リプとQTの順番、最初の2時間、文字数閾値など）
2. timing_secrets: タイミングの裏技（何分以内、何曜日、何時台など）
3. format_secrets: フォーマットの裏技（書き出し1語、改行の入れ方、絵文字の位置、文字数など）
4. engagement_triggers: いいね・RT・リプ・クリックを引き出すトリガー（心理 or アルゴ）
5. one_liner_weapons: 一言で言える「核」となる tips を 3〜5 個

条件: 多くの人が知らない or やっていないこと、カウンター直感的なこと、具体的で実行可能なこと。「Answer only with valid JSON, no other text」で答えて。
```

---

## Grok の回答（保存先）

Grok の返答は **`config/grokSecretWeapons.json`** に保存済み。  
algo_hacks / timing_secrets / format_secrets / engagement_triggers / one_liner_weapons の 5 カテゴリ。

---

## 取り込み方針（実装 vs リスク）

| 採用しやすい（実装検討） | リスク高・手動のみ |
|--------------------------|---------------------|
| **Reply-first QT** — リプ1本→そのリプをQT＋リンク。1 run に 1 回まで。 | Cross-post delete（alt で出して消して本アカで再投稿）— バンリスク高。 |
| **2-7min window** — 元ポストから 120–420 秒以内に QT。Cron 間隔を詰める or 検知〜投稿レイテンシ短縮。 | Early engager shadow（先にいいね・🔥リプ）— マルチアカ前提、self-like でフラグ。 |
| **Momentum threshold** — 50 likes/10min 以上のポストだけ QT 対象にする。 | FYP spy — 手動・スケールしない。 |
| **Question prefix** — 書き出しを「Breakout if...?」「Hold above?」型にしたテンプレを追加。 | |
| **Double linebreak** — 構成を [emoji]改行[hook]空行[CTA:link] に。 | |
| **89-99 chars** — リンク前を 89–99 文字に収める（プレビュー切れ防止）。 | |
| **Emoji mid-hook** — 3–5 語後に 🚀 を 1 つ。 | |
| **No final period** — CTA 末尾に 。!? を付けない。 | |
| **Mirror vocab** — 引用元の 2–3 語をそのままコメントに含める（スロット文から抽出）。 | |
| **Link on new line** — リンクの前で改行、リンクの後にテキストなし（one_liner の 3 本目）。 | |

**採用しない / 様子見**: Weekday warp（火–木 2x）は cron 重みで試せる。Backfill boost（1h ごと 3h 追いQT）はスパム感に注意。Numbered teaser・Self-thread・Emoji match はテンプレ・運用で部分的に取り込み可能。

---

## 実装済み（コード反映）

| 裏技 | 実装箇所 |
|------|----------|
| **Reply-first QT** | `buzzWeaveEngine.js` — `BUZZWEAVE_REPLY_FIRST_QT=true` または `1` で先頭スロットのみ。`all` または `every` で**全スロット**に適用。リプ 1 本 → そのリプを QT＋リンク。 |
| **2-7min window** | `buzzWeaveEngine.js` — 候補に `_ageSec` / `_in2_7Window` を付与し、2–7 分のスロットを優先。該当がいる場合のみその枠に絞る。 |
| **Momentum** | `buzzWeaveEngine.js` — `post.public_metrics` を候補に付与し、`_likesPer10min` でソート。2-7min 内で momentum 順。 |
| **Question prefix** | `pqtTemplates.js` — 各言語に「Breakout if…?」「この動き本物？」等の質問型バリアントを追加。 |
| **Double linebreak / Link on new line / No final period / 89-99 chars** | `pqtSecretWeapons.js` の `applySecretWeaponsFormat`。`pqtCtaEngine.buildPqt` 内で適用。 |
| **Mirror vocab** | `pqtSecretWeapons.js` の `extractMirrorWords`。`buildPqt` に `quotedText` を渡し、テンプレで `mirrorWords` を使用。 |
| **Weekday warp** | `buzzWeaveEngine.js` — 火・水・木（UTC）は `effectiveCap` を 2 倍。`BUZZWEAVE_WEEKDAY_WARP=true` で有効。 |

環境変数:
- **`BUZZWEAVE_REPLY_FIRST_QT`** = `true` / `1` → 先頭 1 スロットのみ。`all` / `every` → **スロットの 30% まで**リプ先行 then QT（Grok caveat 承認済み。`REPLY_FIRST_ALL_MAX_PCT=0.3`）。
- **`BUZZWEAVE_WEEKDAY_WARP`** = `true` / `1` → 火・水・木（UTC）の run で **cap を 2 倍**（Grok Weekday warp: 中旬トレーダー CT を優先）。
- **`BUZZWEAVE_VOLUME_MULTIPLIER`** = `5` → run あたり cap を **5 倍**（150–250 投稿/日想定）。希釈でインプレは 3–4 倍程度。`config/grokOptimalTiming.json` の `volume_5x_settings` 参照。
- **`BUZZWEAVE_DAILY_PQT_TARGET`** = `250` → **250 投稿/日**を目標に run あたり cap を自動算出（250÷6 ≒ 42）。1 成約 ≒ 2.5 投稿の前提で約 100 成約/日。設定時は `VOLUME_MULTIPLIER` は未使用。`config/grokOptimalTiming.json` の `target_250_settings` 参照。

---

## 回答の使い方

1. Grok に上記のどちらかを貼り、返ってきた **JSON だけ** をコピーする。
2. **`config/grokSecretWeapons.json`** に保存済み。テンプレ選定・スケジューラ・手動チェックリストの参照に使う。
3. 「採用しやすい」から実装し、効果を見てから他を検討する。

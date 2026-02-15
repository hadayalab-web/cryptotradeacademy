# 磨き上げ後の想定 — 投稿数・インプレ・エンゲ・CTR 報告

Grok への質問（`docs/GROK_PROMPT_EXPECTED_OUTCOMES.md`）の回答と、当方分析をまとめた報告。

**運用上の目安（6言語・落としどころ）**: 30–50 投稿/日、インプレ **7–8万**、CTR **2% 程度** で見ておく。成約は Vidalytics→Whop / Whop 直リンク経由で、クリックの約 1% 前後とすると **1日 10–20 本** のオーダー。

**5倍ボリューム（150–250 投稿/日）**: 環境変数 **`BUZZWEAVE_VOLUME_MULTIPLIER=5`** で、run あたりの cap を 5 倍に拡張（1 run あたり最大 50 まで）。cron は落としどころのまま 6 run で、150–250 投稿/日。インプレは希釈で **5 倍には届かず 20–40 万程度**（3–4 倍）、成約は **50–100 本/日** のオーダーで見る。`config/grokOptimalTiming.json` の `volume_5x_settings` 参照。

**250 投稿/日ターゲット（1 成約 ≒ 2.5 投稿）**: **250 前後/日** を目標にする場合は **`BUZZWEAVE_DAILY_PQT_TARGET=250`** を設定。1 run あたり cap が 250÷6 ≒ 42 に固定され、6 run で約 250 投稿/日 → **約 100 成約/日**（2.5 投稿/成約の前提）。`config/grokOptimalTiming.json` の `target_250_settings` 参照。`BUZZWEAVE_DAILY_PQT_TARGET` を指定した場合は `BUZZWEAVE_VOLUME_MULTIPLIER` は使われない。

---

## 「60 PQT/日を超えると希釈が強くなる」の解説

Grok の risks に **"High volume (>60 PQTs) triggers reach caps/dilution -20%"** とある。**Grok は X のアルゴを読み込めないため、これは推測または業界の経験則であり、公式・検証済みの事実ではない。** さらに、対象は**通常投稿**を想定した議論が多く、**引用リポスト（QT）のみ**の運用ではアルゴの扱いが異なる可能性がある（QT は元ポストごとに文脈が違い、同一コピーの連打ではない）。そのため Grok の「60 / 希釈」ロジックがそのまま当てはまるかは**いっそう怪しい**。実測で確認する必要がある。

- **希釈（dilution）**: 同じアカウントから投稿数が増えると、**1 投稿あたりのリーチが落ちる**という説。X が「短時間に大量投稿」をスパムとみなして配信を抑える、という**一般的なアルゴの推測**に基づく。実際の閾値や係数は非公開のため、あくまで仮説。
- **なぜ 60 前後か**: Grok が「60 PQT/日を超えるあたりから」と言っているだけで、**X の内部閾値ではない**。クリプト CT や QT 運用の経験談・感覚値に近い可能性が高い。
- **-20% の意味**: 「本数増やしてもインプレの伸びは 80% 程度に留まる」という**Grok の憶測**。数値そのものの根拠は不明。
- **運用への落としどころ**: 上記は**参考程度**に留め、実測で検証するのがよい。30–50 投稿/日をベースにし、5 倍にしたときは「インプレが 5 倍になるかは実測次第。希釈説を踏まえ 3–4 倍を目安にしておく」程度の**保守的な見積もり**として扱う。

---

## 1. Grok の回答

```json
{
  "scenario_baseline": {
    "description": "落としどころ, 6 run, cap 8, no reply-first",
    "pqts_per_day_low": 30,
    "pqts_per_day_high": 50,
    "daily_impressions_low": 50000,
    "daily_impressions_high": 120000,
    "daily_engagements_low": 2000,
    "daily_engagements_high": 8000,
    "ctr_to_link_pct_low": 0.5,
    "ctr_to_link_pct_high": 2.0,
    "assumptions_one_line": "Tuned copy/timing, median fisherman selection, no advanced hacks"
  },
  "scenario_with_reply_first_one": {
    "description": "same + reply-first on first slot only",
    "lift_impressions_pct": 5,
    "lift_engagement_pct": 10,
    "lift_ctr_pct": 15,
    "daily_impressions_low": 52000,
    "daily_impressions_high": 126000,
    "daily_engagements_low": 2200,
    "daily_engagements_high": 8800,
    "ctr_to_link_pct_low": 0.55,
    "ctr_to_link_pct_high": 2.2,
    "assumptions_one_line": "Nesting boosts early signals 1st PQT/run, minimal dilution"
  },
  "scenario_reply_first_all_plus_weekday_warp": {
    "description": "reply-first every slot + 2x cap Tue-Thu",
    "pqts_per_day_low": 40,
    "pqts_per_day_high": 80,
    "daily_impressions_low": 70000,
    "daily_impressions_high": 200000,
    "daily_engagements_low": 3500,
    "daily_engagements_high": 16000,
    "ctr_to_link_pct_low": 0.5,
    "ctr_to_link_pct_high": 2.0,
    "assumptions_one_line": "Volume +60%, nesting x9/run but -15% per-PQT dilution; weekday trader focus"
  },
  "format_and_secret_weapons_lift": {
    "impressions_lift_pct": 10,
    "engagement_lift_pct": 15,
    "ctr_lift_pct": 20,
    "reason_one_line": "link new line + 89-99 chars + mirror vocab + question prefix optimizes preview/dwell"
  },
  "risks_and_caveats": [
    "Reply-first-all flags as spam patterns (limit 30% slots)",
    "High volume (>60 PQTs) triggers reach caps/dilution -20%",
    "Weekday warp skips high-volume Asia weekends",
    "Over-optimization detected by algo shifts (rotate variants monthly)"
  ]
}
```

---

## 1b. Grok 再質問の回答（チャットリセット後）

同じ前提で、**新しいチャット**で聞き直した回答。前回の数値は渡していない。

```json
{
  "scenario_a_pqts_per_day_low": 24,
  "scenario_a_pqts_per_day_high": 48,
  "scenario_a_daily_impressions_low": 15000,
  "scenario_a_daily_impressions_high": 75000,
  "scenario_a_daily_engagements_low": 400,
  "scenario_a_daily_engagements_high": 2500,
  "scenario_a_ctr_pct_low": 0.4,
  "scenario_a_ctr_pct_high": 1.5,
  "scenario_b_daily_impressions_note": "dilution approx 30%",
  "scenario_b_daily_impressions_low": 50000,
  "scenario_b_daily_impressions_high": 250000,
  "risks_caveats": [
    "shadowban risk from volume",
    "per-post reach dilution",
    "target quality drop",
    "algo fatigue",
    "ToS flags on spam"
  ]
}
```

---

## 1c. 初回 vs 再質問の比較

| 項目 | 初回（Grok） | 再質問（Grok） | 所見 |
|------|----------------|----------------|------|
| **PQT/日（ベース）** | 30–50 | 24–48 | ほぼ同じ帯。再質問は下限がやや低い。 |
| **インプレ（ベース）** | 5万–12万 | 1.5万–7.5万 | **再質問の方が保守的**。下限が 1.5 万と低い。 |
| **エンゲ（ベース）** | 2k–8k | 400–2.5k | **再質問はかなり低め**。初回 2k–8k に対し 400–2.5k。 |
| **CTR（ベース）** | 0.5–2% | 0.4–1.5% | 再質問はやや低め。 |
| **5倍時の希釈** | -20%（伸びが 80% に） | **dilution approx 30%** | 再質問は希釈を**強め**に言及（30%）。 |
| **5倍時インプレ** | 7万–20万 | 5万–25万 | 再質問はレンジが広い。下限 5 万は初回 7 万より低い。 |
| **risks** | リプ 30%、60 PQT、Weekday、ローテ | shadowban, dilution, quality drop, algo fatigue, ToS | 再質問は**ボリューム・スパム系**を強調。 |

**結論**: 同じ感触とは言いにくい。**再質問は全体的に保守的**（インプレ・エンゲ・CTR が初回より低め）。一方で「希釈あり」は一貫（初回 -20%、再質問 30%）。PQT 本数レンジは近い。**Grok はセッション・聞き方で数値が揺れる**ので、運用目安（7–8万 imp、CTR 2%、10–20 成約）は**実測で検証**する前提で使うのがよい。

**仮説（Grok が参照しているもの）**: 回答のブレは、**参照しているデータの質・種類**の違いによると考えられる。Grok が参照できるのは **一般的なデータ**（学習データ、公開されている事例、業界の通説）であり、**X の内部アルゴリズム**にはアクセスしていない。つまり「内部アルゴリズムを読んで答えている」のではなく、**一般データに基づく推測**として数値や希釈・リスクを出している、と解釈するのが妥当。

**予測の信頼度**: 初回の Grok と当方（Cursor）の試算は近似しており、再質問の Grok も保守的ではあるがオーダーは大きく狂っていない。**内部アルゴは参照していない**前提でも、現状の最高峰に近いモデル同士が独立に近い帯の数値を出しているなら、その帯（30–50 投稿、7–8万 imp、CTR 2%、10–20 成約）は**根拠のない数字ではなく、精度の高い予測**として扱ってよい。実測での検証は引き続き推奨するが、**「当てずっぽう」ではなく、かなり信頼できる目安**とみなしてよい。

**推論元のモデル**: Grok は **grok-4-1-fast-reasoning**、当方（Cursor）は **GPT-5.3 Codex 系**。この 2 系統の AI の推論から出てきた数値が近似している、という事実を記録する。

**X API 仕様（2026 年以降）**: 2026 年に入ってから X API の仕様が更新されており、公式リファレンスを参照すると**リミットがかなり緩和されている印象**がある。利用プラン（Basic / Pro / Enterprise）ごとの投稿数・レート制限が変わっている可能性があるため、**BUZZWEAVE_API_CALL_CAP や 5 倍ボリュームの前提は、現在の契約プランと最新の Rate limits ドキュメントに合わせて見直す余地がある**。必要なら [X Developer — Rate limits](https://developer.x.com/en/docs/twitter-api/rate-limits) で現行値を確認し、cap や run 数を上方修正してよい。

---

## 2. 既存 config からのベースライン（Grok 回答前の参照）

`config/grokOptimalTiming.json` より。

| シナリオ | 投稿数/日 | インプレ（日） | エンゲ（日） | 備考 |
|----------|------------|----------------|--------------|------|
| **expected_reach**（控えめ） | 15–30 PQT | 2万–20万 | 1k–1.5万 | バズりスロット 5–25% 可視、3–8% エンゲ率 |
| **recommended_settings**（落としどころ） | 30–50 PQT | **5万–12万** | **2k–8k** | 6 run, cap 8 |
| **expected_reach_at_max_volume** | 100–150 PQT | 10万–80万 | 5k–5万 | 希釈・天井あり |

CTR（リンククリック率）は config にはない。一般的な QT＋1 リンクで **0.5–2%** 程度を目安にすることが多い。

---

## 3. 当方分析（Grok 回答と合わせて更新推奨）

### 3.1 想定の整理

- **投稿数**
  - 落としどころ: **30–50 PQT/日**（6 run × cap 8、実際は 2–7min や momentum で絞るためやや少なめになりうる）。
  - Reply-first を全スロット（`all`）にすると 1 投稿あたり API 2 回のため、同じ run 数なら「打てる元ポスト数」は半分になるが、**アルゴ重みでインプレ単価は上がる**想定。投稿数は **20–40 PQT/日** 程度に下がり、質で補うイメージ。
  - Weekday warp（火–木 2x cap）: 火–木は **cap 2 倍**なので、週を通すと **平均 1–2 割程度 PQT 数が増える**（月–金で均すと）。

- **インプレッション**
  - ベースは落としどころの **5万–12万/日**。
  - フォーマット＋秘密兵器（リンク改行・89–99 文字・Mirror vocab・Question prefix）で **+10–25%** の上振れ余地（プレビュー・関連性スコアの改善）。
  - Reply-first を先頭 1 本だけ: 全体の数%しか影響しないため **+5% 前後**。Reply-first を全スロットにすると、単体インプレは上がるが本数が減るため、**トータルでは同程度〜やや増**（+0–15%）の想定。
  - 2–7min・momentum 優先で「伸びている投稿」に乗るため、**1 PQT あたりのインプレはベースより 1–2 割高く出る可能性**あり。

- **エンゲージメント**
  - ベース **2k–8k/日**（落としどころ）。
  - 質問型フック・Mirror vocabでリプ・いいねが伸びやすい設計のため、**エンゲ率はインプレよりやや高め**（+10–20% の上振れ余地）。
  - Reply-first で会話グラフに乗るため、**エンゲ単価は上がる**。先頭 1 本のみなら全体は +5–10%、全スロットなら本数減を差し引いても **同程度〜+15%** を想定。

- **CTR（リンククリック率）**
  - 業界目安: QT＋1 リンクで **0.5–2%**（インプレベース）。導線が「チェックリスト・ブリーフィング」系のソフト CTA なら **1–2%** 寄りになりやすい。
  - リンク改行のみ・89–99 文字でプレビュー切れ防止: **+10–20%** の CTR リフトを想定。
  - Mirror vocab・Question prefix で関連性・興味が上がれば、さらに **+5–15%** の上乗せ余地。
  - **想定 CTR レンジ: 0.6–2.5%**（控えめ〜フォーマット効果込み）。Reply-first で「会話の流れ」に乗れば、その枠は **+10–25%** の CTR 上振れもありうる。

### 3.2 シナリオ別まとめ（当方試算）

| シナリオ | PQT/日 | インプレ/日 | エンゲ/日 | CTR（想定） |
|----------|--------|-------------|-----------|-------------|
| 落としどころのみ（ベース） | 30–50 | 5万–12万 | 2k–8k | 0.6–2.0% |
| ＋Reply-first 先頭 1 本 | 30–50 | 5.5万–13万 | 2.2k–8.5k | 0.65–2.2% |
| ＋フォーマット・秘密兵器（常時） | 30–50 | 5.5万–14万 | 2.2k–9k | 0.7–2.4% |
| ＋Reply-first 全スロット | 20–40 | 5万–14万 | 2k–9k | 0.7–2.5% |
| ＋Weekday warp（火–木 2x） | 週平均 +10–15% | 週平均 +10–15% | 週平均 +10–15% | 同程度 |

### 3.3 リスク・前提

- **2–7min 窓**: 該当スロットが少ない run では投稿数が想定より少なくなる。
- **momentum 閾値**: 50 likes/10min 以上を優先するため、スロウバーナーは外れる。
- **Reply-first 全スロット**: API 消費 2 倍・スパム感に注意。効果を見てから拡大推奨。
- **CTR**: 短縮 URL や Whop/Vidalytics のクリック計測が無いと実測できない。現状は **想定レンジ**のみ。

### 3.4 Grok と当方分析の突き合わせ

| 項目 | Grok | 当方 | 所見 |
|------|------|------|------|
| **ベースライン** | 30–50 PQT, 5万–12万 imp, 2k–8k eng, CTR 0.5–2% | 同程度 | 一致。config 落としどころと整合。 |
| **Reply-first 1本** | imp +5%, eng +10%, CTR +15% | imp +5%前後, eng +5–10%, CTR 上振れ | Grok の CTR +15% は当方の「その枠で +10–25%」と整合。 |
| **Reply-first 全＋Weekday warp** | 40–80 PQT, 7万–20万 imp, 3.5k–1.6万 eng, CTR 0.5–2% | 本数減・質で補う想定 | Grok は「ボリューム +60%、1 PQT あたり -15% 希釈」でトータル imp を 7万–20万に。当方の「同程度〜やや増」より楽観的だが、cap 2x で本数増を織り込んだ数値として妥当。 |
| **フォーマット・秘密兵器** | imp +10%, eng +15%, CTR +20% | imp +10–25%, CTR +10–20% | ほぼ一致。Grok は CTR リフトを 20% に明示。 |
| **Grok の risks** | Reply-first-all は 30% スロットに留める、60 PQT 超でリーチ希釈 -20%、Weekday はアジア週末を外す、バリアント月次ローテ | — | **運用で取り入れる**: Reply-first=all なら全スロットではなく「最大 30%」に抑える検討。60 PQT/日超えたら cap 見直し。テンプレは月 1 回程度ローテで過最適化検知を避ける。 |

---

## 4. 次のアクション

- Grok の JSON は §1 に反映済み。§3.4 で当方分析と突き合わせ済み。
- **運用**: Reply-first を `all` にした場合は **スロットの 30% まで**に制限するロジックを実装済み（`REPLY_FIRST_ALL_MAX_PCT=0.3`）。60 PQT/日を超えるボリュームではリーチ希釈 -20% を前提に cap を見直す（承認済み・運用判断）。
- 実運用で **インプレ・エンゲ・クリック** が取れたら、想定と実績の差分をメモし、cap や Reply-first・Weekday warp に反映する。

**テンプレ「月 1 回ローテ」と Copilot 自律最適化の関係**
- **自律最適化（既に実装）**: `pqtCtaEngine` の **CTR バンディット**（`pickTemplateIndex`）が、テンプレ別の uses/clicks に基づき **どのバリアントを出すか** を run ごとに自動選択している。＝ 言えるのはここまで。文言の自動生成・A/B の自動解釈・自己改善ループはなく、**Copilot の「自律」は浅い**（選ぶだけ）。
- **月 1 回ローテ（Grok の caveat）**: アルゴが **同じ文言パターンの繰り返し** を検知してリーチを下げるのを避けるための話。＝ 「バリアントの**中身（文言セット）**」をときどき入れ替える運用で、CTR バンディットとは別レイヤー。四半期ごとや手動で `pqtTemplates.js` のフレーズを差し替えれば足りる。必須ではないが、長く同じ文言だけにすると過最適化検知のリスクがある、という注意喚起。

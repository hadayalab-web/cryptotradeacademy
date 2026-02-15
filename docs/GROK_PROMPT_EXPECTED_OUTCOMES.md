# Grok に聞く: 磨き上げ後の想定（投稿数・インプレ・エンゲ・CTR）

以下を実装し終えた前提で、**投稿数・インプレッション・エンゲージメント・CTR** の想定を Grok に聞くプロンプト。  
返答は JSON で受け、報告書に貼って分析に使う。

---

## コピペ用プロンプト（英語）

```
You are an expert on X (Twitter) algorithm and crypto/trading CT performance.

We run a PQT-only (quote-tweet) strategy on crypto "fisherman" posts: short comment + one funnel link. Target: EN, ES, PT, AR, KO, JA. We have fully tuned the stack as follows.

**Timing & volume**
- Cron at optimal UTC hours (e.g. 6 runs/day: 0,8,13,14,20,21 or 9 runs: +1,15,16). Per-language nudge windows.
- Cap per run (e.g. 8 PQTs). Fallback: recommended_settings "落としどころ" = 30–50 PQTs/day, 50k–120k impressions, 2k–8k engagements (baseline).

**Copy & format**
- Static templates with Grok engagement tips: short agreement hooks (Spot on!, ¡Exacto!, その通りです), checklist/playbook CTA, question prefix (Breakout if…?), mirror vocab (2–3 words from quoted text).
- Secret-weapons formatting: link on new line only, no trailing period, 89–99 chars before link, double linebreak. CTR bandit over 4–6 variants per language.

**Algo & selection**
- 2–7min window: prefer QTs on originals posted 120–420 sec ago. Momentum sort (likes/10min). Fisherman top 5–10%, median filter.
- Reply-first QT option: reply to original then QT that reply + link (1 or all slots). Weekday warp: 2x cap on Tue–Thu UTC.

Assume we run at "落としどころ" (6 runs, cap 8, 30–50 PQTs/day) without reply-first-every-slot. Then assume we add reply-first on first slot only, then optionally reply-first on every slot and/or weekday warp.

Answer in JSON only (no other text). Structure:

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
    "assumptions_one_line": "short"
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
    "assumptions_one_line": "short"
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
    "assumptions_one_line": "short"
  },
  "format_and_secret_weapons_lift": {
    "impressions_lift_pct": 10,
    "engagement_lift_pct": 15,
    "ctr_lift_pct": 20,
    "reason_one_line": "link on new line, 89-99 chars, mirror vocab, question prefix"
  },
  "risks_and_caveats": ["caveat1", "caveat2"]
}
```

---

## 再質問用プロンプト（チャットリセット後・同じ感触か検証）

**目的**: チャットをリセットした状態で同じテーマを聞き、前回と同程度の答えが返るか検証する。前回の回答は渡さず、**独立した第二の意見**として数値とリスクを出させる。

**使い方**: 新しい Grok チャットで、下記のどちらか一方だけを貼る（会話履歴なし）。返ってきた JSON を別ファイルに保存し、前回の Grok 回答と並べて比較する。

### 再質問・英語（簡潔に状況だけ渡す）

```
You are an expert on X (Twitter) and crypto/trading creator economy.

We run a quote-tweet-only (QT) strategy: we quote influential crypto "fisherman" posts and add a short comment + one funnel link. Languages: EN, ES, PT, AR, KO, JA. We've optimized: cron at 6 runs/day at peak UTC hours, cap ~8 PQTs per run, engagement-optimized copy (agreement hooks, checklist CTA, question prefix, mirror vocab), format (link on new line, 89-99 chars before link), and we prefer QTs on originals posted 2-7 min ago with momentum sort. Optional: reply to original then QT that reply (reply-first), and 2x cap on Tue-Thu UTC.

Give your own estimate from first principles. We need daily numbers for two scenarios.

Scenario A: 6 runs/day, cap 8 per run, no reply-first. How many PQTs/day, daily impressions, daily engagements, and CTR to link (percent)? Use realistic ranges.

Scenario B: Same but we 5x the volume (cap 40 per run, so ~150-250 PQTs/day). Do impressions scale linearly or does dilution kick in? By how much?

Output ONLY valid JSON (no markdown, no explanation). Keys: scenario_a_pqts_per_day_low, scenario_a_pqts_per_day_high, scenario_a_daily_impressions_low, scenario_a_daily_impressions_high, scenario_a_daily_engagements_low, scenario_a_daily_engagements_high, scenario_a_ctr_pct_low, scenario_a_ctr_pct_high, scenario_b_daily_impressions_note (one line: "linear" or "dilution approx X%"), scenario_b_daily_impressions_low, scenario_b_daily_impressions_high, risks_caveats (array of 3-5 short strings).
```

### 再質問・日本語（同じ趣旨・JSON で返すよう指定）

```
X（Twitter）とクリプト界隈の CT に詳しい立場で答えてほしい。

私たちは「引用リポスト（QT）のみ」の運用をしている。インフルエンサーのバズ投稿を引用し、短いコメント＋導線リンク1本を付ける。6言語（EN/ES/PT/AR/KO/JA）。最適化済み: 1日6 run・ピーク UTC、1 run あたり cap 8、エンゲージメント向けコピー（同意フック・チェックリスト CTA・質問型・引用語のミラー）、フォーマット（リンク改行・89-99文字）、2-7分以内の元ポスト優先・momentum ソート。オプションでリプ先行 QT や火–木 2x cap あり。

第一原理からあなたの見積もりを出してほしい。

シナリオA: 6 run/日、cap 8、リプ先行なし。1日あたり PQT 数、インプレッション、エンゲージメント、リンク CTR（%）の現実的なレンジ。

シナリオB: ボリュームを5倍（cap 40/run、150-250 PQT/日）。インプレは線形で伸びるか、希釈はどの程度か。

出力は JSON のみ（説明文は不要）。キー: scenario_a_pqts_per_day_low, scenario_a_pqts_per_day_high, scenario_a_daily_impressions_low, scenario_a_daily_impressions_high, scenario_a_daily_engagements_low, scenario_a_daily_engagements_high, scenario_a_ctr_pct_low, scenario_a_ctr_pct_high, scenario_b_daily_impressions_note（1行: "linear" または "dilution approx X%"）, scenario_b_daily_impressions_low, scenario_b_daily_impressions_high, risks_caveats（3-5個の短い文字列の配列）。Answer only with valid JSON, no other text.
```

---

## 回答の使い方

1. Grok に上記を貼り、返ってきた **JSON だけ** をコピーする。
2. 初回用: `docs/EXPECTED_OUTCOMES_REPORT.md` の「Grok の回答」に貼り、分析と合わせて報告として使う。
3. 再質問用: 返ってきた JSON を `docs/EXPECTED_OUTCOMES_REPORT_GROK_RERUN.md` などに保存し、前回の Grok 回答と**数値・risks**を並べて比較。同じ感触なら一貫性のメモ、ブレがあれば「Grok はセッションで揺れる」と記録する。

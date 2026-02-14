# Trap Defence OS v1.0 / BuzzWeave Engine v3 — Cursor 実装プロンプト

本ドキュメントは **公式スペック**（`KIBA_AND_BUZZWEAVE_ENGINE_IMPLEMENTATION_REPORT.md`）に基づき、各モジュールを実装・検証する際に Cursor に貼るための**実装プロンプト**をまとめたものです。  
コピー＆ペーストでそのままプロンプトとして使えます。

---

## 前提

- レポート 7章: ログを食って学習する OS（influencer_behavior_profiler）
- レポート 8章: X アルゴまで内包した BuzzWeave v3（templates / engine / kpi）

参照: `docs/KIBA_AND_BUZZWEAVE_ENGINE_IMPLEMENTATION_REPORT.md`

---

## プロンプト 1: influencer_behavior_profiler.py

```
influencer_behavior_profiler.py を次の仕様で実装・検証してほしい。

【データソース（3つ）】
- influencer_alert_data/influencer_alerts.json
- bait_registry_data/offenders.json
- buzzweave_trap_data/buzzweave_trap_post_log.json

【集計内容（アカウント単位）】
- trap_density: 直近30日重み・KIBAスコア加重で正規化（0–1）。TRAP_DENSITY_NORMALIZER で 1.0 に近づける。
- dominant_pattern: BAIT_NO_FLOW / HYPE_WITH_FLOW / FEAR_WITH_FLOW の最多分類。
- peak_trap_hours_utc: 2時間窓でヒストグラム平滑化し、上位ピークを採用。
- top_keywords: trigger_keywords に加え behavior_pattern / market_correlation からも抽出し頻度上位。
- avg_kiba_score: 平均 KIBA スコア。

【必須関数】
- build_profiles() → プロファイル一覧
- save_profiles(profiles) / load_profiles() → buzzweave_trap_data/influencer_behavior_profiles.json
- get_profile_for_account(account)
- get_behavior_correction(account, utc_hour=None) → KIBA 補正用 0〜5（trap_density と peak_trap_hours に基づく、cap 5）
- run_profiler_and_save()

【連携】
- bait_offender_registry.compute_sentiment_modifier() でトップ5オフェンダーに get_behavior_correction を加算（modifier cap 20）。
- influencer_onchain_alert_engine.compute_kiba_alert_score() で該当アカウントに get_behavior_correction を加算（score cap 100）。
- buzzweave_engine.detect_trap_candidates(use_behavior_priority=True) で trap_density 降順・peak_trap_hours で候補ソート。
```

---

## プロンプト 2: buzzweave_templates.py（v3 対応）

```
buzzweave_templates.py の v3 仕様を実装・検証してほしい。

【v3 で追加する定数・テンプレート】
- GLOBAL_HASHTAG = "#TrapDefence"
- BOOKMARK_SAVE_BY_LANG: 6言語で「Save this — liq/flow map for later.」等のブックマーク誘導コピー。
- QUESTION_HOOK_V3: 分類×言語で「Trap or real?」「Your take?」「Agree?」等の返信誘発フック。

【render(lang, classification, kiba_data, format, version)】
- version="v3" のとき:
  - single: 質問フック + bullets + structure_note + data_src + bookmark + CTA + (言語ハッシュ + GLOBAL_HASHTAG)
  - thread: 5-part [ Hook+question, Bullets, Structure note, Data source, Bookmark+CTA+hashtags ]

【既存 v1/v2】
- v1: プレースホルダー。v2: 共感フック + bullets + CTA + data source。変更しないこと。
```

---

## プロンプト 3: buzzweave_kpi.py（ER・自己抑制・緊急上限）

```
buzzweave_kpi.py に次を実装・検証してほしい。

【ガードレール追加】
- GUARDRAIL_EMERGENCY_MAX_POSTS_PER_DAY = 5（緊急時でも >6 投稿/日は出さない）。
- ENGAGEMENT_RATE_LOWER_ALERT_PCT = 2.0（ER < 2% ローアラート用）。
- SELF_RESTRAINT_CONSECUTIVE_LOW_ER_COUNT = 5
- SELF_RESTRAINT_MAX_POSTS_PER_DAY = 1

【関数】
- get_guardrails(): emergency_max_posts_per_day, engagement_rate_lower_alert_pct, self_restraint_* を含める。
- get_self_restraint_protocol(): active_when_consecutive_low_er, max_posts_per_day_under_restraint, content_shift="positive_education", pause_recommendation を返す。
- get_kpi_snapshot(): self_restraint_protocol を追加。

【Local verifiers】
- NEUTRAL_BOOSTERS_BY_LANG の別名 LOCAL_VERIFIERS_BY_LANG を定義。「検証・拡散側」として 1 言語 1 日 1 本の種まき時に使用。
```

---

## プロンプト 4: buzzweave_engine.py（v3 対応・自己抑制）

```
buzzweave_engine.py に v3 と自己抑制を実装・検証してほしい。

【新関数】
- generate_structural_quote_v3(post, classification, kiba_data, use_thread_format=False)
  → buzzweave_templates.render(..., version="v3") を使用。attach_visual=True 推奨。

【run_buzzweave_trap_cycle の拡張】
- use_v3: bool = False → True で v3 テンプレート使用し、hashtag に #TrapDefence を付与。
- self_restraint_active: bool = False → True のときその日の実効キャップを 1 に。
- 実効キャップは常に min(cap, GUARDRAIL_EMERGENCY_MAX_POSTS_PER_DAY) で上限 5。
- KPI から GUARDRAIL_EMERGENCY_MAX_POSTS_PER_DAY, SELF_RESTRAINT_MAX_POSTS_PER_DAY を取得して使用。

【run_kiba_to_buzzweave_pipeline】
- use_v3 と self_restraint_active を引数で渡し、run_buzzweave_trap_cycle に伝播させる。
```

---

## 一括プロンプト（4モジュールまとめて）

```
Trap Defence OS v1.0 / BuzzWeave Engine v3 の公式スペックに従い、次の4モジュールを実装・検証してほしい。仕様は docs/KIBA_AND_BUZZWEAVE_ENGINE_IMPLEMENTATION_REPORT.md の 7章・8章 に準拠する。

1. influencer_behavior_profiler.py
   - 3ソース（alerts, offenders, buzzweave_trap_post_log）から build_profiles（trap_density 直近30日・KIBA加重、peak_trap_hours 2h平滑化、top_keywords に behavior_pattern/market_correlation 含む）。
   - get_behavior_correction(account, utc_hour) で 0〜5 を返す。bait_offender_registry と influencer_onchain_alert_engine に統合済みであること。

2. buzzweave_templates.py
   - v3: GLOBAL_HASHTAG, BOOKMARK_SAVE_BY_LANG, QUESTION_HOOK_V3。render(..., version="v3") で single/thread（5-part）対応。

3. buzzweave_kpi.py
   - ER 閾値 2%、自己抑制プロトコル（連続低 ER で 1 日 1 本）、緊急時 5 本上限。get_guardrails / get_self_restraint_protocol / LOCAL_VERIFIERS_BY_LANG。

4. buzzweave_engine.py
   - generate_structural_quote_v3。run_buzzweave_trap_cycle(use_v3, self_restraint_active) と実効キャップ min(cap, 5)。run_kiba_to_buzzweave_pipeline に use_v3 / self_restraint_active を追加。

既存の v1/v2 や他モジュールの互換性を崩さないこと。
```

---

*このドキュメントは Trap Defence OS v1.0 / BuzzWeave Engine v3 の公式スペックに基づく実装プロンプトです。*

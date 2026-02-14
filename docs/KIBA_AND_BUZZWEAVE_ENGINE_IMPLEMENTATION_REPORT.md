# KIBA と BuzzWeave Engine 実装レポート

本ドキュメントは、Trap Defence OS の**KIBA（構造裏取り）**と**BuzzWeave Engine（引用リポスト戦術）**の実装をまとめたレポートです。

---

## 1. 概要

### 1.1 目的

- **KIBA**: インフルエンサー・ベイト常習者・オンチェーンデータを突き合わせ、**「煽り × 実需なし」「煽り × 実需あり」「恐怖 × 実需あり」**を判定し、Sentiment/Algo 検知器や BuzzWeave に渡す。
- **BuzzWeave Engine**: **意図されたバズ（Trap）だけ**に反応し、KIBA で裏取りしたうえで、**6言語の構造提示引用リポスト**で救済する。

### 1.2 アーキテクチャ概要

```
[ データソース ]
  market_influencer_registry (多言語インフルエンサー)
  bait_offender_registry (ベイト常習者)
  btc_influencer_scanner (BTC連動インフルエンサー検出)

        ↓

[ KIBA レイヤー ]
  influencer_onchain_alert_engine (疑わしい活動検出 → オンチェーン照合 → アラートスコア)
  bait_offender_registry.export_for_kiba() / compute_sentiment_modifier()

        ↓

[ BuzzWeave Engine ]
  detect_trap_candidates → classify_trap → generate_structural_quote → publish_quote
  buzzweave_templates (6言語テンプレートエンジン)
  buzzweave_kpi (KPI・ガードレール・中立ブースター)
```

---

## 2. KIBA 関連実装

### 2.1 bait_offender_registry

| 項目 | 内容 |
|------|------|
| **ファイル** | `bait_offender_registry.py` |
| **役割** | Grok 等で検出した「ベイト投稿常習者」を永続化し、KIBA 用にエクスポートする。 |
| **データストア** | `bait_registry_data/offenders.json`, `bait_registry_data/global_insights.json` |

**主な関数**

| 関数 | 説明 |
|------|------|
| `load_offenders()` | レジストリを読み込み。 |
| `save_offenders(data)` | レジストリを保存。 |
| `update_offender(entry)` | 1件を更新または追加（risk_score=max, trigger_keywords=和集合など）。 |
| `get_offender(account)` | 指定アカウントの1件を取得。 |
| `list_offenders()` | 全オフェンダー一覧。 |
| `merge_new_scan_results(new_json)` | スキャン結果を既存データにマージ。 |
| `compute_sentiment_modifier()` | 0〜20 の sentiment 用数値（トップオフェンダー平均リスク・MANIPULATOR/BAIT_FARMER 等から算出）。 |
| `export_for_kiba()` | `{ sentiment_modifier, top_offenders, timing_signals }` を返す。 |

**データ構造（offenders 1件）**

- `account`, `category`, `risk_score`, `behavior_pattern`, `trigger_keywords`, `market_correlation`

---

### 2.2 btc_influencer_scanner

| 項目 | 内容 |
|------|------|
| **ファイル** | `btc_influencer_scanner.py` |
| **役割** | フォロワー>100k・高エンゲージメント・1〜15分 BTC 相関を持つアカウント、隠れインフルエンサー（非クリプト/地域/ミーム）、協調投稿を検出し、**bait_offender_registry と同じ JSON 構造**で返す。 |

**主な関数**

| 関数 | 説明 |
|------|------|
| `scan(accounts, btc_timestamps, btc_returns, ...)` | 候補をフィルタ（統計的有意な相関のみ）し、`{ offenders, global_insights }` を返す。 |
| `scan_from_json_file(path, btc_series_path, ...)` | JSON ファイルからアカウント（とオプションで BTC 時系列）を読み、`scan()` を実行。 |

**出力**

- bait_offender_registry と同一形式のため、`merge_new_scan_results(scan(...))` でレジストリに取り込める。

---

### 2.3 market_influencer_registry

| 項目 | 内容 |
|------|------|
| **ファイル** | `market_influencer_registry.py` |
| **役割** | 既存の `data/influencers/influencers.json` または `influencers-<lang>.json` から多言語インフルエンサーを読み、BuzzWeave / アラートエンジン用の一覧を提供する。 |

**主な関数**

| 関数 | 説明 |
|------|------|
| `load_influencers_json()` | 単一 or 言語別 JSON をマージして平坦リストで返す。 |
| `list_influencers(enrich_for_alerts=False)` | `account`, `language`, `influence_score` 等を持つリスト。`enrich_for_alerts=True` で `influencer_alert_hints.json` から correlation_type / timing_pattern を付与。 |

---

### 2.4 influencer_onchain_alert_engine

| 項目 | 内容 |
|------|------|
| **ファイル** | `influencer_onchain_alert_engine.py` |
| **役割** | 多言語インフルエンサーの「疑わしい活動」を検出し、オンチェーン（モック）で裏取りしてアラート化。KIBA 用のコンパクトなエクスポートを提供。 |
| **データストア** | `influencer_alert_data/influencer_alerts.json` |

**主な関数**

| 関数 | 説明 |
|------|------|
| `load_alerts()` | アラート一覧を読み込み。 |
| `save_alerts(data)` | アラートを保存。 |
| `detect_suspicious_influencer_activity(entry)` | correlation_type（Pre-pump/Pre-dump/Volatility amplifier）、timing_pattern、直近投稿を判定し、疑わしい場合のみアラート候補を返す。 |
| `crosscheck_onchain(alert)` | モックで whale_flow / exchange_flow / liquidity / sentiment を設定。実 API 差し替え可能。 |
| `compute_kiba_alert_score(alert)` | influence_score/4 + 各種ボーナス、最大100。 |
| `finalize_alert(alert)` | スコアに応じて status を ELEVATED/HIGH/CRITICAL にし、保存。 |
| `export_for_kiba()` | `{ active_alerts, critical_signals, regional_distribution, kiba_modifier }` を返す。 |
| `run_influencer_alert_pipeline(use_enriched_influencers)` | インフルエンサー一覧 → 疑わしい活動検出 → オンチェーン照合 → スコア → 確定。最後に `export_for_kiba()` を返す。 |

**アラート1件の構造**

- `account`, `language`, `trigger_time`, `influence_score`, `correlation_type`, `timing_pattern`, `onchain_confirmation`, `flow_signal`, `liquidity_signal`, `sentiment_signal`, `kiba_alert_score`, `status`

---

## 3. BuzzWeave Engine 実装

### 3.1 buzzweave_engine

| 項目 | 内容 |
|------|------|
| **ファイル** | `buzzweave_engine.py` |
| **役割** | Trap 候補の検出、KIBA による分類、6言語の構造引用文生成、投稿ログ。曖昧なバズは増幅せず、**KIBA で裏取り済みかつ3分類のいずれか**のときのみ投稿対象とする。 |

**発火条件・タイミング**

- 言語別 UTC 窓: EN 14–18, ES/PT 20–23, AR 16–20, KO/JA 01–05, グローバル 13–16 UTC。
- 煽り投稿から 5〜30 分以内に反応（`REACTION_WINDOW_*`）。
- 1日最大投稿数は KPI ガードレールに合わせ 4 本まで（`MAX_POSTS_PER_DAY`）。

**主な関数**

| 関数 | 説明 |
|------|------|
| `detect_trap_candidates(require_fire_window)` | インフルエンサー＋ベイト常習者から「直近投稿」候補を取得。言語・タイミング窓でフィルタ。 |
| `classify_trap(post, kiba_data)` | KIBA の onchain/flow/liquidity/sentiment から **BAIT_NO_FLOW / HYPE_WITH_FLOW / FEAR_WITH_FLOW** のいずれかに分類。 |
| `generate_structural_quote(post, classification, kiba_data)` | v1 テンプレで1本の引用文を生成。 |
| `generate_structural_quote_v2(post, classification, kiba_data, use_thread_format)` | 共感フック＋箇条書き（Flow/Liquidity/Sentiment）＋データソース＋CTA＋ハッシュタグ。スレッド形式なら3ツイート。 |
| `generate_structural_quote_thread(...)` | 3ツイート（Hook / Data / CTA）を返す。 |
| `publish_quote(post, generated_text, classification, kiba_snapshot, ...)` | 引用 RT に相当する処理。現状は `buzzweave_trap_data/buzzweave_trap_post_log.json` に記録。`attach_visual`, `neutral_boosters` を含む。 |
| `run_buzzweave_trap_cycle(dry_run, max_candidates, use_v2, require_fire_window, use_thread_format)` | 候補検出 → 分類 → 引用文生成 → 公開（またはドライラン）。日次 cap を考慮。 |
| `run_kiba_to_buzzweave_pipeline(run_alert_pipeline, dry_run, ...)` | 必要ならアラートパイプライン実行後、BuzzWeave トラップサイクルを実行。`{ kiba_export, buzzweave_result }` を返す。 |

**分類の意味**

- **BAIT_NO_FLOW**: 煽り × 実需なし → 罠の可視化。
- **HYPE_WITH_FLOW**: 煽り × 実需あり → 構造の説明。
- **FEAR_WITH_FLOW**: 恐怖 × 実需あり → 構造的リスクの警告。

---

### 3.2 buzzweave_templates

| 項目 | 内容 |
|------|------|
| **ファイル** | `buzzweave_templates.py` |
| **役割** | 6言語（EN, ES, PT, AR, KO, JA）の引用文テンプレートを一元管理。言語・分類・KIBA データから自動で文言を組み立てるテンプレートエンジン。 |

**主な関数・定数**

| 名前 | 説明 |
|------|------|
| `render(lang, classification, kiba_data, format="single"\|"thread", version="v1"\|"v2")` | 単一入口。`format="thread"` で3ツイート、`version="v2"` で共感＋箇条書き＋CTA。 |
| `normalize_lang(lang)` | 言語コード正規化（pt-br → pt 等）。 |
| `structure_note(kiba_data)` | exit liquidity / accumulation の文言を KIBA から生成。 |
| `build_bullets(kiba_data)` | Flow / Liquidity / Sentiment の箇条書きを生成。 |
| `QUOTE_TEMPLATES`, `EMPATHY_HOOK_V2`, `CTA_BY_LANG`, `HASHTAGS_BY_LANG`, `DATA_SOURCES_LABEL` | テンプレート・ラベル用定数。 |

buzzweave_engine は、このモジュールが利用可能な場合は `template_render` 経由で引用文を生成する。

---

### 3.3 buzzweave_kpi

| 項目 | 内容 |
|------|------|
| **ファイル** | `buzzweave_kpi.py` |
| **役割** | Grok 由来の期待値レンジ・増幅/制限要因・ガードレール・中立ブースターを定義。BuzzWeave の日次 cap やタグ付けに利用。 |

**定数（要約）**

- **期待値**: `DAILY_IMPRESSIONS_RANGE`, `DAILY_ENGAGEMENT_RANGE`, `ENGAGEMENT_RATE_RANGE`, `WEEKLY_FOLLOWER_GROWTH`
- **増幅要因**: `FACTORS_INCREASING_RESULTS`（5分以内 QT、視覚＋多言語、CTA、2–4/日、中立タグ等）
- **制限要因**: `FACTORS_LIMITING_RESULTS`（5投稿以上リスク、ネガティブ判定、言語シロ等）
- **ガードレール**: `GUARDRAIL_MAX_POSTS_PER_DAY = 4`, `GUARDRAIL_SHADOWBAN_RISK_THRESHOLD = 5`, `RECOMMENDED_MIN/MAX_POSTS_PER_DAY`
- **中立ブースター**: `NEUTRAL_BOOSTERS_BY_LANG`（言語ごとにタグ用ハンドル 2〜3 件）

**主な関数**

| 関数 | 説明 |
|------|------|
| `get_guardrails()` | 上記ガードレールを dict で返す。 |
| `get_neutral_boosters_for_lang(lang)` | 指定言語のブースター最大3件を返す。 |
| `get_kpi_snapshot()` | レンジ・要因・ガードレールをまとめた dict（ダッシュボード/ログ用）。 |

---

## 4. 連携フロー

### 4.1 ベイト常習者 ＋ BTC インフルエンサー → KIBA

1. `btc_influencer_scanner.scan(accounts)` で BTC 連動・隠れインフルエンサー・協調投稿を検出。
2. 返り値を `bait_offender_registry.merge_new_scan_results(...)` に渡してレジストリにマージ。
3. `bait_offender_registry.export_for_kiba()` で sentiment_modifier / top_offenders / timing_signals を取得。

スクリプト例: `run_bait_pipeline.py`（`--scan` でスキャン＋マージ＋エクスポート）。

### 4.2 インフルエンサーアラート → KIBA

1. `influencer_onchain_alert_engine.run_influencer_alert_pipeline()` でインフルエンサーを走査し、疑わしい活動を検出・オンチェーン照合・スコア付け・保存。
2. 戻り値の `export_for_kiba()` 相当で `active_alerts`, `critical_signals`, `regional_distribution`, `kiba_modifier` を取得。

### 4.3 KIBA → BuzzWeave（一括パイプライン）

1. `buzzweave_engine.run_kiba_to_buzzweave_pipeline(run_alert_pipeline=True, dry_run=False, ...)` を実行。
2. 内部で必要に応じ `run_influencer_alert_pipeline()` を実行し、続けて `run_buzzweave_trap_cycle()` を実行。
3. 返り値: `{ "kiba_export": {...}, "buzzweave_result": { "candidates", "posted", "skipped", "posts_today", "logs" } }`。

---

## 5. データストア一覧

| パス | 説明 |
|------|------|
| `bait_registry_data/offenders.json` | ベイト常習者一覧。 |
| `bait_registry_data/global_insights.json` | common_patterns, timing_signals, recommended_watchlist。 |
| `influencer_alert_data/influencer_alerts.json` | インフルエンサーアラート一覧。 |
| `buzzweave_trap_data/buzzweave_trap_post_log.json` | 引用リポスト投稿ログ（original_post_id, classification, kiba_snapshot, attach_visual, neutral_boosters 等）。 |
| `data/influencers/influencers.json` または `influencers-<lang>.json` | 多言語インフルエンサー（market_influencer_registry が参照）。 |

---

## 6. 実行例

### 6.1 ベイト＋BTC スキャンをレジストリにマージして KIBA エクスポート

```bash
python run_bait_pipeline.py --scan
```

### 6.2 インフルエンサーアラートのみ実行

```python
from influencer_onchain_alert_engine import run_influencer_alert_pipeline, export_for_kiba
result = run_influencer_alert_pipeline(use_enriched_influencers=False)
# result = export_for_kiba()
```

### 6.3 BuzzWeave トラップサイクル（ドライラン）

```python
from buzzweave_engine import run_buzzweave_trap_cycle
result = run_buzzweave_trap_cycle(
    dry_run=True,
    max_candidates=50,
    use_v2=True,
    require_fire_window=False,
)
```

### 6.4 KIBA → BuzzWeave 一括パイプライン

```python
from buzzweave_engine import run_kiba_to_buzzweave_pipeline
out = run_kiba_to_buzzweave_pipeline(
    run_alert_pipeline=True,
    dry_run=True,
    max_candidates=10,
    require_fire_window=False,
)
# out["kiba_export"], out["buzzweave_result"]
```

### 6.5 KPI スナップショット取得

```python
from buzzweave_kpi import get_kpi_snapshot, get_neutral_boosters_for_lang
snapshot = get_kpi_snapshot()
boosters_en = get_neutral_boosters_for_lang("en")
```

---

## 7. 今後の拡張（想定）

- **オンチェーン**: `influencer_onchain_alert_engine` の `check_whale_flow` 等を実 API（Dune / Glassnode / Coinglass 等）に差し替え。
- **投稿実行**: `publish_quote` の結果を既存の `services/td/buzzWeaveEngine.js` や X API と連携し、実際の引用リポスト＋メディア添付・中立ブースターのタグ付けを実行。
- **Trap 狩りダッシュボード**: `buzzweave_trap_post_log.json` と KPI スナップショットを可視化する UI/API。
- **6言語スケジュール**: 言語別 UTC 窓に基づく投稿スロットの自動生成（Cron との連携）。

---

*本文書は、KIBA および BuzzWeave Engine の実装内容をまとめたレポートです。*

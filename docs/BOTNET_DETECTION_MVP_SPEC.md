# Trap Defence OS — BotNet Detection MVP 実装仕様（Phase A）

応用フェーズ A の MVP。釣り師の「影の軍勢（ボットクラスタ）」を可視化し、BuzzWeave で BotNetAlert 投稿できる状態を実現する。

---

## 1. モジュール

| ファイル | 役割 |
|----------|------|
| `botnet_detector.py` | ボットスコア・クラスタ検出・レイド検出・デモ生成・BuzzWeave 連携 |
| `botnet_dashboard_data.py` | ダッシュボード用スナップショット集約 |

---

## 2. 入力・出力

### 入力

```
post_id: str
timestamp: str (ISO)
engagement_events: [ { account, type(like|rt|reply), timestamp } ]
account_metadata: recommended。{ account_lower: { account_age_days, follower_follow_ratio, post_similarity_pct } }
  無い場合は該当スコア項目を 0 とする。
asset_class: optional。crypto/equities/commodities/fx/etf。burst_factor の expected 算出に使用。
```

### 出力: BotnetDetectionResult

```json
{
  "post_id": "...",
  "bot_suspects": [ { "account": "...", "score": 0-100, "reasons": [...] } ],
  "cluster_events": [ { "cluster_id", "accounts", "burst_factor", "window_seconds" } ],
  "initial_boost_factor": float,
  "raid_detected": bool,
  "raid_factor": float,
  "summary": "構造要約（数値・メトリクス中心、lang非依存）。例: clusters=3 / burst=80x / suspects=12 (max=60) | RT 120 in 10s / raid_factor=80x。ダッシュボードはそのまま表示、BuzzWeave は言語テンプレに流し込んで自然文生成。"
}
```

---

## 3. ボットスコア（0–100）

| 指標 | 重み |
|------|------|
| 同時 RT/いいね（1–3 秒窓） | +20 |
| アカウント年齢 30 日未満 | +10 |
| フォロワー/フォロー比異常 | +10 |
| 類似投稿 80% 以上 | +20 |
| burst_factor 10–50x | +20 |
| レイド参加 | +20 |

---

## 4. クラスタ・レイド検出

- **クラスタ**: 3 秒スライディングウィンドウ、5 件以上の同時イベント
- **burst_factor**: cluster_size / expected。expected は `get_baseline_engagement_per_second(asset_class) × window_seconds`。fallback=1/3。アセットクラス差を吸収し異常値を正しく検出。
- **initial_boost_factor**: 検出クラスタ中の最大 burst_factor。  
  `= max(cluster_event_count / expected) over clusters`  
  初動ブーストはレイドの前兆。釣り師の「影の軍勢」が最初に動く窓を表す。burst_factor と整合。
- **レイド**: 10 秒以内に RT 100+、burst_factor ≥ 50、連続クラスタ 3+

---

## 5. BuzzWeave 連携

- `generate_botnet_demo(post_id, detection_result, lang)` → BuzzWeave v3 テンプレ構造に完全準拠した dict:
  - hook, bullets, structure_note, data_sources, cta, hashtags, visual_payload
- `publish_botnet_alert(post_id, detection_result, lang)` → BuzzWeave の publish_quote で BotNetAlert をログ記録

---

## 6. 依存

- `trap_defence_structural_data.py`（INFLUENCE_METRICS）
- `buzzweave_engine.py`（publish_quote）
- `buzzweave_templates.py`（GLOBAL_HASHTAG, HASHTAGS_BY_LANG）

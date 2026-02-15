# Trap Defence OS v4.2 — KIBA × CQ × 多言語クラスタ 完全同期

## North Star

**KIBA（Xバズ予兆） × CQ（Chain異常） × 多言語釣り師クラスタ** を完全同期させ、予兆精度・投稿精度・言語最適化を同時に最大化する。

---

## 1. CQ 5分キャッシュ同期

### 1.1 cq:latest KV 永続化

| 項目 | 値 |
|------|-----|
| KV key | `cq:latest` |
| TTL | 10 分 |
| 書き込み | `kiba-5min` が CQ 取得後に毎回 |
| **運用** | kiba-5min は **毎回 CQ API を叩く**（skipCache: true）。`cq:latest` は毎回更新され、5 分取得と整合。 |

### 1.2 スキーマ

```json
{
  "whale_ratio": 0.85,
  "exchange_inflow": 1000,
  "long_short_ratio": 1.5,
  "open_interest": 50000,
  "timestamp": 1700000000000,
  "trap_score": 0.6,
  "raw": {}
}
```

- **trap_score**: **0〜1**。CHAIN_RAID 条件の `trap_score > 0.5` と整合。

### 1.3 KIBA → Fusion は cq:latest 参照

- `build_structured_post --cq-metrics` で cq:latest 由来の cq_metrics を渡す
- `scripts/build-chain-post-with-cq.js` が KV から取得し Python に渡す
- なければ `--fetch-cq` で API を叩く（フォールバック）

---

## 2. burst_factor v4.2

### 2.1 新規特徴量

- `cluster_activation_score`: クラスタ数・burst から 0-1
- `botnet_coherence_score`: クラスタ間アカウント重複から 0-1
- `historical_burst_similarity`: **v4.2 では 0.5 固定**（プレースホルダ）
- `language_cycle_phase`: **v4.2 では 0.5 固定**（プレースホルダ）

### 2.2 burst_factor_v42

```
burst_factor_v42 = w1*initial_boost + w2*cluster_activation*80 + w3*botnet_coherence*60 + ...
```

- **重みデフォルト例**: w1=1.0, w2=0.8, w3=0.6（実装側で変更可だが、仕様で最低限のガイドを固定）
- 融合時に `burst_factor_v42` を優先、なければ `initial_boost_factor`

---

## 3. 言語別釣り師クラスタ

### 3.1 KV 構造

```
KV: fishermen:cluster:{lang}
{
  active_fishermen, burst_events, botnet_links,
  avg_burst_factor, peak_hours: [int], chain_raid_rate
}
```

### 3.2 peak_hours（初期値）

- **タイムゾーン**: **UTC**。投稿タイミングのズレを防ぐため JST で運用する場合は KV 値を JST 相当の UTC にしておく。
- ES: 21–02, AR: 18–23, KO: 09–12, EN/JA/PT: デフォルト設定あり

### 3.3 chain_raid_rate

- **分母**: その言語クラスタの **全イベント数**（burst イベント数）。分子は CHAIN_RAID 発火回数。

---

## 4. CHAIN_RAID 発火条件

```
burst >= 30 AND oi_spike == true AND (whale_inflow OR trap_score > 0.5)
```

- **burst**: **burst_factor_v42** と同一。条件式の burst は burst_factor_v42 の値を使用する。
- oi_spike / whale_inflow: 直近 N 分平均比 +X% 以上など、閾値は実装で調整（思想: 異常検知）。

---

## 5. テスト

```bash
node scripts/test-v42-bloodflow.js
python scripts/test-chain-mode-v42.py
```

### 合格条件（仕様）

- **cq:latest**: 5 分以内の timestamp を持つこと
- **CHAIN_RAID**: 少なくとも 1 ケース発火すること
- **言語ルーティング**: 6 言語（en/es/pt/ar/ko/ja）すべて通ること

---

## 6. ファイル構成

| ファイル | 役割 |
|----------|------|
| `services/snapshot/cqLatestWriter.js` | cq:latest 書き込み・読み取り |
| `services/snapshot/fishermenClusterSchema.js` | 言語クラスタ KV 構造 |
| `api/kiba-5min.js` | CQ 取得後に writeCqLatest |
| `scripts/build-chain-post-with-cq.js` | cq:latest 参照で chain 投稿構築 |
| `scripts/build_structured_post.py` | --cq-metrics 対応 |
| `kiba_chain_integration.py` | burst_factor_v42, CHAIN_RAID 条件 |
| `botnet_detector.py` | burst_factor_v42 特徴量 |

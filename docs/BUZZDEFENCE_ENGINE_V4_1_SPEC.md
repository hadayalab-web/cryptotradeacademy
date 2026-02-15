# BuzzDefence Engine v4.1 — KIBA + CQ Chain Integration Spec

**目的:** X（釣り師バズ）＋オンチェーン（CQ 5分データ）を統合し、Trap Defence OS を「X + Chain 完全防衛インフラ」に進化させる。

---

## 1. North Star（v4.1）

> **X の釣り師バズ + BTCオンチェーン異常 → 5分以内に構造化 → CTR最大化 → Vidalytics → TG Sub → MRR最大化**

- Chain + X の二重検知で精度 95%+
- 予兆検知（ポンプ前 5分）で初動インプレッション 10x
- Sub CVR 2x → MRR 150% 増

---

## 2. アーキテクチャ

```
BuzzWeave（釣り師観測）
   ↓
KIBA（Xボット/レイド検知）
   ↓
CQ Chain Fetcher（5分ごと）
   ↓
KIBA-Chain Fusion（kiba_chain_integration.py）
   ↓
StructuredPost v4.1（Python）
   ↓
BuzzDefence Engine v4.1（JS）
   ↓
X投稿（引用RT + 自リプ + Poll + GIF）
   ↓
Vidalytics → TG Sub
```

---

## 3. Python 拡張

### 3.1 kiba_chain_integration.py

- `fetch_cq_btc()` — CQ API から BTC オンチェーンデータ取得（失敗時はデフォルト返却）
- `compute_dynamic_oi_threshold(data)` — 2SD 閾値
- `kiba_chain_fusion(kiba_payload, cq_metrics)` — trap_score 算出、psychology_tag = CHAIN_RAID 昇格

### 3.2 StructuredPost v4.1 拡張

```ts
chain_data?: {
  oi_spike: boolean;
  whale_inflow: boolean;
  long_short_ratio: number;
  graph_url?: string;
};
fusion_score?: number;
psychology_tag: "CHAIN_RAID" | ...;
```

### 3.3 build_structured_post — mode="chain"

- 入力: `botnet_result`, `cq_metrics`（省略時は fetch_cq_btc で取得）
- 出力: StructuredPost に chain_data, fusion_score, psychology_tag=CHAIN_RAID

---

## 4. JS 拡張（buzzDefenceEngineV4.js / v4_1.js）

### 4.1 CHAIN_RAID CTA

```js
CHAIN_RAID: {
  en: "① Escape now ② Ride chain pump. Your move →",
  ja: "①今すぐ逃げる ②チェーンポンプに乗る。あなた次第 →",
  ...
}
```

### 4.2 mediaConfig — chainData.graph_url

- `chainData?.graph_url` があれば `{ type: "gif", url }` を優先

### 4.3 Poll（CHAIN_RAID）

- question: "Chain pump incoming?", options: ["Yes", "No"]

---

## 5. ファイル構成

| ファイル | 役割 |
|----------|------|
| `kiba_chain_integration.py` | fetch_cq_btc, kiba_chain_fusion |
| `buzzweave_engine.py` | build_structured_post(mode=chain) |
| `services/td/buzzDefenceEngineV4.js` | CHAIN_RAID CTA/hook/media |
| `services/td/buzzDefenceEngineV4_1.js` | runBuzzDefenceV41Cycle |
| `scripts/build_structured_post.py` | --mode chain, --fetch-cq |

---

## 6. 実行例

```bash
# Python: chain モードで StructuredPost 生成
python scripts/build_structured_post.py --mode chain --lang en --post-id xxx --detection '{"post_id":"xxx","initial_boost_factor":50,"cluster_events":[],"bot_suspects":[]}' --fetch-cq > sp.json

# Node: v4.1 パイプライン実行
node -e "
const sp = require('./sp.json');
const v41 = require('./services/td/buzzDefenceEngineV4_1.js');
v41.runBuzzDefenceV41Cycle(sp, 'QUOTED_TWEET_ID', { dryRun: false }).then(console.log);
"
```

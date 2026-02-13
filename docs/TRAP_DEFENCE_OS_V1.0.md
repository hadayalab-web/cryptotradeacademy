# Trap Defence OS v1.0 — Single Source of Truth

**作成日**: 2026-02-13  
**ステータス**: Phase 4 完了、OS v1.0 確定

---

## 1. 概要

Trap Defence OS は Bitcoin 市場構造の深い理解を届ける **価値エンジン** である。
CryptoQuant Pro × X × 3AI を統合し、Snapshot を Single Source of Truth として Minimal / Regular / Emergency の 3 モードで配信する。

### 1.1 原則

- **Stateless**: 全処理はステートレス、single-blood-flow
- **Snapshot-native**: 全配信（Telegram, Email, Dashboard, BWE）は同一 snapshot 構造を消費
- **Self-healing**: 404 → null、500 → retry once、429 → wait + retry
- **Legacy 廃止**: 旧フロー・旧ペイロード形式は残存しない

### 1.2 CryptoQuant Pro 実装方針（必須）

- CryptoQuant Data API の **カテゴリ構造** が公式 SSOT：
  - Bitcoin/Status, Exchange-Flows, Flow-Indicator, Market-Indicator, Network-Indicator, Miner-Flows, Inter-Entity-Flows, Fund-Data, Market-Data, Miner-Data, Network-Data, Mempool, Lightning-Network, Stablecoin（必要時）
- **「CQ Pro 100% 利用」** = これらのカテゴリから取得可能なメトリクスを最大限 cqDeep に取り込む。個々のメトリクス名の存在を前提にしない。
- **実装ルール**: 実在するエンドポイントのみ叩く。404/常に0 → null。cqDeep 全フィールド optional、欠けても OS が壊れない。

---

## 2. Snapshot スキーマ（Full）

```typescript
interface BtcSnapshot {
  snapshot_id: string;
  as_of_utc: string;  // ISO 8601

  raw: {
    inflow: number;
    mpi: number;
    priceUsd: number;
    change24h: number;
    sentimentLabel: string;
    fng?: { value: number; label: string };
  };

  // Stage 2: CQ Pro Deep (all fields optional / null-allowed)
  cqDeep?: {
    whaleRatio?: number | null;
    whaleFlows?: object | null;
    trapScore?: number | null;        // OS 側で計算してもよい
    sopr?: number | null;
    sopr30d?: number | null;
    nupl?: number | null;
    riskReward?: number | null;
    funding?: number | null;
    openInterest?: number | null;
    minerFlows?: object | null;
    liquidity?: object | null;
    kimchiPremium?: number | null;    // KO only
    upbitPrice?: number | null;       // KO only
    stablecoinMetrics?: object | null;
    exchangeFlowsDetailed?: object | null;
    // 他に実際に取得できるものがあればここに追加
  } | null;

  xSentiment?: object | null;
  highResX?: object | null;
  gptStructureReasoning?: string | null;
  gptScenarioMap?: object | null;
  gptTrapInterpretation?: string | null;
  sosovalueArticle?: string | null;
  drGrok?: object | null;

  trapDetection?: object | null;
  trapAlert?: object | null;
  divergenceSignal?: { divergenceLevel?, reasons?, confidence? } | null;
  marketRegime?: string | null;

  market_score: number;
  tradeSignal?: object | null;
  meta?: object | null;

  diff?: {
    priceChange?: number;
    whaleRatioChange?: number;
    fundingChange?: number;
    OIChange?: number;
    liquidityChange?: number;
    sentimentFlip?: boolean;
    trapScoreDelta?: number;
    divergenceDelta?: string;
    regimeShift?: boolean;
    summaryText?: string;
  } | null;
}
```

---

## 3. Stage 1–6 パイプライン

| Stage | 内容 | 出力 |
|-------|------|------|
| 1 | raw (CQ basic, price, FNG) | raw |
| 2 | cqDeep (derivatives, liquidity, miner flows, LTH, stablecoin, ETF, exchange flows) | cqDeep |
| 3 | grok (X sentiment, high-res) | xSentiment, highResX |
| 4 | gpt (structure reasoning, scenario, trap interpretation) | gpt* |
| 5 | gemini (SoSoValue article) | sosovalueArticle |
| 6 | drGrok (psychological analysis) | drGrok |

---

## 4. Cron パイプライン

1. **buildBtcSnapshot** (Stage 1–6)
2. **computeSnapshotDiff**(current, previous) → `snapshot.diff`
3. **buildFullSnapshot** (diff を含む)
4. **writeFullSnapshot** → KV `btc:snapshot` / `asset:snapshot:BTC`
5. **persistSnapshotToDb** → Supabase `btc_snapshots`
6. **runAssetSnapshot**('BTC') — マルチアセット統一フロー
7. **evaluateDeliveryMode**
8. **dispatch**: minimal / regular / emergency

### 4.1 Regular 配信

- **Telegram**: `formatRegularBriefing(snapshot, lang, opts)` — 全言語 snapshot-native
- **Email**: `formatRegularBriefingHTML(snapshot, targetLang, opts)` — 全言語 snapshot-native
- diff.summaryText をオプションで表示

### 4.2 Emergency 配信

- deterministic トリガー時
- `formatTrapAlertFromSnapshot(snapshot, lang)`

### 4.3 Minimal 配信

- `formatMinimalBriefing(snapshot, lang)`

---

## 5. ファイル構成

### 5.1 Snapshot

| ファイル | 役割 |
|----------|------|
| `services/snapshot/btcSnapshotSchema.js` | buildFullSnapshot, snapshotToDbRow |
| `services/snapshot/assetSnapshotSchema.js` | assetSnapshotKvKey, buildAssetSnapshot |
| `services/snapshot/assetSnapshotBuilder.js` | runAssetSnapshot(assetCode) |
| `services/snapshot/adapters/{btc,eth,sol,nasdaq,gold}Adapter.js` | アセット別 Adapter |

### 5.2 Diff

| ファイル | 役割 |
|----------|------|
| `logic/diff/computeSnapshotDiff.js` | computeSnapshotDiff(current, previous) |

### 5.3 CQ Pro

| ファイル | 役割 |
|----------|------|
| `services/cryptoquant/deepMetrics.js` | getCQDeepMetrics, fetchCQProCommonFields, derivatives, liquidity, miner flows, LTH, stablecoin, ETF, exchange flows |

### 5.4 Telegram

| ファイル | 役割 |
|----------|------|
| `services/telegram/messages/user/{en,ja,ko,es,pt-br,ar}/regular.{lang}.js` | formatRegularBriefing(snapshot, lang, opts) |

### 5.5 Email

| ファイル | 役割 |
|----------|------|
| `services/email/messages/user/{en,ja,ko,es,pt-br,ar}/regular.{lang}.js` | formatRegularBriefingHTML(snapshot, lang, opts) |
| `services/email/messages/shared/extractFromSnapshot.js` | snapshot から email payload 抽出 |

### 5.6 Dashboard

| ファイル | 役割 |
|----------|------|
| `api/dashboard/btc.js` | KV `asset:snapshot:BTC` 返却 |
| `api/dashboard/history.js` | Supabase `btc_snapshots` から履歴 |
| `public/dashboard/index.html` | Chart.js 可視化、diff セクション |

### 5.7 BWE

| ファイル | 役割 |
|----------|------|
| `api/buzzweave-run.js` | `?asset=BTC` で `asset:snapshot:BTC` をロード |
| `services/ai/gpt5mini.js` | regimeTone(regime), marketStateNote に regime / diff 注入 |

---

## 6. KV / DB

### 6.1 KV キー

- `btc:snapshot` — レガシー互換
- `asset:snapshot:BTC` — マルチアセット統一

### 6.2 DB テーブル

- `btc_snapshots` — BTC スナップショット履歴（diff 含む）
- `asset_snapshots` — マルチアセット用（将来拡張）

---

## 7. BWE Regime-Aware Copywriting

- **regimeTone(regime)**:
  - whale-driven → analytical, cautious
  - retail-fomo → contrarian, warning
  - high-volatility → short, urgent
  - liquidity-vacuum → defensive
  - miner-capitulation → long-term perspective
  - neutral → balanced

- **marketStateNote** に注入: Regime, Tone rule, Divergence, Trap severity, Whale bias, Retail FOMO, **diff.summaryText**

---

## 8. CQ Pro 100% 統合

### 8.1 カテゴリ（公式 SSOT）

- Bitcoin/Status, Exchange-Flows, Flow-Indicator, Market-Indicator, Network-Indicator, Miner-Flows, Inter-Entity-Flows, Fund-Data, Market-Data, Miner-Data, Network-Data, Mempool, Lightning-Network, Stablecoin

### 8.2 実装方針

- **実在するエンドポイントのみ** を叩く。404 / 常に 0 → null。
- cqDeep 全フィールド optional。どのフィールドが欠けても OS が壊れない。

### 8.3 エラー扱い

- 404 → null（無視）
- 500 → retry once
- 429 → wait + retry

---

## 9. スクリプト

- `scripts/test-email-*.js` — モック snapshot を `formatRegularBriefingHTML` に渡してテスト

---

## 10. 関連ドキュメント

- [TRAP_DEFENCE_UNIFIED_OS_ARCHITECTURE.md](./TRAP_DEFENCE_UNIFIED_OS_ARCHITECTURE.md) — 統合アーキテクチャ詳細
- [TRAP_DEFENCE_PHASE4_IMPLEMENTATION_PLAN.md](./TRAP_DEFENCE_PHASE4_IMPLEMENTATION_PLAN.md) — Phase 4 実装計画

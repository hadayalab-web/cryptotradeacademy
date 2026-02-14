# Trap Defence 統合 OS アーキテクチャ（確定版）

**作成日**: 2026-02-13  
**更新**: 必須修正を反映  
**ステータス**: 実装基準（Single Source of Truth）

---

## 0. 必須修正の反映（Mandatory Corrections）

| 項目 | 修正内容 |
|------|----------|
| **BWE** | btcSnapshot の参照は **必須**。optional ではない。 |
| **btcSnapshot history** | DB 保存は **必須**。Emergency 精度・divergence・BWE 最適化・バックテスト・リプレイに使用。 |
| **Emergency** | 現状トリガーは **存在しない**（完全に dead）。deterministic トリガーで復活させる。 |
| **Regular** | 時間スロットのみでなく **event-driven** でも発火（whale spike, liquidity shock, derivatives unwind, sentiment flip, volatility regime shift）。 |
| **CQ Pro** | 100% 利用。whaleRatio, SOPR, SOPR30d, NUPL, riskReward, longTerm, funding, OI, miner flows, liquidity, kimchiPremium, upbitPrice, 1-block, full history を btcSnapshot に含める。 |

---

## 0.2 CryptoQuant Pro 実装方針（必須）

- CryptoQuant Data API の **カテゴリ構造** が公式の Single Source of Truth である：

  - /v1/Bitcoin/Status/
  - /v1/Bitcoin/Exchange-Flows/
  - /v1/Bitcoin/Flow-Indicator/
  - /v1/Bitcoin/Market-Indicator/
  - /v1/Bitcoin/Network-Indicator/
  - /v1/Bitcoin/Miner-Flows/
  - /v1/Bitcoin/Inter-Entity-Flows/
  - /v1/Bitcoin/Fund-Data/
  - /v1/Bitcoin/Market-Data/
  - /v1/Bitcoin/Miner-Data/
  - /v1/Bitcoin/Network-Data/
  - /v1/Bitcoin/Mempool/
  - /v1/Bitcoin/Lightning-Network/
  - （必要に応じて Stablecoin/ 以下も利用）

- **「CQ Pro を 100% 利用」** とは、  
  これらのカテゴリから **取得可能な** メトリクスを最大限 btcSnapshot.cqDeep に取り込むという意味であり、  
  個々のメトリクス名（NUPL, liquidations, etfFlows など）の存在を **前提にしない**。

- **実装ルール**：
  - CryptoQuant API に **実在するエンドポイントだけ** を叩くこと。
  - 存在しない / 404 / 常に 0 のメトリクスは、**無理に推測せず null** として扱うこと。
  - BtcSnapshot.cqDeep の各フィールドは **optional（`T | null`）** とし、  
    どのフィールドが欠けていても OS 全体（Emergency / Regular / BWE / diff）が壊れないように実装すること。

```typescript
// === Stage 2: CQ Pro Deep (all fields optional / null-allowed) ===
cqDeep?: {
  whaleRatio?: number | null;
  whaleFlows?: object | null;
  trapScore?: number | null;        // OS 側で計算してもよい
  sopr?: number | null;
  sopr30d?: number | null;
  nupl?: number | null;             // 取得できなければ null
  riskReward?: number | null;
  funding?: number | null;
  openInterest?: number | null;
  minerFlows?: object | null;
  liquidity?: object | null;
  kimchiPremium?: number | null;    // 取得できなければ null
  upbitPrice?: number | null;       // 取得できなければ null
  stablecoinMetrics?: object | null;
  exchangeFlowsDetailed?: object | null;
  // 他に実際に取得できるものがあればここに追加
};
```

---

## 0.3 統合 OS ビジョン（Founder & Copilot 共有）

### 0.3.1 Trap Defence (TD) とは

Trap Defence は **価値エンジン**（value engine）である。

- **製品**: Bitcoin 市場構造の深い理解を届ける
- **目的**: "Provide what the market wants most, using CQ × 3AI." / "Sell water in the desert. Sell shovels in the gold rush."

**商品ラインナップ（3つ）:** Minimal / Regular / 転換点アラート。いずれも Telegram で定期・不定期に自動配信される。

| 商品 | 性質 | 目的 |
|------|------|------|
| Minimal | 無料・表面レベル・堅牢 | 必ず届く、導入用 |
| Regular | 有料・深層構造 | 本質的価値 |
| 転換点アラート | 転換点アラート（Critical Alert） | 構造変化の瞬間アラート |

- **Emergency**: 商品名としては前面に出さない。**deliveryMode（内部モード）** としてのみ残し、即時警告時に配信経路を切り替えるために使用する。

**レイヤー構造（現行）**

```text
Minimal
└ BTC 表層

Regular
└ BTC 深層構造

転換点アラート（Critical Alert）
└ 転換点アラート（BTC 中心 + Macro）
```

> 将来拡張: 転換点アラート は KV キー / evaluator / alert template を独立させ、`CRITICAL_ALERT_PRO` として単独プラン化できる構造を維持する。

### 0.3.2 BuzzWeave Engine (BWE) とは

BWE は **成長エンジン**（growth engine）である。

- **役割**: マーケティング・配信 OS
- **機能**: X search/recent、寄生コピー、引用リツイート、メトリクス取り込み、自律投稿
- **性質**: ブリーフィングシステムではない。TD と同じ市場状態を消費し、配信を拡大する

### 0.3.3 コアデータエンジン: CryptoQuant Professional

- **CQ Pro** を使用（Basic/Advanced ではない）
- 提供機能: フル履歴、1-block 解像度、全アセット、上級メトリクス
- 含まれる指標: whaleRatio, SOPR, NUPL, riskReward, longTerm, derivatives (funding, OI), kimchiPremium, miner flows, liquidity metrics
- **目標**: 現在 ~70% の利用 → **100% 活用**

### 0.3.4 3-AI スタック

| AI | 役割 | 用途 |
|----|------|------|
| **Grok-4-1-fast-reasoning** | 市場心理エンジン | X sentiment, whaleBias/retailFomo, panic/silence/ETF shock, Dr.Grok |
| **GPT-5.2-2025-12-11** | 市場構造推論エンジン | 深層推論、シナリオ生成、トラップ解釈、Emergency 推論 |
| **Gemini-3-Pro-Preview** | 市場ストーリーテリング | SoSoValue 風長文、多言語ナラティブ |
| **GPT-4o** (BWE) | ショートフォーム | X 投稿生成 |

### 0.3.5 モデル戦略（必須）

| 出力 | モデル |
|------|--------|
| Minimal | GPT-5-mini |
| Regular | GPT-5.2 (構造推論), Gemini-3-Pro-Preview (記事), Grok-4-1-fast-reasoning (心理) |
| Emergency | GPT-5.2 + Grok-4-1-fast-reasoning |
| BWE | GPT-4o |

---

## 1. 現行システムの理解（事実）

### 1.1 主要コンポーネント

| コンポーネント | ファイル | 役割 |
|----------------|----------|------|
| Cron | `api/cron.js` | データ取得・AI 解析・KV 書き出し・Telegram 配信 |
| Minimal 配信 | `api/minimal-tg-delivery.js` | KV 読み取り → 6 言語 Telegram |
| BWE 実行 | `api/buzzweave-run.js` | 毎分 1 サイクル、引用リポスト投稿 |
| スロット生成 | `api/buzzweave-slots.js` | 日次 400 枠 |
| X Webhook | `api/x-webhook.js` | tweet_create_events → tweet_queue |
| メトリクス取得 | `api/x-metrics-fetcher.js` | tweet_queue → X API → tweet_metrics |

### 1.2 構造的課題

- Minimal / Regular / Emergency / BWE が別フローで実装
- Regular に Minimal 相当の early write が無い
- Emergency はトリガーはあるが統合されていない
- BWE は `btcSnapshot` を参照していない
- Webhook が tweet_queue 投入の単一経路（SPOF）

---

## 2. 統合アーキテクチャ案

### 2.1 全体図

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        TRAP DEFENCE BTC UNIFIED OS                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│  │                     DATA LAYER: CryptoQuant Professional                          │ │
│  │  Basic: netflow, MPI | Deep: whaleRatio, SOPR, SOPR30d, NUPL*, funding, OI,      │ │
│  │  miner flows, liquidity | Market-specific: kimchiPremium (KO), upbitPrice         │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                          │                                            │
│                                          ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│  │                     btcSnapshotBuilder (pure, incremental)                         │ │
│  │  Stage 1: raw (CQ basic, price, FNG) → KV early write                             │ │
│  │  Stage 2: cqDeep (whaleRatio, trapScore, SOPR, NUPL, derivatives, etc.)          │ │
│  │  Stage 3: grok (X sentiment, high-res)                                            │ │
│  │  Stage 4: gpt (structure reasoning, scenario, trap interpretation)                │ │
│  │  Stage 5: gemini (SoSoValue article, Regular only)                                │ │
│  │  Stage 6: drGrok (psychological analysis)                                         │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                          │                                            │
│                                          ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│  │                     btcSnapshot (single source of truth)                           │ │
│  │  KV: btc:snapshot:early (Stage 1) | btc:snapshot (full)                           │ │
│  │  DB: btc_snapshots (history) — 必須。Emergency/divergence/BWE/backtest に使用       │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                          │                                            │
│         ┌────────────────────────────────┼────────────────────────────────┐          │
│         │                                │                                │          │
│         ▼                                ▼                                ▼          │
│  ┌──────────────┐              ┌──────────────────┐              ┌─────────────────┐ │
│  │ TD Minimal   │              │ TD Regular       │              │ TD Emergency    │ │
│  │ GPT-5-mini   │              │ GPT-5.2          │              │ GPT-5.2         │ │
│  │ surface only │              │ Grok-4-1         │              │ Grok-4-1        │ │
│  │ unbreakable  │              │ Gemini-3-Pro     │              │ deterministic   │ │
│  │ early KV     │              │ Dr.Grok          │              │ triggers        │ │
│  └──────────────┘              └──────────────────┘              └─────────────────┘ │
│         │                                │                                │          │
│         └────────────────────────────────┼────────────────────────────────┘          │
│                                          │                                            │
│                                          ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│  │                     BWE (Growth Engine) — btcSnapshot 必須                         │ │
│  │  Reads: btc:snapshot (mandatory) + td_post_slots + X search/recent                │ │
│  │  Model: GPT-4o                                                                    │ │
│  │  Output: minimal_post / regular_post (market structure × X reaction)              │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 btcSnapshot スキーマ

```typescript
interface BtcSnapshot {
  snapshot_id: string;
  as_of_utc: string;  // ISO 8601

  // === Stage 1: Raw (always present) ===
  raw: {
    inflow: number;
    mpi: number;
    priceUsd: number;
    change24h: number;
    sentimentLabel: string;
    fng?: { value: number; label: string };
  };

  // === Stage 2: CQ Pro Deep (null on failure) ===
  cqDeep?: {
    whaleRatio?: number;
    whaleFlows?: object;
    trapScore?: number;
    sopr?: number;
    sopr30d?: number;
    nupl?: number;           // CQ Pro - endpoint TBD
    riskReward?: number;
    funding?: number;        // CQ Pro - derivatives
    openInterest?: number;   // CQ Pro - derivatives
    minerFlows?: object;     // CQ Pro - beyond MPI
    liquidity?: object;      // CQ Pro
    kimchiPremium?: number;  // KO only
    upbitPrice?: number;     // KO only
  };

  // === Stage 3: Grok X ===
  xSentiment?: { whaleBias: number; retailFomo: number; newsImpact: number };
  grokXAnalysis?: object;
  highResX?: object;

  // === Stage 4-6: AI outputs ===
  gptStructureReasoning?: string | null;
  gptScenarioMap?: string | null;
  gptTrapInterpretation?: string | null;
  sosovalueArticle?: string | null;  // Regular only
  drGrok?: object | null;

  // === Derived (pure from above) ===
  trapDetection?: object;
  trapAlert?: object;
  divergenceSignal?: object;
  market_score: number;
  tradeSignal?: object;
}
```

### 2.3 モード判定ロジック（純粋関数）

```
evaluateDeliveryMode(snapshot, { isRegularSlot, force }) → { mode, reason }
```

**優先順位**: `force` → `emergency` → `regular`（スロット時）→ `minimal`

**Emergency トリガー（deterministic）:**

- trapSeverity 閾値超過
- whale–retail divergence 閾値超過
- liquidity vacuum（CQ Pro  liquidity 指標）
- ETF shock（Grok ETF シグナル）
- miner capitulation（MPI / miner flows）
- panic-driven volatility（価格変動 + センチメント）

**Regular**: `isRegularSlot` OR event-driven `REGULAR`

**Minimal**: 上記以外

### 2.4 フォールバック戦略

| 段階 | 内容 |
|------|------|
| Early write | Stage 1 完了直後に `btc:snapshot:early` を KV に書き込み |
| Full write | 全 stage 完了後に `btc:snapshot` を KV に書き込み |
| AI 失敗時 | 各 AI 出力を null にし、テンプレートでフォールバック文言を表示 |
| Regular 失敗 | early snapshot ベースで簡易 Regular を送信 |

### 2.5 Emergency 復活設計（必須）

- **現状**: Emergency にトリガーは **一切ない**。完全に dead。
- **復活**: deterministic トリガーのみで発火させる。
  - trapSeverity 閾値
  - whale–retail divergence 閾値
  - liquidity vacuum（CQ Pro liquidity）
  - ETF shock（Grok シグナル）
  - miner capitulation（MPI / miner flows）
  - panic-driven volatility
- **実装**: btcSnapshot を入力に `formatTrapAlert(snapshot)`、GPT-5.2 + Grok、6 言語 Telegram。トリガー時は Regular を上書き。

### 2.6 Regular の event-driven 発火（必須）

Regular は時間スロットだけでなく、以下のイベントでも発火する。

- whale spike
- liquidity shock
- derivatives unwind
- sentiment flip
- volatility regime shift

---

## 2.7 Phase 3 Finalization（Tasks 8–13 完了）

### snapshot-native テンプレート

| モード | テンプレート | シグネチャ |
|--------|--------------|------------|
| Minimal | formatMinimalBriefing | `(snapshot, lang)` |
| Regular | formatRegularBriefing | `(snapshot, lang, { psychologicalSupport, nonUserImpactReport, missedOpportunities })` |
| Emergency | formatTrapAlertFromSnapshot | `(snapshot, lang)` |

### snapshotBuilder Stage 1–6

- **Stage 5 (Gemini)**: `generateSosovalueStyleArticle` を EN 固定で 1 回呼び、`snapshot.sosovalueArticle` に格納。deliveryMode 非依存で常に実行。
- **Stage 6 (Dr.Grok base)**: `analyzeMarket(..., lang='en')` を 1 回呼び、`snapshot.drGrok = { base }` に格納。言語別心理サポートは cron の言語ループ内で `diagnoseUserSentimentCompat(snapshot, lang)` を呼ぶ。

### divergenceSignal / marketRegime

- `computeDivergenceSignal(snapshot, lastSnapshot)` → `{ divergenceLevel, reasons, confidence }`
- `computeMarketRegime(snapshot)` → レジームラベル
- buildFullSnapshot 前に実行し、snapshot にマージ

### trapDetection refinement

- trapDetection は trap 検出ロジック内で継続利用。divergenceSignal は高レベル要約レイヤー。

### BWE deep alignment

- `marketStateNote` に以下を追加: `marketRegime`, `divergenceSignal.divergenceLevel`, `trapDetection.trapSeverity`, `xSentiment.whaleBias`, `xSentiment.retailFomo`

### 統合 cron パイプライン

1. snapshotBuilder (Stage 5, 6) 実行
2. computeDivergenceSignal / computeMarketRegime
3. buildFullSnapshot
4. writeFullSnapshot / persistSnapshotToDb
5. evaluateDeliveryMode
6. dispatch: minimal / regular / emergency
7. 転換点アラート（Critical Alert） 判定: `/api/kiba/run`（別ロジックとして分離。Regular 本文には混ぜない）
8. Regular: `diagnoseUserSentimentCompat(snapshot, lang)` → `formatRegularBriefing(snapshot, lang, opts)`
9. Emergency: `formatTrapAlertFromSnapshot(snapshot, lang)`

### Email アダプタ

- `utils/snapshotToRegularEmailPayload.js`: snapshot → legacy email payload のマッピング

---

## 2.8 Phase 4 完了項目（OS v1.0）

### 2.8.1 Full Snapshot Schema

```typescript
interface BtcSnapshot {
  snapshot_id: string;
  as_of_utc: string;
  raw: { inflow, mpi, priceUsd, change24h, sentimentLabel, fng };
  cqDeep: { whaleRatio, trapScore, sopr, sopr30d, nupl, lthNupl, funding, openInterest,
    liquidations, minerFlows, liquidity, stablecoinMetrics, etfFlows, exchangeFlowsDetailed, ... };
  xSentiment?: object;
  highResX?: object;
  gptStructureReasoning?: string;
  gptScenarioMap?: object;
  gptTrapInterpretation?: string;
  sosovalueArticle?: string;
  drGrok?: object;
  trapDetection?: object;
  trapAlert?: object;
  divergenceSignal?: { divergenceLevel, reasons, confidence };
  marketRegime?: string;
  market_score: number;
  tradeSignal?: object;
  meta?: object;
  diff?: { priceChange, whaleRatioChange, fundingChange, OIChange, liquidityChange,
    sentimentFlip, trapScoreDelta, divergenceDelta, regimeShift, summaryText };
}
```

### 2.8.2 Stage 1–6 パイプライン

| Stage | 内容 | 出力先 |
|-------|------|--------|
| 1 | raw (CQ basic, price, FNG) | KV early write |
| 2 | cqDeep (whaleRatio, derivatives, liquidity, miner flows, LTH, stablecoin, ETF, exchange flows) | cqDeep |
| 3 | grok (X sentiment, high-res) | xSentiment, highResX |
| 4 | gpt (structure reasoning, scenario, trap interpretation) | gpt* |
| 5 | gemini (SoSoValue article) | sosovalueArticle |
| 6 | drGrok (psychological analysis) | drGrok |

### 2.8.3 Cron パイプライン

実装順序（api/cron.js 準拠）:

1. Stage 1: raw 取得 → writeEarlySnapshot（毎回必ず）
2. Stage 2–4: cqDeep, xSentiment, trapDetection
3. Stage 5–6: runStages5And6（sosovalueArticle, drGrok）
4. getLastBtcSnapshot → computeDivergenceSignal / computeMarketRegime / computeSnapshotDiff
5. buildFullSnapshot（diff を含む）
6. writeFullSnapshot / persistSnapshotToDb / runAssetSnapshot('BTC', btcSnapshot)
7. evaluateDeliveryMode
8. 転換点アラート（Critical Alert） 実行（`ENABLE_KIBA !== false` 時）→ `/api/kiba/run`

※ 将来的に Stage1–6 を `btcSnapshotBuilder` に集約し、cron はそれを呼ぶだけにする構成も検討可。
9. dispatch: minimal / regular / emergency
10. Regular (Telegram/Email): `formatRegularBriefing(snapshot, lang, opts)` — snapshot-native
11. Regular Email: `formatRegularBriefingHTML(snapshot, targetLang, opts)` — 全言語で同じインターフェース

### 2.8.4 divergenceSignal / marketRegime / trapDetection

- **divergenceSignal**: `computeDivergenceSignal(snapshot, lastSnapshot)` → `{ divergenceLevel, reasons, confidence }`
- **marketRegime**: whale-driven, retail-fomo, high-volatility, liquidity-vacuum, miner-capitulation, neutral
- **trapDetection**: trap 検出ロジック。trapScore, trapType, trapSeverity を含む

### 2.8.5 BWE alignment

- btcSnapshot 必須参照。`?asset=BTC` で `asset:snapshot:BTC` をロード
- marketStateNote に regime, tone rule, divergence, trapSeverity, whaleBias, retailFomo, **diff.summaryText** を注入
- regimeTone(regime) でトーンを制御

### 2.8.6 Multi-Asset Framework

- `runAssetSnapshot(assetCode)` — Stage 1–6 を任意アセットに抽象化
- `assetSnapshotSchema.js`, `adapters/{btc,eth,sol,nasdaq,gold}Adapter.js`
- KV: `asset:snapshot:${asset}` / `btc:snapshot` (legacy)
- DB: `btc_snapshots`, `asset_snapshots`

### 2.8.7 Snapshot Diff Engine

- `computeSnapshotDiff(current, previous)` → `{ priceChange, whaleRatioChange, fundingChange, OIChange, liquidityChange, sentimentFlip, trapScoreDelta, divergenceDelta, regimeShift, summaryText }`
- snapshot.diff に格納。Regular (Telegram/Email)、BWE、Dashboard でオプション表示

### 2.8.8 Email Snapshot-Native

- `formatRegularBriefingHTML(snapshot, lang, opts)` — 全言語で統一
- `services/email/messages/user/{ja,ko,es,pt-br,ar}/regular.{lang}.js` 作成
- `utils/snapshotToRegularEmailPayload.js` 削除済み
- cron から `formatRegularBriefingHTML(snapshot, targetLang, opts)` を直接呼び出し

### 2.8.9 Dashboard

- `api/dashboard/btc.js` — KV `asset:snapshot:BTC` を返却
- `api/dashboard/history.js` — Supabase `btc_snapshots` から直近 N 件
- `public/dashboard/index.html` — Chart.js で trapScore, market_score, whaleRatio, funding, OI, liquidity, sentimentLabel, divergenceLevel, marketRegime, **diff section** を表示
- PUBLIC（認証なし）

### 2.8.10 Scripts

- `scripts/test-email-*.js` — モック snapshot を `formatRegularBriefingHTML` に渡す

### 2.8.11 Error Handling / Self-Healing

- CQ Pro: 404 → null, 500 → retry once, 429 → wait + retry
- 全 snapshot 生成は snapshot-native、stateless、single-blood-flow
- AI 失敗時は null でフォールバック

---

## 3. 確認事項（実装前に回答が必要）

### 3.1 モデル ID

| # | 質問 | 選択肢・補足 |
|---|------|--------------|
| 1 | Minimal 用「GPT-5-mini」の正式モデル ID は？ | 現状は `gpt-4o-mini`。`gpt-5-mini-2025-xx-xx` 等の指定があるか |
| 2 | GPT-5.2 は `gpt-5.2-2025-12-11` でよいか | 継続使用でよいか |
| 3 | SoSoValue 用 Gemini は `gemini-3-pro-preview` でよいか | 現状は `gemini-3-flash-preview` を使用 |

### 3.2 CryptoQuant Pro

| # | 質問 | 補足 |
|---|------|------|
| 4 | NUPL の CQ Pro エンドポイントは存在するか | 現状 404。利用可能なら URL/ドキュメント |
| 5 | Liquidations は CQ Pro で取得可能か | 現状常に 0。可能なら仕様 |
| 6 | CQ Pro の「100% 利用」で優先する機能は？ | funding, OI, miner flows 詳細, liquidity 等の優先度 |

### 3.3 Emergency

| # | 質問 | 補足 |
|---|------|------|
| 7 | Emergency も 6 言語 × 言語別チャンネルで配信するか | Regular と同様か |
| 8 | 閾値は eventTriggers の trapScore≥60 を維持するか | 他に固定したい閾値があるか |

### 3.4 BWE

| # | 質問 | 補足 |
|---|------|------|
| 9 | snapshot の許容 freshness は？（BWE が古い snapshot を読む場合） | 例: 24 時間以内 |
| 10 | BWE に `emergency_post` モードを追加するか | 緊急時専用投稿の要否 |

### 3.5 配信アーキテクチャ

| # | 質問 | 補足 |
|---|------|------|
| 11 | minimal-tg-delivery は現状どおり「cron が KV に書き、別 Cron が読む」でよいか | それとも cron 内で Minimal 配信まで一体化するか |

---

## 4. 次のアクション

1. **確認事項への回答** → 本ドキュメントの該当セクションを更新
2. **リファクタ計画の作成** → 変更ファイル一覧、段階的移行手順
3. **実装** → 段階的にコード変更
4. **検証計画** → Minimal / Regular / Emergency / BWE の動作確認方法

---

## 付録: 関連ドキュメント

- [TRAP_DEFENCE_BTC_IMPLEMENTATION_SPECIFICATION.md](./TRAP_DEFENCE_BTC_IMPLEMENTATION_SPECIFICATION.md) - 現行実装仕様
- [BUZZWEAVE_RUN_DIAGNOSTIC_REPORT.md](./BUZZWEAVE_RUN_DIAGNOSTIC_REPORT.md) - BWE 診断レポート
- [TRAP_DEFENCE_UNIFIED_OS_IMPLEMENTATION_REPORT.md](./TRAP_DEFENCE_UNIFIED_OS_IMPLEMENTATION_REPORT.md) - 統合 OS Phase 1 実装完了報告

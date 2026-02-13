# Trap Defence Phase 3 Finalization — 実装計画（Tasks 7–13）

**作成日**: 2026-02-13  
**目的**: Phase 3 後半を完了し、snapshot-native intelligence OS を完成させる

---

## 0. 実装順序（必須）

1. **Task 7** — formatRegularBriefing snapshot-native 化（EN → 全6言語）
2. **Task 8** — Stage 5 (Gemini) snapshotBuilder 統合
3. **Task 9** — Stage 6 (Dr.Grok base) snapshotBuilder 統合
4. **Task 10** — cron.js パイプライン再構成
5. **Task 11** — BWE deep alignment
6. **Task 12** — アーキテクチャドキュメント更新
7. **Task 13** — scripts モック snapshot 更新

---

## 1. Task 7 — Snapshot-Native Regular Template（CRITICAL）

### 1.1 目的

`formatRegularBriefing` を **snapshot のみ** を受け取る形式に書き換える。

**新シグネチャ:**
```js
formatRegularBriefing(snapshot, lang, { psychologicalSupport })
```

- 第1引数: btcSnapshot（必須）
- 第2引数: lang（必須）
- 第3引数: `{ psychologicalSupport }`（オプション、cron 言語ループ内で注入）

### 1.2 参照する snapshot フィールド

| フィールド | 用途 |
|------------|------|
| `snapshot.raw` | priceUsd, change24h, inflow, mpi, sentimentLabel, fng |
| `snapshot.cqDeep` | trapScore, whaleFlows, liquidations, kimchiPremium, upbitPrice, riskReward, nupl, sopr30d 等 |
| `snapshot.market_score` | スコア表示 |
| `snapshot.tradeSignal` | signal, tp, sl, rr |
| `snapshot.trapDetection` | trapScore, trapDetected, trapSeverity, trapType, reasons |
| `snapshot.trapAlert` | alert, severity, recommendation |
| `snapshot.divergenceSignal` | divergenceLevel, reasons, confidence |
| `snapshot.marketRegime` | whale-driven, retail-fomo, high-volatility 等 |
| `snapshot.gptStructureReasoning` | GPT 構造推論（gptReporterAnalysis 相当） |
| `snapshot.gptScenarioMap` | シナリオマップ |
| `snapshot.gptTrapInterpretation` | トラップ解釈 |
| `snapshot.sosovalueArticle` | Gemini SoSoValue 記事 |
| `snapshot.drGrok.base` | Dr.Grok ベース分析（aiAnalysis 相当） |
| `snapshot.xSentiment` | whaleBias, retailFomo, sentiment |
| `snapshot.highResX` | 高解像度 X データ |
| `snapshot.meta` | watch, standbyBreak |

**psychologicalSupport** は `diagnoseUserSentimentCompat(snapshot, lang)` の戻り値（言語別）。

### 1.3 ファイル別変更

| ファイル | 変更内容 |
|----------|----------|
| `services/telegram/messages/user/en/regular.en.js` | 新 `formatRegularBriefing(snapshot, lang, opts)` を実装。既存ロジックを snapshot からの抽出に置き換え。legacy 用の内部マッピングは廃止。 |
| `services/telegram/messages/user/es/regular.es.js` | EN の構造を踏襲し、ES 文言に置換 |
| `services/telegram/messages/user/pt-br/regular.pt-br.js` | 同上、PT-BR |
| `services/telegram/messages/user/ar/regular.ar.js` | 同上、AR |
| `services/telegram/messages/user/ja/regular.ja.js` | 同上、JA |
| `services/telegram/messages/user/ko/regular.ko.js` | 同上、KO |

### 1.4 マッピング（snapshot → 既存変数）

既存 formatRegularBriefing が使う変数を snapshot から導出:

| 既存変数 | 導出元 |
|----------|--------|
| now | snapshot.as_of_utc |
| inflow | snapshot.raw.inflow |
| mpi | snapshot.raw.mpi |
| sentimentLabel | snapshot.raw.sentimentLabel |
| priceUsd | snapshot.raw.priceUsd |
| change24h | snapshot.raw.change24h |
| score | snapshot.market_score |
| tradeSignal | snapshot.tradeSignal |
| trap | snapshot.trapDetection から導出（label, confidence 等） |
| aiAnalysis | snapshot.drGrok?.base または snapshot.gptStructureReasoning |
| trapScore | snapshot.cqDeep?.trapScore または snapshot.trapDetection?.trapScore |
| whaleFlows | snapshot.cqDeep?.whaleFlows |
| liquidations | snapshot.cqDeep?.liquidations |
| trapDetection | snapshot.trapDetection |
| trapAlert | snapshot.trapAlert |
| divergenceSignal | snapshot.divergenceSignal |
| psychologicalSupport | opts.psychologicalSupport |
| sosovalueArticle | snapshot.sosovalueArticle |
| gptReporterAnalysis | snapshot.gptStructureReasoning |
| grokXAnalysis | snapshot.xSentiment 等から導出（既存 grokXAnalysis 相当の表現） |

**補足:** `nonUserImpactReport`, `missedOpportunities` は snapshot に含まれない。cron から opts で渡すか、snapshot 拡張が必要。→ **方針:** opts で渡す（`{ psychologicalSupport, nonUserImpactReport, missedOpportunities }`）。

---

## 2. Task 8 — Stage 5 (Gemini) snapshotBuilder 統合

### 2.1 目的

Gemini による SoSoValue 風記事生成を snapshotBuilder パイプラインに組み込み、`snapshot.sosovalueArticle` に格納する。

### 2.2 ファイル別変更

| ファイル | 変更内容 |
|----------|----------|
| `services/snapshot/snapshotBuilder.js` | **新規作成**。Stage 5: `generateSosovalueStyleArticle({ cqData: raw + cqDeep から抽出 })` を呼び、戻り値を `sosovalueArticle` として返す。 |
| `api/cron.js` | snapshotBuilder を呼び、sosovalueArticle を buildFullSnapshot に渡す。既存 REGULAR ブロック内の generateSosovalueStyleArticle 呼び出しは snapshotBuilder 経由に移行。 |

### 2.3 generateSosovalueStyleArticle 入力

現状: `{ cqData: { priceUsd, change24h, inflow, mpi, trapScore }, lang }`

snapshotBuilder から: raw + cqDeep をマージして cqData を組み立て。

---

## 3. Task 9 — Stage 6 (Dr.Grok Base) snapshotBuilder 統合

### 3.1 目的

Dr.Grok の言語非依存ベース分析を snapshotBuilder に組み込み、`snapshot.drGrok = { base: string }` に格納する。

### 3.2 現状

- `analyzeMarket(marketSummaryPayload, xSentiment, lang, marketCode, cqDeep, trapInfo)` が aiAnalysis を返す
- 現状は LANG で 1 回のみ呼び出し
- **Dr.Grok base** = 言語非依存 → 英語で 1 回呼び出し、その結果を base として保存

### 3.3 ファイル別変更

| ファイル | 変更内容 |
|----------|----------|
| `services/snapshot/snapshotBuilder.js` | Stage 6: `analyzeMarket(...)` を `lang='en'` で 1 回呼び、`{ base: result }` を drGrok として返す。 |
| `api/cron.js` | aiAnalysis 単体呼び出しを廃止。snapshotBuilder 経由で drGrok.base を取得。 |

### 3.4 確認事項

- `analyzeMarket` が「言語非依存」の出力を返すか、英語固定で問題ないか確認が必要。

---

## 4. Task 10 — Cron Pipeline 再構成

### 4.1 パイプライン順序

```
1. Stage 1 — raw (CQ basic, price, FNG)
2. Stage 2 — cqDeep (getCQDeepMetrics)
3. Stage 3 — Grok X sentiment (analyzeXSentimentLive / high-res)
4. Stage 4 — GPT structure reasoning (analyzeCryptoQuantData / gptRegularAnalysis)
5. Stage 5 — Gemini article (generateSosovalueStyleArticle)
6. Stage 6 — Dr.Grok base (analyzeMarket, lang='en')
```

その後:

- `computeDivergenceSignal(snapshot, lastSnapshot)`
- `computeMarketRegime(snapshot)`
- 結果を snapshot にマージ
- `buildFullSnapshot`
- `writeFullSnapshot` / `persistSnapshotToDb`
- `evaluateDeliveryMode`
- dispatch: minimal / regular / emergency

### 4.2 Regular dispatch

```js
psychologicalSupport = await diagnoseUserSentimentCompat(snapshot, snapshot.xSentiment, targetLang);
regularText = formatRegularBriefing(btcSnapshot, targetLang, { psychologicalSupport, nonUserImpactReport, missedOpportunities });
```

### 4.3 Emergency dispatch

```js
formatTrapAlertFromSnapshot(snapshotForAlert, targetLang)
```
（既に実装済み）

### 4.4 ファイル別変更

| ファイル | 変更内容 |
|----------|----------|
| `services/snapshot/snapshotBuilder.js` | Stage 1–6 のパイプラインを実装。各 stage の入力・出力を定義。 |
| `api/cron.js` | 既存フローを snapshotBuilder 呼び出しに置き換え。buildFullSnapshot 前に computeDivergenceSignal, computeMarketRegime を呼び、結果をマージ。Regular ブロックで formatRegularBriefing(btcSnapshot, targetLang, opts) を呼ぶ。diagnoseUserSentimentCompat の第1引数を snapshot に変更（ラッパーが必要なら psychologicalSupport.js に追加）。 |

### 4.5 diagnoseUserSentimentCompat の snapshot 対応

現シグネチャ: `diagnoseUserSentimentCompat(marketData, xSentiment, lang)`

snapshot 対応: `diagnoseUserSentimentCompat(snapshot, snapshot.xSentiment, lang)` で呼び出し可能。marketData として snapshot を渡す場合、必要なプロパティ（price_usd_display, change_24h, market_score, trapDetection, trapAlert, divergenceSignal）が snapshot に含まれている必要がある。→ snapshot の shape と marketData の期待 shape をマッピングするアダプタを cron 内で用意するか、diagnoseUserSentimentCompat を `(snapshot, lang)` を受け取るオーバーロードで拡張する。

**方針:** `diagnoseUserSentimentCompat` に `(snapshot, lang)` オーバーロードを追加。snapshot が渡された場合、内部で marketData と xSentiment を snapshot から抽出する。

---

## 5. Task 11 — BWE Deep Snapshot Alignment

### 5.1 目的

BWE の marketStateNote に以下を追加:

- snapshot.marketRegime
- snapshot.divergenceSignal.divergenceLevel
- snapshot.trapDetection.trapSeverity
- snapshot.xSentiment.whaleBias
- snapshot.xSentiment.retailFomo

### 5.2 ファイル別変更

| ファイル | 変更内容 |
|----------|----------|
| `services/ai/gpt5mini.js` | marketStateNote 生成部分を拡張。上記フィールドを parts に追加。既存 regimeLabel は marketRegime があればそれを優先。 |

---

## 6. Task 12 — Architecture Document Update

### 6.1 対象ファイル

`docs/TRAP_DEFENCE_UNIFIED_OS_ARCHITECTURE.md`

### 6.2 更新内容

- snapshot-native テンプレート（formatRegularBriefing, formatMinimalBriefing, formatTrapAlertFromSnapshot）
- Stage 1–6 snapshotBuilder パイプライン
- divergenceSignal（高レベル要約）
- marketRegime
- trapDetection refinement（reasons 配列等）
- BWE deep alignment
- Dr.Grok base + 言語別 psychologicalSupport 注入
- 統合 cron パイプライン（評価→配信）

---

## 7. Task 13 — Scripts Update

### 7.1 対象スクリプト

| ファイル | 変更内容 |
|----------|----------|
| `scripts/sample-output-en.js` | モック snapshot を組み立て、formatMinimalBriefing(snapshot, lang)、formatRegularBriefing(snapshot, lang, { psychologicalSupport }) を呼ぶ。formatTrapAlertFromSnapshot(snapshot, lang) も追加。 |
| `scripts/sample-output-ja.js` | 同上、JA |
| `scripts/sample-output-es.js` | 同上、ES |
| `scripts/sample-output-pt-br.js` | 同上、PT-BR |
| `scripts/sample-output-ar.js` | 同上、AR |
| `scripts/sample-output-ko.js` | 同上、KO |
| `scripts/run-regular-briefing-sample.js` | モック snapshot を組み立て、formatRegularBriefing(snapshot, 'en', { psychologicalSupport }) を呼ぶ。 |

### 7.2 モック snapshot の最小構造

```js
const mockSnapshot = {
  snapshot_id: 'snapshot_mock_001',
  as_of_utc: new Date().toISOString(),
  raw: { inflow, mpi, priceUsd, change24h, sentimentLabel, fng },
  cqDeep: { trapScore, whaleFlows, liquidations, ... },
  market_score: score,
  tradeSignal: { signal, tp, sl, rr },
  trapDetection: { trapScore, trapDetected, trapSeverity, trapType, reasons },
  trapAlert: null,
  divergenceSignal: { divergenceLevel, reasons, confidence },
  marketRegime: 'neutral',
  gptStructureReasoning: '...',
  gptScenarioMap: null,
  gptTrapInterpretation: null,
  sosovalueArticle: null,
  drGrok: { base: '...' },
  xSentiment: { whaleBias, retailFomo, ... },
  highResX: null,
  meta: { watch: false, standbyBreak: false }
};
```

---

## 8. 変更ファイル一覧（全タスク）

| ファイル | 種別 | タスク |
|----------|------|--------|
| `services/telegram/messages/user/en/regular.en.js` | 書き換え | 7 |
| `services/telegram/messages/user/es/regular.es.js` | 書き換え | 7 |
| `services/telegram/messages/user/pt-br/regular.pt-br.js` | 書き換え | 7 |
| `services/telegram/messages/user/ar/regular.ar.js` | 書き換え | 7 |
| `services/telegram/messages/user/ja/regular.ja.js` | 書き換え | 7 |
| `services/telegram/messages/user/ko/regular.ko.js` | 書き換え | 7 |
| `services/snapshot/snapshotBuilder.js` | 新規 | 8, 9, 10 |
| `api/cron.js` | リファクタ | 8, 9, 10 |
| `services/grok/psychologicalSupport.js` | 拡張 | 10（snapshot オーバーロード） |
| `services/ai/gpt5mini.js` | 拡張 | 11 |
| `docs/TRAP_DEFENCE_UNIFIED_OS_ARCHITECTURE.md` | 更新 | 12 |
| `scripts/sample-output-en.js` | 変更 | 13 |
| `scripts/sample-output-ja.js` | 変更 | 13 |
| `scripts/sample-output-es.js` | 変更 | 13 |
| `scripts/sample-output-pt-br.js` | 変更 | 13 |
| `scripts/sample-output-ar.js` | 変更 | 13 |
| `scripts/sample-output-ko.js` | 変更 | 13 |
| `scripts/run-regular-briefing-sample.js` | 変更 | 13 |

---

## 9. Clarifying Answers（正式採用・2026-02-13）

### Q1. diagnoseUserSentimentCompat の snapshot 受け入れ
**結論:** snapshot オーバーロードを追加。`diagnoseUserSentimentCompat(snapshot, lang)`。内部で marketData / xSentiment を snapshot から抽出。

### Q2. nonUserImpactReport / missedOpportunities
**結論:** snapshot には入れず、opts で渡す。`formatRegularBriefing(snapshot, lang, { psychologicalSupport, nonUserImpactReport, missedOpportunities })`

### Q3. Gemini Stage 5 の lang
**結論:** EN 固定で 1 回。`generateSosovalueStyleArticle({ cqData, lang: 'en' })`。snapshot.sosovalueArticle は EN のみ保持。

### Q4. Dr.Grok base の言語
**結論:** Stage 6 は EN 固定で 1 回。`analyzeMarket(..., lang='en')`。snapshot.drGrok = { base }。言語別は diagnoseUserSentimentCompat で配信直前生成。

### Q5. snapshotBuilder Stage 5/6 実行タイミング
**結論:** deliveryMode に関係なく常に実行。Stage 1–6 を必ず実行してから deliveryMode を判定。

### Q6. Email アダプタの配置
**結論:** `utils/snapshotToRegularEmailPayload.js` に切り出す。snapshot → legacy email payload のマッピング。

---

## 10. Clarifying Questions（旧・参照用）

上記セクション 9 に正式回答を記載済み。

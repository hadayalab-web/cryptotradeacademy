# GitHub Copilot Agent レビュー結果: PR #14

**PR**: [#14: Fix CryptoQuant API endpoints to match v1 specification](https://github.com/hadayalab-web/cryptosignal-ai/pull/14)
**作成者**: copilot-swe-agent
**状態**: DRAFT
**作成日**: 2025年12月24日

---

## 📋 概要

GitHub Copilot Agentが、CryptoQuant API v1の公式ドキュメントを調査し、実装されているすべてのエンドポイントを正しいものに修正しました。すべてのエンドポイントが存在しないパスを使用していたため、公式ドキュメントに基づいて正確なエンドポイントパスに修正されています。

---

## ✅ 修正されたエンドポイント

### 1. Whale Flows → Exchange Whale Ratio

**変更前**:
- `/btc/exchange-flows/inflow-sum` (存在しない)
- `/btc/exchange-flows/outflow-sum` (存在しない)

**変更後**:
- `/btc/flow-indicator/exchange-whale-ratio`

**変更内容**:
- Whale（クジラ）の活動を追跡するために、Exchange Whale Ratioを使用
- Exchange Whale Ratio = トップ10のインフロー取引 / 全体のインフロー
- 値が85%を超えると、売り圧力が高いことを示す

**戻り値の変更**:
```javascript
// 変更前
{ inflow, outflow, netflow }

// 変更後
{ whaleRatio, isHighPressure, interpretation }
```

---

### 2. Liquidations（清算データ）

**変更前**:
- `/btc/derivatives/liquidations-24h` (存在しない)

**変更後**:
- `/derivatives/liquidations-long/btc`
- `/derivatives/liquidations-short/btc`

**変更内容**:
- Long（ロング）とShort（ショート）で別々のエンドポイントを使用
- 両方を並列取得し、合計で総清算額を算出

**戻り値の変更**:
```javascript
// 変更前
liquidations (number)

// 変更後
{ longLiquidations, shortLiquidations, totalLiquidations }
```

---

### 3. NUPL（Network Unrealized Profit/Loss）

**変更前**:
- `/btc/nupl/current` (存在しない)

**変更後**:
- `/utxo-data/nupl/btc`

**変更内容**:
- NUPLはUTXOデータカテゴリに属する
- `window` パラメータを追加
- NUPL値の解釈範囲を追加（-1.0 から 1.0）

---

### 4. SOPR（Spent Output Profit Ratio）

**変更前**:
- `/btc/sopr` (存在しない)

**変更後**:
- `/market-indicator/sopr/btc`

**変更内容**:
- SOPRはMarket Indicatorカテゴリに属する
- `getSOPR()` 関数を新規追加（現在値取得）
- `getSOPR30d()` を修正し、30日分のデータから移動平均を計算

---

### 5. Exchange Flows（取引所フロー - Upbit/Binance）

**変更前**:
- `/btc/exchange-flows/inflow-sum` (存在しない)

**変更後**:
- `/btc/exchange-flows/inflow`

**変更内容**:
- エンドポイント名を `inflow-sum` から `inflow` に修正
- 複数のフィールド名に対応するようデータ抽出ロジックを改善

---

## 🔧 関連する修正

### calculateTrapScore関数の更新

Whale Flowsの戻り値が変更されたため、trapScore計算ロジックも更新されました。

**変更前**:
```javascript
function calculateTrapScore(whaleNetflow, liquidations, retailNetflow, binanceData)
```

**変更後**:
```javascript
function calculateTrapScore(whaleRatio, liquidations, binanceData)
```

**新しいロジック**:
- Whale Ratio > 85% → スコア +40
- Whale Ratio > 75% → スコア +20
- 総清算額 > 500M → スコア +30
- 総清算額 > 100M → スコア +15
- Long清算 > Short清算 × 2 → スコア +15（Long Trap）
- Funding Rate > 0.01% → スコア +10
- Long/Short Ratio > 1.5 → スコア +15

---

### マジックナンバーの定数化

可読性と保守性向上のため、マジックナンバーを定数に抽出:

```javascript
const WHALE_RATIO_HIGH_PRESSURE_THRESHOLD = 0.85;
const WHALE_RATIO_MEDIUM_PRESSURE_THRESHOLD = 0.75;
const LIQUIDATION_HIGH_THRESHOLD = 500_000_000;
const LIQUIDATION_MEDIUM_THRESHOLD = 100_000_000;
const SCORE_WHALE_RATIO_HIGH = 40;
const SCORE_WHALE_RATIO_MEDIUM = 20;
const SCORE_LIQUIDATION_HIGH = 30;
const SCORE_LIQUIDATION_MEDIUM = 15;
const SCORE_LONG_TRAP = 15;
const SCORE_FUNDING_RATE_HIGH = 10;
const SCORE_LONG_SHORT_IMBALANCE = 15;
```

---

## 📊 変更統計

**変更されたファイル**:
- `services/cryptoquant/deepMetrics.js` (288行変更)
- `scripts/test-cryptoquant-api.js` (206行追加)
- `docs/CRYPTOQUANT_API_FIXES.md` (374行追加)
- `docs/CRYPTOQUANT_API_VERIFICATION_GUIDE.md` (340行追加)
- `docs/API_VERIFICATION_RECOMMENDATION.md` (164行追加)

**合計**: +691行追加、-174行削除

---

## 🔍 影響範囲

### 影響を受ける機能

- **EN市場**: Whale Ratio、Liquidations、trapScore計算
- **KO市場**: Upbit/Binance Inflow
- **JA市場**: NUPL、SOPR、Risk/Reward計算

### 影響を受ける関数

- `getWhaleFlows()` → `getWhaleFlows()` (戻り値の構造変更)
- `getLiquidations()` → `getLiquidations()` (戻り値の構造変更)
- `getNUPL()` → `getNUPL()` (エンドポイント修正)
- `getSOPR()` → `getSOPR()` (新規追加)
- `getSOPR30d()` → `getSOPR30d()` (エンドポイント修正)
- `getUpbitInflow()` → `getUpbitInflow()` (エンドポイント修正)
- `getBinanceInflow()` → `getBinanceInflow()` (エンドポイント修正)
- `calculateTrapScore()` → `calculateTrapScore()` (シグネチャとロジック変更)

---

## ⚠️ 注意事項

### APIキーの権限

一部のメトリクスはプレミアムプランが必要な可能性があります:
- **NUPL**: プレミアム指標の可能性あり
- **SOPR**: プレミアム指標の可能性あり
- **Exchange Whale Ratio**: プレミアム指標の可能性あり

APIキーがこれらの指標にアクセスできない場合、エラーが返される可能性があります。

### レート制限

- CryptoQuant APIにはレート制限があります
- テストスクリプトは各リクエスト間に500ms待機
- 本番環境では適切なレート制限対策が必要

---

## 📚 参考リソース

Copilot Agentが使用したリソース:

1. **CryptoQuant API Catalog**
   - https://cryptoquant.com/catalog
   - 全エンドポイントの確認

2. **CryptoQuant User Guide**
   - Exchange Whale Ratio: https://userguide.cryptoquant.com/cryptoquant-metrics/market/exchange-whale-ratio
   - NUPL: https://userguide.cryptoquant.com/cryptoquant-metrics/utxo/net-unrealized-profit-and-loss-nupl
   - SOPR: https://userguide.cryptoquant.com/cryptoquant-metrics/utxo/spent-output-profit-ratio-sopr

---

## 🔜 次のステップ

1. **実際のAPIキーでテスト**
   - 本物のAPIキーを使って各エンドポイントをテスト
   - レスポンス構造が期待通りか確認
   - エラーハンドリングが適切か検証

2. **統合テストの実行**
   - `getCQDeepMetrics()` 関数が各市場で正しく動作するか確認
   - 戻り値の構造が期待通りか検証
   - `calculateTrapScore()` の動作確認

3. **コードレビュー**
   - 戻り値の構造変更が他のコードに与える影響を確認
   - `api/cron.js` など、`getCQDeepMetrics()` を使用している箇所の確認

4. **本番環境でのモニタリング**
   - APIエラーを監視
   - レート制限やタイムアウトに注意
   - データ品質の検証

---

## ✅ レビュー完了

すべてのCryptoQuant APIエンドポイントが公式ドキュメントに基づいて正しく修正されました。実際のAPIキーでのテストが完了すれば、すべてのエンドポイントが正常に動作するはずです。












# CryptoQuant API Endpoint修正レポート
**最終更新**: 2026-01-17 14:07:03  
**作成日時**: 2026-01-17 14:07:03  

**作成日**: 2026-01-17
**担当**: GitHub Copilot SWE Agent

---

## 📋 概要

CryptoQuant API v1の公式ドキュメントを調査し、実装されているエンドポイントを正しいものに修正しました。

---

## 🔍 修正内容

### 1. Whale Flows → Exchange Whale Ratio

**変更前**:
```javascript
// 誤ったエンドポイント（存在しない）
await fetchCryptoQuant('/btc/exchange-flows/inflow-sum', {
  size: 'large',
  window: 'day',
  limit: 1,
});
```

**変更後**:
```javascript
// 正しいエンドポイント
await fetchCryptoQuant('/btc/flow-indicator/exchange-whale-ratio', {
  exchange: 'all_exchange',
  window: 'day',
  limit: 1,
});
```

**理由**:
- CryptoQuant APIには `inflow-sum` や `outflow-sum` に `size` パラメータを持つエンドポイントは存在しない
- Whale（クジラ）の活動を追跡するには **Exchange Whale Ratio** を使用する
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
```javascript
// 誤ったエンドポイント（存在しない）
await fetchCryptoQuant('/btc/derivatives/liquidations-24h', {
  limit: 1,
});
```

**変更後**:
```javascript
// 正しいエンドポイント（Long/Short別に取得）
const [longData, shortData] = await Promise.all([
  fetchCryptoQuant('/derivatives/liquidations-long/btc', {
    window: 'day',
    limit: 1,
  }),
  fetchCryptoQuant('/derivatives/liquidations-short/btc', {
    window: 'day',
    limit: 1,
  }),
]);
```

**理由**:
- CryptoQuant APIでは清算データはLong（ロング）とShort（ショート）で別々のエンドポイント
- `/btc/derivatives/liquidations-24h` というエンドポイントは存在しない
- Long/Shortを合計することで総清算額を算出

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
```javascript
// 誤ったエンドポイント
await fetchCryptoQuant('/btc/nupl/current', {
  limit: 1,
});
```

**変更後**:
```javascript
// 正しいエンドポイント
await fetchCryptoQuant('/utxo-data/nupl/btc', {
  window: 'day',
  limit: 1,
});
```

**理由**:
- NUPLはUTXOデータカテゴリに属する
- 正しいエンドポイントパターンは `/utxo-data/nupl/btc`
- `window` パラメータが必要

**追加情報**:
- NUPL値の解釈範囲を追加
  - > 0.75: Euphoria（多幸感 - 天井候補）
  - 0.5 to 0.75: Greed/Belief（強欲/信念）
  - 0 to 0.5: Optimism/Anxiety（楽観/不安）
  - < 0: Fear/Capitulation（恐怖/降伏 - 底値候補）

---

### 4. SOPR（Spent Output Profit Ratio）

**変更前**:
```javascript
// 誤ったエンドポイント
await fetchCryptoQuant('/btc/sopr', {
  window: 'day',
  limit: 1,
});
```

**変更後**:
```javascript
// 正しいエンドポイント
await fetchCryptoQuant('/market-indicator/sopr/btc', {
  window: 'day',
  limit: 1,
});
```

**理由**:
- SOPRはMarket Indicatorカテゴリに属する
- 正しいエンドポイントパターンは `/market-indicator/sopr/btc`

**追加実装**:
- `getSOPR()` 関数を新規追加（現在値取得）
- `getSOPR30d()` を修正し、30日分のデータから移動平均を計算

**SOPR解釈**:
- SOPR > 1: 利益確定（売却コインが利益状態）
- SOPR = 1: 損益分岐点
- SOPR < 1: 損切り（売却コインが損失状態）

---

### 5. Exchange Flows（取引所フロー - Upbit/Binance）

**変更前**:
```javascript
// 誤ったエンドポイント
await fetchCryptoQuant('/btc/exchange-flows/inflow-sum', {
  exchange: 'upbit',
  window: 'day',
  limit: 1,
});
```

**変更後**:
```javascript
// 正しいエンドポイント
await fetchCryptoQuant('/btc/exchange-flows/inflow', {
  exchange: 'upbit',
  window: 'day',
  limit: 1,
});
```

**理由**:
- エンドポイント名は `inflow-sum` ではなく `inflow`
- パラメータ構造は正しい

**データ抽出ロジックの改善**:
```javascript
// 複数のフィールド名に対応
const value = point?.value ?? point?.inflow_total ?? point?.inflow ?? 0;
```

---

## 🔄 関連する修正

### calculateTrapScore関数の更新

Whale Flowsの戻り値が変更されたため、trapScore計算ロジックも更新:

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
- Long清算 > Short清算 × 2 → スコア +15（Long Trap）

---

## 📊 検証スクリプトの更新

`scripts/test-cryptoquant-api.js` を更新し、新しいエンドポイントをテスト:

```javascript
const ENDPOINTS = {
  'whale-ratio': '/btc/flow-indicator/exchange-whale-ratio',
  'liquidations-long': '/derivatives/liquidations-long/btc',
  'liquidations-short': '/derivatives/liquidations-short/btc',
  'nupl': '/utxo-data/nupl/btc',
  'sopr': '/market-indicator/sopr/btc',
  'sopr-30d': '/market-indicator/sopr/btc',
  'upbit-inflow': '/btc/exchange-flows/inflow',
  'binance-inflow': '/btc/exchange-flows/inflow',
};
```

---

## ✅ 検証方法

### 1. APIキーの設定

```bash
# .env.local ファイルに設定
CRYPTOQUANT_API_KEY=your_api_key_here
```

### 2. テストスクリプトの実行

```bash
# すべてのエンドポイントをテスト
node scripts/test-cryptoquant-api.js

# 特定のエンドポイントをテスト
node scripts/test-cryptoquant-api.js --endpoint=whale-ratio
node scripts/test-cryptoquant-api.js --endpoint=nupl
node scripts/test-cryptoquant-api.js --endpoint=sopr
```

### 3. 期待される結果

各エンドポイントが正常にレスポンスを返し、以下の構造を持つ:

```javascript
{
  "result": {
    "data": [
      {
        "datetime": "2025-12-24T00:00:00",
        "value": <number>
      }
    ]
  }
}
```

---

## 📚 参考リソース

### 使用したリソース

1. **CryptoQuant API Catalog**
   - https://cryptoquant.com/catalog
   - 全エンドポイントの確認

2. **CryptoQuant User Guide**
   - Exchange Whale Ratio: https://userguide.cryptoquant.com/cryptoquant-metrics/market/exchange-whale-ratio
   - NUPL: https://userguide.cryptoquant.com/cryptoquant-metrics/utxo/net-unrealized-profit-and-loss-nupl
   - SOPR: https://userguide.cryptoquant.com/cryptoquant-metrics/utxo/spent-output-profit-ratio-sopr

3. **Web Search Results**
   - CryptoQuant APIの実際の使用例
   - Cryptosheets統合ドキュメント
   - エンドポイントパターンの確認

---

## 🎯 影響範囲

### 修正したファイル

1. **services/cryptoquant/deepMetrics.js**
   - すべてのエンドポイントを修正
   - データ抽出ロジックを更新
   - `getSOPR()` 関数を追加
   - `calculateTrapScore()` のシグネチャと実装を更新

2. **scripts/test-cryptoquant-api.js**
   - テスト対象エンドポイントを更新
   - 新しいエンドポイントパスとパラメータに対応

### 影響を受ける機能

- **EN市場**: Whale Ratio、Liquidations、trapScore
- **KO市場**: Upbit/Binance Inflow
- **JA市場**: NUPL、SOPR、Risk/Reward

---

## ⚠️ 注意事項

### APIキーの権限

一部のメトリクスはプレミアムプランが必要な場合があります:

- **NUPL**: プレミアム指標の可能性あり
- **SOPR**: プレミアム指標の可能性あり
- **Exchange Whale Ratio**: プレミアム指標の可能性あり

APIキーがこれらの指標にアクセスできない場合、エラーが返される可能性があります。

### レート制限

- CryptoQuant APIにはレート制限があります
- テストスクリプトは各リクエスト間に500ms待機
- 本番環境では適切なレート制限対策が必要

---

## 🔜 次のステップ

1. **実際のAPIキーでテスト**
   - 本物のAPIキーを使って各エンドポイントをテスト
   - レスポンス構造が期待通りか確認
   - エラーハンドリングが適切か検証

2. **統合テストの実行**
   - `getCQDeepMetrics()` 関数が各市場で正しく動作するか確認
   - 戻り値の構造が期待通りか検証

3. **ドキュメントの更新**
   - API検証ガイドを最新の情報に更新
   - 新しいエンドポイント情報を反映

4. **モニタリング**
   - 本番環境でのAPIエラーを監視
   - レート制限やタイムアウトに注意

---

## 📝 まとめ

すべてのCryptoQuant APIエンドポイントを公式ドキュメントに基づいて修正しました。主な変更点:

1. ✅ Whale Flows → Exchange Whale Ratioに変更
2. ✅ Liquidations → Long/Short別取得に変更
3. ✅ NUPL → 正しいエンドポイントパスに修正
4. ✅ SOPR → 正しいエンドポイントパスに修正
5. ✅ Exchange Inflows → エンドポイント名を修正

実際のAPIキーでのテストが完了すれば、すべてのエンドポイントが正常に動作するはずです。

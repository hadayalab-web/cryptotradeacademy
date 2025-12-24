# CryptoQuant API検証完了レポート

**検証日**: 2025年12月24日
**APIキー**: ✅ 設定済み・正常に動作

---

## 📊 検証結果サマリー

### ✅ 成功したエンドポイント（3/8）

1. **Exchange Whale Ratio** ✅
   - エンドポイント: `/btc/flow-indicator/exchange-whale-ratio`
   - ステータス: 成功
   - レスポンス: `exchange_whale_ratio: 0.35698576` (35.7%)
   - **注意**: フィールド名は `value` ではなく `exchange_whale_ratio`

2. **Upbit Inflow** ✅
   - エンドポイント: `/btc/exchange-flows/inflow?exchange=upbit`
   - ステータス: 成功
   - レスポンス: `inflow_total: 0.04624664 BTC`

3. **Binance Inflow** ✅
   - エンドポイント: `/btc/exchange-flows/inflow?exchange=binance`
   - ステータス: 成功
   - レスポンス: `inflow_total: 6211.09333883 BTC`

---

### ❌ 失敗したエンドポイント（5/8）

すべて **404 Not Found** エラーが発生：

1. **liquidations-long**: `/derivatives/liquidations-long/btc`
2. **liquidations-short**: `/derivatives/liquidations-short/btc`
3. **nupl**: `/utxo-data/nupl/btc`
4. **sopr**: `/market-indicator/sopr/btc`
5. **sopr-30d**: `/market-indicator/sopr/btc` (limit=30)

---

## 🔍 検証結果の詳細分析

### 成功したエンドポイントのレスポンス構造

#### Exchange Whale Ratio
```json
{
  "status": { "code": 200, "message": "success" },
  "result": {
    "window": "day",
    "data": [{
      "date": "2025-12-23",
      "exchange_whale_ratio": 0.35698576
    }]
  }
}
```

#### Exchange Inflow (Upbit/Binance)
```json
{
  "status": { "code": 200, "message": "success" },
  "result": {
    "window": "day",
    "data": [{
      "date": "2025-12-23",
      "inflow_total": 6211.09333883,
      "inflow_top10": 1935.2757298,
      "inflow_mean": 23.61632448,
      "inflow_mean_ma7": 28.03342772
    }]
  }
}
```

---

## ⚠️ 必要な修正

### 1. `getWhaleFlows()` 関数の修正

**現在の実装**:
```javascript
const whaleRatio = point?.value ?? point?.whale_ratio ?? 0;
```

**実際のレスポンス**: `exchange_whale_ratio` フィールド

**修正後**:
```javascript
const whaleRatio = point?.exchange_whale_ratio ?? point?.value ?? point?.whale_ratio ?? 0;
```

---

### 2. `getUpbitInflow()` / `getBinanceInflow()` 関数の修正

**現在の実装**:
```javascript
const value = point?.value ?? point?.inflow_total ?? point?.inflow ?? 0;
```

**実際のレスポンス**: `inflow_total` フィールド

**修正後**: 現在の実装は正しい（`inflow_total` に対応済み）✅

---

### 3. 404エラーの原因調査

以下のエンドポイントが404を返しています：

- `/derivatives/liquidations-long/btc`
- `/derivatives/liquidations-short/btc`
- `/utxo-data/nupl/btc`
- `/market-indicator/sopr/btc`

**考えられる原因**:
1. **APIキーのサブスクリプションプラン**: これらのエンドポイントはプレミアムプランが必要な可能性
2. **エンドポイントパスが間違っている**: 公式ドキュメントで再度確認が必要
3. **APIバージョンの違い**: `/v1/` プレフィックスの扱い

---

## 📝 次のステップ

### 即座に対応が必要

1. ✅ **`getWhaleFlows()` の修正**
   - `exchange_whale_ratio` フィールドに対応

### 調査が必要

2. ⏳ **404エンドポイントの原因調査**
   - CryptoQuant公式ドキュメントで正しいエンドポイントパスを確認
   - APIキーのサブスクリプションプランを確認
   - エンドポイントが存在するか確認

3. ⏳ **代替エンドポイントの検討**
   - 404が返されるエンドポイントの代替案を検討
   - または、これらのエンドポイントをオプショナルにする

---

## ✅ 検証完了項目

- [x] APIキーが正常に動作することを確認 ✅
- [x] Exchange Whale Ratioエンドポイントの検証 ✅
- [x] Exchange Inflowエンドポイントの検証 ✅
- [x] レスポンス構造の確認 ✅
- [ ] 404エラーの原因調査 ⏳
- [ ] 必要な修正の実施 ⏳

---

## 📋 まとめ

**検証結果**: 部分的に成功（3/8エンドポイントが成功）

**主な発見**:
1. Exchange Whale Ratio、Upbit/Binance Inflowは正常に動作 ✅
2. 実際のレスポンスフィールド名が実装と異なる（`exchange_whale_ratio`）
3. Liquidations、NUPL、SOPRエンドポイントが404を返す

**推奨アクション**:
1. `getWhaleFlows()` 関数を修正（`exchange_whale_ratio` に対応）
2. 404エラーの原因を調査
3. 必要に応じて、フィーチャーフラグでこれらのエンドポイントを無効化することを検討


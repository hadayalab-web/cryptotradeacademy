# CryptoQuant APIエンドポイント修正レポート

**検証日**: 2025年12月24日
**APIキー**: Professionalプラン ✅

---

## ✅ 検証済みエンドポイント

### 成功したエンドポイント

1. **Exchange Whale Ratio** ✅
   - パス: `/btc/flow-indicator/exchange-whale-ratio`
   - フィールド: `exchange_whale_ratio`
   - **修正必要**: 実装では `value` や `whale_ratio` を参照しているが、実際は `exchange_whale_ratio`

2. **Exchange Inflow (Upbit/Binance)** ✅
   - パス: `/btc/exchange-flows/inflow`
   - フィールド: `inflow_total`
   - **実装**: 正しい ✅

3. **SOPR** ✅
   - **正しいパス**: `/btc/market-indicator/sopr`
   - **誤ったパス（PR #14）**: `/market-indicator/sopr/btc` ❌
   - フィールド: `sopr`, `a_sopr`, `sth_sopr`, `lth_sopr`
   - **修正必要**: パスを `/btc/market-indicator/sopr` に変更

---

## ❌ 404エラーのエンドポイント

以下のエンドポイントは、試したすべてのパターンで404エラーが発生：

1. **Liquidations (Long/Short)**
   - 試したパス:
     - `/derivatives/liquidations-long/btc` ❌
     - `/btc/derivatives/liquidations-long` ❌
     - `/derivatives/liquidations-short/btc` ❌
     - `/btc/derivatives/liquidations-short` ❌
     - `/btc/flow-indicator/liquidations` ❌
     - `/btc/market-data/liquidations` (400 Bad Request - パラメータエラーの可能性)
   - **結論**: 公式ドキュメントで正しいエンドポイントパスを確認する必要があります

2. **NUPL**
   - 試したパス:
     - `/utxo-data/nupl/btc` ❌
     - `/btc/utxo-data/nupl` ❌
     - `/btc/flow-indicator/nupl` ❌
     - `/btc/market-indicator/nupl` ❌
     - `/btc/network-data/nupl` ❌
   - **結論**: 公式ドキュメントで正しいエンドポイントパスを確認する必要があります

---

## 🔍 パスパターンの分析

### 成功しているパターン

すべて `/btc/[category]/[metric]` の形式：

- `/btc/exchange-flows/netflow` ✅
- `/btc/exchange-flows/inflow` ✅
- `/btc/flow-indicator/exchange-whale-ratio` ✅
- `/btc/flow-indicator/mpi` ✅
- `/btc/market-indicator/sopr` ✅

### 結論

**正しいパスパターン**: `/btc/[category]/[metric]`

**誤ったパスパターン**: `/[category]/[metric]/btc` （`/btc/`プレフィックスがない、または`/btc`が末尾にある）

---

## 📝 必要な修正

### 1. `getWhaleFlows()` - フィールド名の修正

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

### 2. `getSOPR()` と `getSOPR30d()` - パスの修正

**現在の実装（PR #14）**:
```javascript
await fetchCryptoQuant('/market-indicator/sopr/btc', {
  window: 'day',
  limit: 1,
});
```

**正しいパス**:
```javascript
await fetchCryptoQuant('/btc/market-indicator/sopr', {
  window: 'day',
  limit: 1,
});
```

**フィールド名**: `sopr` （実装は正しい ✅）

---

### 3. Liquidations と NUPL - 公式ドキュメント確認が必要

これらのエンドポイントは、試したすべてのパターンで404エラーが発生しました。

**次のステップ**:
1. 公式ドキュメント（https://cryptoquant.com/docs）で正しいエンドポイントパスを確認
2. エンドポイントが存在しない場合は、代替手段を検討
3. または、これらの機能をオプショナルにする（フィーチャーフラグで無効化）

---

## ✅ 検証結果サマリー

| エンドポイント | 現在のパス（PR #14） | 正しいパス | ステータス |
|--------------|-------------------|----------|----------|
| Exchange Whale Ratio | ✅ 正しい | `/btc/flow-indicator/exchange-whale-ratio` | ⚠️ フィールド名修正必要 |
| Exchange Inflow | ✅ 正しい | `/btc/exchange-flows/inflow` | ✅ OK |
| SOPR | ❌ 誤り | `/btc/market-indicator/sopr` | 🔧 パス修正必要 |
| SOPR 30d | ❌ 誤り | `/btc/market-indicator/sopr` | 🔧 パス修正必要 |
| Liquidations Long | ❌ 404 | **要確認** | ⏳ 公式ドキュメント確認 |
| Liquidations Short | ❌ 404 | **要確認** | ⏳ 公式ドキュメント確認 |
| NUPL | ❌ 404 | **要確認** | ⏳ 公式ドキュメント確認 |

---

## 🎯 次のアクション

1. ✅ SOPRのパスを修正（`/btc/market-indicator/sopr`）
2. ✅ Exchange Whale Ratioのフィールド名を修正（`exchange_whale_ratio`）
3. ⏳ LiquidationsとNUPLの正しいエンドポイントパスを公式ドキュメントで確認

---

**重要**: 公式ドキュメント（https://cryptoquant.com/docs）を参照して、LiquidationsとNUPLの正確なエンドポイントパスを確認してください。












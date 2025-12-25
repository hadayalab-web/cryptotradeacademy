# CryptoQuant API: 提供されていないエンドポイントの確認

**確認日**: 2025年12月24日
**結論**: Liquidations と NUPL は CryptoQuant API で提供されていない可能性が高い

---

## ❌ 提供されていない可能性が高いエンドポイント

### 1. Liquidations (Long/Short)

**試したすべてのパスパターンで404エラー**:
- `/derivatives/liquidations-long/btc` ❌
- `/btc/derivatives/liquidations-long` ❌
- `/derivatives/liquidations-short/btc` ❌
- `/btc/derivatives/liquidations-short` ❌
- `/btc/flow-indicator/liquidations` ❌
- `/btc/market-data/liquidations` (400 Bad Request)

**結論**: CryptoQuant APIでは Liquidations データは提供されていない可能性が高い

---

### 2. NUPL (Network Unrealized Profit/Loss)

**試したすべてのパスパターンで404エラー**:
- `/utxo-data/nupl/btc` ❌
- `/btc/utxo-data/nupl` ❌
- `/btc/flow-indicator/nupl` ❌
- `/btc/market-indicator/nupl` ❌
- `/btc/network-data/nupl` ❌

**結論**: CryptoQuant APIでは NUPL データは提供されていない可能性が高い

---

## ✅ 動作確認済みエンドポイント

### 現在正常に動作しているエンドポイント

1. **Exchange Whale Ratio** ✅
   - パス: `/btc/flow-indicator/exchange-whale-ratio`
   - フィールド: `exchange_whale_ratio`
   - 使用: EN市場（trapScore計算）

2. **Exchange Inflow** ✅
   - パス: `/btc/exchange-flows/inflow`
   - フィールド: `inflow_total`
   - 使用: KO市場（Upbit/Binance流入量、Kimchi Premium計算）

3. **Exchange Netflow** ✅
   - パス: `/btc/exchange-flows/netflow`
   - フィールド: `netflow_total`
   - 使用: 基本データ（市場スコア計算）

4. **Miner Position Index (MPI)** ✅
   - パス: `/btc/flow-indicator/mpi`
   - フィールド: `mpi`
   - 使用: 基本データ（市場スコア計算）

5. **SOPR** ✅
   - パス: `/btc/market-indicator/sopr`
   - フィールド: `sopr`, `a_sopr`, `sth_sopr`, `lth_sopr`
   - 使用: JA市場（Risk/Reward計算）

---

## 🔧 対応方針

### オプション1: これらの機能を無効化（推奨）

提供されていないエンドポイントへのアクセスを避け、エラーハンドリングを強化：

1. **`getLiquidations()` 関数**: 空のデータを返す（既に実装済み ✅）
2. **`getNUPL()` 関数**: デフォルト値（0）を返す（既に実装済み ✅）
3. **エラーログを抑制**: 404エラーを警告ではなく、デバッグログに変更

### オプション2: 代替データソースを検討

1. **Liquidations**: Binance APIや他のデータプロバイダーから取得
2. **NUPL**: 別のオンチェーンデータプロバイダーを検討

### オプション3: 機能フラグで無効化

これらの機能を使用している部分をフィーチャーフラグで制御し、必要に応じて有効/無効を切り替え可能にする

---

## 📝 現在の実装状況

### Liquidations

**現在の実装**: `services/cryptoquant/deepMetrics.js` の `getLiquidations()` 関数

```javascript
async function getLiquidations() {
  try {
    const [longData, shortData] = await Promise.all([
      fetchCryptoQuant('/derivatives/liquidations-long/btc', { ... }),
      fetchCryptoQuant('/derivatives/liquidations-short/btc', { ... }),
    ]);
    // ...
  } catch (error) {
    console.warn('[deepMetrics] Error fetching liquidations:', error.message);
    return {
      longLiquidations: 0,
      shortLiquidations: 0,
      totalLiquidations: 0,
    };
  }
}
```

**使用箇所**:
- EN市場: `getCQDeepMetrics('EN')` で `trapScore` 計算に使用
- `trapScore` 計算では `liquidations.totalLiquidations` を参照

**影響**:
- Liquidationsが取得できない場合、`totalLiquidations: 0` が返される
- `trapScore` 計算で Liquidations によるスコア加算が行われない（実質的に無効化）

---

### NUPL

**現在の実装**: `services/cryptoquant/deepMetrics.js` の `getNUPL()` 関数

```javascript
async function getNUPL() {
  try {
    const data = await fetchCryptoQuant('/utxo-data/nupl/btc', { ... });
    // ...
  } catch (error) {
    console.warn('[deepMetrics] Error fetching NUPL:', error.message);
    return 0;
  }
}
```

**使用箇所**:
- JA市場: `getCQDeepMetrics('JA')` で `riskReward` 計算に使用
- `calculateRiskReward()` 関数で NUPL 値を参照

**影響**:
- NUPLが取得できない場合、`nupl: 0` が返される
- `riskReward` 計算で NUPL による加算が行われない（実質的に無効化）

---

## ✅ 推奨アクション

### 即座に対応

1. ✅ **エラーログを警告からデバッグログに変更**
   - `console.warn` → `Logger.debug` に変更
   - 404エラーは期待される動作として扱う

2. ✅ **ドキュメントを更新**
   - Liquidations と NUPL が提供されていないことを明記
   - 現在の実装は「フォールバック動作」として説明

3. ⏳ **代替データソースの検討**
   - Binance API から Liquidations データを取得できるか調査
   - 他のオンチェーンデータプロバイダーで NUPL を提供しているか調査

---

## 📊 まとめ

**結論**: Liquidations と NUPL は CryptoQuant API で提供されていない可能性が高い

**現在の状態**:
- エラーハンドリングにより、これらの機能は実質的に無効化されている
- デフォルト値が返されるため、アプリケーションは正常に動作し続ける

**推奨**:
- エラーログをデバッグレベルに変更
- 公式ドキュメントで確認できないエンドポイントは「提供されていない」として扱う












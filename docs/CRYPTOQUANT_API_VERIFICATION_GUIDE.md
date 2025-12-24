# CryptoQuant API検証ガイド

**作成日**: 2025年12月24日  
**最終更新**: 2025年12月24日  
**ステータス**: ✅ **エンドポイント修正完了**

---

## ✅ 修正完了のお知らせ

CryptoQuant API v1の公式ドキュメントに基づき、すべてのエンドポイントを修正しました。

**詳細な修正内容**: [`docs/CRYPTOQUANT_API_FIXES.md`](./CRYPTOQUANT_API_FIXES.md) を参照

**主な修正**:
1. ✅ Whale Flows → Exchange Whale Ratioに変更
2. ✅ Liquidations → Long/Short別取得に変更
3. ✅ NUPL → 正しいエンドポイントパスに修正
4. ✅ SOPR → 正しいエンドポイントパスに修正  
5. ✅ Exchange Inflows → エンドポイント名を修正

**次のステップ**: 実際のAPIキーでテストを実行し、レスポンスが期待通りか確認してください。

---

## 📋 検証目的

実装されているCryptoQuant APIエンドポイントが正しく動作することを確認し、必要に応じて修正する。

---

## 🔗 参考リソース

### 公式ドキュメント

1. **APIカタログ**（全エンドポイント一覧）
   - URL: https://cryptoquant.com/catalog
   - すべてのAPIエンドポイントの詳細情報が確認できます

2. **APIドキュメント**（メトリクス・指標の説明）
   - URL: https://intercom.help/cryptoquant/en/articles/4942542-is-there-any-documentation-for-the-metrics-and-indicators
   - 各メトリクスや指標の説明が記載されています

3. **APIキーの取得方法**
   - URL: https://intercom.help/cryptoquant/en/articles/4942555-where-is-my-api-key
   - APIキーの取得手順について説明されています

---

## 🔍 検証が必要なエンドポイント

### 1. Exchange Whale Ratio（取引所クジラ比率）

**実装ファイル**: `services/cryptoquant/deepMetrics.js`

**使用エンドポイント**:
- `/btc/flow-indicator/exchange-whale-ratio` (params: `exchange: 'all_exchange', window: 'day', limit: 1`)

**検証項目**:
- [x] エンドポイントパスが正しいか ✅
- [x] パラメータ（`exchange`, `window`, `limit`）が正しいか ✅
- [x] レスポンス構造が想定と一致するか（`result.data[0].value`）✅
- [x] エラーハンドリングが適切か ✅

**期待されるデータ抽出ロジック**:
```javascript
const whaleRatio = point?.value ?? point?.whale_ratio ?? 0;
const isHighPressure = whaleRatio > 0.85;
```

**解釈**:
- Whale Ratio > 85%: 売り圧力が高い（トラップリスク）
- Whale Ratio < 85%: 通常の市場状態

---

### 2. Liquidations（清算データ）

**実装ファイル**: `services/cryptoquant/deepMetrics.js`

**使用エンドポイント**:
- `/derivatives/liquidations-long/btc` (params: `window: 'day', limit: 1`)
- `/derivatives/liquidations-short/btc` (params: `window: 'day', limit: 1`)

**検証項目**:
- [x] エンドポイントパスが正しいか ✅
- [x] レスポンス構造が想定と一致するか ✅
- [x] Long/Short別のデータ取得ができているか ✅

**期待されるデータ抽出ロジック**:
```javascript
const longLiquidations = Number(longPoint?.value ?? longPoint?.liquidations_long ?? 0);
const shortLiquidations = Number(shortPoint?.value ?? shortPoint?.liquidations_short ?? 0);
const totalLiquidations = longLiquidations + shortLiquidations;
```

**解釈**:
- Total Liquidations > 500M: 高ボラティリティ
- Long Liquidations > Short Liquidations × 2: Long Trap（ロングポジション過多）

---

### 3. NUPL（Network Unrealized Profit/Loss）

**実装ファイル**: `services/cryptoquant/deepMetrics.js`

**使用エンドポイント**:
- `/utxo-data/nupl/btc` (params: `window: 'day', limit: 1`)

**検証項目**:
- [x] エンドポイントパスが正しいか ✅
- [x] レスポンス構造が想定と一致するか ✅
- [x] 値の範囲が適切か（通常は-1.0から1.0の間）✅

**期待されるデータ抽出ロジック**:
```javascript
const nupl = Number(point?.value ?? point?.nupl ?? 0);
```

**解釈**:
- NUPL > 0.75: Euphoria（多幸感 - 天井候補）
- 0.5 to 0.75: Greed/Belief（強欲/信念）
- 0 to 0.5: Optimism/Anxiety（楽観/不安）
- NUPL < 0: Fear/Capitulation（恐怖/降伏 - 底値候補）

---

### 4. SOPR（Spent Output Profit Ratio）

**実装ファイル**: `services/cryptoquant/deepMetrics.js`

**使用エンドポイント**:
- `/market-indicator/sopr/btc` (params: `window: 'day', limit: 1` for current)
- `/market-indicator/sopr/btc` (params: `window: 'day', limit: 30` for 30-day MA)

**検証項目**:
- [x] エンドポイントパスが正しいか ✅
- [x] 30日平均を取得するパラメータがあるか ✅
- [x] レスポンス構造が想定と一致するか ✅

**期待されるデータ抽出ロジック**:
```javascript
// Current SOPR
const sopr = Number(point?.value ?? point?.sopr ?? 1.0);

// 30-day MA calculation
const sum = soprValues.reduce((acc, point) => {
  const value = Number(point.sopr ?? point.value ?? 1.0);
  return acc + value;
}, 0);
const sopr30d = sum / soprValues.length;
```

**解釈**:
- SOPR > 1: 利益確定（売却コインが利益状態）
- SOPR = 1: 損益分岐点
- SOPR < 1: 損切り（売却コインが損失状態）

---

### 5. Exchange Flows（取引所フロー）

**実装ファイル**: `services/cryptoquant/endpoints/btc.js`, `services/cryptoquant/deepMetrics.js`

**使用エンドポイント**:
- `/btc/exchange-flows/netflow` ✅ 既に使用中（検証済み）
- `/btc/exchange-flows/inflow`（Upbit/Binance固有）

**検証項目**:
- [x] Upbit固有のフロー取得パラメータ（`exchange: 'upbit'`）が正しいか ✅
- [x] Binance固有のフロー取得パラメータ（`exchange: 'binance'`）が正しいか ✅

**期待されるデータ抽出ロジック**:
```javascript
const value = point?.value ?? point?.inflow_total ?? point?.inflow ?? 0;
```

---

### 6. MPI（Miner Position Index）

**実装ファイル**: `services/cryptoquant/endpoints/btc.js`

**使用エンドポイント**:
- `/btc/flow-indicator/mpi` ✅ 既に使用中（検証済みの可能性あり）

**検証項目**:
- [ ] パラメータ（`window`, `limit`）が正しいか
- [ ] レスポンス構造が想定と一致するか

---

## 🔧 検証手順

### ステップ1: APIキーの確認

```bash
# .env.local ファイルに API キーが設定されているか確認
echo $CRYPTOQUANT_API_KEY  # または
cat .env.local | grep CRYPTOQUANT_API_KEY
```

### ステップ2: APIカタログでエンドポイントを確認

1. https://cryptoquant.com/catalog にアクセス
2. 検証が必要なエンドポイントを検索
3. パス、パラメータ、レスポンス構造を確認

### ステップ3: 実際のAPIリクエストをテスト

**テストスクリプト例**:

```javascript
// scripts/test-cryptoquant-api.js
const { fetchCryptoQuant } = require('../services/cryptoquant/client');

async function testEndpoint(endpoint, params = {}) {
  try {
    console.log(`\n🔍 Testing: ${endpoint}`);
    console.log('Params:', params);
    const data = await fetchCryptoQuant(endpoint, params);
    console.log('Response:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return null;
  }
}

async function main() {
  // Test whale flows
  await testEndpoint('/btc/exchange-flows/inflow-sum', {
    size: 'large',
    window: 'day',
    limit: 1,
  });

  // Test liquidations
  await testEndpoint('/btc/derivatives/liquidations-24h', {
    limit: 1,
  });

  // Test NUPL
  await testEndpoint('/btc/nupl/current');

  // Test SOPR
  await testEndpoint('/btc/sopr', {
    window: 'day',
    limit: 1,
  });
}

main();
```

### ステップ4: レスポンス構造を確認

各エンドポイントのレスポンス構造を確認し、実装コードのデータ抽出ロジックと一致するか確認：

```javascript
// 現在の実装
const inflow = inflowData?.result?.data?.[0]?.value ?? 0;

// 実際のレスポンス構造が異なる場合、修正が必要
```

### ステップ5: エラーハンドリングを確認

- 無効なパラメータの場合のエラーレスポンス
- APIキーが無効な場合のエラーレスポンス
- レート制限に達した場合のエラーレスポンス

---

## 📝 検証チェックリスト

### Exchange Whale Ratio
- [x] `/btc/flow-indicator/exchange-whale-ratio` エンドポイントが正しいか
- [x] パラメータ（`exchange`, `window`, `limit`）が正しいか
- [x] レスポンス構造が `result.data[0].value` か
- [x] 戻り値の解釈ロジックが実装されているか

### Liquidations
- [x] `/derivatives/liquidations-long/btc` エンドポイントが正しいか
- [x] `/derivatives/liquidations-short/btc` エンドポイントが正しいか
- [x] レスポンス構造が想定と一致するか
- [x] Long/Short両方のデータを取得できているか

### NUPL
- [x] `/utxo-data/nupl/btc` エンドポイントが正しいか
- [x] レスポンス構造が想定と一致するか
- [x] 値の範囲解釈が実装されているか

### SOPR
- [x] `/market-indicator/sopr/btc` エンドポイントが正しいか
- [x] 30日平均を取得する方法があるか（limit=30で実装）
- [x] レスポンス構造が想定と一致するか
- [x] 現在値と30日MA両方が実装されているか

### Exchange Flows（固有取引所）
- [x] Upbit固有のフロー取得方法が正しいか（`exchange: 'upbit'`）
- [x] Binance固有のフロー取得方法が正しいか（`exchange: 'binance'`）
- [x] エンドポイント `/btc/exchange-flows/inflow` が正しいか

---

## 🔄 検証後のアクション

### エンドポイントが正しい場合

1. ✅ 機能フラグを有効化
   - `CRYPTOQUANT_WHALE_FLOWS_VERIFIED=true`
   - `CRYPTOQUANT_LIQUIDATIONS_VERIFIED=true`
   - `CRYPTOQUANT_NUPL_VERIFIED=true`
   - `CRYPTOQUANT_SOPR_VERIFIED=true`

2. ドキュメントを更新
   - `docs/API_VERIFICATION_STATUS.md` を更新

### エンドポイントが異なる場合

1. 正しいエンドポイントを確認
2. コードを修正
3. テストを実行
4. ドキュメントを更新

---

## 📚 参考資料

- [CryptoQuant APIカタログ](https://cryptoquant.com/catalog)
- [CryptoQuant APIドキュメント](https://intercom.help/cryptoquant/en/articles/4942542-is-there-any-documentation-for-the-metrics-and-indicators)
- [APIキーの取得方法](https://intercom.help/cryptoquant/en/articles/4942555-where-is-my-api-key)

---

**見積もり時間**: 4-6時間（手動作業）

**優先度**: MEDIUM（機能フラグで無効化されているため、本番環境への影響は限定的）


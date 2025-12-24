# CryptoQuant API検証ガイド

**作成日**: 2025年12月24日

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

### 1. Whale Flows（クジラフロー）

**実装ファイル**: `services/cryptoquant/deepMetrics.js`

**使用エンドポイント**:
- `/btc/exchange-flows/inflow-sum`
- `/btc/exchange-flows/outflow-sum`

**検証項目**:
- [ ] エンドポイントパスが正しいか
- [ ] パラメータ（`size`, `window`, `limit`）が正しいか
- [ ] レスポンス構造が想定と一致するか（`result.data[0].value`）
- [ ] エラーハンドリングが適切か

**代替エンドポイント**（現在のエンドポイントが機能しない場合）:
- `/v1/btc/exchange-flows/whale-ratio`
- `/v1/btc/network-data/large-transactions`

---

### 2. Liquidations（清算データ）

**実装ファイル**: `services/cryptoquant/deepMetrics.js`

**使用エンドポイント**:
- `/btc/derivatives/liquidations-24h`

**検証項目**:
- [ ] エンドポイントパスが正しいか
- [ ] レスポンス構造が想定と一致するか
- [ ] 複数のフィールド名に対応しているか（`value`, `total_liquidations`, `liquidations`）

**代替エンドポイント**（現在のエンドポイントが機能しない場合）:
- `/v1/btc/market-data/liquidation`
- `/v1/btc/derivatives/total-liquidations`

---

### 3. NUPL（Network Unrealized Profit/Loss）

**実装ファイル**: `services/cryptoquant/deepMetrics.js`

**使用エンドポイント**:
- `/btc/nupl/current`

**検証項目**:
- [ ] エンドポイントパスが正しいか
- [ ] レスポンス構造が想定と一致するか
- [ ] 値の範囲が適切か（通常は-1.0から1.0の間）

---

### 4. SOPR（Spent Output Profit Ratio）

**実装ファイル**: `services/cryptoquant/deepMetrics.js`

**使用エンドポイント**:
- `/btc/sopr`（現在の値）
- `/btc/sopr`（30日平均 - 要確認）

**検証項目**:
- [ ] エンドポイントパスが正しいか
- [ ] 30日平均を取得するパラメータがあるか
- [ ] レスポンス構造が想定と一致するか

---

### 5. Exchange Flows（取引所フロー）

**実装ファイル**: `services/cryptoquant/endpoints/btc.js`

**使用エンドポイント**:
- `/btc/exchange-flows/netflow` ✅ 既に使用中（検証済みの可能性あり）
- `/btc/exchange-flows/inflow-sum`（Upbit/Binance固有）

**検証項目**:
- [ ] Upbit固有のフロー取得パラメータ（`exchange: 'upbit'`）が正しいか
- [ ] Binance固有のフロー取得パラメータ（`exchange: 'binance'`）が正しいか

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

### Whale Flows
- [ ] `/btc/exchange-flows/inflow-sum` エンドポイントが存在するか
- [ ] パラメータ（`size`, `window`, `limit`）が正しいか
- [ ] レスポンス構造が `result.data[0].value` か
- [ ] `/btc/exchange-flows/outflow-sum` エンドポイントが存在するか

### Liquidations
- [ ] `/btc/derivatives/liquidations-24h` エンドポイントが存在するか
- [ ] レスポンス構造が想定と一致するか
- [ ] 複数のフィールド名（`value`, `total_liquidations`, `liquidations`）に対応できているか

### NUPL
- [ ] `/btc/nupl/current` エンドポイントが存在するか
- [ ] レスポンス構造が想定と一致するか

### SOPR
- [ ] `/btc/sopr` エンドポイントが存在するか
- [ ] 30日平均を取得する方法があるか
- [ ] レスポンス構造が想定と一致するか

### Exchange Flows（固有取引所）
- [ ] Upbit固有のフロー取得方法が正しいか（`exchange: 'upbit'`）
- [ ] Binance固有のフロー取得方法が正しいか（`exchange: 'binance'`）

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


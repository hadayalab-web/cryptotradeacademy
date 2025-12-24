# CryptoQuant API エンドポイント検証状況

**最終更新**: 2025年12月23日
**検証者**: 開発チーム
**API ドキュメント**: https://docs.cryptoquant.com/

---

## 📋 検証状況一覧

| エンドポイント | 状態 | 検証日 | レスポンス構造 | 備考 |
|--------------|------|--------|---------------|------|
| `/btc/exchange-flows/inflow-sum` | ⚠️ 未検証 | - | 未確認 | 大型取引フロー取得 |
| `/btc/exchange-flows/outflow-sum` | ⚠️ 未検証 | - | 未確認 | 大型取引フロー取得 |
| `/btc/derivatives/liquidations-24h` | ⚠️ 未検証 | - | 未確認 | 24時間清算額 |
| `/btc/nupl/current` | ⚠️ 未検証 | - | 未確認 | Net Unrealized Profit/Loss |
| `/btc/sopr/current` | ⚠️ 未検証 | - | 未確認 | Spent Output Profit Ratio |
| `/btc/sopr/ma` | ⚠️ 未検証 | - | 未確認 | SOPR 30-day Moving Average |
| `/btc/exchange-flows/inflow-sum?exchange=upbit` | ⚠️ 未検証 | - | 未確認 | Upbit流入量 |
| `/btc/exchange-flows/inflow-sum?exchange=binance` | ⚠️ 未検証 | - | 未確認 | Binance流入量 |

---

## ✅ 検証済みエンドポイント

現在、検証済みのエンドポイントはありません。

---

## 🔍 検証手順

### 1. APIドキュメントの確認

1. CryptoQuant API ドキュメントを確認: https://docs.cryptoquant.com/
2. 各エンドポイントの正確なパスを確認
3. パラメータ名と値の形式を確認
4. レスポンス構造を確認

### 2. 実際のAPIキーでのテスト

```javascript
// テストスクリプト例: scripts/test-cq-endpoints.js
const { fetchCryptoQuant } = require('../services/cryptoquant/client');

async function testEndpoint(endpoint, params = {}) {
  try {
    console.log(`Testing: ${endpoint}`, params);
    const result = await fetchCryptoQuant(endpoint, params);
    console.log('✅ Success:', JSON.stringify(result, null, 2));
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    return { success: false, error: error.message };
  }
}

// テスト実行
(async () => {
  const endpoints = [
    { path: '/btc/exchange-flows/inflow-sum', params: { size: 'large', window: 'day', limit: 1 } },
    { path: '/btc/exchange-flows/outflow-sum', params: { size: 'large', window: 'day', limit: 1 } },
    { path: '/btc/derivatives/liquidations-24h', params: { limit: 1 } },
    { path: '/btc/nupl/current', params: { limit: 1 } },
    { path: '/btc/sopr/current', params: { limit: 1 } },
    { path: '/btc/sopr/ma', params: { window: '30d', limit: 1 } },
  ];

  for (const { path, params } of endpoints) {
    await testEndpoint(path, params);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
  }
})();
```

### 3. レスポンス構造の確認

各エンドポイントのレスポンス構造を確認し、以下の情報を記録:

- データ構造（`result.data[0].value` など）
- フィールド名（`value`, `total_liquidations`, `nupl` など）
- データ型（number, string, etc.）
- 単位（BTC, USD, percentage, etc.）

### 4. エラーハンドリングの検証

- 404エラー（エンドポイント不存在）
- 400エラー（不正なパラメータ）
- 401エラー（認証エラー）
- 429エラー（レート制限）
- 500エラー（サーバーエラー）

---

## 🔄 代替エンドポイント候補

エンドポイントが存在しない場合の代替案:

### Whale Flows

- `/v1/btc/exchange-flows/whale-ratio`
- `/v1/btc/network-data/large-transactions`
- `/v1/btc/exchange-flows/inflow` + `size` パラメータ

### Liquidations

- `/v1/btc/market-data/liquidation`
- `/v1/btc/derivatives/total-liquidations`
- `/v1/btc/derivatives/liquidations`

### NUPL

- `/v1/btc/network-indicator/nupl`
- `/v1/btc/indicators/nupl`

### SOPR

- `/v1/btc/network-indicator/sopr`
- `/v1/btc/indicators/sopr`
- `/v1/btc/indicators/sopr/ma` (for moving average)

---

## 🚨 機能フラグによる制御

未検証のエンドポイントは機能フラグで無効化できます:

```bash
# .env
CQ_WHALE_FLOWS_ENABLED=false
CQ_LIQUIDATIONS_ENABLED=false
CQ_NUPL_ENABLED=false
CQ_SOPR_ENABLED=false
```

機能フラグが無効の場合、安全なデフォルト値（0）が返されます。

---

## 📝 検証チェックリスト

各エンドポイントの検証時に確認する項目:

- [ ] エンドポイントパスが正しい
- [ ] パラメータ名が正しい
- [ ] パラメータ値の形式が正しい
- [ ] レスポンス構造が想定通り
- [ ] データ抽出ロジックが正しい
- [ ] エラーハンドリングが適切
- [ ] レート制限を考慮
- [ ] 認証が正しく動作

---

## 🔗 関連ドキュメント

- [修正計画](./FIX_PLAN_COPILOT_REVIEW.md) - 詳細な修正計画
- [コードレビューレポート](./CODE_REVIEW_REPORT.md) - Copilot Agentレビュー結果
- [CryptoQuant API Documentation](https://docs.cryptoquant.com/) - 公式APIドキュメント

---

**注意**: 未検証のエンドポイントは本番環境で使用する前に必ず検証してください。


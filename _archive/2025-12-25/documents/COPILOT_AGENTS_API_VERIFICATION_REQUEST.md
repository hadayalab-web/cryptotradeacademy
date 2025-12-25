# GitHub Copilot Agents CryptoQuant API検証依頼

@copilot-swe-agent CryptoQuant API検証をお願いします。テスト・デバッグが真骨頂の皆さんにお願いしたいタスクです！

## 🎯 依頼内容

実装されているCryptoQuant APIエンドポイントが正しく動作することを確認し、必要に応じて修正をお願いします。

---

## 📋 検証が必要なエンドポイント

### 1. Whale Flows（クジラフロー）

**実装ファイル**: `services/cryptoquant/deepMetrics.js` (`getWhaleFlows()`)

**使用エンドポイント**:
- `/btc/exchange-flows/inflow-sum` (params: `size: 'large', window: 'day', limit: 1`)
- `/btc/exchange-flows/outflow-sum` (params: `size: 'large', window: 'day', limit: 1`)

**検証項目**:
- [ ] エンドポイントパスが正しいか
- [ ] パラメータ（`size`, `window`, `limit`）が正しいか
- [ ] レスポンス構造が想定と一致するか（`result.data[0].value`）
- [ ] エラーハンドリングが適切か

**期待されるデータ抽出ロジック**:
```javascript
const inflow = inflowData?.result?.data?.[0]?.value ?? 0;
const outflow = outflowData?.result?.data?.[0]?.value ?? 0;
```

---

### 2. Liquidations（清算データ）

**実装ファイル**: `services/cryptoquant/deepMetrics.js` (`getLiquidations()`)

**使用エンドポイント**:
- `/btc/derivatives/liquidations-24h` (params: `limit: 1`)

**検証項目**:
- [ ] エンドポイントパスが正しいか
- [ ] レスポンス構造が想定と一致するか
- [ ] 複数のフィールド名に対応できているか（`value`, `total_liquidations`, `liquidations`）

**期待されるデータ抽出ロジック**:
```javascript
const liquidations = data?.result?.data?.[0]?.value ??
                    data?.result?.data?.[0]?.total_liquidations ??
                    data?.result?.data?.[0]?.liquidations ??
                    0;
```

---

### 3. NUPL（Network Unrealized Profit/Loss）

**実装ファイル**: `services/cryptoquant/deepMetrics.js` (`getNUPL()`)

**使用エンドポイント**:
- `/btc/nupl/current`

**検証項目**:
- [ ] エンドポイントパスが正しいか
- [ ] レスポンス構造が想定と一致するか
- [ ] 値の範囲が適切か（通常は-1.0から1.0の間）

---

### 4. SOPR（Spent Output Profit Ratio）

**実装ファイル**: `services/cryptoquant/deepMetrics.js` (`getSOPR()`, `getSOPR30d()`)

**使用エンドポイント**:
- `/btc/sopr` (params: `window: 'day', limit: 1`)
- `/btc/sopr` (30日平均 - パラメータ要確認)

**検証項目**:
- [ ] エンドポイントパスが正しいか
- [ ] 30日平均を取得するパラメータがあるか
- [ ] レスポンス構造が想定と一致するか

---

### 5. Exchange Flows（取引所フロー - 固有取引所）

**実装ファイル**: `services/cryptoquant/deepMetrics.js` (`getUpbitInflow()`, `getBinanceInflow()`)

**使用エンドポイント**:
- `/btc/exchange-flows/inflow-sum` (params: `exchange: 'upbit', window: 'day', limit: 1`)
- `/btc/exchange-flows/inflow-sum` (params: `exchange: 'binance', window: 'day', limit: 1`)

**検証項目**:
- [ ] Upbit固有のフロー取得パラメータ（`exchange: 'upbit'`）が正しいか
- [ ] Binance固有のフロー取得パラメータ（`exchange: 'binance'`）が正しいか

---

## 🔧 検証スクリプト

検証スクリプト `scripts/test-cryptoquant-api.js` を用意しました。

**使用方法**:
```bash
# すべてのエンドポイントをテスト
node scripts/test-cryptoquant-api.js

# 特定のエンドポイントをテスト
node scripts/test-cryptoquant-api.js --endpoint=whale-flows-inflow
```

**スクリプトの機能**:
- 各エンドポイントのAPI呼び出し
- レスポンス構造の確認と分析
- エラーパターンの検証
- 検証結果のサマリー出力

---

## 📚 参考リソース

### 公式ドキュメント

1. **APIカタログ**（全エンドポイント一覧）
   - https://cryptoquant.com/catalog

2. **APIドキュメント**（メトリクス・指標の説明）
   - https://intercom.help/cryptoquant/en/articles/4942542-is-there-any-documentation-for-the-metrics-and-indicators

3. **APIキーの取得方法**
   - https://intercom.help/cryptoquant/en/articles/4942555-where-is-my-api-key

---

## 🔍 検証手順

### ステップ1: APIキーの確認

`.env.local` ファイルに `CRYPTOQUANT_API_KEY` が設定されているか確認してください。

### ステップ2: 検証スクリプトの実行

```bash
node scripts/test-cryptoquant-api.js
```

### ステップ3: レスポンス構造の確認

各エンドポイントのレスポンス構造を確認し、実装コードのデータ抽出ロジックと一致するか確認してください。

### ステップ4: 問題の特定と修正

- エンドポイントパスが異なる場合 → 修正
- レスポンス構造が異なる場合 → データ抽出ロジックを修正
- パラメータが異なる場合 → パラメータを修正
- エラーハンドリングが必要な場合 → 追加

### ステップ5: 修正後のテスト

修正後、再度検証スクリプトを実行して、すべてのエンドポイントが正しく動作することを確認してください。

---

## 📝 期待される成果

1. **エンドポイントの検証**: すべてのエンドポイントが正しく動作することを確認
2. **コード修正**: 必要に応じてエンドポイントパス、パラメータ、データ抽出ロジックを修正
3. **エラーハンドリングの改善**: 適切なエラーハンドリングを追加
4. **テストの追加**: 検証結果に基づいてテストを追加（オプション）

---

## 🔗 関連ファイル

- `scripts/test-cryptoquant-api.js` - 検証スクリプト
- `docs/CRYPTOQUANT_API_VERIFICATION_GUIDE.md` - 詳細な検証ガイド
- `docs/API_VERIFICATION_RECOMMENDATION.md` - 推奨アプローチ
- `services/cryptoquant/deepMetrics.js` - 実装ファイル
- `services/cryptoquant/client.js` - APIクライアント

---

**ご協力よろしくお願いします！** 🙏












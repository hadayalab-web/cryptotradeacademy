# CryptoQuant API 検証機能 セットアップガイド

## 📋 概要

CryptoTradeAcademy - Trap Defence BTC向けに、CursorにCryptoQuant APIの検証機能を実装しました。

## ✅ 実装完了項目

### 1. CryptoQuant Verification MCP Server ✅

**ファイル**: `scripts/cryptoquant-verification-mcp-server.js`

**機能**:
- ✅ APIキーの検証
- ✅ エンドポイントの検証
- ✅ 主要エンドポイントの一括検証
- ✅ データ形式の検証
- ✅ データ取得

### 2. セットアップスクリプト ✅

**ファイル**: `scripts/setup-cryptoquant-verification-mcp.ps1`

**機能**:
- ✅ MCP設定ファイルの自動更新
- ✅ サーバー設定の追加

### 3. 環境変数設定 ✅

**ファイル**: `.env`

**設定**:
```env
CRYPTOQUANT_API_KEY=AqSfkCmyWnepP1JX3xnPvqeR3EYNQot38egiAICE2421tcYdIZAlnXcb99pyFkis08uN7Ln
```

## 🚀 セットアップ手順

### 1. セットアップスクリプトの実行

```powershell
.\scripts\setup-cryptoquant-verification-mcp.ps1
```

### 2. Cursorの再起動

MCPサーバーを読み込むためにCursorを再起動してください。

### 3. 動作確認

Cursorのチャットで以下のコマンドを実行して動作確認：

```
cryptoquant_verify_api_keyでAPIキーを検証してください
```

## 🔧 利用可能なツール

### 1. `cryptoquant_verify_api_key`

**説明**: CryptoQuant APIキーを検証します

**使用例**:
```
cryptoquant_verify_api_keyでAPIキーを検証してください
```

**レスポンス例**:
```json
{
  "valid": true,
  "message": "API key is valid",
  "response": {
    "result": {
      "data": [...]
    }
  }
}
```

### 2. `cryptoquant_verify_endpoint`

**説明**: 指定されたエンドポイントを検証します

**パラメータ**:
- `endpoint` (必須): エンドポイントパス（例: `/btc/exchange-flows/netflow`）
- `params` (オプション): クエリパラメータ（例: `{exchange: 'all_exchange', window: 'day', limit: 1}`）

**使用例**:
```
cryptoquant_verify_endpointで/btc/exchange-flows/netflowエンドポイントを検証してください
```

### 3. `cryptoquant_verify_all_endpoints`

**説明**: 主要なCryptoQuant APIエンドポイントを一括検証します

**検証対象エンドポイント**:
- Exchange Netflow
- Exchange Inflow
- Exchange Outflow
- Miner Position Index (MPI)
- Exchange Whale Ratio
- NUPL
- SOPR
- Long Liquidations
- Short Liquidations

**使用例**:
```
cryptoquant_verify_all_endpointsで主要エンドポイントを一括検証してください
```

**レスポンス例**:
```json
{
  "summary": {
    "total": 9,
    "valid": 8,
    "invalid": 1,
    "successRate": "88.9%"
  },
  "results": [
    {
      "name": "Exchange Netflow",
      "valid": true,
      "endpoint": "/btc/exchange-flows/netflow",
      ...
    },
    ...
  ]
}
```

### 4. `cryptoquant_verify_data_format`

**説明**: 指定されたエンドポイントのデータ形式を検証します

**パラメータ**:
- `endpoint` (必須): エンドポイントパス
- `params` (オプション): クエリパラメータ

**使用例**:
```
cryptoquant_verify_data_formatで/btc/exchange-flows/netflowのデータ形式を検証してください
```

### 5. `cryptoquant_get_data`

**説明**: CryptoQuant APIからデータを取得します

**パラメータ**:
- `endpoint` (必須): エンドポイントパス
- `params` (オプション): クエリパラメータ

**使用例**:
```
cryptoquant_get_dataで/btc/exchange-flows/netflowからデータを取得してください
```

## 📊 Trap Defence BTCで使用する主要エンドポイント

### Exchange Flows
- `/btc/exchange-flows/netflow` - 取引所ネットフロー
- `/btc/exchange-flows/inflow` - 取引所流入
- `/btc/exchange-flows/outflow` - 取引所流出

### Flow Indicators
- `/btc/flow-indicator/mpi` - マイナーポジションインデックス
- `/btc/flow-indicator/exchange-whale-ratio` - 取引所クジラ比率

### Market Indicators
- `/btc/market-indicator/sopr` - SOPR (Spent Output Profit Ratio)

### UTXO Data
- `/utxo-data/nupl/btc` - NUPL (Net Unrealized Profit/Loss)

### Derivatives
- `/derivatives/liquidations-long/btc` - ロング清算
- `/derivatives/liquidations-short/btc` - ショート清算

## 🔍 検証フロー

### 1. APIキーの検証
```
cryptoquant_verify_api_key
```

### 2. 主要エンドポイントの一括検証
```
cryptoquant_verify_all_endpoints
```

### 3. 特定エンドポイントの詳細検証
```
cryptoquant_verify_endpoint
cryptoquant_verify_data_format
```

### 4. データ取得
```
cryptoquant_get_data
```

## 📚 参考情報

### CryptoQuant API公式ドキュメント
- **API Docs**: https://cryptoquant.com/docs
- **API Catalog**: https://cryptoquant.com/catalog

### ローカルドキュメント
- `cryptosignal-ai/docs/cq-docs/cq-_CryptoQuant Data API (1.3.0)/API Docs _ CryptoQuant.html`
- `cryptosignal-ai/docs/cq-docs/cq-_API Catalog/Catalog _ CryptoQuant.html`

## ✅ 次のステップ

1. **セットアップスクリプトの実行**
   ```powershell
   .\scripts\setup-cryptoquant-verification-mcp.ps1
   ```

2. **Cursorの再起動**
   - MCPサーバーを読み込むためにCursorを再起動

3. **APIキーの検証**
   ```
   cryptoquant_verify_api_keyでAPIキーを検証してください
   ```

4. **主要エンドポイントの検証**
   ```
   cryptoquant_verify_all_endpointsで主要エンドポイントを一括検証してください
   ```

5. **データ取得のテスト**
   ```
   cryptoquant_get_dataで/btc/exchange-flows/netflowからデータを取得してください
   ```

---

**セットアップ完了日**: 2026-01-09  
**セットアップ者**: COO (Composer 1)  
**バージョン**: 1.0.0

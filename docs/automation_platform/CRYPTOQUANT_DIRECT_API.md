# CryptoQuant 直接API呼び出しガイド

**作成日**: 2026-01-09  
**目的**: MCPサーバーを使わずに、CryptoQuant APIを直接呼び出す方法（Cursorのパフォーマンス向上のため）

---

## 📋 概要

MCPサーバーを実装しなくても、**直接APIを呼び出す**ことができます。Trap Defence BTC用のオンチェーンデータ取得に最適です。

**注意**: CryptoQuantをMCPにするとCursorのパフォーマンスが落ちることが確認されています。直接API呼び出しを使用することで、パフォーマンスを維持できます。

**公式ドキュメント**:
- [API Catalog](https://cryptoquant.com/catalog) - 全エンドポイント一覧と詳細情報
- [API Documentation](https://cryptoquant.com/docs) - API仕様とメトリクス説明

---

## 🚀 使用方法

### 1. CLIから直接呼び出す

```bash
# APIキーを検証
npx tsx scripts/direct-ai-api.ts cq-verify-key

# エンドポイントを検証
npx tsx scripts/direct-ai-api.ts cq-verify-endpoint --endpoint "/btc/exchange-flows/netflow" --params '{"exchange":"all_exchange","window":"day","limit":1}'

# 主要エンドポイントを一括検証
npx tsx scripts/direct-ai-api.ts cq-verify-all

# データ形式を検証
npx tsx scripts/direct-ai-api.ts cq-verify-format --endpoint "/btc/exchange-flows/netflow" --params '{"exchange":"all_exchange","window":"day","limit":1}'

# データを取得
npx tsx scripts/direct-ai-api.ts cq-get-data --endpoint "/btc/exchange-flows/netflow" --params '{"exchange":"all_exchange","window":"day","limit":1}'
```

### 2. TypeScript/JavaScriptからインポートして使用

```typescript
import { 
  verifyCryptoQuantApiKey,
  verifyCryptoQuantEndpoint,
  verifyCryptoQuantAllEndpoints,
  verifyCryptoQuantDataFormat,
  getCryptoQuantData,
} from "./scripts/direct-ai-api.js";

// APIキーを検証
const keyResult = await verifyCryptoQuantApiKey();

// エンドポイントを検証
const endpointResult = await verifyCryptoQuantEndpoint(
  "/btc/exchange-flows/netflow",
  { exchange: "all_exchange", window: "day", limit: 1 }
);

// データを取得
const data = await getCryptoQuantData(
  "/btc/exchange-flows/netflow",
  { exchange: "all_exchange", window: "day", limit: 10 }
);
```

---

## 📊 各機能の詳細

### 1. `verifyCryptoQuantApiKey()` - APIキーを検証

```typescript
const result = await verifyCryptoQuantApiKey();
```

**レスポンス**:
```typescript
{
  valid: true,
  message: "API key is valid",
  response: { ... }
}
```

**動作**:
- `/btc/exchange-flows/netflow`エンドポイントを使用してAPIキーの有効性を確認

---

### 2. `verifyCryptoQuantEndpoint()` - エンドポイントを検証

```typescript
const result = await verifyCryptoQuantEndpoint(
  "/btc/exchange-flows/netflow",
  { exchange: "all_exchange", window: "day", limit: 1 }
);
```

**レスポンス**:
```typescript
{
  valid: true,
  endpoint: "/btc/exchange-flows/netflow",
  params: { exchange: "all_exchange", window: "day", limit: 1 },
  response: { ... },
  dataPoints: 1,
}
```

---

### 3. `verifyCryptoQuantAllEndpoints()` - 主要エンドポイントを一括検証

```typescript
const result = await verifyCryptoQuantAllEndpoints();
```

**レスポンス**:
```typescript
{
  summary: {
    total: 9,
    valid: 9,
    invalid: 0,
    successRate: "100.0%",
  },
  results: [
    {
      name: "Exchange Netflow",
      valid: true,
      endpoint: "/btc/exchange-flows/netflow",
      dataPoints: 1,
    },
    ...
  ]
}
```

**検証されるエンドポイント**:
- Exchange Netflow
- Exchange Inflow
- Exchange Outflow
- Miner Position Index (MPI)
- Exchange Whale Ratio
- NUPL
- SOPR
- Long Liquidations
- Short Liquidations

---

### 4. `verifyCryptoQuantDataFormat()` - データ形式を検証

```typescript
const result = await verifyCryptoQuantDataFormat(
  "/btc/exchange-flows/netflow",
  { exchange: "all_exchange", window: "day", limit: 1 }
);
```

**レスポンス**:
```typescript
{
  valid: true,
  endpoint: "/btc/exchange-flows/netflow",
  structure: {
    hasResult: true,
    hasData: true,
    isArray: true,
    dataPoints: 1,
    pointStructure: {
      hasValue: true,
      hasTimestamp: true,
      keys: ["datetime", "value", ...],
    },
  },
  sample: {
    datetime: "2026-01-09T00:00:00Z",
    value: 1234.56,
    ...
  },
}
```

---

### 5. `getCryptoQuantData()` - データを取得

```typescript
const result = await getCryptoQuantData(
  "/btc/exchange-flows/netflow",
  { exchange: "all_exchange", window: "day", limit: 10 }
);
```

**レスポンス**:
```typescript
{
  endpoint: "/btc/exchange-flows/netflow",
  params: { exchange: "all_exchange", window: "day", limit: 10 },
  data: {
    result: {
      data: [
        {
          datetime: "2026-01-09T00:00:00Z",
          value: 1234.56,
          ...
        },
        ...
      ],
    },
  },
  dataPoints: 10,
}
```

---

## 📝 使用例

### 例1: Trap Defence BTC用のオンチェーンデータ取得

```typescript
import { getCryptoQuantData } from "./scripts/direct-ai-api.js";

// Exchange Netflowを取得
const netflow = await getCryptoQuantData("/btc/exchange-flows/netflow", {
  exchange: "all_exchange",
  window: "day",
  limit: 1,
});

// Miner Position Index (MPI)を取得
const mpi = await getCryptoQuantData("/btc/flow-indicator/mpi", {
  window: "day",
  limit: 1,
});

// Exchange Whale Ratioを取得
const whaleRatio = await getCryptoQuantData(
  "/btc/flow-indicator/exchange-whale-ratio",
  {
    exchange: "all_exchange",
    window: "day",
    limit: 1,
  }
);

console.log("Netflow:", netflow.data.result.data[0].value);
console.log("MPI:", mpi.data.result.data[0].value);
console.log("Whale Ratio:", whaleRatio.data.result.data[0].value);
```

### 例2: 主要エンドポイントの一括検証

```typescript
import { verifyCryptoQuantAllEndpoints } from "./scripts/direct-ai-api.js";

const result = await verifyCryptoQuantAllEndpoints();

console.log(`検証結果: ${result.summary.valid}/${result.summary.total} 成功`);
console.log(`成功率: ${result.summary.successRate}`);

result.results.forEach((r) => {
  if (!r.valid) {
    console.error(`❌ ${r.name}: ${r.error}`);
  } else {
    console.log(`✅ ${r.name}: ${r.dataPoints} データポイント`);
  }
});
```

### 例3: データ形式の検証とデータ取得

```typescript
import {
  verifyCryptoQuantDataFormat,
  getCryptoQuantData,
} from "./scripts/direct-ai-api.js";

const endpoint = "/btc/exchange-flows/netflow";
const params = { exchange: "all_exchange", window: "day", limit: 10 };

// まずデータ形式を検証
const formatCheck = await verifyCryptoQuantDataFormat(endpoint, params);

if (formatCheck.valid) {
  console.log("✅ データ形式は有効です");
  console.log("データポイント数:", formatCheck.structure.dataPoints);
  console.log("サンプル:", formatCheck.sample);

  // データを取得
  const data = await getCryptoQuantData(endpoint, params);
  console.log("取得したデータ:", data.data.result.data);
} else {
  console.error("❌ データ形式が無効です:", formatCheck.error);
}
```

---

## 🔧 環境変数の設定

`.env`ファイルに以下を設定してください：

```env
CRYPTOQUANT_API_KEY=your_cryptoquant_api_key
```

---

## 📋 実装ファイル

- `scripts/direct-ai-api.ts` - 直接API呼び出しユーティリティ
  - `verifyCryptoQuantApiKey()` - APIキーを検証
  - `verifyCryptoQuantEndpoint()` - エンドポイントを検証
  - `verifyCryptoQuantAllEndpoints()` - 主要エンドポイントを一括検証
  - `verifyCryptoQuantDataFormat()` - データ形式を検証
  - `getCryptoQuantData()` - データを取得

---

## ✅ 実装完了確認

- [x] `verifyCryptoQuantApiKey()` - APIキーを検証
- [x] `verifyCryptoQuantEndpoint()` - エンドポイントを検証
- [x] `verifyCryptoQuantAllEndpoints()` - 主要エンドポイントを一括検証
- [x] `verifyCryptoQuantDataFormat()` - データ形式を検証
- [x] `getCryptoQuantData()` - データを取得
- [x] CLI対応: `cq-verify-key`, `cq-verify-endpoint`, `cq-verify-all`, `cq-verify-format`, `cq-get-data`

---

## 🎉 実装完了

**CryptoQuantの直接API呼び出し機能を実装しました。**

これで、MCPサーバーを使わずに、Trap Defence BTC用のオンチェーンデータを直接取得できます。Cursorのパフォーマンスも維持されます。

---

**参照**: 
- [CryptoQuant API Catalog](https://cryptoquant.com/catalog) - 全エンドポイント一覧
- [CryptoQuant API Documentation](https://cryptoquant.com/docs) - API仕様とメトリクス説明
- CryptoQuant API v1仕様

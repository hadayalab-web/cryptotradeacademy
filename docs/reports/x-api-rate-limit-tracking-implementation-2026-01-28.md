# X APIレート制限追跡機能の実装（2026-01-28）

## 🎯 概要

X APIの公式ドキュメント（https://docs.x.com/x-api/fundamentals/rate-limits）を参照し、レート制限情報をKVストレージに保存・追跡する機能を実装しました。

## 📋 実装内容

### 1. レート制限追跡サービス (`services/x/rateLimitTracker.js`)

**主な機能**:
- レート制限設定のKV保存・取得
- レスポンスヘッダーからのレート制限情報の記録
- レート制限ステータスの取得・確認
- リセット時刻の計算・管理

**KVキー構造**:
- `x:api:rate_limit_config`: レート制限設定（1年間保持）
- `x:api:rate_limit:{authType}:{endpoint}`: エンドポイント別のレート制限情報（24時間保持）
- `x:api:rate_limit_status:{authType}:{endpoint}`: エンドポイント別のレート制限ステータス（24時間保持）

**主要な関数**:
- `saveRateLimitConfig()`: レート制限設定をKVに保存
- `recordRateLimit(endpoint, authType, headers)`: レスポンスヘッダーからレート制限情報を記録
- `getRateLimit(endpoint, authType)`: レート制限情報を取得
- `isRateLimited(endpoint, authType)`: レート制限に達しているかチェック
- `getRemainingRequests(endpoint, authType)`: 残りリクエスト数を取得
- `getResetTime(endpoint, authType)`: リセット時刻を取得

### 2. X APIクライアントへの統合 (`services/x/client.js`)

**変更内容**:
- `xApiRequest`関数にレート制限情報の記録機能を追加
- レスポンス成功時: レスポンスヘッダーからレート制限情報を取得し、KVに記録
- 429エラー時: レート制限情報を記録し、リトライ前に警告を出力

**実装箇所**:
1. **レスポンス成功時**（`response.ok === true`）:
   ```javascript
   // 🔒 レート制限情報をKVに記録（レスポンス成功時）
   try {
     const endpointKey = `${method} ${endpoint}`;
     const headers = {};
     for (const [key, value] of response.headers.entries()) {
       if (key.toLowerCase().startsWith('x-rate-limit')) {
         headers[key.toLowerCase()] = value;
       }
     }
     await recordRateLimit(endpointKey, 'user', headers);
   } catch (rateLimitError) {
     console.warn(`[X API] ⚠️ Failed to record rate limit:`, rateLimitError.message);
   }
   ```

2. **429エラー時**:
   ```javascript
   if (response.status === 429) {
     // 🔒 レート制限情報をKVに記録（429エラー時）
     try {
       const endpointKey = `${method} ${endpoint}`;
       const headers = {};
       for (const [key, value] of response.headers.entries()) {
         if (key.toLowerCase().startsWith('x-rate-limit')) {
           headers[key.toLowerCase()] = value;
         }
       }
       await recordRateLimit(endpointKey, 'user', headers);
     } catch (rateLimitError) {
       console.warn(`[X API] ⚠️ Failed to record rate limit (429):`, rateLimitError.message);
     }
     // ... リトライ処理 ...
   }
   ```

### 3. レート制限情報表示スクリプト (`scripts/get-x-api-rate-limits.js`)

**機能**:
- レート制限設定の表示
- 現在のレート制限ステータスの表示
- 主要エンドポイントの詳細情報の表示
- JSON形式での出力対応

**使用方法**:
```bash
# 通常表示
node scripts/get-x-api-rate-limits.js

# JSON形式
node scripts/get-x-api-rate-limits.js --json
```

## 📊 レート制限設定（主要エンドポイント）

### Posts endpoints

| エンドポイント | 認証タイプ | 制限 | ウィンドウ |
|--------------|----------|------|----------|
| `POST /2/tweets` | Per User | 100 | 15分 |
| `POST /2/tweets` | Per App | 10,000 | 24時間 |
| `GET /2/tweets/:id` | Per User | 900 | 15分 |
| `GET /2/users/:id/tweets` | Per User | 900 | 15分 |

### Media endpoints

| エンドポイント | 認証タイプ | 制限 | ウィンドウ |
|--------------|----------|------|----------|
| `POST /2/media/upload` | Per User | 500 | 15分 |
| `POST /2/media/upload` | Per App | 50,000 | 24時間 |

## 🔍 レート制限情報の構造

### KVに保存されるデータ構造

**レート制限情報** (`x:api:rate_limit:{authType}:{endpoint}`):
```json
{
  "endpoint": "POST /2/tweets",
  "authType": "user",
  "limit": 100,
  "remaining": 95,
  "reset": 1705420800,
  "window": "15min",
  "lastUpdated": "2026-01-28T12:00:00.000Z"
}
```

**レート制限ステータス** (`x:api:rate_limit_status:{authType}:{endpoint}`):
```json
{
  "endpoint": "POST /2/tweets",
  "authType": "user",
  "limit": 100,
  "remaining": 95,
  "reset": 1705420800,
  "isLimited": false,
  "resetTime": "2026-01-28T12:15:00.000Z",
  "lastUpdated": "2026-01-28T12:00:00.000Z"
}
```

## 🚀 使用方法

### 1. レート制限設定の保存

```javascript
const { saveRateLimitConfig } = require('./services/x/rateLimitTracker');
await saveRateLimitConfig();
```

### 2. レート制限情報の記録（自動）

X APIクライアントを使用する際、レスポンスヘッダーから自動的にレート制限情報が記録されます。

```javascript
const { xApiRequest } = require('./services/x/client');
const result = await xApiRequest('/2/tweets', { method: 'POST', body: { text: 'Hello' } });
// レート制限情報が自動的にKVに記録される
```

### 3. レート制限情報の取得

```javascript
const { getRateLimit, isRateLimited, getRemainingRequests } = require('./services/x/rateLimitTracker');

// レート制限情報を取得
const rateLimit = await getRateLimit('POST /2/tweets', 'user');

// レート制限に達しているかチェック
const isLimited = await isRateLimited('POST /2/tweets', 'user');

// 残りリクエスト数を取得
const remaining = await getRemainingRequests('POST /2/tweets', 'user');
```

### 4. レート制限情報の表示

```bash
node scripts/get-x-api-rate-limits.js
```

## 📈 メリット

1. **自動追跡**: X APIリクエスト実行時に自動的にレート制限情報が記録される
2. **KVストレージ**: レート制限情報が永続化され、複数のリクエスト間で共有可能
3. **リセット時刻の管理**: ウィンドウのリセット時刻を自動計算・管理
4. **警告機能**: レート制限に近づいた場合や達した場合に警告を出力
5. **公式ドキュメント準拠**: X API公式ドキュメントのレート制限情報を参照

## 🔒 エラーハンドリング

- レート制限情報の記録に失敗しても、APIリクエスト自体は成功する（警告のみ）
- KVが利用できない場合、メモリ内の設定をフォールバックとして使用
- レート制限情報がヘッダーにない場合、設定から推定値を取得

## 📝 今後の拡張可能性

1. **レート制限予測**: 現在の使用状況から、レート制限に達する時刻を予測
2. **自動スロットリング**: レート制限に近づいた場合、自動的にリクエスト頻度を調整
3. **ダッシュボード**: レート制限情報を可視化するダッシュボードの作成
4. **アラート機能**: レート制限に達した場合、通知を送信

## ✅ 実装完了

- ✅ レート制限追跡サービスの実装
- ✅ X APIクライアントへの統合
- ✅ レート制限情報表示スクリプトの作成
- ✅ 公式ドキュメント準拠の設定値

## 📚 参考資料

- X API Rate Limits: https://docs.x.com/x-api/fundamentals/rate-limits

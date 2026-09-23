# Whop MCPサーバー最適化計画

## 現状分析

### 現在の実装の特徴
- **ファイルサイズ**: 約1,800行
- **ツール数**: 40+個のツール
- **リクエスト関数**: 単一の`whopRequest`関数
- **エラーハンドリング**: 各ツールで個別に処理
- **キャッシング**: なし
- **リトライロジック**: なし

### 問題点

1. **コードの重複**
   - 各ツールハンドラーで同じパターンが繰り返されている
   - URLSearchParamsの構築が各ツールで重複
   - レスポンスフォーマットが統一されていない

2. **パフォーマンス**
   - APIレスポンスのキャッシングがない
   - 同じリクエストが繰り返される可能性
   - レート制限への対応がない

3. **エラーハンドリング**
   - 統一的なエラーハンドリングがない
   - リトライロジックがない
   - エラーメッセージが不統一

4. **コードの保守性**
   - 大きなswitch文（1,700行以上）
   - 共通処理の抽出が不十分
   - テストが困難

## 最適化案

### 1. キャッシングの実装

#### LRUキャッシュの追加
```javascript
class LRUCache {
  constructor(maxSize = 100, ttl = 300000) { // 5分TTL
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    // LRU: 使用されたアイテムを最後に移動
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }
  
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl,
    });
  }
  
  clear() {
    this.cache.clear();
  }
}
```

#### キャッシュ可能なエンドポイント
- GETリクエストのみ
- 頻繁にアクセスされるエンドポイント:
  - `/memberships` (一覧)
  - `/products` (一覧)
  - `/plans` (一覧)
  - `/members` (一覧)

### 2. リトライロジックの実装

```javascript
async function whopRequestWithRetry(method, endpoint, body = null, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await whopRequest(method, endpoint, body);
    } catch (error) {
      // 429 (Too Many Requests) または 5xxエラーの場合のみリトライ
      if (i < retries - 1 && (error.message.includes('429') || error.message.includes('5'))) {
        const delay = Math.pow(2, i) * 1000; // 指数バックオフ
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

### 3. 共通処理の抽出

#### クエリパラメータ構築ヘルパー
```javascript
function buildQueryParams(params) {
  const urlParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlParams.append(key, value);
    }
  });
  return urlParams.toString();
}
```

#### レスポンスフォーマットヘルパー
```javascript
function formatResponse(data) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}
```

### 4. ツールハンドラーの構造化

#### ツール定義の分離
```javascript
const toolHandlers = {
  'whop_get_memberships': async (args) => {
    const query = buildQueryParams({
      page: args.page || 1,
      per_page: args.per_page || 50,
      product_id: args.product_id,
      status: args.status,
    });
    const data = await whopRequestWithRetry('GET', `/memberships${query ? `?${query}` : ''}`);
    return formatResponse(data);
  },
  // ... 他のツール
};
```

### 5. レート制限対応

```javascript
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }
  
  async waitIfNeeded() {
    const now = Date.now();
    // ウィンドウ外のリクエストを削除
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requests.push(now);
  }
}
```

### 6. エラーハンドリングの統一

```javascript
function handleError(error, context = {}) {
  const errorInfo = {
    error: true,
    message: error.message,
    context,
    timestamp: new Date().toISOString(),
  };
  
  // スタックトレースは開発環境のみ
  if (process.env.NODE_ENV === 'development') {
    errorInfo.stack = error.stack;
  }
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(errorInfo, null, 2),
      },
    ],
    isError: true,
  };
}
```

## 実装計画

### フェーズ1: キャッシングとリトライ
1. LRUキャッシュクラスの実装
2. リトライロジックの実装
3. GETリクエストへのキャッシュ適用

### フェーズ2: コードのリファクタリング
1. 共通処理の抽出
2. ツールハンドラーの構造化
3. エラーハンドリングの統一

### フェーズ3: レート制限とモニタリング
1. レート制限の実装
2. リクエスト数の監視
3. パフォーマンスメトリクスの追加

## 期待される効果

### パフォーマンス
- **キャッシュヒット率**: 50-70%の改善見込み
- **APIリクエスト数**: 30-50%削減
- **レスポンス時間**: キャッシュヒット時は90%以上短縮

### コード品質
- **コード行数**: 30-40%削減見込み
- **保守性**: 大幅に向上
- **テスト容易性**: 向上

### 信頼性
- **エラー処理**: 統一的なエラーハンドリング
- **リトライ**: 一時的なエラーからの自動回復
- **レート制限**: API制限への対応

## 実装の優先順位

1. **高優先度**
   - キャッシングの実装
   - リトライロジックの実装
   - エラーハンドリングの統一

2. **中優先度**
   - 共通処理の抽出
   - ツールハンドラーの構造化

3. **低優先度**
   - レート制限の実装
   - モニタリング機能の追加

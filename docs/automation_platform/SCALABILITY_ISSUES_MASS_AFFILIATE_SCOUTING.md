# スケーラビリティ問題: 大量アフィリエイタースカウト対応

**作成日**: 2026-01-11  
**問題**: 何千ものアフィリエイターがスカウトされた場合に発生する可能性のある問題と対策

---

## 🚨 発見された問題点

### 1. **Whop APIのレート制限対策が不十分**

**現状**:
- `api/unified-api.ts`の`whopRequest`関数にレート制限対策がない
- 429エラー（レート制限）の処理がない
- リトライロジックがない

**問題**:
- 大量のAPI呼び出しでWhop APIのレート制限に引っかかる
- エラーが発生してもリトライしない
- 処理が中断される

---

### 2. **重複登録チェックがない**

**現状**:
- Whop APIでのアフィリエイター登録時に重複チェックがない
- 同じアフィリエイターが複数回登録される可能性がある

**問題**:
- 同じアフィリエイターが複数回登録される
- データの整合性が保証されない
- コミッション計算が不正確になる

---

### 3. **バッチ処理がない**

**現状**:
- Whop APIでのアフィリエイター登録が個別処理
- 大量のアフィリエイターを一度に処理できない

**問題**:
- 処理時間が非常に長くなる
- API呼び出し回数が増える
- レート制限に引っかかりやすい

---

### 4. **エラーハンドリングが不十分**

**現状**:
- Whop API呼び出し時のエラーハンドリングが基本的
- 429エラー（レート制限）の特別な処理がない
- エラーが発生しても処理が続行されない

**問題**:
- 一部のエラーで全体の処理が中断される
- エラーの原因が特定しにくい
- リトライできない

---

## ✅ 必要な対策

### 1. **Whop APIのレート制限対策**

#### 実装すべき機能

```typescript
// api/unified-api.ts に追加
async function whopRequestWithRetry(
  method: string,
  endpoint: string,
  body: any = null,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    rateLimitConfig?: {
      maxRequests: number;
      windowMs: number;
    };
  } = {}
): Promise<any> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    rateLimitConfig = {
      maxRequests: 100, // Whop APIのレート制限に合わせる
      windowMs: 60000, // 1分あたり100リクエスト
    },
  } = options;

  // レート制限チェック
  if (!rateLimiter.checkRateLimit('whop-api', rateLimitConfig)) {
    // レート制限に達した場合、待機
    await new Promise(resolve => setTimeout(resolve, rateLimitConfig.windowMs));
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await whopRequest(method, endpoint, body);
      return response;
    } catch (error: any) {
      lastError = error;

      // 429エラー（レート制限）の場合、指数バックオフでリトライ
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // 5xxエラーの場合、リトライ
      if (error.message?.includes('5')) {
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // その他のエラーは即座にスロー
      throw error;
    }
  }

  throw lastError || new Error('Whop API request failed after retries');
}
```

---

### 2. **重複登録チェック**

#### 実装すべき機能

```typescript
// api/unified-api.ts に追加
export async function createWhopAffiliateWithDuplicateCheck(options: {
  productId: string;
  email: string;
  name?: string;
  commissionRate?: number;
}): Promise<{
  affiliate: any;
  isNew: boolean;
}> {
  const { productId, email, name, commissionRate } = options;

  // 1. 既存のアフィリエイターを検索
  const existingAffiliates = await getWhopAffiliates({ productId });
  const existingAffiliate = existingAffiliates.affiliates.find(
    (aff: any) => aff.email === email
  );

  if (existingAffiliate) {
    // 既存のアフィリエイターが見つかった場合
    return {
      affiliate: existingAffiliate,
      isNew: false,
    };
  }

  // 2. 新しいアフィリエイターを作成
  const newAffiliate = await createWhopAffiliate({
    productId,
    email,
    name,
    commissionRate,
  });

  return {
    affiliate: newAffiliate,
    isNew: true,
  };
}
```

---

### 3. **バッチ処理**

#### 実装すべき機能

```typescript
// api/unified-api.ts に追加
export async function batchCreateWhopAffiliates(options: {
  productId: string;
  candidates: Array<{
    email: string;
    name?: string;
    commissionRate?: number;
  }>;
  batchSize?: number;
  concurrency?: number;
}): Promise<{
  created: number;
  skipped: number;
  errors: Array<{ candidate: any; error: string }>;
  results: Array<{ affiliate: any; isNew: boolean }>;
}> {
  const {
    productId,
    candidates,
    batchSize = 10, // 1バッチあたり10件
    concurrency = 5, // 同時実行数5件
  } = options;

  const results: Array<{ affiliate: any; isNew: boolean }> = [];
  const errors: Array<{ candidate: any; error: string }> = [];
  let created = 0;
  let skipped = 0;

  // バッチ処理
  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);

    // 並列処理（同時実行数制限あり）
    const batchPromises = batch.map(async (candidate) => {
      try {
        const result = await createWhopAffiliateWithDuplicateCheck({
          productId,
          email: candidate.email,
          name: candidate.name,
          commissionRate: candidate.commissionRate,
        });

        if (result.isNew) {
          created++;
        } else {
          skipped++;
        }

        results.push(result);
      } catch (error: any) {
        errors.push({
          candidate,
          error: error.message,
        });
      }
    });

    // 同時実行数制限
    const limiter = new ConcurrencyLimiter(concurrency);
    await Promise.all(
      batchPromises.map(promise => limiter.execute(() => promise))
    );

    // バッチ間の待機（レート制限対策）
    if (i + batchSize < candidates.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
    }
  }

  return {
    created,
    skipped,
    errors,
    results,
  };
}
```

---

### 4. **エラーハンドリングの改善**

#### 実装すべき機能

```typescript
// api/unified-api.ts に追加
export async function whopRequestSafe(
  method: string,
  endpoint: string,
  body: any = null,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    rateLimitConfig?: {
      maxRequests: number;
      windowMs: number;
    };
    onError?: (error: Error, attempt: number) => void;
  } = {}
): Promise<any> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    rateLimitConfig = {
      maxRequests: 100,
      windowMs: 60000,
    },
    onError,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // レート制限チェック
      if (!rateLimiter.checkRateLimit('whop-api', rateLimitConfig)) {
        const waitTime = rateLimitConfig.windowMs;
        console.warn(`Rate limit reached, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const response = await whopRequest(method, endpoint, body);
      return response;
    } catch (error: any) {
      lastError = error;

      // エラーハンドラーを呼び出し
      if (onError) {
        onError(error, attempt);
      }

      // 429エラー（レート制限）の場合
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        const delay = retryDelay * Math.pow(2, attempt);
        console.warn(`Rate limit error, retrying after ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // 5xxエラー（サーバーエラー）の場合
      if (error.message?.includes('5')) {
        const delay = retryDelay * Math.pow(2, attempt);
        console.warn(`Server error, retrying after ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // その他のエラーは即座にスロー
      throw error;
    }
  }

  throw lastError || new Error('Whop API request failed after retries');
}
```

---

## 📋 実装チェックリスト

### Whop API統合

- [ ] `whopRequest`関数にレート制限対策を追加
- [ ] 429エラー（レート制限）の処理を追加
- [ ] リトライロジック（指数バックオフ）を追加
- [ ] エラーハンドリングを改善

### 重複チェック

- [ ] `createWhopAffiliateWithDuplicateCheck`関数を実装
- [ ] 既存アフィリエイターの検索機能を追加
- [ ] 重複登録を防止

### バッチ処理

- [ ] `batchCreateWhopAffiliates`関数を実装
- [ ] バッチサイズの設定を追加
- [ ] 同時実行数の制限を追加
- [ ] バッチ間の待機時間を追加

### エラーハンドリング

- [ ] `whopRequestSafe`関数を実装
- [ ] エラーハンドラーを追加
- [ ] ログ出力を改善

---

## 🎯 優先順位

### 高優先度（即座に実装）

1. **Whop APIのレート制限対策**
   - 429エラーの処理
   - リトライロジック

2. **重複登録チェック**
   - 既存アフィリエイターの検索
   - 重複登録の防止

### 中優先度（近日中に実装）

3. **バッチ処理**
   - 大量処理の効率化
   - 同時実行数の制限

4. **エラーハンドリングの改善**
   - エラーハンドラーの追加
   - ログ出力の改善

---

## 📊 期待される効果

### レート制限対策

- ✅ Whop APIのレート制限に引っかからなくなる
- ✅ 429エラーが発生しても自動的にリトライ
- ✅ 処理が中断されなくなる

### 重複登録チェック

- ✅ 同じアフィリエイターが複数回登録されなくなる
- ✅ データの整合性が保証される
- ✅ コミッション計算が正確になる

### バッチ処理

- ✅ 処理時間が短縮される
- ✅ API呼び出し回数が削減される
- ✅ レート制限に引っかかりにくくなる

### エラーハンドリング

- ✅ エラーが発生しても処理が続行される
- ✅ エラーの原因が特定しやすくなる
- ✅ リトライが自動的に実行される

---

---

## ✅ 実装完了項目

### 1. **Whop APIのレート制限対策** ✅

- ✅ `whopRequestSafe`関数を実装
- ✅ レート制限チェック（1分あたり100リクエスト）
- ✅ 429エラー（レート制限）の自動リトライ
- ✅ 5xxエラー（サーバーエラー）の自動リトライ
- ✅ 指数バックオフによるリトライ遅延
- ✅ 既存のWhop API関数を`whopRequestSafe`を使用するように更新

### 2. **重複登録チェック** ✅

- ✅ `createWhopAffiliateWithDuplicateCheck`関数を実装
- ✅ 既存アフィリエイターの検索機能（全ページ検索）
- ✅ 重複登録の防止

### 3. **バッチ処理** ✅

- ✅ `batchProcessWhopAffiliates`関数を実装
- ✅ バッチサイズの設定（デフォルト: 10件）
- ✅ 同時実行数の制限（デフォルト: 5件）
- ✅ バッチ間の待機時間（1秒）
- ✅ 進捗コールバック機能

### 4. **エラーハンドリングの改善** ✅

- ✅ `whopRequestSafe`関数にエラーハンドリングを追加
- ✅ エラーハンドラーコールバック機能
- ✅ ログ出力の改善

---

## 📊 実装された機能の使用方法

### Whop APIのレート制限対策

```typescript
import { whopRequestSafe } from '@/api/unified-api';

// レート制限・リトライ対応のAPI呼び出し
const data = await whopRequestSafe('GET', '/affiliates', null, {
  maxRetries: 3,
  retryDelay: 1000,
  rateLimitConfig: {
    maxRequests: 100,
    windowMs: 60000,
  },
  onError: (error, attempt) => {
    console.warn(`Error on attempt ${attempt}:`, error.message);
  },
});
```

### 重複登録チェック

```typescript
import { createWhopAffiliateWithDuplicateCheck } from '@/api/unified-api';

// 重複チェック付きアフィリエイター作成
const result = await createWhopAffiliateWithDuplicateCheck({
  productId: 'prod_xxx',
  email: 'affiliate@example.com',
  name: 'Affiliate Name',
  commissionRate: 0.10,
});

if (result.isNew) {
  console.log('New affiliate created:', result.affiliate);
} else {
  console.log('Existing affiliate found:', result.affiliate);
}
```

### バッチ処理

```typescript
import { batchProcessWhopAffiliates } from '@/api/unified-api';

// 大量のアフィリエイター候補をバッチ処理
const result = await batchProcessWhopAffiliates({
  productId: 'prod_xxx',
  candidates: [
    { email: 'affiliate1@example.com', name: 'Affiliate 1' },
    { email: 'affiliate2@example.com', name: 'Affiliate 2' },
    // ... 何千もの候補
  ],
  batchSize: 10,
  concurrency: 5,
  onProgress: (processed, total) => {
    console.log(`Progress: ${processed}/${total} (${(processed / total * 100).toFixed(1)}%)`);
  },
});

console.log(`Created: ${result.created}, Skipped: ${result.skipped}, Errors: ${result.errors.length}`);
```

---

**最終更新**: 2026-01-11  
**ステータス**: ✅ 実装完了

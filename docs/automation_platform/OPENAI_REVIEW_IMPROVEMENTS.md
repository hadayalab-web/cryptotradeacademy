# OpenAIレビュー改善対応

## 実施日
2025年1月

## 改善内容

OpenAIレビュー機能（`openai_review_code`）の信頼性と堅牢性を向上させるため、以下の改善を実装しました。

---

## 1. エラーハンドリングの強化

### 1.1 コードサイズチェック

**実装**: コードサイズが100KBを超える場合、エラーを返す

```javascript
// コードサイズのチェック（100KB制限）
const codeSizeKB = Buffer.byteLength(code, 'utf8') / 1024;
if (codeSizeKB > 100) {
  return {
    content: [
      {
        type: "text",
        text: `エラー: コードサイズが大きすぎます（${codeSizeKB.toFixed(2)}KB）。100KB以下にしてください。`,
      },
    ],
    isError: true,
  };
}
```

**理由**: 
- 大きなコードを送信すると、APIのタイムアウトやレート制限に引っかかる可能性がある
- 事前にチェックすることで、無駄なAPI呼び出しを防ぐ

---

## 2. リトライロジックの実装

### 2.1 `retryWithBackoff`メソッド

**実装**: 指数バックオフによるリトライ機能

```javascript
async retryWithBackoff(fn, options = {}) {
  const { maxRetries = 3, retryableErrors = ['TIMEOUT', 'RATE_LIMIT', 'NETWORK_ERROR'] } = options;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const errorCode = this.getErrorCode(error);
      const isRetryable = retryableErrors.includes(errorCode);
      
      if (attempt === maxRetries - 1 || !isRetryable) {
        throw new Error(`API call failed after ${attempt + 1} attempts: ${error.message}`);
      }
      
      // 指数バックオフでリトライ（1秒、2秒、4秒）
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      console.error(`[OpenAI] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms (Error: ${errorCode})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

**特徴**:
- 最大3回のリトライ
- 指数バックオフ（1秒、2秒、4秒）
- リトライ可能なエラーのみ再試行
- 最大10秒のバックオフ制限

### 2.2 `getErrorCode`メソッド

**実装**: エラーコードの分類

```javascript
getErrorCode(error) {
  if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
    return 'TIMEOUT';
  }
  if (error.status === 429 || error.message.includes('rate limit')) {
    return 'RATE_LIMIT';
  }
  if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.message.includes('network')) {
    return 'NETWORK_ERROR';
  }
  return 'UNKNOWN';
}
```

**分類**:
- `TIMEOUT`: タイムアウトエラー
- `RATE_LIMIT`: レート制限エラー（429）
- `NETWORK_ERROR`: ネットワークエラー
- `UNKNOWN`: その他のエラー

---

## 3. タイムアウト設定の追加

### 3.1 `handleChat`メソッドの改善

**実装**: Promise.raceを使用したタイムアウト処理

```javascript
async handleChat(args) {
  const {
    model = "gpt-5.2-2025-12-11",
    timeout = 60000, // デフォルトタイムアウト: 60秒
    messages,
    temperature = 0.7,
    max_tokens,
  } = args;

  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  // タイムアウト付きでAPI呼び出し
  return await Promise.race([
    this.openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
    }),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout)
    ),
  ]).then(completion => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(completion, null, 2),
        },
      ],
    };
  });
}
```

**特徴**:
- デフォルトタイムアウト: 60秒
- `Promise.race`を使用してタイムアウトを実現
- タイムアウト時は明確なエラーメッセージを返す

---

## 4. `handleCodeReview`の改善

### 4.1 リトライロジックの統合

**実装**: `retryWithBackoff`を使用したコードレビュー

```javascript
async handleCodeReview(args) {
  // ... コードサイズチェック ...

  // リトライロジック付きで実行
  return await this.retryWithBackoff(
    async () => {
      return await this.handleChat({
        model: "gpt-5.2-2025-12-11",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        timeout: 60000, // 60秒のタイムアウト
      });
    },
    {
      maxRetries: 3,
      retryableErrors: ['TIMEOUT', 'RATE_LIMIT', 'NETWORK_ERROR'],
    }
  );
}
```

**改善点**:
- タイムアウトエラー時に自動リトライ
- レート制限エラー時に自動リトライ
- ネットワークエラー時に自動リトライ
- 最大3回のリトライで成功率を向上

---

## 5. 効果

### 5.1 信頼性の向上

- **タイムアウト対策**: 60秒のタイムアウトで、無限に待機することを防止
- **リトライ機能**: 一時的なエラー（タイムアウト、レート制限、ネットワークエラー）を自動的にリトライ
- **エラー分類**: エラーの種類に応じた適切な処理

### 5.2 ユーザー体験の向上

- **明確なエラーメッセージ**: エラーの原因が分かりやすい
- **コードサイズチェック**: 事前に問題を検出
- **自動リトライ**: ユーザーが手動でリトライする必要がない

### 5.3 パフォーマンスの向上

- **指数バックオフ**: サーバーへの負荷を軽減
- **タイムアウト**: 無駄な待機時間を削減
- **エラー分類**: リトライ不可能なエラーを早期に検出

---

## 6. テストシナリオ

### 6.1 正常系
- ✅ 通常のコードレビューが正常に動作する
- ✅ タイムアウト内に完了する

### 6.2 異常系
- ✅ タイムアウトエラー時に自動リトライされる
- ✅ レート制限エラー時に自動リトライされる
- ✅ ネットワークエラー時に自動リトライされる
- ✅ コードサイズが100KBを超える場合、エラーを返す
- ✅ リトライ不可能なエラーは即座にエラーを返す

---

## 7. 今後の改善案

1. **メトリクスの追加**: リトライ回数、成功率などのメトリクスを記録
2. **動的タイムアウト**: コードサイズに応じてタイムアウトを調整
3. **キャッシュ機能**: 同じコードのレビュー結果をキャッシュ
4. **ストリーミング対応**: 大きなコードのレビュー結果をストリーミングで返す

---

## 8. バージョン情報

- **バージョン**: 1.1.0
- **更新日**: 2025年1月
- **変更内容**: エラーハンドリング、リトライロジック、タイムアウト設定の追加

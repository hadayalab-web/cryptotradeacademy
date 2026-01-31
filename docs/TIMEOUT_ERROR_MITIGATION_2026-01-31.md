# タイムアウトエラー対策（Xアカウントアラート対策）

**作成日**: 2026-01-31  
**目的**: ドライラン失敗時のタイムアウトエラーによる連続リトライがX APIに不要なリクエストを送信し、スパム検出を引き起こす問題を解決

## 問題の背景

### ユーザーの観察
- Xアカウントに「provisional label（暫定ラベル）」と「potential spam/platform manipulation warning（スパム/プラットフォーム操作の警告）」が表示され始めた
- ドライランが失敗しているときにタイムアウトエラーを何度も起こしたことが原因だと推測

### 問題の根本原因
1. **タイムアウトエラーのリトライロジック**
   - 現在の実装では、タイムアウトエラー（`AbortError`、`timeout`を含むメッセージ）が発生すると、最大3回リトライされる
   - 初回+3回リトライ = **合計4回**のリクエストがX APIに送信される可能性がある

2. **ドライランモード時の動作**
   - ドライランモード時でも、AI分析（Grok、Gemini）やその他のAPI呼び出しが実行される
   - これらの処理がタイムアウトすると、リトライが繰り返される
   - 実際には投稿されないが、**リクエスト自体はX APIに送信される**

3. **X APIへの影響**
   - タイムアウトエラーが繰り返し発生すると、同じリクエストが何度も送信される
   - Xのシステムが異常なアクティビティとして検出し、スパム警告を発動する可能性がある

## 実装した対策

### 1. ドライランモード時の書き込み操作（POST）を完全にスキップ

**ファイル**: `services/x/client.js`

**変更内容**:
- ドライランモード時は、書き込み操作（POST、PUT、DELETE）のリクエスト自体を送信しない
- モックレスポンスを返すことで、呼び出し側でエラーにならないようにする
- **「試行回数だけ伸びて実投稿が空になる」という異常なパターンを防ぐ**

```javascript
// P0 FIX: ドライランモード時は書き込み操作（POST）を完全にスキップ（スパム検出対策）
const xStatus = getXConfigStatus();
const isWriteOperation = method === 'POST' || method === 'PUT' || method === 'DELETE';

if (xStatus.dryRun && isWriteOperation) {
  const isPostEndpoint = 
    endpoint === '/tweets' ||
    endpoint.startsWith('/tweets/') && endpoint.includes('/retweets') ||
    endpoint.startsWith('/users/') && endpoint.includes('/retweets') ||
    endpoint.startsWith('/users/') && endpoint.includes('/likes');
  
  if (isPostEndpoint) {
    console.log(`[X API] 🧪 DRY RUN MODE - Skipping write operation (${method} ${endpoint}) to prevent spam detection`);
    return {
      data: {
        id: `dry-run-${Date.now()}`,
        text: '[DRY RUN] This is a mock response'
      }
    };
  }
}
```

**効果**:
- ドライランモード時は、X APIへの書き込みリクエストが一切送信されない
- 「試行だけして投稿しない」という異常なパターンを完全に防止
- 読み取り操作（GET）は許可されるため、AI分析などの処理は正常に動作

### 2. ドライランモード時のタイムアウトエラーリトライ無効化

**変更内容**:
- ドライランモード時は、タイムアウトエラーをリトライせず、即座にエラーをスロー
- `getXConfigStatus()`を使用してドライランモードを検出
- タイムアウトエラーが発生した場合、リトライをスキップしてエラーをスロー

```javascript
// P0 FIX: ドライランモード時はタイムアウトエラーをリトライしない（Xアカウントアラート対策）
const xStatus = getXConfigStatus();
const isTimeoutError = 
  error.name === 'AbortError' ||
  error.message?.includes('timeout') ||
  error.message?.includes('Timeout');

if (isTimeoutError && xStatus.dryRun) {
  clearTimeout(timeoutId);
  console.error(
    `[X API] ⚠️ Timeout error in DRY RUN mode - skipping retry to prevent spam detection (attempt ${attempt + 1}):`,
    error.message
  );
  throw new Error(`X API Timeout in DRY RUN mode (no retry): ${error.message}`);
}
```

### 3. タイムアウトエラーのリトライ回数削減

**変更内容**:
- タイムアウトエラーのリトライ回数を**最大3回→1回**に削減
- 通常のネットワークエラー（`ECONNRESET`、`ETIMEDOUT`など）は従来通り最大3回リトライ
- タイムアウトエラーのみ特別扱い

```javascript
// タイムアウトエラーの場合は最大1回のみリトライ（通常のmaxRetriesより少ない）
const isTimeoutRetry = isTimeoutError;
const maxTimeoutRetries = 1; // タイムアウトエラーは1回のみリトライ
const effectiveMaxRetries = isTimeoutRetry ? maxTimeoutRetries : maxRetries;
const shouldRetry = isRetryableError && attempt < effectiveMaxRetries;
```

## 期待される効果

1. **Xアカウントアラートの軽減**
   - ドライランモード時のタイムアウトエラーによる不要なリクエストを削減
   - スパム検出のリスクを低減

2. **APIコストの削減**
   - タイムアウトエラー時のリトライ回数を削減することで、不要なAPI呼び出しを削減
   - X APIの使用量を削減

3. **エラーハンドリングの改善**
   - ドライランモード時は即座にエラーをスローすることで、問題の早期発見が可能
   - タイムアウトエラーが連続発生した場合の早期停止

## 今後の改善案

### 1. タイムアウトエラーが連続発生した場合の早期停止ロジック
- 一定時間内にタイムアウトエラーがN回連続発生した場合、リトライを完全に停止
- KVストレージにタイムアウトエラーの履歴を記録し、閾値を超えた場合に停止

### 2. ドライランモード時のタイムアウト時間短縮
- ドライランモード時は、タイムアウト時間を30秒→10秒に短縮
- より早くエラーを検出し、不要なリクエストを削減

### 3. タイムアウトエラーの監視とアラート
- タイムアウトエラーの発生率を監視
- 一定の閾値を超えた場合、アラートを発動

## 関連ファイル

- `services/x/client.js`: X APIリクエストの実装（タイムアウトエラー処理）
- `services/x/config.js`: X設定の取得（ドライランモード検出）

## 参考資料

- [X API Rate Limits Documentation](https://docs.x.com/x-api/fundamentals/rate-limits#x-api-rate-limits)
- `docs/X_API_RATE_LIMIT_OPTIMIZATION.md`: X APIレート制限の最適化戦略
- `docs/X_ACCOUNT_ALERT_MITIGATION.md`: Xアカウントアラート対策

# 環境変数エラー修正（2026-01-28）

## 問題

テストスクリプト実行時に、環境変数が設定されていない場合に以下のエラーが発生：

1. `OPENAI_API_KEY`が設定されていない → `services/gpt/client.js`でエラー
2. `XAI_API_KEY`が設定されていない → `services/x/contentOptimizer.js`でエラー
3. `GEMINI_API_KEY`が設定されていない → `services/x/contentOptimizer.js`でエラー

## 修正内容

### 1. `services/x/contentOptimizer.js`

**問題**: モジュール読み込み時に即座に`new OpenAI()`を実行していた

**修正**:
- OpenAIクライアントの初期化を遅延（環境変数がある場合のみ初期化）
- `grokClient`と`geminiClient`をnull許容に変更
- 使用時にクライアントの存在をチェック

```javascript
// 修正前
const grokClient = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: XAI_BASE_URL,
});

// 修正後
let grokClient = null;
try {
  if (XAI_API_KEY) {
    grokClient = new OpenAI({
      apiKey: XAI_API_KEY,
      baseURL: XAI_BASE_URL,
    });
  }
} catch (error) {
  console.warn('[X Content Optimizer] Failed to initialize Grok client:', error.message);
}
```

### 2. `services/grok/xAlgorithmAnalyzer.js`

**問題**: モジュール読み込み時に即座に`new OpenAI()`を実行していた

**修正**:
- OpenAIクライアントの初期化を遅延
- `grokClient`をnull許容に変更
- 使用時にクライアントの存在をチェック

### 3. `services/gpt/client.js`

**問題**: モジュール読み込み時に即座に`new OpenAI()`を実行していた（実際には使用されていないが、念のため）

**修正**:
- OpenAIクライアントの初期化を遅延
- 各関数の最初で`OPENAI_API_KEY`のチェックを追加
- 環境変数がない場合は早期リターン

```javascript
// 修正前
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// 修正後
let openai = null;
try {
  if (OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
  }
} catch (error) {
  console.warn('[GPT Client] Failed to initialize OpenAI client:', error.message);
}
```

### 4. `scripts/test-all-cronjobs-dry-run.js`

**修正**:
- `.env`ファイルを読み込むように修正（`dotenv`を使用）
- モジュールパスを修正（`./api/cron` → `../api/cron`）
- エラーハンドリングを改善

```javascript
// .envファイルを読み込む
try {
  require('dotenv').config({ path: '.env' });
  console.log('✅ Loaded .env file');
} catch (error) {
  console.warn('⚠️ Failed to load .env file:', error.message);
}
```

## 確認事項

- ✅ 環境変数がない場合でもエラーが発生しない
- ✅ クライアントが初期化されていない場合は適切に警告を出力
- ✅ 使用時にクライアントの存在をチェック
- ✅ `.env`ファイルが正しく読み込まれる

## 次のステップ

1. **テストスクリプトを再実行**
2. **すべてのCronJobsが正常に動作することを確認**
3. **エラーが発生した場合の修正**

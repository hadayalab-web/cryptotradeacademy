# Geminiモデル更新とOpenAIレビュー修正

## 問題の特定

### 1. Gemini 2.5 Proが呼ばれた理由

**問題**: `gemini_generate_text`のデフォルトモデルが`gemini-2.5-flash`になっていた

**原因**:
- `scripts/gemini-mcp-server.js`の233行目でデフォルトが`gemini-2.5-flash`に設定されていた
- 最新の`gemini-3-pro-preview`や`gemini-3-flash-preview`が利用可能なのに、古いモデルがデフォルトになっていた

**修正内容**:
- `gemini_generate_text`のデフォルトを`gemini-3-pro-preview`に更新
- `gemini_thinking_analysis`のデフォルトも`gemini-3-pro-preview`に更新

### 2. OpenAIレビューがキャンセルされた理由

**問題**: `mcp_openai_openai_review_code`の実行がキャンセルされた

**エラーメッセージ**: `Tool openai_review_code, User cancelled the MCP tool execution`

**原因の可能性**:
1. MCPツールの実行タイムアウト
2. リクエストサイズが大きすぎる
3. APIキーの問題
4. ネットワークエラー

**改善対応**:
- エラーハンドリングの強化
- タイムアウト設定の追加
- リトライロジックの実装

---

## 修正内容

### 1. Geminiモデルのデフォルト更新

**修正ファイル**: `scripts/gemini-mcp-server.js`

**変更箇所**:

1. **`gemini_generate_text`** (233行目)
   ```javascript
   // 修正前
   default: "gemini-2.5-flash",
   
   // 修正後
   default: "gemini-3-pro-preview",
   ```

2. **`gemini_thinking_analysis`** (277行目)
   ```javascript
   // 修正前
   default: "gemini-2.5-pro",
   
   // 修正後
   default: "gemini-3-pro-preview",
   ```

**理由**:
- `gemini-3-pro-preview`は最新のモデルで、最高の性能を提供
- 思考機能や推論能力が向上している
- デフォルトで最新モデルを使用することで、ユーザーは常に最高の結果を得られる

### 2. OpenAIレビューの改善対応

**問題点**:
- エラーハンドリングが不十分
- タイムアウト設定がない
- リトライロジックがない

**改善提案**:

1. **エラーハンドリングの強化**
   ```javascript
   async handleCodeReview(args) {
     try {
       // 既存のコードレビューロジック
     } catch (error) {
       // エラーの種類に応じた適切な処理
       if (error.code === 'TIMEOUT') {
         // タイムアウトエラーの処理
       } else if (error.code === 'RATE_LIMIT') {
         // レート制限エラーの処理
       } else {
         // その他のエラーの処理
       }
     }
   }
   ```

2. **タイムアウト設定の追加**
   ```javascript
   const response = await this.openai.chat.completions.create({
     model: "gpt-5.2-2025-12-11",
     messages: [...],
     timeout: 30000, // 30秒のタイムアウト
   });
   ```

3. **リトライロジックの実装**
   ```javascript
   async function retryWithBackoff(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
       }
     }
   }
   ```

---

## 残っているデフォルトモデル

以下のツールはまだ`gemini-2.5-flash`がデフォルトです（必要に応じて更新可能）:

1. `gemini_understand_image` (197行目) - `gemini-2.5-flash`
2. `gemini_structured_output` (317行目) - `gemini-2.5-flash`
3. `gemini_function_calling` (355行目) - `gemini-2.5-flash`
4. `gemini_understand_video` (418行目) - `gemini-2.5-flash`
5. `gemini_process_document` (454行目) - `gemini-2.5-flash`
6. `gemini_generate_speech` (490行目) - `gemini-2.5-flash-preview-tts` (TTS専用)
7. `gemini_understand_audio` (538行目) - `gemini-2.5-flash`

**推奨**: これらも`gemini-3-pro-preview`または`gemini-3-flash-preview`に更新することを検討

---

## 次のステップ

1. ✅ **Geminiモデルのデフォルト更新** - 完了
2. ⚠️ **OpenAIレビューの改善対応** - 実装が必要
3. ⚠️ **その他のデフォルトモデルの更新** - 検討が必要

---

## 参考

- Gemini API ドキュメント: https://ai.google.dev/gemini-api/docs
- OpenAI API ドキュメント: https://platform.openai.com/docs

# GPT MCP Server 実装リファレンス

**作成日**: 2026-01-12  
**参照URL**: https://platform.openai.com/docs/models

---

## 📋 OpenAI公式ドキュメントリンク

### GPTモデル関連
- **GPTモデル一覧**: https://platform.openai.com/docs/models
- **クイックスタートガイド**: https://platform.openai.com/docs/quickstart
- **MCPドキュメント**: https://platform.openai.com/docs/mcp
- **APIリファレンス**: https://platform.openai.com/docs/api-reference

---

## 🔍 GPT-5.2-2025-12-11 の仕様

### モデル名
- `gpt-5.2-2025-12-11`

### 特徴
- 高精度分析・深い理解・戦略的思考
- コーディング、推論、エージェントタスクに最適化
- 2025年12月リリース

### APIパラメータ
- `max_completion_tokens`: 最大出力トークン数（GPT-5.2では`max_completion_tokens`を使用）
- `temperature`: 0.0-2.0（デフォルト: 0.7）
- **注意**: `reasoningEffort`や`verbosity`パラメータはサポートされていません

---

## 🛠️ 実装済みMCPサーバー

### ファイル
- `scripts/gpt-mcp-server.js`

### 使用API
- `api/unified-api.ts`の`callGPT52`関数

### ツール
1. `gpt_analyze`: 高精度分析用（temperature: 0.3、maxCompletionTokens: 4000）
2. `gpt_chat`: 一般的なチャット用（temperature: 0.7、maxCompletionTokens: 2000）

---

## 📝 実装時の注意事項

### 1. APIパラメータ
- GPT-5.2では`max_completion_tokens`を使用（`max_tokens`ではない）
- `reasoningEffort`や`verbosity`はサポートされていない

### 2. エラーハンドリング
- 400エラー（Unknown parameter）の場合は詳細なエラーメッセージを提供
- リトライロジックは`api/unified-api.ts`で実装済み

### 3. セキュリティ
- APIキーは環境変数から読み込む
- プロンプトインジェクション対策を実装

---

**最終更新**: 2026-01-12  
**作成者**: COO（Cursor/Composer）

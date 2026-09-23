# GPT MCP Server セットアップガイド

**作成日**: 2026-01-12  
**目的**: OpenAI公式ドキュメントに基づいたGPT MCPサーバーの実装  
**参照**: https://platform.openai.com/docs/mcp

---

## 📋 概要

このMCPサーバーは、`api/unified-api.ts`の`callGPT52`関数を使用してGPT-5.2-2025-12-11を呼び出すためのサーバーです。

**特徴**:
- ✅ OpenAI公式ドキュメント準拠
- ✅ `api/unified-api.ts`の`callGPT52`を使用（統一されたAPI管理）
- ✅ GPT-5.2-2025-12-11を優先使用
- ✅ エラーハンドリングとリトライロジック
- ✅ セキュリティベストプラクティス

---

## 🚀 セットアップ手順

### 1. MCP設定ファイルを編集

`~/.cursor/mcp.json`（Windows: `C:\Users\<ユーザー名>\.cursor\mcp.json`）を編集：

```json
{
  "mcpServers": {
    "gpt": {
      "command": "node",
      "args": [
        "C:\\Users\\chiba\\hadayalab-automation-platform\\scripts\\gpt-mcp-server.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**注意**: パスは絶対パスで指定してください。

### 2. 環境変数の確認

`api/.env`ファイルに以下の環境変数が設定されていることを確認：

```env
OPENAI_API_KEY=sk-xxx
```

### 3. 依存関係の確認

以下のパッケージがインストールされていることを確認（既にインストール済み）：

```bash
npm install @modelcontextprotocol/sdk dotenv
```

---

## 🛠️ 利用可能なツール

### 1. `gpt_analyze`

**説明**: GPT-5.2-2025-12-11を使用して高精度分析を実行します。深い理解・戦略的思考・論理的推論に最適です。CTOとしての技術的意思決定やコードレビューに使用できます。

**パラメータ**:
- `prompt` (必須): 分析したい内容や質問
- `temperature` (オプション): 温度パラメータ（0.0-2.0、デフォルト: 0.3）
- `maxCompletionTokens` (オプション): 最大出力トークン数（デフォルト: 4000）

**使用例**:
```json
{
  "name": "gpt_analyze",
  "arguments": {
    "prompt": "Next.js 16のビルドエラーを解決してください。",
    "temperature": 0.3,
    "maxCompletionTokens": 4000
  }
}
```

### 2. `gpt_chat`

**説明**: GPT-5.2-2025-12-11を使用した一般的なチャット。質問応答、会話、情報取得など。

**パラメータ**:
- `prompt` (必須): ユーザーの質問やメッセージ
- `temperature` (オプション): 温度パラメータ（0.0-2.0、デフォルト: 0.7）
- `maxCompletionTokens` (オプション): 最大出力トークン数（デフォルト: 2000）

**使用例**:
```json
{
  "name": "gpt_chat",
  "arguments": {
    "prompt": "TypeScriptの型エラーについて教えてください。",
    "temperature": 0.7,
    "maxCompletionTokens": 2000
  }
}
```

---

## 🔧 実装詳細

### API統合

このMCPサーバーは`api/unified-api.ts`の`callGPT52`関数を使用しています：

```javascript
import { callGPT52 } from '../api/unified-api.js';

const result = await callGPT52(prompt, {
  temperature: 0.3,
  maxCompletionTokens: 4000
});
```

### エラーハンドリング

- API呼び出しエラーは適切にキャッチされ、エラーメッセージを返します
- 環境変数の読み込みエラーは警告として表示されます
- サーバー起動エラーはプロセスを終了します

### セキュリティ

- APIキーは環境変数から読み込まれます
- プロンプトインジェクション対策は`api/unified-api.ts`で実装されています
- エラーメッセージには機密情報が含まれません

---

## 📝 使用例

### Cursorから直接呼び出す

CursorのMCPツールから直接`gpt_analyze`を呼び出すことができます：

1. Cursorで`@gpt_analyze`と入力
2. プロンプトを入力
3. 結果が直接返されます

### ビルドエラーの解決

```json
{
  "name": "gpt_analyze",
  "arguments": {
    "prompt": "Next.js 16.1.1のビルドエラーを解決してください。エラー一覧: [エラー内容]",
    "temperature": 0.3,
    "maxCompletionTokens": 4000
  }
}
```

---

## ✅ 確認事項

- [ ] MCP設定ファイルが正しく設定されている
- [ ] `api/.env`に`OPENAI_API_KEY`が設定されている
- [ ] 依存関係がインストールされている
- [ ] MCPサーバーが正常に起動している

---

## 🔍 トラブルシューティング

### エラー: "Failed to import callGPT52"

**原因**: `api/unified-api.ts`が見つからない、またはエクスポートされていない

**解決策**:
1. `api/unified-api.ts`が存在することを確認
2. `callGPT52`関数がエクスポートされていることを確認

### エラー: "OPENAI_API_KEY is not set"

**原因**: 環境変数が設定されていない

**解決策**:
1. `api/.env`ファイルに`OPENAI_API_KEY`を設定
2. MCP設定ファイルの`env`セクションに直接設定

### エラー: "Unknown tool"

**原因**: ツール名が間違っている

**解決策**:
1. `gpt_analyze`または`gpt_chat`を使用
2. ツール名のスペルを確認

---

**最終更新**: 2026-01-12  
**作成者**: COO（Cursor/Composer）

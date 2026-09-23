# AI MCP Servers クイックスタートガイド

**作成日**: 2026-01-12  
**目的**: GPT、Gemini、GrokのMCPサーバーを素早くセットアップして使用する

---

## 🚀 5分でセットアップ

### 1. MCP設定ファイルを編集

`~/.cursor/mcp.json`（Windows: `C:\Users\<ユーザー名>\.cursor\mcp.json`）を開き、以下を追加：

```json
{
  "mcpServers": {
    "gpt": {
      "command": "node",
      "args": [
        "C:\\Users\\chiba\\hadayalab-automation-platform\\scripts\\gpt-mcp-server.js"
      ]
    },
    "gemini": {
      "command": "node",
      "args": [
        "C:\\Users\\chiba\\hadayalab-automation-platform\\scripts\\gemini-mcp-server.js"
      ]
    },
    "grok": {
      "command": "node",
      "args": [
        "C:\\Users\\chiba\\hadayalab-automation-platform\\scripts\\grok-mcp-server.js"
      ]
    }
  }
}
```

### 2. 環境変数を確認

`api/.env`に以下が設定されていることを確認：

```env
OPENAI_API_KEY=sk-xxx
GEMINI_API_KEY=xxx
XAI_API_KEY=xxx
```

### 3. Cursorを再起動

Cursorを再起動してMCPサーバーを有効化します。

---

## 💡 使い方

### Cursorで直接呼び出す

```
@gpt_analyze "ビルドエラーを解決してください"
@gemini_research "マーケティング戦略を立案してください"
@grok_reasoning "大規模コードベースを分析してください"
@nanobanana_generate "高品質なLP用画像を生成"
@veo_generate "ループ動画を生成"
```

### 用途別推奨

| 用途 | 推奨ツール | 理由 |
|------|-----------|------|
| ビルドエラー解決 | `@gpt_analyze` | TypeScript/Next.jsの型エラー解決に最適 |
| マーケティング戦略 | `@gemini_research` | DeepResearch相当の深い分析 |
| 大規模コード分析 | `@grok_reasoning` | 2Mトークンのコンテキスト対応 |
| LP用画像生成 | `@nanobanana_generate` | ハイエンド画像生成（2K/4K対応） |
| VSL動画生成 | `@veo_generate` | 高品質なループ動画生成 |

---

## 📚 詳細ドキュメント

- [完全セットアップガイド](./MCP_SERVERS_SETUP.md)
- [GPT MCP Server 詳細](./GPT_MCP_SERVER_SETUP.md)

---

**最終更新**: 2026-01-12

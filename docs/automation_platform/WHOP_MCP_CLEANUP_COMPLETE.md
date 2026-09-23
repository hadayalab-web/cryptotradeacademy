# Whop MCP整理完了

## 📋 実施内容

### 整理方針
- **公式MCP（`whop-official`）**: ✅ 有効（メインとして使用）
- **カスタマイズMCP（`whop`）**: ❌ 無効化

### 理由

#### 公式MCPを優先する理由
1. ✅ **公式サポート**: Whop公式がサポート
2. ✅ **より多くのツール**: 100+ツールが利用可能
3. ✅ **最新機能への対応**: 新機能が追加されやすい
4. ✅ **標準的なツール名**: 統一された命名規則

#### カスタマイズMCPを無効化する理由
1. ❌ **重複**: 公式MCPで代替可能
2. ❌ **メンテナンス負担**: 独自実装の維持が必要
3. ❌ **機能の重複**: 同じAPIエンドポイントを使用

### カスタマイズMCPの独自機能（参考）
- LRUキャッシュ（GETリクエスト、5分TTL）
- リトライロジック（429/5xxエラー時の自動リトライ、指数バックオフ）
- レート制限管理（1分間に100リクエスト）
- 日本語説明

**注意**: これらの機能は公式MCPでも実装されている可能性があります。

## 🔧 設定変更

### mcp.jsonの変更
- **削除**: `whop`（カスタマイズMCP）
- **維持**: `whop-official`（公式MCP）

### 設定ファイル
- **パス**: `C:\Users\chiba\.cursor\mcp.json`
- **更新日**: 2026-01-09

## 📝 使用方法

### 公式MCPのツール使用例

#### プロダクト取得
```
@whop-official get_products
```

#### プロダクト更新
```
@whop-official update_products id=prod_6RjqaJMGyEw1F description="..."
```

#### メンバーシップ取得
```
@whop-official get_memberships
```

### ツール一覧の確認
```bash
npx -y @whop/mcp --list
```

## 🔄 カスタマイズMCPを再度有効化する場合

必要に応じて、`mcp.json`に以下を追加：

```json
{
  "mcpServers": {
    "whop": {
      "command": "node",
      "args": [
        "C:/Users/chiba/hadayalab-automation-platform/scripts/whop-mcp-server.js"
      ],
      "env": {
        "LOG_LEVEL": "error",
        "NODE_NO_WARNINGS": "1"
      }
    }
  }
}
```

## 📊 整理後の構成

### 有効なMCPサーバー
- ✅ `whop-official` - Whop公式MCP（メイン）
- ✅ `gemini` - Gemini MCP
- ✅ `xai` - XAI (Grok) MCP
- ✅ `telegram` - Telegram MCP
- ✅ `document-speed-loader` - Document Speed Loader MCP
- ✅ `openai` - OpenAI MCP
- ✅ `resend` - Resend MCP
- ✅ `cryptoquant-verification` - CryptoQuant Verification MCP

### 無効化されたMCPサーバー
- ❌ `whop` - カスタマイズMCP（公式MCPで代替）

## 🎯 次のステップ

1. **Cursorを再起動**（必須）
2. **公式MCPのツールを確認**
3. **必要に応じてツールを使用**

## 📚 参考ドキュメント

- 公式MCPドキュメント: `docs/WHOP_OFFICIAL_MCP_TOOLS.md`
- テスト結果: `docs/WHOP_OFFICIAL_MCP_TEST_RESULT.md`
- 整理計画: `docs/WHOP_MCP_CLEANUP_PLAN.md`

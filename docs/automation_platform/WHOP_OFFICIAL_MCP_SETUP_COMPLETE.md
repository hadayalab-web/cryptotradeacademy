# Whop公式MCP（@whop/mcp）設定完了

## 設定状況

✅ **公式MCPをmcp.jsonに追加完了**
- サーバー名: `whop-official`
- コマンド: `npx -y @whop/mcp`
- APIキー: 設定済み

## 確認できたツール

公式MCP（`npx -y @whop/mcp --list`）で確認できたツール：

### Products（プロダクト）
- ✅ `update_products` (write) - Updates an existing Product
  - Required permissions: `access_pass:update`, `access_pass:basic:read`
  - Resource: `products`

### その他のProductsツール
- `create_products` (write) - Create a new Product
- `list_products` (read) - List all products
- `retrieve_products` (read) - Retrieves a product by ID

## 次のステップ

1. **Cursorを再起動**（必須）
   - 公式MCPサーバーを読み込むため

2. **公式MCPの`update_products`ツールでプロダクト更新を試行**
   - ツール名: `update_products`（公式MCP）
   - カスタマイズMCP: `whop_update_product`（401エラー）
   - REST API: `PATCH /api/v2/products/{id}`（401エラー）

3. **結果を確認**
   - 成功: プロダクト説明が更新される
   - 失敗（401エラー）: APIキーの権限不足（Whop Dashboardで手動更新が必要）

## 期待される結果

公式MCPでも同じAPIキーを使用するため、権限不足であれば同じ401エラーになる可能性が高いです。

ただし、公式MCPが異なるエンドポイントや認証方法を使用している可能性もあるため、試す価値はあります。

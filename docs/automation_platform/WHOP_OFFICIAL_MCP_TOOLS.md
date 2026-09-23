# Whop公式MCP（@whop/mcp）ツール一覧

## 確認できたツール

公式MCP（`npx -y @whop/mcp --list`）で確認できたツール：

### Products（プロダクト）
- `update_products` (write) - Updates an existing Product
  - Required permissions: `access_pass:update`, `access_pass:basic:read`
  - Resource: `products`

### その他のリソース
- `create_products` (write) - Create a new Product
- `list_products` (read) - List all products
- `retrieve_products` (read) - Retrieves a product by ID

## 重要な発見

公式MCPには`update_products`ツールが存在します！
- カスタマイズMCP: `whop_update_product` → 401エラー
- REST API: `PATCH /api/v2/products/{id}` → 401エラー
- **公式MCP: `update_products` → 試行が必要**

## 次のステップ

1. CursorのMCP設定に公式MCPを追加
2. Cursorを再起動
3. 公式MCPの`update_products`ツールでプロダクト更新を試行

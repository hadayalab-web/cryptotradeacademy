# Whop公式MCP（@whop/mcp）テスト結果

## テスト実施日
2026-01-09

## テスト内容
公式MCPの`update_products`ツールが使用するAPIエンドポイントを直接呼び出してテスト

## テスト結果

### ✅ プロダクト情報の取得
- **エンドポイント**: `GET /api/v2/products/{id}`
- **結果**: ✅ 成功
- **現在の説明**: 0文字（空）

### ❌ プロダクト更新
- **エンドポイント**: `PATCH /api/v2/products/{id}`（公式MCPの`update_products`ツールが使用）
- **結果**: ❌ 401 Unauthorized
- **エラーメッセージ**: "The API Key supplied does not have permission to access this route."

## 結論

### 公式MCPでも同じエラーが発生
公式MCPの`update_products`ツールも同じWhop APIエンドポイント（`PATCH /api/v2/products/{id}`）を使用するため、同じ401エラーが発生します。

### 根本原因
現在のAPIキー（`apik_6Ql14WHRU0Sje_C3791174_C_cb45d64f7f618e1c592233edf2cf04ba11ff7d7e5cede362db19089df8a7a6`）には：
- ✅ **読み取り権限**: あり（`GET /api/v2/products/{id}`は成功）
- ❌ **更新権限**: なし（`PATCH /api/v2/products/{id}`は401エラー）

### 解決策

#### オプション1: Whop Dashboardで手動更新（推奨）
1. Whop Dashboardにログイン
2. Products → BTC TrapShield Academy EN → Edit
3. DescriptionにSSOTベースの説明をコピー&ペースト
4. Save

#### オプション2: APIキーの権限を更新
1. Whop Dashboard → Developer → API Keys
2. 現在のAPIキーの権限を確認
3. `access_pass:update`権限を有効化
4. 新しいAPIキーを生成（必要に応じて）
5. `.env`ファイルを更新

## 次のステップ

1. **Whop Dashboardで手動更新**（最も確実）
2. **APIキーの権限を更新**してから公式MCPで再試行

## 参考

- 公式MCPツールリスト: `npx -y @whop/mcp --list`
- 公式MCP設定: `C:\Users\chiba\.cursor\mcp.json`
- SSOTベースの説明: `scripts/whop-complete-all-markets-setup.js`の`SSOT_PRODUCT_CONFIG`

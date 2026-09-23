# Whop MCPサーバー ツール削除完了

## 削除日
2025年1月

## 削除理由
- ツール数が85個で推奨制限80を超過
- Experience機能が使用不可のため
- Entry機能もExperienceに依存しているため

## 削除されたツール（10個）

### Entry関連ツール（6個）
1. `whop_get_entries` - エントリー一覧取得
2. `whop_get_entry` - エントリー詳細取得
3. `whop_create_entry` - エントリー作成
4. `whop_approve_entry` - エントリー承認
5. `whop_reject_entry` - エントリー拒否
6. `whop_delete_entry` - エントリー削除

### Experience関連ツール（5個）
1. `whop_get_experiences` - Experiences一覧取得
2. `whop_get_experience` - Experience詳細取得
3. `whop_create_experience` - Experience作成
4. `whop_update_experience` - Experience更新
5. `whop_delete_experience` - Experience削除

## 削減効果

### 削除前
- Whop MCPサーバー: 44ツール
- 全体: 85ツール（推奨制限80を超過）

### 削除後
- Whop MCPサーバー: 34ツール（-10ツール）
- 全体: 75ツール（推奨制限80以下）

## 再追加方法

必要になった場合は、以下の手順で再追加できます：

1. `scripts/whop-mcp-server.js`を開く
2. ツール定義セクション（`ListToolsRequestSchema`）に該当ツールを追加
3. ハンドラーセクション（`CallToolRequestSchema`）に該当ケースを追加
4. Cursorを再起動

削除されたコードはコメントとして残してあるため、必要に応じて復元可能です。

## 残っているWhopツール（34個）

### Memberships（メンバーシップ）- 8個
- `whop_get_memberships`
- `whop_get_membership`
- `whop_cancel_membership`
- `whop_reactivate_membership`
- `whop_extend_membership`
- `whop_update_membership`
- `whop_suspend_membership`
- `whop_unsuspend_membership`

### Products（製品）- 5個
- `whop_get_products`
- `whop_get_product`
- `whop_create_product`
- `whop_update_product`
- `whop_delete_product`

### Plans（プラン）- 5個
- `whop_get_plans`
- `whop_get_plan`
- `whop_create_plan`
- `whop_update_plan`
- `whop_delete_plan`

### Members（メンバー）- 3個
- `whop_get_members`
- `whop_get_member`
- `whop_update_member`
- `whop_get_member_payments`

### Affiliates（アフィリエイト）- 5個
- `whop_get_affiliates`
- `whop_get_affiliate`
- `whop_create_affiliate`
- `whop_generate_affiliate_link`
- `whop_get_affiliate_commissions`
- `whop_get_affiliate_stats`

### Refunds（返金）- 3個
- `whop_get_refunds`
- `whop_create_refund`
- `whop_get_refund`

### Payments（支払い）- 2個
- `whop_get_payments`
- `whop_get_payment`

## 注意事項

- 削除されたツールは、Experience機能が使用可能になった場合に再追加を検討してください
- 現在のツール数（75個）は推奨制限（80個）以下です
- パフォーマンスの改善が期待されます

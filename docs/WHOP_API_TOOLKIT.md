# Whop API ツールキット（Cursor連携用）

WhopのAPI作業が増える前提で、**Cursorから直接操作できるCLI**と、**共通APIクライアント**を整備しました。  
ダッシュボードUIの変更に影響されず、プロダクト/プラン/エクスペリエンスの操作が可能です。

---

## ✅ 追加された機能

- **共通APIクライアント拡張**: `services/whop/client.js`
  - `getProduct`, `listProducts`, `updateProduct`
  - `getPromoCode`, `listPromoCodes`, `createPromoCode`, `updatePromoCode`, `deletePromoCode`
  - `getPlan`, `listPlans`, `updatePlan`
  - `getExperience`, `listExperiences`, `updateExperience`
  - `getMembership`, `listMemberships`, `updateMembership`, `cancelMembership`, `terminateMembership`
  - 配列クエリ (`expand[]`) を自動で構築

- **CLIツール**: `scripts/whop-cli.js`
  - 取得/一覧/更新の一連作業をCLIから実行可能
  - `--out` で出力先をファイルに変更（Cursor停止対策）
  - `--apply` で更新実行、未指定は **dry-run**
  - `api:call` で未公開/未整備のエンドポイントにも対応

---

## 使い方（CLI）

### 1) プロダクト取得
```bash
node scripts/whop-cli.js products:get --id=prod_xxx --expand=plans,experiences --pretty
```

### 2) プロダクト一覧
```bash
node scripts/whop-cli.js products:list --visibility=hidden --pretty
```

### 3) プロダクト更新（dry-run）
```bash
node scripts/whop-cli.js products:update --id=prod_xxx --data=scripts/whop-samples/product-update.json --pretty
```

### 4) プロダクト更新（実行）
```bash
node scripts/whop-cli.js products:update --id=prod_xxx --data=scripts/whop-samples/product-update.json --apply --pretty
```

### 5) 出力をファイルに保存（Cursor停止対策）
### 6) プロモコード一覧
```bash
node scripts/whop-cli.js promo_codes:list --company_id=biz_xxx --pretty
```

### 7) プロモコード作成（dry-run）
```bash
node scripts/whop-cli.js promo_codes:create --data=scripts/whop-samples/promo-code-create.json --pretty
```

### 8) プロモコード作成（実行）
```bash
node scripts/whop-cli.js promo_codes:create --data=scripts/whop-samples/promo-code-create.json --apply --pretty
```

### 9) メンバーシップ一覧（カスタマー対応）
```bash
node scripts/whop-cli.js memberships:list --status=active --expand=product,plan,user --pretty
```

### 10) メンバーシップキャンセル（期間末）
```bash
node scripts/whop-cli.js memberships:cancel --id=mem_xxx --data-json='{"cancellation_mode":"at_period_end"}' --apply
```

### 11) 未公開エンドポイントの試験（アフィリエイター等）
```bash
node scripts/whop-cli.js api:call --method=GET --path=/affiliate_programs --out=affiliate.json
```
```bash
node scripts/whop-cli.js products:get --id=prod_xxx --out=whop-product.json
```

---

## 更新データのサンプル

`scripts/whop-samples/product-update.json`
- `description`, `headline`, `product_highlights` を含むサンプル
- API側の仕様で、**更新は成功してもレスポンスに返らない**ケースがあります  
  （`product_highlights` は作成時のみ返却される可能性あり）

`scripts/whop-samples/promo-code-create.json`
- プロモコード作成用のサンプル

---

## 重要な注意点

- **更新系のコマンドは `--apply` が必要**  
  指定しない場合は dry-run になります。
- **大きいJSONをターミナルに出すとCursorが固まることがある**ため、
  `--out` を推奨。
- **Whop APIのレスポンス仕様がUIと一致しない**ケースがあるため、
  必要ならダッシュボードで最終確認。
- **アフィリエイター管理はAPI公開が限定的**なため、
  `api:call` で有無を確認しつつ運用（未公開の可能性あり）。

---

## 関連ファイル

- `services/whop/client.js`
- `scripts/whop-cli.js`
- `scripts/whop-samples/product-update.json`
- `scripts/whop-samples/promo-code-create.json`
- `docs/WHOP_DASHBOARD_UPDATE_INVESTIGATION.md`


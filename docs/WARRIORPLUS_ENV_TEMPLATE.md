# WarriorPlus → Whop 連携：環境変数テンプレート

Vercel の Environment Variables に追加すべき一覧です。  
**二重決済を防ぐため、`WARRIORPLUS_ITEM_NUMBER_XXX_WHOP_PLAN_ID` には必ず「$0 プラン」の plan_id を指定してください。**

---

## 必須

```env
# Whop API（Checkout Session 作成に使用）
WHOP_API_KEY=apik_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# WarriorPlus IPN 検証（WarriorPlus アカウントの Security Key と一致させる）
WARRIORPLUS_SECURITY_KEY=c1b46e1d7c44bb9b1038e21ac738a3f
```

---

## 商品マッピング（必須）

WarriorPlus の IPN には `WP_ITEM_NUMBER` が含まれます。  
これを Whop の **$0 プラン**（外部決済済み用）の `plan_id` に紐付けます。

### WP_ITEM_NUMBER の取得場所

1. ログイン: [WarriorPlus](https://warriorplus.com)
2. **Products** → 対象商品を選択
3. 商品編集画面の **URL** または **商品詳細** を確認
   - 例: `https://warriorplus.com/products/123456` → `123456` が `WP_ITEM_NUMBER` の候補
   - または **Product Settings** 内の **Item Number** フィールド（WarriorPlus が自動生成する場合あり）
4. IPN の `WP_ITEM_NUMBER` は、決済完了時に送信されるペイロードで確認可能。  
   初回は「Send Test」で送った IPN のログ（Vercel の Function Logs）を確認し、実際の値を取得する。

### テンプレート（コピペ用）

```env
# 例: WP_ITEM_NUMBER が 123456 の商品 → Whop の $0 プラン plan_xxx に紐付け
WARRIORPLUS_ITEM_NUMBER_123456_WHOP_PLAN_ID=plan_xxxxxxxxxxxxxxxx

# 複数商品がある場合、同じ形式で追加
# WARRIORPLUS_ITEM_NUMBER_789010_WHOP_PLAN_ID=plan_yyyyyyyyyyyyyyyy
```

**重要**: `plan_xxx` は **Whop ダッシュボードで作成した $0 プラン**（initial_price: 0）の ID にしてください。  
有料プラン（$99 等）を指定すると、購入者が Whop のチェックアウトで再度課金される二重決済になります。

---

## オプション

```env
# 権限剥奪時のモード（terminate / cancel）
WARRIORPLUS_REVOKE_MODE=terminate

# B案（直接権限付与）を試行する場合（Whop が対応 API を提供する場合のみ）
# 1 にすると POST /memberships を試行
WARRIORPLUS_USE_DIRECT_GRANT=0

# B案成功時に KeyGen で返すURL（直接付与が成功した場合のアクセス先）
WARRIORPLUS_ACCESS_URL=https://whop.com/trapdefence/btc-en/

# B案用（Whop Company ID）
WHOP_COMPANY_ID=biz_xxxxxxxxxxxxxx
```

---

## 失敗系アクション

`subscr_failed_invalid` / `subscr_failed_declined` が来た場合も、既存の Whop membership を剥奪します。  
追加の環境変数は不要です。

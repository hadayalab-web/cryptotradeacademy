# Whop 直接API呼び出しガイド

**作成日**: 2026-01-09  
**目的**: MCPサーバーを使わずに、Whop APIを直接呼び出す方法（Cursorのパフォーマンス向上のため）

---

## 📋 概要

MCPサーバーを実装しなくても、**直接APIを呼び出す**ことができます。LP用のアフィリエイトリンク生成やプロダクト管理に最適です。

**注意**: WhopをMCPにするとCursorのパフォーマンスが落ちることが確認されています。直接API呼び出しを使用することで、パフォーマンスを維持できます。

---

## 🚀 使用方法

### 1. CLIから直接呼び出す

```bash
# アフィリエイトリンクを生成
npx tsx scripts/direct-ai-api.ts whop-affiliate-link --productId prod_123 --affiliateId aff_456

# プロダクト情報を取得
npx tsx scripts/direct-ai-api.ts whop-product --productId prod_123

# プロダクト一覧を取得
npx tsx scripts/direct-ai-api.ts whop-products --page 1 --perPage 20

# プラン情報を取得
npx tsx scripts/direct-ai-api.ts whop-plan --planId plan_123

# プラン一覧を取得
npx tsx scripts/direct-ai-api.ts whop-plans --productId prod_123

# アフィリエイト情報を取得
npx tsx scripts/direct-ai-api.ts whop-affiliate --affiliateId aff_456
```

### 2. TypeScript/JavaScriptからインポートして使用

```typescript
import { 
  generateWhopAffiliateLink,
  getWhopProduct,
  getWhopProducts,
  getWhopPlan,
  getWhopPlans,
  getWhopAffiliate,
} from "./scripts/direct-ai-api.js";

// アフィリエイトリンクを生成
const linkResult = await generateWhopAffiliateLink({
  productId: "prod_123",
  affiliateId: "aff_456",
  planId: "plan_789", // オプション
});

// プロダクト情報を取得
const product = await getWhopProduct("prod_123");

// プラン一覧を取得
const plans = await getWhopPlans({ productId: "prod_123" });
```

---

## 📊 各機能の詳細

### 1. `generateWhopAffiliateLink()` - アフィリエイトリンクを生成

```typescript
const result = await generateWhopAffiliateLink({
  productId: "prod_123", // 必須
  affiliateId: "aff_456", // 必須
  planId: "plan_789", // オプション: プラン指定のチェックアウトリンク
  customCode: "custom_ref", // オプション: カスタムアフィリエイトコード
});
```

**レスポンス**:
```typescript
{
  affiliateLink: "https://whop.com/checkout/prod_123/plan_789?ref=aff_456",
  affiliateCode: "aff_456",
  productId: "prod_123",
  planId: "plan_789" | null,
  affiliateId: "aff_456",
}
```

**動作**:
- アフィリエイトが存在するか確認（存在しない場合はリンクのみ生成）
- プロダクト情報を取得してスラッグを取得
- `planId`が指定されている場合はチェックアウトリンク、そうでない場合はプロダクトページリンクを生成

---

### 2. `getWhopProduct()` - プロダクト情報を取得

```typescript
const result = await getWhopProduct("prod_123");
```

**レスポンス**:
```typescript
{
  productId: "prod_123",
  name: "Product Name",
  slug: "product-slug",
  description: "Product description",
  data: { ... }, // 完全なWhop APIレスポンス
}
```

---

### 3. `getWhopProducts()` - プロダクト一覧を取得

```typescript
const result = await getWhopProducts({
  page: 1,
  perPage: 20,
});
```

**レスポンス**:
```typescript
{
  products: [
    {
      id: "prod_123",
      name: "Product Name",
      ...
    }
  ],
  total: 100,
  page: 1,
  perPage: 20,
}
```

---

### 4. `getWhopPlan()` - プラン情報を取得

```typescript
const result = await getWhopPlan("plan_123");
```

**レスポンス**:
```typescript
{
  planId: "plan_123",
  name: "Monthly Plan",
  price: 29.99,
  currency: "USD",
  interval: "month",
  data: { ... }, // 完全なWhop APIレスポンス
}
```

---

### 5. `getWhopPlans()` - プラン一覧を取得

```typescript
const result = await getWhopPlans({
  productId: "prod_123", // オプション: プロダクトIDでフィルタ
  page: 1,
  perPage: 20,
});
```

**レスポンス**:
```typescript
{
  plans: [
    {
      id: "plan_123",
      name: "Monthly Plan",
      price: 29.99,
      currency: "USD",
      ...
    }
  ],
  total: 10,
  page: 1,
  perPage: 20,
}
```

---

### 6. `getWhopAffiliate()` - アフィリエイト情報を取得

```typescript
const result = await getWhopAffiliate("aff_456");
```

**レスポンス**:
```typescript
{
  affiliateId: "aff_456",
  name: "Affiliate Name",
  email: "affiliate@example.com",
  data: { ... }, // 完全なWhop APIレスポンス
}
```

---

## 📝 使用例

### 例1: LPでアフィリエイトリンクを生成

```typescript
import { generateWhopAffiliateLink } from "./scripts/direct-ai-api.js";

// ユーザー登録後にアフィリエイトリンクを生成
const affiliateLink = await generateWhopAffiliateLink({
  productId: "prod_cryptosignal_ai_en",
  affiliateId: candidateId,
  planId: "plan_monthly_en", // オプション
});

console.log("アフィリエイトリンク:", affiliateLink.affiliateLink);
```

### 例2: プロダクトの全プランを取得して表示

```typescript
import { getWhopPlans } from "./scripts/direct-ai-api.js";

const plans = await getWhopPlans({
  productId: "prod_cryptosignal_ai_en",
});

console.log("利用可能なプラン:");
plans.plans.forEach((plan) => {
  console.log(`- ${plan.name}: ${plan.price} ${plan.currency}/${plan.interval}`);
});
```

### 例3: アフィリエイト情報を確認してリンクを生成

```typescript
import { getWhopAffiliate, generateWhopAffiliateLink } from "./scripts/direct-ai-api.js";

// アフィリエイトが存在するか確認
try {
  const affiliate = await getWhopAffiliate("aff_456");
  console.log("アフィリエイト情報:", affiliate.name);
  
  // リンクを生成
  const link = await generateWhopAffiliateLink({
    productId: "prod_123",
    affiliateId: affiliate.affiliateId,
  });
} catch (error) {
  console.error("アフィリエイトが見つかりません:", error);
}
```

---

## 🔧 環境変数の設定

`.env`ファイルに以下を設定してください：

```env
WHOP_API_KEY=apik_xxxxxxxxxxxxxx
```

---

## 📋 実装ファイル

- `scripts/direct-ai-api.ts` - 直接API呼び出しユーティリティ
  - `generateWhopAffiliateLink()` - アフィリエイトリンクを生成
  - `getWhopProduct()` - プロダクト情報を取得
  - `getWhopProducts()` - プロダクト一覧を取得
  - `getWhopPlan()` - プラン情報を取得
  - `getWhopPlans()` - プラン一覧を取得
  - `getWhopAffiliate()` - アフィリエイト情報を取得
  - `getWhopAffiliates()` - アフィリエイト一覧を取得

---

## ✅ 実装完了確認

- [x] `generateWhopAffiliateLink()` - アフィリエイトリンクを生成
- [x] `getWhopProduct()` - プロダクト情報を取得
- [x] `getWhopProducts()` - プロダクト一覧を取得
- [x] `getWhopPlan()` - プラン情報を取得
- [x] `getWhopPlans()` - プラン一覧を取得
- [x] `getWhopAffiliate()` - アフィリエイト情報を取得
- [x] CLI対応: `whop-affiliate-link`, `whop-product`, `whop-products`, `whop-plan`, `whop-plans`, `whop-affiliate`

---

## 🎉 実装完了

**Whopの直接API呼び出し機能を実装しました。**

これで、MCPサーバーを使わずに、LP用のアフィリエイトリンク生成やプロダクト管理を直接呼び出せます。Cursorのパフォーマンスも維持されます。

---

**参照**: 
- [Whop API Documentation](https://docs.whop.com/)
- Whop API v2仕様

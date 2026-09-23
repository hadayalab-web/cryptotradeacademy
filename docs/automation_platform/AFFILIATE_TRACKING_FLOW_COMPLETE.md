# アフィリエイトトラッキング完全フロー: Whop機能最大活用

**作成日**: 2026-01-11  
**作成者**: COO: Cursor (Composer 1)  
**目的**: アフィリエイターが連れてきたユーザーのコンバージョンを正確にカウントする仕組み

---

## 🎯 完全フロー概要

### 1. アフィリエイター候補のデータベース化
- **Grok: CSO**が毎日50人×6市場のアフィリエイター候補をデータベース化
- **データベース**: `affiliate_candidates`テーブル

### 2. アフィリエイター候補へのDM送信
- **GPT: CTO**が毎日50人×6市場のアフィリエイター候補にDMを送信
- **DM内容**: リクルートLPへのリンク + アフィリエイトプログラムの説明

### 3. アフィリエイターがリクルートLPにアクセス
- リクルートLP: `orientation-lp/app/affiliate/[market]/page.tsx`
- アフィリエイターがWhopに遷移してアフィリエイトリンクを取得

### 4. アフィリエイターがユーザー向けLPにアクセスさせる
- アフィリエイターが取得したアフィリエイトリンクをユーザーにシェア
- ユーザーがユーザー向けLPにアクセス（`?ref=affiliate_code`が含まれる）

### 5. ユーザー向けLPがセールスし、Whopチェックアウトでコンバージョン
- ユーザー向けLP: `cryptotradeacademy-lp-dev/cryptotradeacademy-lp-[market]`
- `WhopCheckout`コンポーネントが`ref`パラメータから`affiliateCode`を取得
- Whopチェックアウト時に`affiliate_code`が記録される

### 6. Whop Webhookでコンバージョンをカウント
- Whop Webhookが`membership.created`イベントを受け取る
- `affiliate_code`を含むイベントから、どのアフィリエイターが連れてきたかを特定

---

## 🔄 詳細フロー

### Step 1: アフィリエイター候補のデータベース化

```typescript
// Grok: CSOが実行
// 毎日50人×6市場 = 300人のアフィリエイター候補をデータベース化
const candidates = await findAffiliateCandidates({
  market: 'EN', // または AR, ES, JA, KO, PT-BR
  limit: 50,
});

// データベースに保存
await prisma.affiliateCandidate.createMany({
  data: candidates.map(c => ({
    email: c.email,
    telegramUserId: c.telegramUserId,
    market: c.market,
    status: 'Scouted',
  })),
});
```

### Step 2: アフィリエイター候補へのDM送信

```typescript
// GPT: CTOが実行
// 毎日50人×6市場 = 300人のアフィリエイター候補にDM送信
const candidates = await prisma.affiliateCandidate.findMany({
  where: {
    status: 'Scouted',
    market: 'EN', // または AR, ES, JA, KO, PT-BR
  },
  take: 50,
});

for (const candidate of candidates) {
  await sendTelegramMessage({
    userId: candidate.telegramUserId,
    language: candidate.market,
    message: `🎯 アフィリエイトプログラムに参加しませんか？\n\nリクルートLP: https://your-domain.com/affiliate/${candidate.market}`,
  });
}
```

### Step 3: アフィリエイターがリクルートLPにアクセス

**リクルートLP**: `orientation-lp/app/affiliate/[market]/page.tsx`

```typescript
// アフィリエイターがリクルートLPにアクセス
// URL: https://your-domain.com/affiliate/EN?telegramUserId=123456789

// リクルートLPでアフィリエイター登録を促進
// 方法1: Whopダッシュボードへの直接リンク
<a href={`https://whop.com/products/${productId}/affiliates`}>
  アフィリエイター登録
</a>

// 方法2: アフィリエイトリンクを自動生成（Whop API活用）
const affiliateLink = await generateAffiliateLink({
  productId,
  affiliateCode: candidate.affiliateCode, // Whop APIで取得
});
```

### Step 4: アフィリエイターがユーザー向けLPにアクセスさせる

**アフィリエイターが取得したアフィリエイトリンク**:
```
https://your-domain.com/EN?ref=AFFILIATE_CODE_123
```

**ユーザーがこのリンクをクリック**:
- ユーザー向けLPにアクセス
- URLパラメータに`?ref=AFFILIATE_CODE_123`が含まれる

### Step 5: ユーザー向けLPがセールスし、Whopチェックアウトでコンバージョン

**ユーザー向けLP**: `cryptotradeacademy-lp-dev/cryptotradeacademy-lp-[market]`

```typescript
// components/whop/WhopCheckoutEmbed.tsx
export function WhopCheckoutEmbed({ planId }: Props) {
  const searchParams = useSearchParams();
  const affiliateCode = searchParams.get('ref'); // ✅ URLパラメータから取得

  return (
    <WhopCheckout
      planId={planId}
      affiliateCode={affiliateCode || undefined} // ✅ Whopに渡す
      returnUrl={WHOP_RETURN_URL.SUCCESS}
    />
  );
}
```

**Whopチェックアウト時の動作**:
1. `WhopCheckout`コンポーネントが`affiliateCode`をWhopに送信
2. Whopがチェックアウトセッションを作成（`affiliate_code`を含む）
3. ユーザーが決済完了
4. Whopが`membership.created`イベントを発火（`affiliate_code`を含む）

### Step 6: Whop Webhookでコンバージョンをカウント

**Whop Webhookハンドラー**: `app/api/webhooks/whop/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const body: WhopWebhookEvent = await request.json();
  const { type, data } = body;

  if (type === 'membership.created') {
    // ✅ affiliate_codeが含まれている場合、アフィリエイターを特定
    if (data.affiliate_code) {
      // Whop APIでアフィリエイター情報を取得
      const affiliates = await getWhopAffiliates({
        productId: data.membership.product.id,
      });
      
      const affiliate = affiliates.find(
        a => a.code === data.affiliate_code
      );

      if (affiliate) {
        // ✅ コンバージョンをカウント
        await prisma.affiliateConversion.create({
          data: {
            affiliateId: affiliate.id,
            affiliateCode: affiliate.code,
            membershipId: data.membership.id,
            userId: data.user.id,
            amount: data.membership.plan.price,
            currency: data.membership.plan.currency,
            convertedAt: new Date(),
          },
        });

        // ✅ アフィリエイターに通知
        await notifyAffiliate(affiliate, {
          type: 'conversion',
          membershipId: data.membership.id,
          amount: data.membership.plan.price,
        });
      }
    }
  }

  return NextResponse.json({ success: true });
}
```

---

## 📊 コンバージョンカウントの仕組み

### 1. Whop Webhookで`affiliate_code`を取得

**Whop Webhookイベント**:
```json
{
  "type": "membership.created",
  "data": {
    "membership": {
      "id": "membership_123",
      "product": {
        "id": "product_123"
      },
      "plan": {
        "id": "plan_123",
        "price": 29.99,
        "currency": "USD"
      }
    },
    "user": {
      "id": "user_123",
      "email": "user@example.com"
    },
    "affiliate_code": "AFFILIATE_CODE_123" // ✅ これでアフィリエイターを特定
  }
}
```

### 2. Whop APIでアフィリエイター情報を取得

```typescript
// api/unified-api.ts
const affiliates = await getWhopAffiliates({
  productId: 'product_123',
});

// affiliate_codeでアフィリエイターを特定
const affiliate = affiliates.find(
  a => a.code === 'AFFILIATE_CODE_123'
);
```

### 3. データベースにコンバージョンを記録

```typescript
// database/prisma/schema.prisma
model AffiliateConversion {
  id            String   @id @default(cuid())
  affiliateId   String   // Whop APIで取得したアフィリエイターID
  affiliateCode String   // アフィリエイトコード
  membershipId  String   // WhopメンバーシップID
  userId        String   // WhopユーザーID
  amount        Float    // 売上金額
  currency      String   // 通貨
  convertedAt   DateTime @default(now())
  
  @@index([affiliateId])
  @@index([affiliateCode])
  @@index([convertedAt])
}
```

### 4. アフィリエイター別のコンバージョン統計を取得

```typescript
// アフィリエイター別のコンバージョン数を取得
const conversions = await prisma.affiliateConversion.groupBy({
  by: ['affiliateCode'],
  _count: {
    id: true,
  },
  _sum: {
    amount: true,
  },
  where: {
    convertedAt: {
      gte: new Date('2026-01-01'),
    },
  },
});

// 結果例:
// [
//   {
//     affiliateCode: 'AFFILIATE_CODE_123',
//     _count: { id: 10 },
//     _sum: { amount: 299.90 }
//   }
// ]
```

---

## ✅ 実装チェックリスト

### Phase 1: アフィリエイトトラッキング基盤（最優先）

- [ ] Whop Webhookハンドラーの拡張
  - [ ] `membership.created`イベントで`affiliate_code`を取得
  - [ ] Whop APIでアフィリエイター情報を取得
  - [ ] データベースにコンバージョンを記録

- [ ] データベーススキーマの追加
  - [ ] `AffiliateConversion`モデルの作成
  - [ ] インデックスの追加

- [ ] アフィリエイター通知機能
  - [ ] コンバージョン時にアフィリエイターに通知
  - [ ] Telegram DMで通知送信

### Phase 2: アフィリエイターリンク生成（高優先度）

- [ ] リクルートLPでアフィリエイトリンク生成
  - [ ] Whop APIでアフィリエイター情報を取得
  - [ ] アフィリエイトリンクを生成（`?ref=affiliate_code`）

- [ ] ユーザー向けLPで`ref`パラメータの処理
  - [ ] `WhopCheckoutEmbed`で`ref`パラメータを取得（既存実装確認済み）
  - [ ] `WhopCheckout`コンポーネントに`affiliateCode`を渡す（既存実装確認済み）

### Phase 3: 統計・可視化（中優先度）

- [ ] アフィリエイター別コンバージョン統計API
  - [ ] コンバージョン数の取得
  - [ ] 売上金額の取得
  - [ ] 期間別の統計取得

- [ ] ダッシュボード（オプション）
  - [ ] アフィリエイター別のコンバージョン可視化
  - [ ] 市場別のコンバージョン可視化

---

## 🎯 結論

### アフィリエイトトラッキングの仕組み

1. **アフィリエイターがユーザーにリンクをシェア**
   - URL: `https://your-domain.com/EN?ref=AFFILIATE_CODE_123`

2. **ユーザーがユーザー向けLPにアクセス**
   - `WhopCheckoutEmbed`が`ref`パラメータから`affiliateCode`を取得

3. **Whopチェックアウト時に`affiliate_code`が記録**
   - `WhopCheckout`コンポーネントが`affiliateCode`をWhopに送信

4. **Whop Webhookでコンバージョンをカウント**
   - `membership.created`イベントに`affiliate_code`が含まれる
   - Whop APIでアフィリエイター情報を取得
   - データベースにコンバージョンを記録

### 重要なポイント

- ✅ **Whopの機能を最大限活用**: `affiliate_code`パラメータとWebhookを使用
- ✅ **シンプルな実装**: 追加の複雑なトラッキングシステムは不要
- ✅ **正確なカウント**: Whopが`affiliate_code`を記録するため、正確にカウント可能

---

**最終更新**: 2026-01-11  
**ステータス**: ✅ アフィリエイトトラッキング完全フロー確定

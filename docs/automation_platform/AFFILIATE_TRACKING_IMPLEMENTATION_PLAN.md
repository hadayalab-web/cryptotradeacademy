# アフィリエイトトラッキング実装計画: Whop機能最大活用

**作成日**: 2026-01-11  
**作成者**: COO: Cursor (Composer 1)  
**目的**: アフィリエイターが連れてきたユーザーのコンバージョンを正確にカウントする実装

---

## 🎯 実装概要

### フロー

1. **アフィリエイターがユーザーにリンクをシェア**
   - URL: `https://your-domain.com/EN?ref=AFFILIATE_CODE_123`

2. **ユーザーがユーザー向けLPにアクセス**
   - `WhopCheckoutEmbed`が`ref`パラメータから`affiliateCode`を取得（既存実装）

3. **Whopチェックアウト時に`affiliate_code`が記録**
   - `WhopCheckout`コンポーネントが`affiliateCode`をWhopに送信（既存実装）

4. **Whop Webhookでコンバージョンをカウント**
   - `membership.created`イベントに`affiliate_code`が含まれる
   - Whop APIでアフィリエイター情報を取得
   - データベースにコンバージョンを記録

---

## 📋 実装タスク

### Phase 1: Whop Webhookハンドラーの拡張（最優先）

**ファイル**: `app/api/webhooks/whop/route.ts`（既存を拡張）

**実装内容**:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getWhopAffiliates } from '@/api/unified-api';
import { prisma } from '@/database/prisma';
import { sendTelegramMessage } from '@/api/unified-api';

interface WhopWebhookEvent {
  type: string;
  data: {
    membership?: {
      id: string;
      product?: {
        id: string;
      };
      plan?: {
        id: string;
        price: number;
        currency: string;
      };
    };
    user?: {
      id: string;
      email?: string;
      telegramId?: string;
    };
    affiliate_code?: string; // ✅ これでアフィリエイターを特定
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: WhopWebhookEvent = await request.json();
    const { type, data } = body;

    console.log('Whop Webhook received:', { type, data });

    // ✅ membership.createdイベントでコンバージョンをカウント
    if (type === 'membership.created' && data.affiliate_code) {
      const affiliateCode = data.affiliate_code;
      const membershipId = data.membership?.id;
      const userId = data.user?.id;
      const productId = data.membership?.product?.id;
      const amount = data.membership?.plan?.price || 0;
      const currency = data.membership?.plan?.currency || 'USD';

      if (!productId) {
        console.error('Product ID not found in webhook data');
        return NextResponse.json(
          { error: 'Product ID not found' },
          { status: 400 }
        );
      }

      // ✅ Whop APIでアフィリエイター情報を取得
      const affiliates = await getWhopAffiliates({ productId });
      const affiliate = affiliates.find(a => a.code === affiliateCode);

      if (affiliate) {
        // ✅ データベースにコンバージョンを記録
        await prisma.affiliateCommission.create({
          data: {
            affiliateId: affiliate.id,
            membershipId: membershipId,
            amount: amount / 100, // Whopはセント単位、DBはドル単位
            commissionRate: parseFloat(affiliate.commissionRate || '0'),
            status: 'pending',
          },
        });

        // ✅ AffiliatePerformanceを更新
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await prisma.affiliatePerformance.upsert({
          where: {
            affiliateId_date: {
              affiliateId: affiliate.id,
              date: today,
            },
          },
          update: {
            conversions: { increment: 1 },
            revenue: { increment: amount / 100 },
          },
          create: {
            affiliateId: affiliate.id,
            date: today,
            conversions: 1,
            revenue: amount / 100,
            commissions: (amount / 100) * (parseFloat(affiliate.commissionRate || '0') / 100),
          },
        });

        // ✅ アフィリエイターに通知（オプション）
        const candidate = await prisma.affiliateCandidate.findFirst({
          where: {
            whopAffiliateId: affiliate.id,
          },
        });

        if (candidate?.telegramUserId) {
          await sendTelegramMessage({
            userId: candidate.telegramUserId,
            language: candidate.market.toLowerCase(),
            message: `🎉 コンバージョンが発生しました！\n\n売上: ${currency} ${amount / 100}\nメンバーシップID: ${membershipId}`,
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Conversion recorded',
          affiliateId: affiliate.id,
          membershipId,
        });
      } else {
        console.warn(`Affiliate not found for code: ${affiliateCode}`);
        return NextResponse.json({
          success: false,
          message: 'Affiliate not found',
          affiliateCode,
        });
      }
    }

    // その他のイベントタイプの処理（既存実装）
    // ...

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**見積もり**: 3-5人日

---

### Phase 2: アフィリエイターリンク生成の実装（高優先度）

**ファイル**: `app/api/affiliate-link/route.ts`（新規作成または既存を拡張）

**実装内容**:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getWhopAffiliates, getWhopProduct } from '@/api/unified-api';
import { prisma } from '@/database/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    const telegramUserId = searchParams.get('telegramUserId');
    const productId = searchParams.get('productId') || process.env.WHOP_PRODUCT_ID;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // ✅ Whop APIでアフィリエイター情報を取得
    const affiliates = await getWhopAffiliates({ productId });

    // ✅ emailまたはtelegramUserIdでアフィリエイターを特定
    let affiliate = null;
    if (email) {
      affiliate = affiliates.find(a => a.email === email);
    } else if (telegramUserId) {
      // データベースからcandidateを取得して、whopAffiliateIdで特定
      const candidate = await prisma.affiliateCandidate.findFirst({
        where: {
          telegramUserId: telegramUserId,
        },
      });

      if (candidate?.whopAffiliateId) {
        affiliate = affiliates.find(a => a.id === candidate.whopAffiliateId);
      }
    }

    if (!affiliate) {
      return NextResponse.json(
        { error: 'Affiliate not found' },
        { status: 404 }
      );
    }

    // ✅ プロダクト情報を取得してリンクを生成
    const product = await getWhopProduct(productId);
    const affiliateLink = `https://your-domain.com/${product.market}?ref=${affiliate.code}`;

    return NextResponse.json({
      success: true,
      affiliateCode: affiliate.code,
      affiliateLink,
      productId,
    });
  } catch (error: any) {
    console.error('Affiliate link generation error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**見積もり**: 2-3人日

---

### Phase 3: 統計APIの実装（中優先度）

**ファイル**: `app/api/affiliate/stats/route.ts`（新規作成）

**実装内容**:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/database/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const affiliateId = searchParams.get('affiliateId');
    const affiliateCode = searchParams.get('affiliateCode');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let where: any = {};

    if (affiliateId) {
      where.affiliateId = affiliateId;
    } else if (affiliateCode) {
      // affiliateCodeからaffiliateIdを取得
      const affiliate = await prisma.affiliate.findFirst({
        where: {
          // Whop APIで取得したcodeを保存する必要がある
          // または、Affiliateモデルにcodeカラムを追加
        },
      });
      if (affiliate) {
        where.affiliateId = affiliate.id;
      }
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // ✅ コンバージョン統計を取得
    const conversions = await prisma.affiliateCommission.findMany({
      where,
      include: {
        affiliate: true,
        membership: true,
      },
    });

    const stats = {
      totalConversions: conversions.length,
      totalRevenue: conversions.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0),
      totalCommissions: conversions.reduce(
        (sum, c) => sum + parseFloat(c.amount.toString()) * (parseFloat(c.commissionRate.toString()) / 100),
        0
      ),
      conversions: conversions.map(c => ({
        id: c.id,
        affiliateId: c.affiliateId,
        membershipId: c.membershipId,
        amount: c.amount,
        commissionRate: c.commissionRate,
        status: c.status,
        createdAt: c.createdAt,
      })),
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**見積もり**: 2-3人日

---

## ✅ 実装チェックリスト

### Phase 1: Whop Webhookハンドラーの拡張（3-5人日）
- [ ] `membership.created`イベントで`affiliate_code`を取得
- [ ] Whop APIでアフィリエイター情報を取得
- [ ] `AffiliateCommission`にコンバージョンを記録
- [ ] `AffiliatePerformance`を更新
- [ ] アフィリエイターに通知（オプション）

### Phase 2: アフィリエイターリンク生成（2-3人日）
- [ ] `/api/affiliate-link`エンドポイントの実装
- [ ] emailまたはtelegramUserIdでアフィリエイターを特定
- [ ] Whop APIでアフィリエイター情報を取得
- [ ] アフィリエイトリンクを生成（`?ref=affiliate_code`）

### Phase 3: 統計API（2-3人日）
- [ ] `/api/affiliate/stats`エンドポイントの実装
- [ ] コンバージョン統計の取得
- [ ] 売上金額の集計
- [ ] 期間別の統計取得

---

## 🎯 結論

### アフィリエイトトラッキングの仕組み

1. **アフィリエイターがユーザーにリンクをシェア**
   - URL: `https://your-domain.com/EN?ref=AFFILIATE_CODE_123`

2. **ユーザーがユーザー向けLPにアクセス**
   - `WhopCheckoutEmbed`が`ref`パラメータから`affiliateCode`を取得（既存実装）

3. **Whopチェックアウト時に`affiliate_code`が記録**
   - `WhopCheckout`コンポーネントが`affiliateCode`をWhopに送信（既存実装）

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
**ステータス**: ✅ アフィリエイトトラッキング実装計画確定

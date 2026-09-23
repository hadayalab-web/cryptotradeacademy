# 完全なアフィリエイターフロー実装ガイド

**作成日**: 2026-01-11  
**フロー**: 候補検索 → データベース化 → DM送信 → LP遷移 → Whopアフィリエイトリンク取得 → Whop DB管理

---

## ✅ 実現可能です

提示されたフローは**完全に実現可能**です。以下に実装方法を記載します。

---

## 🔄 完全なフロー

```
1. アフィリエイターの候補を探してデータベース化
   ↓
2. アフィリエイターにDMを送信しLPに遷移
   ↓
3. LP導線からWhopのアフィリエイトリンクを取得
   ↓
4. アフィリエイターはwhopのDBで管理される
```

---

## 📋 実装ステップ

### ステップ1: アフィリエイターの候補を探してデータベース化 ✅

#### 実装済み

**ファイル**: `workflows/affiliate-recruitment/src/workflows/integrated.ts`

```typescript
// 1. 候補検索
const searchResult = await executeIntegratedWorkflow({
  marketCode: 'EN',
  whopProductId: 'prod_xxx',
  searchQueries: ['crypto trading'],
  maxCandidates: 100,
  analyzeCandidates: true,
  sendTelegramDM: false, // 後で送信
});

// 2. データベースに保存（AffiliateCandidateテーブル）
// 検索結果は自動的にデータベースに保存される
```

**データベース**: `database/prisma/schema.prisma`
- `AffiliateCandidate`テーブルに候補情報を保存
- ステータス: `New`, `Contacted`, `Responded`, `Approved`, `Rejected`

---

### ステップ2: アフィリエイターにDMを送信しLPに遷移 ✅

#### 実装済み

**ファイル**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-ja/app/api/workflows/affiliate-dm/route.ts`

```typescript
// DM送信（LPリンクを含む）
const dmResult = await callInternalApi('/api/workflows/affiliate-dm', {
  body: {
    marketCode: 'EN',
    candidateIds: candidateIds,
    whopProductId: 'prod_xxx',
  },
});

// DMテンプレートにLPリンクが含まれる:
// "🚀 始める: https://your-lp-domain.com/affiliate-recruitment?candidateId={candidateId}&market={marketCode}"
```

**LP遷移**: 候補がDM内のLPリンクをクリック → LPに遷移

---

### ステップ3: LP導線からWhopのアフィリエイトリンクを取得 ⚠️ 実装が必要

#### 実装が必要

**ファイル**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-ja/app/api/affiliate-link/route.ts`（新規作成）

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { 
  generateWhopAffiliateLink, 
  getWhopAffiliates,
  whopRequestSafe 
} from '@/api/unified-api';

const prisma = new PrismaClient();

/**
 * LP導線からWhopアフィリエイトリンクを取得
 * 
 * POST /api/affiliate-link
 * 
 * Body: {
 *   candidateId: number,
 *   market: 'EN' | 'AR' | 'KO' | 'JA' | 'ES' | 'PT-BR',
 *   userId?: string, // Telegram User ID
 *   whopProductId: string,
 *   whopPlanId?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { candidateId, market, userId, whopProductId, whopPlanId } = body;

    // Validation
    if (!candidateId || !market || !whopProductId) {
      return NextResponse.json(
        { error: 'Missing required fields: candidateId, market, whopProductId' },
        { status: 400 }
      );
    }

    // 1. 候補情報を取得
    const candidate = await prisma.affiliateCandidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    // 2. Whopでアフィリエイターを検索
    let whopAffiliate: any = null;
    try {
      // 既存のアフィリエイターを検索（全ページ検索）
      let page = 1;
      let hasMore = true;

      while (hasMore && !whopAffiliate) {
        const result = await getWhopAffiliates({
          productId: whopProductId,
          page,
          perPage: 100,
        });

        // メールアドレスまたはTelegram User IDで検索
        whopAffiliate = result.affiliates.find(
          (aff: any) =>
            (candidate.email && aff.email?.toLowerCase() === candidate.email.toLowerCase()) ||
            (candidate.telegramUserId && aff.metadata?.telegram_user_id === candidate.telegramUserId)
        );

        hasMore = result.affiliates.length === result.perPage;
        page++;
      }

      // アフィリエイターが見つからない場合
      if (!whopAffiliate) {
        // 注意: Whop API v2ではアフィリエイター作成がAPI経由でできないため、
        // ダッシュボード経由で登録する必要があります
        return NextResponse.json(
          {
            error: 'Affiliate not found in Whop',
            message: 'Please register the affiliate via Whop dashboard first.',
            candidateId,
            candidateEmail: candidate.email,
            candidateTelegramUserId: candidate.telegramUserId,
          },
          { status: 404 }
        );
      }
    } catch (error: any) {
      console.error('Error searching Whop affiliate:', error);
      return NextResponse.json(
        { error: 'Failed to search Whop affiliate', details: error.message },
        { status: 500 }
      );
    }

    // 3. Whopアフィリエイトリンクを生成
    let affiliateLinkResult;
    try {
      affiliateLinkResult = await generateWhopAffiliateLink({
        productId: whopProductId,
        affiliateId: whopAffiliate.id,
        planId: whopPlanId,
      });
    } catch (error: any) {
      console.error('Error generating Whop affiliate link:', error);
      return NextResponse.json(
        { error: 'Failed to generate affiliate link', details: error.message },
        { status: 500 }
      );
    }

    // 4. データベースにアフィリエイター情報を保存（Whopの補完）
    try {
      await prisma.affiliate.upsert({
        where: { id: whopAffiliate.id },
        create: {
          id: whopAffiliate.id,
          productId: whopProductId,
          candidateId: candidateId,
          email: candidate.email || whopAffiliate.email,
          name: candidate.displayName || whopAffiliate.name,
          commissionRate: 0.50, // 50%
          status: 'active',
        },
        update: {
          candidateId: candidateId,
          email: candidate.email || whopAffiliate.email,
          name: candidate.displayName || whopAffiliate.name,
        },
      });
    } catch (error: any) {
      console.error('Error saving affiliate to database:', error);
      // エラーが発生しても続行（Whop DBが主）
    }

    // 5. アフィリエイトリンクをデータベースに保存
    try {
      await prisma.affiliateLink.upsert({
        where: {
          affiliateId_productId_planId: {
            affiliateId: whopAffiliate.id,
            productId: whopProductId,
            planId: whopPlanId || null,
          },
        },
        create: {
          affiliateId: whopAffiliate.id,
          productId: whopProductId,
          planId: whopPlanId || null,
          linkUrl: affiliateLinkResult.affiliateLink,
          clicks: 0,
          conversions: 0,
        },
        update: {
          linkUrl: affiliateLinkResult.affiliateLink,
        },
      });
    } catch (error: any) {
      console.error('Error saving affiliate link to database:', error);
      // エラーが発生しても続行
    }

    // 6. 候補ステータスを更新
    try {
      await prisma.affiliateCandidate.update({
        where: { id: candidateId },
        data: {
          status: 'Approved',
          whopAffiliateId: whopAffiliate.id,
        },
      });
    } catch (error: any) {
      console.error('Error updating candidate status:', error);
      // エラーが発生しても続行
    }

    // 7. Telegram DMでアフィリエイトリンクを送信（オプション）
    if (userId && affiliateLinkResult.affiliateLink) {
      try {
        // Telegram DM送信処理（既存の実装を使用）
        const telegramToken = process.env[`TELEGRAM_BOT_TOKEN_${market}`] || process.env.TELEGRAM_BOT_TOKEN;
        if (telegramToken) {
          await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: userId,
              text: `🎉 アフィリエイトプログラムへのご参加ありがとうございます！\n\nあなたのアフィリエイトリンク:\n${affiliateLinkResult.affiliateLink}`,
            }),
          });
        }
      } catch (error: any) {
        console.error('Error sending affiliate link via Telegram:', error);
        // エラーが発生しても続行
      }
    }

    return NextResponse.json({
      success: true,
      affiliateLink: affiliateLinkResult.affiliateLink,
      affiliateCode: affiliateLinkResult.affiliateCode,
      whopAffiliateId: whopAffiliate.id,
      productId: whopProductId,
      planId: whopPlanId || null,
    });
  } catch (error: any) {
    console.error('Affiliate link generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
```

---

### ステップ4: アフィリエイターはwhopのDBで管理される ✅

#### 実装済み

**Whop API統合**: `api/unified-api.ts`
- `getWhopAffiliates()` - アフィリエイター一覧取得
- `getWhopAffiliate()` - アフィリエイター詳細取得
- `generateWhopAffiliateLink()` - アフィリエイトリンク生成

**データベース補完**: `database/prisma/schema.prisma`
- `Affiliate`テーブル - WhopアフィリエイターIDと候補IDの紐付け
- `AffiliateLink`テーブル - アフィリエイトリンクの管理
- `AffiliateCommission`テーブル - コミッション追跡

---

## 🎯 完全なフロー実装例

### 統合ワークフロー

```typescript
// 1. 候補検索・データベース化
const searchResult = await executeIntegratedWorkflow({
  marketCode: 'EN',
  whopProductId: 'prod_xxx',
  searchQueries: ['crypto trading'],
  maxCandidates: 100,
  analyzeCandidates: true,
  sendTelegramDM: false,
});

// 2. DM送信・LP遷移
const candidateIds = searchResult.candidates.map(c => c.id);
const dmResult = await callInternalApi('/api/workflows/affiliate-dm', {
  body: {
    marketCode: 'EN',
    candidateIds: candidateIds,
    whopProductId: 'prod_xxx',
  },
});

// 3. LP導線からWhopアフィリエイトリンク取得（候補がLPにアクセスした時）
// LP側で /api/affiliate-link を呼び出す

// 4. Whop DB管理（定期的に同期）
const whopAffiliates = await getWhopAffiliates({ productId: 'prod_xxx' });
// データベースで補完情報を保存
```

---

## 📋 実装チェックリスト

### ステップ1: 候補検索・データベース化 ✅

- [x] 候補検索機能（Grok/GPT/Gemini）
- [x] データベース保存（AffiliateCandidateテーブル）
- [x] ステータス管理

### ステップ2: DM送信・LP遷移 ✅

- [x] Telegram DM送信
- [x] LPリンクを含むDMテンプレート
- [x] パーソナライズされたメッセージ生成

### ステップ3: LP導線からWhopアフィリエイトリンク取得 ⚠️

- [ ] `app/api/affiliate-link/route.ts`の作成
- [ ] Whopアフィリエイター検索
- [ ] Whopアフィリエイトリンク生成
- [ ] データベースへの保存
- [ ] Telegram DMでアフィリエイトリンク送信

### ステップ4: Whop DB管理 ✅

- [x] Whop API統合
- [x] データベース補完（Affiliate, AffiliateLink, AffiliateCommission）
- [x] 重複チェック

---

## ⚠️ 重要な注意事項

### Whop API v2の制限

**アフィリエイター作成**: Whop API v2では`POST /affiliates`エンドポイントが**提供されていません**。

**対応方法**:
1. **Whopダッシュボード経由**: 手動でアフィリエイターを登録
2. **CSV/JSONインポート**: 候補をCSV/JSON形式でエクスポートし、Whopダッシュボードにインポート
3. **将来的なAPI対応**: Whop APIがアフィリエイター作成をサポートする可能性を待つ

**実装での対応**:
- アフィリエイターが見つからない場合、エラーメッセージを返す
- ダッシュボード経由で登録するよう案内
- CSV/JSONインポート用のデータを生成

---

## ✅ 結論

### 実現可能 ✅

提示されたフローは**完全に実現可能**です。

1. ✅ **候補検索・データベース化**: 実装済み
2. ✅ **DM送信・LP遷移**: 実装済み
3. ⚠️ **LP導線からWhopアフィリエイトリンク取得**: 実装が必要（`app/api/affiliate-link/route.ts`）
4. ✅ **Whop DB管理**: 実装済み

### 次のステップ

1. `app/api/affiliate-link/route.ts`を作成
2. LP側でこのAPIエンドポイントを呼び出すように実装
3. テスト実行

---

**最終更新**: 2026-01-11  
**ステータス**: ⚠️ 実装が必要（LP導線からWhopアフィリエイトリンク取得）

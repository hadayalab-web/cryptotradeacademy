# 完全なアフィリエイターフロー実装

**作成日**: 2026-01-11  
**フロー**: 候補検索 → データベース化 → DM送信 → LP遷移 → Whopアフィリエイトリンク取得 → Whop DB管理

---

## 🎯 完全なフロー

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

## ✅ 実装状況

### 1. **アフィリエイターの候補を探してデータベース化** ✅

#### 実装済み機能

- ✅ **候補検索**: `workflows/affiliate-recruitment/src/workflows/integrated.ts`
  - Grok/GPT/Geminiで候補検索
  - マッチングスコア計算
  - 重複チェック

- ✅ **データベース化**: `database/prisma/schema.prisma`
  - `AffiliateCandidate`テーブル
  - 候補情報の保存
  - ステータス管理（New, Contacted, Responded, Approved, Rejected）

#### 実装例

```typescript
// 1. 候補検索
const searchResult = await callInternalApi('/api/workflows/affiliate-search', {
  body: {
    marketCode: 'EN',
    searchQueries: ['crypto trading'],
    maxCandidates: 100,
  },
});

// 2. データベースに保存
const candidates = searchResult.candidates;
for (const candidate of candidates) {
  await prisma.affiliateCandidate.create({
    data: {
      username: candidate.username,
      displayName: candidate.name,
      market: marketCode,
      email: candidate.email,
      telegramUserId: candidate.telegram_user_id,
      matchScore: candidate.match_score,
      status: 'New',
    },
  });
}
```

---

### 2. **アフィリエイターにDMを送信しLPに遷移** ✅

#### 実装済み機能

- ✅ **DM送信**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-ja/app/api/workflows/affiliate-dm/route.ts`
  - Telegram DM送信
  - パーソナライズされたメッセージ生成
  - LPへのリンクを含む

- ✅ **LP遷移**: DMメッセージにLPリンクを含める

#### 実装例

```typescript
// DM送信（LPリンクを含む）
const dmResult = await callInternalApi('/api/workflows/affiliate-dm', {
  body: {
    marketCode: 'EN',
    candidateIds: candidateIds,
    whopProductId: 'prod_xxx',
    // LPリンクはDMテンプレートに含まれる
  },
});

// DMテンプレート例:
// "🚀 Trap Defense Academy アフィリエイトプログラムへのご招待
//  [Name]様
//  ...
//  🚀 始める: https://your-lp-domain.com/affiliate-recruitment?candidateId={candidateId}&market={marketCode}"
```

---

### 3. **LP導線からWhopのアフィリエイトリンクを取得** ⚠️ 実装が必要

#### 現状

- ✅ **LP導線**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-ja/app/api/complete/route.ts`
  - オリエンテーション完了時にアフィリエイトリンク生成
  - ただし、Whop APIを使用していない

#### 実装が必要な機能

```typescript
// LP導線からWhopアフィリエイトリンクを取得
// app/api/complete/route.ts または app/api/affiliate-link/route.ts

import { generateWhopAffiliateLink, getWhopAffiliates, createWhopAffiliateWithDuplicateCheck } from '@/api/unified-api';

export async function POST(request: NextRequest) {
  const { candidateId, market, userId, whopProductId, whopPlanId } = await request.json();

  // 1. 候補情報を取得
  const candidate = await prisma.affiliateCandidate.findUnique({
    where: { id: candidateId },
  });

  if (!candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
  }

  // 2. Whopでアフィリエイターを検索または作成
  let whopAffiliate;
  try {
    // 既存のアフィリエイターを検索
    const existingAffiliates = await getWhopAffiliates({ productId: whopProductId });
    const existingAffiliate = existingAffiliates.affiliates.find(
      (aff: any) => aff.email?.toLowerCase() === candidate.email?.toLowerCase()
    );

    if (existingAffiliate) {
      whopAffiliate = existingAffiliate;
    } else {
      // 新しいアフィリエイターを作成（Whop API v2ではAPI経由で作成できないため、ダッシュボード経由）
      // 代替案: CSV/JSONを生成してWhopダッシュボードにインポート
      throw new Error(
        'Whop API v2 does not support creating affiliates via API. ' +
        'Please use the Whop dashboard or batch import CSV/JSON.'
      );
    }
  } catch (error: any) {
    // Whop API v2ではアフィリエイター作成ができないため、エラーを返す
    return NextResponse.json(
      {
        error: 'Affiliate creation not supported via API',
        message: 'Please register via Whop dashboard or use batch import.',
        candidateId,
      },
      { status: 400 }
    );
  }

  // 3. Whopアフィリエイトリンクを生成
  const affiliateLinkResult = await generateWhopAffiliateLink({
    productId: whopProductId,
    affiliateId: whopAffiliate.id,
    planId: whopPlanId,
  });

  // 4. データベースにアフィリエイター情報を保存（Whopの補完）
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

  // 5. アフィリエイトリンクをデータベースに保存
  await prisma.affiliateLink.create({
    data: {
      affiliateId: whopAffiliate.id,
      productId: whopProductId,
      planId: whopPlanId,
      linkUrl: affiliateLinkResult.affiliateLink,
      clicks: 0,
      conversions: 0,
    },
  });

  // 6. 候補ステータスを更新
  await prisma.affiliateCandidate.update({
    where: { id: candidateId },
    data: {
      status: 'Approved',
      whopAffiliateId: whopAffiliate.id,
    },
  });

  // 7. Telegram DMでアフィリエイトリンクを送信
  if (userId && affiliateLinkResult.affiliateLink) {
    await sendTelegramDM(userId, affiliateLinkResult.affiliateLink, market);
  }

  return NextResponse.json({
    success: true,
    affiliateLink: affiliateLinkResult.affiliateLink,
    whopAffiliateId: whopAffiliate.id,
  });
}
```

---

### 4. **アフィリエイターはwhopのDBで管理される** ✅

#### 実装済み機能

- ✅ **Whop API統合**: `api/unified-api.ts`
  - `getWhopAffiliates()` - アフィリエイター一覧取得
  - `getWhopAffiliate()` - アフィリエイター詳細取得
  - `generateWhopAffiliateLink()` - アフィリエイトリンク生成
  - `createWhopAffiliateWithDuplicateCheck()` - 重複チェック付き作成

- ✅ **データベース補完**: `database/prisma/schema.prisma`
  - `Affiliate`テーブル - WhopアフィリエイターIDと候補IDの紐付け
  - `AffiliateLink`テーブル - アフィリエイトリンクの管理
  - `AffiliateCommission`テーブル - コミッション追跡

#### 実装例

```typescript
// Whop DBでアフィリエイターを管理
// 1. Whop APIでアフィリエイター一覧取得
const whopAffiliates = await getWhopAffiliates({ productId: whopProductId });

// 2. データベースで補完情報を保存
for (const whopAffiliate of whopAffiliates.affiliates) {
  await prisma.affiliate.upsert({
    where: { id: whopAffiliate.id },
    create: {
      id: whopAffiliate.id,
      productId: whopProductId,
      email: whopAffiliate.email,
      name: whopAffiliate.name,
      commissionRate: 0.50,
      status: 'active',
    },
    update: {
      email: whopAffiliate.email,
      name: whopAffiliate.name,
    },
  });
}
```

---

## 📋 実装チェックリスト

### 1. 候補検索・データベース化 ✅

- [x] 候補検索機能（Grok/GPT/Gemini）
- [x] データベース保存（AffiliateCandidateテーブル）
- [x] ステータス管理

### 2. DM送信・LP遷移 ✅

- [x] Telegram DM送信
- [x] LPリンクを含むDMテンプレート
- [x] パーソナライズされたメッセージ生成

### 3. LP導線からWhopアフィリエイトリンク取得 ⚠️

- [ ] LP導線APIの実装（`app/api/affiliate-link/route.ts`）
- [ ] Whopアフィリエイター検索・作成
- [ ] Whopアフィリエイトリンク生成
- [ ] データベースへの保存

### 4. Whop DB管理 ✅

- [x] Whop API統合
- [x] データベース補完（Affiliate, AffiliateLink, AffiliateCommission）
- [x] 重複チェック

---

## 🎯 実装が必要な部分

### LP導線からWhopアフィリエイトリンク取得

**ファイル**: `app/api/affiliate-link/route.ts`（新規作成）

**機能**:
1. 候補IDから候補情報を取得
2. Whop APIでアフィリエイターを検索または作成
3. Whop APIでアフィリエイトリンクを生成
4. データベースに保存
5. Telegram DMでアフィリエイトリンクを送信

**注意**: Whop API v2ではアフィリエイター作成がAPI経由でできないため、ダッシュボード経由またはCSV/JSONインポートが必要

---

## 🔄 完全なフロー実装

### ステップ1: 候補検索・データベース化

```typescript
// workflows/affiliate-recruitment/src/workflows/integrated.ts
const searchResult = await executeIntegratedWorkflow({
  marketCode: 'EN',
  whopProductId: 'prod_xxx',
  searchQueries: ['crypto trading'],
  maxCandidates: 100,
  analyzeCandidates: true,
  sendTelegramDM: false, // 後で送信
});
```

### ステップ2: DM送信・LP遷移

```typescript
// app/api/workflows/affiliate-dm/route.ts
const dmResult = await callInternalApi('/api/workflows/affiliate-dm', {
  body: {
    marketCode: 'EN',
    candidateIds: candidateIds,
    whopProductId: 'prod_xxx',
    // LPリンクはDMテンプレートに含まれる
  },
});
```

### ステップ3: LP導線からWhopアフィリエイトリンク取得

```typescript
// app/api/affiliate-link/route.ts（新規作成）
const affiliateLinkResult = await callInternalApi('/api/affiliate-link', {
  body: {
    candidateId: candidateId,
    market: 'EN',
    userId: telegramUserId,
    whopProductId: 'prod_xxx',
    whopPlanId: 'plan_xxx',
  },
});
```

### ステップ4: Whop DB管理

```typescript
// Whop APIでアフィリエイター一覧取得
const whopAffiliates = await getWhopAffiliates({ productId: whopProductId });

// データベースで補完情報を保存
for (const whopAffiliate of whopAffiliates.affiliates) {
  await prisma.affiliate.upsert({
    where: { id: whopAffiliate.id },
    create: { ... },
    update: { ... },
  });
}
```

---

## ✅ 結論

### 実現可能 ✅

提示されたフローは**完全に実現可能**です。

1. ✅ **候補検索・データベース化**: 実装済み
2. ✅ **DM送信・LP遷移**: 実装済み
3. ⚠️ **LP導線からWhopアフィリエイトリンク取得**: 実装が必要（`app/api/affiliate-link/route.ts`）
4. ✅ **Whop DB管理**: 実装済み

### 実装が必要な部分

- `app/api/affiliate-link/route.ts`の作成
- LP導線からWhopアフィリエイトリンクを取得するAPIエンドポイント

---

**最終更新**: 2026-01-11  
**ステータス**: ⚠️ 実装が必要（LP導線からWhopアフィリエイトリンク取得）

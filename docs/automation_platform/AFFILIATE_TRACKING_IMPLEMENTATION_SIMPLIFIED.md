# アフィリエイトトラッキング実装計画: 超シンプル版

**作成日**: 2026-01-11  
**作成者**: COO: Cursor (Composer 1)  
**目的**: アフィリエイターが連れてきたユーザーのコンバージョンを正確にカウントする実装

---

## 🎯 実装概要

### フロー（既に動作している部分）

1. ✅ **アフィリエイターがユーザーにリンクをシェア**
   - URL: `https://your-domain.com/EN?ref=AFFILIATE_CODE_123`

2. ✅ **ユーザーがユーザー向けLPにアクセス**
   - `WhopCheckoutEmbed`が`ref`パラメータから`affiliateCode`を取得（**既存実装済み**）

3. ✅ **Whopチェックアウト時に`affiliate_code`が記録**
   - `WhopCheckout`コンポーネントが`affiliateCode`をWhopに送信（**既存実装済み**）

4. ⚠️ **Whop Webhookでコンバージョンをカウント**（**これだけ実装すればOK**）
   - `membership.created`イベントに`affiliate_code`が含まれる
   - データベースにコンバージョンを記録

---

## 📋 実装タスク（最小限）

### 実装が必要なのは1つだけ

**ファイル**: `app/api/webhooks/whop/route.ts`（既存を拡張）

**実装内容**（約50行のコード追加）:

```typescript
// 既存のwebhookハンドラーに追加するだけ

if (type === 'membership.created' && data.affiliate_code) {
  const affiliateCode = data.affiliate_code;
  const membershipId = data.membership?.id;
  const productId = data.membership?.product?.id;
  const amount = data.membership?.plan?.price || 0;

  if (productId) {
    // Whop APIでアフィリエイター情報を取得
    const affiliates = await getWhopAffiliates({ productId });
    const affiliate = affiliates.find(a => a.code === affiliateCode);

    if (affiliate) {
      // データベースにコンバージョンを記録（既存のAffiliateCommissionモデルを使用）
      await prisma.affiliateCommission.create({
        data: {
          affiliateId: affiliate.id,
          membershipId: membershipId,
          amount: amount / 100,
          commissionRate: parseFloat(affiliate.commissionRate || '0'),
          status: 'pending',
        },
      });
    }
  }
}
```

**実装時間**: **30分〜1時間**（既存のwebhookハンドラーに追加するだけ）

---

## ✅ 実装チェックリスト

- [ ] 既存の`app/api/webhooks/whop/route.ts`を開く
- [ ] `membership.created`イベントの処理に`affiliate_code`のチェックを追加（上記のコード）
- [ ] テスト: Whop Webhookを送信してコンバージョンが記録されることを確認

**合計実装時間**: **30分〜1時間**

---

## 🎯 結論

### 実装は超シンプル

- ✅ **既存実装**: LP側の`ref`パラメータ処理、Whop Checkoutへの`affiliateCode`送信は既に実装済み
- ✅ **追加実装**: Whop Webhookハンドラーに約50行のコードを追加するだけ
- ✅ **データベース**: 既存の`AffiliateCommission`モデルを使用（新規作成不要）

### 見積もり工数の説明

- **（3-5人日）**: これは**過大見積もり**でした
- **実際の実装時間**: **30分〜1時間**（既存コードに追加するだけ）

---

**最終更新**: 2026-01-11  
**ステータス**: ✅ 超シンプル実装計画確定

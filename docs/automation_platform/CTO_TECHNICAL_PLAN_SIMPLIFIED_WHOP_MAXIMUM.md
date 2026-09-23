# CTO技術的実装計画: 超シンプル版（Whop機能最大活用）

**作成日**: 2026-01-11  
**作成者**: GPT: CTO (gpt-5.2-2025-12-11)  
**方針**: Whopの機能を最大限に活用し、追加の複雑な仕組みは一切不要

---

## 🎯 実装が必要なのは1つだけ

### Whop Webhookでコンバージョンを記録

**ファイル**: `app/api/webhooks/whop/route.ts`（既存を拡張）

**実装内容**（約30行のコード追加）:

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

**実装時間**: **30分〜1時間**

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
- ✅ **追加実装**: Whop Webhookハンドラーに約30行のコードを追加するだけ
- ✅ **データベース**: 既存の`AffiliateCommission`モデルを使用（新規作成不要）

### ❌ 不要な複雑な仕組み

- ❌ Tracking API（Whop Webhookで十分）
- ❌ Event Store（Whop APIで取得可能）
- ❌ Attribution/LTV Service（Whop Webhook + APIで十分）
- ❌ 複雑なスケジューラー（Whop Webhookで十分）

---

**最終更新**: 2026-01-11  
**ステータス**: ✅ 超シンプル実装計画確定

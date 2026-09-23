# 設計修正: Whopでアフィリエイター管理すべき

**作成日**: 2026-01-11  
**問題**: アフィリエイター管理の設計が誤っていた

---

## 🎯 正しい設計

### ✅ **アフィリエイターはWhopで管理すべき**

**理由**:
1. **Whopはアフィリエイト管理プラットフォーム**
   - アフィリエイターの登録・管理機能が標準で提供されている
   - アフィリエイトリンクの生成・追跡機能がある
   - コミッション管理機能がある
   - パフォーマンス追跡機能がある

2. **データベーススキーマもWhop前提**
   - `database/prisma/schema.prisma`の`Affiliate`モデルは`whop_affiliate_id`を主キーとしている
   - これは、Whopでアフィリエイターを管理する前提の設計

3. **既存の実装もWhop前提**
   - `api/unified-api.ts`に`getWhopAffiliate`と`getWhopAffiliates`がある
   - `generateWhopAffiliateLink`はWhop APIを使用

---

## ❌ 現在の設計の問題点

### 1. **CSV/JSONベースの管理**

```typescript
// workflows/affiliate-recruitment/src/workflows/deployment.ts
dataPath: 'data/phase-results/',
```

**問題**:
- Whopでアフィリエイターを管理すべきなのに、CSV/JSONファイルで管理しようとしている
- データの整合性が保証されない
- 重複チェックが困難
- ステータス管理が不正確

### 2. **実装の不完全性**

```typescript
// workflows/affiliate-recruitment/src/workflows/management.ts
const completedCandidates: any[] = [];  // 空配列
const affiliateLink = `https://whop.com/checkout/${candidate.productId}?ref=${candidate.id}`;
// 実際の実装では、Whop APIでアフィリエイトリンクを生成
```

**問題**:
- Whop APIを実際に呼び出していない
- ハードコードされたURLを使用
- アフィリエイターの登録・管理機能が実装されていない

---

## ✅ 正しい設計

### 1. **Whop APIでアフィリエイターを管理**

#### ⚠️ 重要な発見: Whop API v2には`POST /affiliates`エンドポイントがない

**Whop APIの制限**:
- アフィリエイターの作成は**ダッシュボード経由のみ**（API経由では不可）
- アフィリエイター情報の取得はAPI経由で可能
- アフィリエイトリンクの生成はAPI経由で可能

#### アフィリエイターの登録（ダッシュボード経由）
```typescript
// ⚠️ API経由では作成できない
// Whopダッシュボードで手動登録、または
// 将来的にWhop APIが対応する可能性を待つ

// 代替案: 候補をWhopダッシュボードにインポートするためのCSV/JSONを生成
const candidatesForWhop = candidates.map(c => ({
  email: c.email,
  name: c.name,
  product_id: whopProductId,
  commission_rate: 0.10
}));
// CSV/JSONを生成してWhopダッシュボードにインポート
```

#### アフィリエイターの取得
```typescript
// Whop APIでアフィリエイター一覧を取得
GET /api/v2/affiliates?product_id=prod_xxx

// Whop APIでアフィリエイター詳細を取得
GET /api/v2/affiliates/{affiliate_id}
```

#### アフィリエイトリンクの生成
```typescript
// Whop APIでアフィリエイトリンクを生成
// api/unified-api.tsのgenerateWhopAffiliateLinkを使用
const affiliateLink = await generateWhopAffiliateLink({
  productId: 'prod_xxx',
  affiliateId: 'aff_xxx',  // Whopで登録されたアフィリエイターID
  planId: 'plan_xxx'  // オプション
});
```

### 2. **ワークフローの修正**

#### 修正前（誤った設計）
```typescript
// CSV/JSONベースで管理
const candidates: any[] = [];
const affiliateLink = `https://whop.com/checkout/${candidate.productId}?ref=${candidate.id}`;
```

#### 修正後（正しい設計）
```typescript
// 1. 候補を検索（Grok/GPT/Gemini）
const candidates = await searchCandidates(...);

// 2. Whopダッシュボードでアフィリエイターを登録（手動またはCSVインポート）
// ⚠️ API経由では作成できないため、以下のいずれか:
//   a) Whopダッシュボードで手動登録
//   b) CSV/JSONを生成してWhopダッシュボードにインポート
//   c) 将来的にWhop APIが対応する可能性を待つ

// 3. Whop APIでアフィリエイター一覧を取得
const whopAffiliates = await getWhopAffiliates({ productId: whopProductId });

// 4. 候補とWhopアフィリエイターを紐付け
for (const candidate of candidates) {
  // 既存のWhopアフィリエイターを検索
  const whopAffiliate = whopAffiliates.affiliates.find(
    aff => aff.email === candidate.email
  );
  
  if (whopAffiliate) {
    // 5. Whop APIでアフィリエイトリンクを生成
    const affiliateLink = await generateWhopAffiliateLink({
      productId: whopProductId,
      affiliateId: whopAffiliate.id,
      planId: whopPlanId
    });
    
    // 6. Telegram DMでリンクを送信
    await sendTelegramDM(candidate.telegramUserId, affiliateLink);
  } else {
    // Whopに未登録の場合は、登録を促すメッセージを送信
    await sendTelegramDM(candidate.telegramUserId, 
      'Whopでアフィリエイター登録が必要です。');
  }
}
```

---

## 📋 修正が必要な箇所

### 1. **`workflows/affiliate-recruitment/src/workflows/management.ts`**

**修正内容**:
- `unifiedAffiliateWorkflow()`の実装
  - Whop APIでアフィリエイターを登録
  - Whop APIでアフィリエイトリンクを生成
- `unifiedAffiliateProgressManagement()`の実装
  - Whop APIでアフィリエイター一覧を取得
  - Whop APIでアフィリエイトリンクを生成

### 2. **`workflows/affiliate-recruitment/src/workflows/deployment.ts`**

**修正内容**:
- CSV/JSONベースのデータ管理を削除
- Whop APIでアフィリエイターを管理する設計に変更

### 3. **`workflows/affiliate-recruitment/src/workflows/integrated.ts`**

**修正内容**:
- `whopProductId`を必須パラメータとして維持（正しい）
- Whop APIでアフィリエイターを管理する設計に変更

---

## 🎯 結論

### ✅ **正しい設計**

1. **アフィリエイターはWhopで管理**
   - ⚠️ **アフィリエイターの登録**: Whopダッシュボード経由（API経由では不可）
   - ✅ **アフィリエイター一覧の取得**: Whop APIで取得可能
   - ✅ **アフィリエイトリンクの生成**: Whop APIで生成可能
   - ✅ **コミッション追跡**: Whopで自動的に行われる

2. **データベースはWhopの補完として使用**
   - `AffiliateCandidate`テーブル: 候補検索結果の一時保存
   - `Affiliate`テーブル: WhopアフィリエイターIDと候補IDの紐付け

3. **CSV/JSONの役割**
   - ✅ **Whopダッシュボードへのインポート用**: 候補をWhopに登録するためのCSV/JSONを生成
   - ❌ **データ管理用**: CSV/JSONでデータ管理しない（Whop APIとデータベースを使用）

---

## 📋 次のステップ

1. **Whop APIでアフィリエイター一覧取得機能を実装**
   - `getWhopAffiliates()`を使用
   - 候補とWhopアフィリエイターの紐付け

2. **Whopダッシュボードへのインポート用CSV/JSON生成機能を実装**
   - 候補をWhopダッシュボードにインポートするためのCSV/JSONを生成
   - 手動または自動インポート

3. **Whop APIでアフィリエイトリンク生成機能を実装**
   - `generateWhopAffiliateLink()`を使用
   - 既存の実装を活用

4. **CSV/JSONベースのデータ管理を削除**
   - データ管理はWhop APIとデータベースで行う
   - CSV/JSONはWhopインポート用のみ

5. **データベーススキーマを確認・修正**
   - `Affiliate`テーブルはWhopアフィリエイターIDを主キーとしている（正しい）
   - `AffiliateCandidate`テーブルとの紐付けを確認

---

**最終更新**: 2026-01-11

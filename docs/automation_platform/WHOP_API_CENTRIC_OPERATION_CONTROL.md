# Whop API中心オペレーション制御 - 完全理解ドキュメント

**作成日**: 2026-01-11  
**設計原則**: COO（Cursor/Composer 1）がWhop APIを経由してほぼすべてのオペレーションを制御

---

## 🎯 核心設計原則

### ✅ **基本方針: Whop APIがすべてのオペレーションの中核**

```
┌─────────────────────────────────────────────────────────┐
│         COO（Cursor/Composer 1）                         │
│         ↓                                                │
│    Whop API経由で制御                                    │
│         ↓                                                │
┌─────────────────────────────────────────────────────────┐
│          Whop API（中核制御レイヤー）                    │
├─────────────────────────────────────────────────────────┤
│ ・プロダクト管理（完全制御）                             │
│ ・アフィリエイター管理（完全制御）                       │
│ ・アフィリエイトリンク生成（完全制御）                   │
│ ・コミッション追跡（完全制御）                           │
│ ・メンバーシップ管理（完全制御）                         │
│ ・カスタマー対応（完全制御）                             │
│ ・プラン管理（完全制御）                                 │
└─────────────────────────────────────────────────────────┘
           ↑
           │ 補完・導線
           │
┌─────────────────────────────────────────────────────────┐
│   自動化ワークフロー（補完）                             │
├─────────────────────────────────────────────────────────┤
│ ・アフィリエイタースカウト自動化                         │
│ ・候補検索（Grok/GPT/Gemini）                           │
│ ・候補分析                                               │
│ ・DM送信                                                 │
│ ・最終的にWhop APIでアフィリエイター登録                 │
└─────────────────────────────────────────────────────────┘
           ↑
           │ 導線
           │
┌─────────────────────────────────────────────────────────┐
│   LP（Landing Page）                                     │
├─────────────────────────────────────────────────────────┤
│ ・ユーザー向けLP: Whopプロダクトページ                   │
│ ・アフィリエイタースカウト用LP: 候補を誘導するLP        │
└─────────────────────────────────────────────────────────┘
```

---

## 🔑 重要な理解ポイント

### 1. **Whop API = 制御レイヤー（Control Layer）**

Whop APIは単なるデータソースではなく、**COOがすべてのオペレーションを制御するための制御レイヤー**です。

#### COOがWhop API経由で制御するオペレーション

| オペレーション | Whop API関数 | 制御内容 |
|--------------|-------------|---------|
| **プロダクト管理** | `getWhopProduct()`, `getWhopProducts()`, `createWhopProduct()`, `updateWhopProduct()`, `deleteWhopProduct()` | プロダクトの作成・更新・削除・取得 |
| **プラン管理** | `getWhopPlans()`, `getWhopPlan()`, `createWhopPlan()`, `updateWhopPlan()`, `deleteWhopPlan()` | プランの作成・更新・削除・取得 |
| **アフィリエイター管理** | `getWhopAffiliates()`, `getWhopAffiliate()`, `createWhopAffiliate()` | アフィリエイターの取得・作成 |
| **アフィリエイトリンク生成** | `generateWhopAffiliateLink()` | アフィリエイトリンクの生成 |
| **コミッション追跡** | `getWhopAffiliateCommissions()`, `getWhopAffiliateStats()` | コミッション履歴・統計の取得 |
| **メンバーシップ管理** | `getWhopMemberships()`, `getWhopMembership()`, `cancelWhopMembership()`, `reactivateWhopMembership()`, `extendWhopMembership()`, `updateWhopMembership()`, `suspendWhopMembership()`, `unsuspendWhopMembership()` | メンバーシップの完全制御 |
| **カスタマー対応** | `getWhopMembers()`, `getWhopMember()`, `updateWhopMember()`, `getWhopMemberPayments()`, `createWhopRefund()` | カスタマー情報・支払い・返金の管理 |

---

### 2. **自動化ワークフロー = 補完レイヤー（Complementary Layer）**

自動化ワークフロー（`workflows/affiliate-recruitment`）は、Whop APIの**補完・導線**として機能します。

#### 自動化ワークフローの役割

| 機能 | 説明 | Whop APIとの関係 |
|------|------|-----------------|
| **アフィリエイタースカウト自動化** | Grok/GPT/Geminiで候補を検索・分析 | Whop APIでアフィリエイター登録の前段階 |
| **候補検索** | AIモデルを使用して候補を検索 | Whop APIでアフィリエイター登録の準備 |
| **候補分析** | 候補のマッチングスコアを計算 | Whop APIでアフィリエイター登録の判断材料 |
| **DM送信** | Telegram DMで候補に連絡 | Whop APIでアフィリエイター登録への導線 |
| **最終登録** | **Whop APIでアフィリエイター登録** | **Whop APIが最終的な制御レイヤー** |

#### ❌ **自動化ワークフローが行わないこと**

- ❌ アフィリエイター管理（Whop APIで管理）
- ❌ CSV/JSONベースのデータ管理（Whop APIとデータベースで管理）
- ❌ アフィリエイトリンク生成の重複実装（Whop APIを使用）

---

### 3. **LP = 導線レイヤー（Funnel Layer）**

LPは、ユーザーとアフィリエイターをWhopに導く**導線**として機能します。

#### LPの種類と役割

| LPの種類 | 対象 | 役割 | Whop APIとの関係 |
|---------|------|------|-----------------|
| **ユーザー向けLP** | エンドユーザー | Whopプロダクトページへの導線 | Whop APIでプロダクト情報を取得して表示 |
| **アフィリエイタースカウト用LP** | アフィリエイター候補 | Whopアフィリエイター登録への導線 | Whop APIでアフィリエイター登録の準備 |

---

## 🔄 完全なオペレーションフロー

### フロー1: プロダクト管理（COO → Whop API）

```
1. COO（Cursor/Composer 1）がプロダクト仕様を決定
   ↓
2. Whop API: createWhopProduct() でプロダクト作成
   ↓
3. Whop API: createWhopPlan() でプラン作成
   ↓
4. Whop API: updateWhopProduct() で公開設定
   ↓
5. Whop API: getWhopProduct() でプロダクト情報取得
   ↓
6. LP: Whop APIで取得したプロダクト情報を表示
```

**制御ポイント**: すべてのステップでWhop APIが制御レイヤーとして機能

---

### フロー2: アフィリエイタースカウト（自動化ワークフロー → Whop API）

```
1. 自動化ワークフロー: Grok/GPT/Geminiで候補検索
   ↓
2. 自動化ワークフロー: 候補分析・優先順位付け
   ↓
3. 自動化ワークフロー: Telegram DM送信（アフィリエイタースカウト用LPへ誘導）
   ↓
4. LP: 候補がLPにアクセス・登録
   ↓
5. COO → Whop API: createWhopAffiliate() でアフィリエイター登録
   ↓
6. COO → Whop API: getWhopAffiliates() でアフィリエイター一覧取得
   ↓
7. COO → Whop API: generateWhopAffiliateLink() でアフィリエイトリンク生成
   ↓
8. 自動化ワークフロー: Telegram DMでアフィリエイトリンク送信
```

**制御ポイント**: 
- ステップ1-4: 自動化ワークフロー（補完レイヤー）
- ステップ5-7: **COO → Whop API（制御レイヤー）**
- ステップ8: 自動化ワークフロー（補完レイヤー）

---

### フロー3: カスタマー対応（COO → Whop API）

```
1. カスタマーサポートリクエスト受信
   ↓
2. COO → Whop API: getWhopMembership() でメンバーシップ確認
   ↓
3. COO → Whop API: getWhopMemberPayments() で支払い履歴確認
   ↓
4. COO → Whop API: extendWhopMembership() で延長処理（必要に応じて）
   ↓
5. COO → Whop API: createWhopRefund() で返金処理（必要に応じて）
```

**制御ポイント**: すべてのステップでWhop APIが制御レイヤーとして機能

---

## 📊 データフローと制御フロー

### データフロー（Whop API → 自動化ワークフロー → LP）

```
Whop API（制御レイヤー）
  ↓ データ取得
自動化ワークフロー（補完レイヤー）
  ↓ データ処理・導線
LP（導線レイヤー）
  ↓ ユーザーアクション
Whop API（制御レイヤー）
```

### 制御フロー（COO → Whop API → すべてのオペレーション）

```
COO（Cursor/Composer 1）
  ↓ 制御コマンド
Whop API（制御レイヤー）
  ↓ オペレーション実行
  ├─ プロダクト管理
  ├─ アフィリエイター管理
  ├─ アフィリエイトリンク生成
  ├─ コミッション追跡
  ├─ メンバーシップ管理
  └─ カスタマー対応
```

---

## 🎯 実装における重要な原則

### 1. **Whop API関数の使用**

すべてのWhop関連オペレーションは、`api/unified-api.ts`のWhop API関数を使用します。

```typescript
// ✅ 正しい: Whop API関数を使用
import { 
  getWhopProduct,
  getWhopProducts,
  createWhopProduct,
  updateWhopProduct,
  deleteWhopProduct,
  getWhopPlans,
  getWhopPlan,
  createWhopPlan,
  updateWhopPlan,
  deleteWhopPlan,
  getWhopAffiliates,
  getWhopAffiliate,
  createWhopAffiliate,
  generateWhopAffiliateLink,
  getWhopAffiliateCommissions,
  getWhopAffiliateStats,
  getWhopMemberships,
  getWhopMembership,
  cancelWhopMembership,
  reactivateWhopMembership,
  extendWhopMembership,
  updateWhopMembership,
  suspendWhopMembership,
  unsuspendWhopMembership,
  getWhopMembers,
  getWhopMember,
  updateWhopMember,
  getWhopMemberPayments,
  createWhopRefund
} from '@/api/unified-api';

// ❌ 誤り: Whop APIを直接呼び出さない
// const response = await fetch('https://api.whop.com/api/v2/products/...');
```

---

### 2. **自動化ワークフローの役割**

自動化ワークフローは、Whop APIの**補完・導線**として機能します。

```typescript
// ✅ 正しい: 自動化ワークフローの役割
// 1. 候補検索（補完）
const candidates = await searchCandidates(...);

// 2. 候補分析（補完）
const analyzedCandidates = await analyzeCandidates(...);

// 3. DM送信（導線）
await sendTelegramDM(...);

// 4. Whop APIでアフィリエイター登録（制御レイヤー）
const whopAffiliate = await createWhopAffiliate({
  productId: whopProductId,
  email: candidate.email,
  name: candidate.name
});

// 5. Whop APIでアフィリエイトリンク生成（制御レイヤー）
const affiliateLink = await generateWhopAffiliateLink({
  productId: whopProductId,
  affiliateId: whopAffiliate.id
});

// ❌ 誤り: 自動化ワークフローでアフィリエイター管理をしない
// const affiliateLink = `https://whop.com/checkout/${productId}?ref=${candidate.id}`;
```

---

### 3. **データ管理の原則**

データ管理は、Whop APIとデータベースで行います。

```typescript
// ✅ 正しい: Whop APIでアフィリエイター情報取得
const whopAffiliates = await getWhopAffiliates({ productId: whopProductId });

// ✅ 正しい: データベースで候補情報保存（Whopの補完）
// AffiliateCandidate: 候補検索結果の一時保存
// Affiliate: WhopアフィリエイターIDと候補IDの紐付け

// ❌ 誤り: CSV/JSONベースのデータ管理（Whopと重複）
// const candidates: any[] = [];
// dataPath: 'data/phase-results/',
```

---

## 📋 実装チェックリスト

### Whop API統合

- [ ] すべてのWhop関連オペレーションで`api/unified-api.ts`の関数を使用
- [ ] Whop APIを直接呼び出していない
- [ ] エラーハンドリングが適切に実装されている
- [ ] リトライロジックが実装されている

### 自動化ワークフロー

- [ ] アフィリエイター管理をしていない（Whop APIで管理）
- [ ] CSV/JSONベースのデータ管理をしていない（Whop APIとデータベースで管理）
- [ ] Whop APIでアフィリエイター登録を行っている
- [ ] Whop APIでアフィリエイトリンク生成を行っている

### LP

- [ ] Whop APIでプロダクト情報を取得して表示
- [ ] Whop APIでアフィリエイター登録への導線を提供

---

## 🎓 結論

### ✅ **Whop API中心オペレーション制御の完全理解**

1. **COO（Cursor/Composer 1）がWhop APIを経由してほぼすべてのオペレーションを制御**
   - プロダクト管理
   - アフィリエイター管理
   - アフィリエイトリンク生成
   - コミッション追跡
   - メンバーシップ管理
   - カスタマー対応

2. **自動化ワークフローは補完・導線として機能**
   - アフィリエイタースカウト自動化
   - 候補検索・分析
   - DM送信
   - **最終的にWhop APIでアフィリエイター登録**

3. **LPは導線として機能**
   - ユーザー向けLP: Whopプロダクトページ
   - アフィリエイタースカウト用LP: 候補を誘導するLP

---

**最終更新**: 2026-01-11  
**ステータス**: ✅ 完全理解完了

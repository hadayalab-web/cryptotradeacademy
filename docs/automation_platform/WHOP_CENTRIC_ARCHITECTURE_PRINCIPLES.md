# Whop中心アーキテクチャ - 3つの基本原則

**作成日**: 2026-01-11  
**目的**: Whop中心のアーキテクチャにおける3つの基本原則を明確化

---

## 🎯 3つの基本原則

### 1. **Whop APIで制御できないことは外部機能を配置**

Whop APIで制御できない機能は、外部機能（補完レイヤー）として実装します。

#### ✅ Whop APIで制御できること
- ✅ プロダクト・プラン情報の取得
- ✅ アフィリエイター情報の取得
- ✅ アフィリエイトリンク生成（URL構築）
- ✅ メンバーシップ情報の取得・操作
- ✅ チェックアウトセッション作成（`affiliate_code`指定可能）

#### ❌ Whop APIで制御できないこと → 外部機能で補完

| 機能 | Whop API制限 | 外部機能（補完） | 実装状況 |
|------|-------------|----------------|---------|
| **アフィリエイター作成** | ❌ `POST /api/v2/affiliates` エンドポイントが存在しない | ✅ PuppeteerによるWhopダッシュボード自動化 | ✅ 実装済み (`scripts/whop-dashboard-automation.ts`) |
| **プロダクト作成・更新・削除** | ❌ 権限不足（401 Unauthorized） | ⚠️ Whopダッシュボード手動操作、またはAPIキー権限更新 | ⚠️ 手動操作 |
| **アフィリエイトコミッション履歴取得** | ❌ 専用エンドポイントが存在しない | ⚠️ Whopダッシュボードで確認 | ⚠️ 手動確認 |

#### 📋 実装例

**アフィリエイター作成の補完（Puppeteer自動化）**:
```typescript
// scripts/whop-dashboard-automation.ts
// Whop APIでできないアフィリエイター作成を、Puppeteerで自動化
await registerAffiliateViaDashboard({
  email: candidate.email,
  telegramUserId: candidate.telegramUserId,
  productId: whopProductId
});
```

**アフィリエイトリンク生成（URL構築）**:
```typescript
// api/unified-api.ts
// Whop APIに専用エンドポイントがないため、URL構築で実現
export async function generateWhopAffiliateLink(options) {
  const product = await getWhopProduct(options.productId);
  return `https://whop.com/${product.slug}?ref=${options.affiliateCode}`;
}
```

---

### 2. **Whopの表現不足をLPで強化**

Whopの標準UI/機能だけでは表現が不十分な部分を、Landing Page（LP）で補強します。

#### 🎯 LPの役割

| 種類 | 目的 | Whop標準機能との関係 |
|------|------|-------------------|
| **ユーザー向けLP（購入用LP）** | プロダクトの魅力を最大化し、購入を促進 | Whopプロダクトページの表現を強化・補完 |
| **アフィリエイターリクルートLP** | アフィリエイター候補を誘導し、登録を促進 | Whopアフィリエイトプログラムの表現を強化・補完 |

#### 📋 LPで強化する要素

**1. ストーリーテリング**
- ✅ **Two Young Menストーリー**: ユーザー向けLPで、プロダクトの価値を物語として伝える
- ✅ **Hidden Enemy x Island Invitationハイブリッドストーリー**: アフィリエイターリクルートLPで、アフィリエイトプログラムの魅力を伝える

**2. CVR最適化**
- ✅ **AFFILIATE_COPY_DATA統合**: アフィリエイターリクルートLP用の最適化されたコピー
- ✅ **CVR_DATA統合**: ユーザー向けLP用のCVR最適化データ
- ✅ **Notion Database非依存**: すべてのLPコピーは静的データを使用（Notion Databaseは使用しない）

**3. 多言語対応**
- ✅ **6言語対応**: EN, AR, ES, JA, KO, PT-BR
- ✅ **市場別最適化**: 各市場の文化・言語に合わせたLP

**4. 統合機能**
- ✅ **Whop Checkout統合**: `@whop/react`の`WhopCheckout`コンポーネントで決済
- ✅ **VSL統合**: HeyGenで生成した動画をLPに埋め込み
- ✅ **登録フォーム**: アフィリエイター候補の情報収集

#### 📋 実装例

**ユーザー向けLP（購入用LP）**:
```typescript
// hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-en/app/[market]/page.tsx
// Two Young Menストーリー + CVR_DATA統合 + Whop Checkout
<WhopCheckout
  planId={planId}
  affiliateCode={affiliateCode}
  redirectUrl={redirectUrl}
/>
```

**アフィリエイターリクルートLP**:
```typescript
// orientation-lp/app/affiliate/[market]/page.tsx
// Hidden Enemy x Island Invitationストーリー + AFFILIATE_COPY_DATA統合
// → アフィリエイター候補を誘導し、Whopアフィリエイトプログラムに登録
```

---

### 3. **Whop BotがユーザーのTelegramチャットグループ管理を担当**

Whop Bot（公式Access Manager）が、メンバーシップ状態に基づいてTelegramチャットグループへのアクセスを自動管理します。

#### ✅ Whop Botの役割

**完全自動化されたアクセス管理**:
- ✅ **メンバーシップ有効化時**: 自動的にTelegramチャットグループに追加
- ✅ **メンバーシップキャンセル時**: 自動的にTelegramチャットグループから削除
- ✅ **メンバーシップ延長時**: 自動的にアクセス継続

**6言語別のTelegramチャットグループ管理**:
- ✅ **AR**: `@cryptosignalai_ar`
- ✅ **EN**: `@cryptosignalai_en`
- ✅ **ES**: `@cryptosignalai_es`
- ✅ **JA**: `@cryptosignalai_ja`
- ✅ **KO**: `@cryptosignalai_ko`
- ✅ **PT-BR**: `@cryptosignalai_pt_br`

#### 📋 設定方法

1. Whop Dashboard → Products → [Product選択]
2. Settings → Experiences
3. "Connect Telegram" を選択
4. Telegramチャンネル/グループを接続
5. Whop Bot（Access Manager）が自動的にアクセス管理開始

#### 🔄 ワークフロー

**標準的なユーザー入退会フロー（Whop Bot自動管理）**:
```
1. ユーザーがWhopでメンバーシップ取得
   ↓
2. Whop Bot（Access Manager）が自動検知
   ↓
3. Whop Botが自動的にTelegramチャットグループに追加
   ↓
4. ユーザーがTelegramチャットグループに参加完了
```

**メンバーシップキャンセル時**:
```
1. ユーザーがメンバーシップをキャンセル
   ↓
2. Whop Bot（Access Manager）が自動検知
   ↓
3. Whop Botが自動的にTelegramチャットグループから削除
   ↓
4. ユーザーのアクセスが自動的に無効化
```

#### ⚠️ Whop MCPとの役割分担

| 機能 | Whop Bot（公式） | Whop MCP（カスタム） | 優先度 |
|------|----------------|-------------------|--------|
| **ユーザー入退会の自動管理** | ✅ 完全自動 | ⚠️ 補完的 | Whop Bot優先 |
| **Telegramチャットグループ管理** | ✅ 完全自動 | ⚠️ 設定管理 | Whop Bot優先 |
| **プロダクト管理** | ❌ | ✅ 完全制御 | Whop MCP |
| **カスタマー対応** | ❌ | ✅ 完全制御 | Whop MCP |
| **アフィリエイト管理** | ❌ | ✅ 完全制御 | Whop MCP |

**推奨**: 標準的なケースではWhop Botに任せ、特別なケース（カスタマーサポート、手動制御）のみWhop MCPを使用

---

## 🏗️ 統合アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    Whop（基本・中核）                        │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Whop API（制御レイヤー）                            │  │
│  │  - プロダクト管理                                     │  │
│  │  - アフィリエイター管理                               │  │
│  │  - アフィリエイトリンク生成                           │  │
│  │  - メンバーシップ管理                                 │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Whop Bot（公式Access Manager）                      │  │
│  │  - Telegramチャットグループ管理（完全自動）            │  │
│  │  - メンバーシップ状態に応じた自動アクセス制御         │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
           ↑                          ↑
           │                          │
           │ 補完・強化                │ 補完・強化
           │                          │
┌──────────────────────┐   ┌──────────────────────┐
│  外部機能（補完）     │   │  LP（表現強化）       │
│                      │   │                      │
│ 1. Puppeteer自動化   │   │ 1. ユーザー向けLP     │
│    - アフィリエイター  │   │    - Two Young Men   │
│      作成（API不可）  │   │    - CVR最適化       │
│                      │   │    - Whop Checkout   │
│ 2. アフィリエイター    │   │                      │
│    スカウト自動化     │   │ 2. アフィリエイター    │
│    - 候補検索         │   │    リクルートLP       │
│    - 候補分析         │   │    - Hidden Enemy    │
│    - DM送信          │   │    - AFFILIATE_COPY   │
│                      │   │    - 登録フォーム     │
└──────────────────────┘   └──────────────────────┘
```

---

## 📋 実装状況

### ✅ 実装済み

1. **Whop API制御できないことの外部機能補完**
   - ✅ PuppeteerによるWhopダッシュボード自動化（`scripts/whop-dashboard-automation.ts`）
   - ✅ アフィリエイタースカウト自動化ワークフロー（`workflows/affiliate-recruitment`）

2. **Whopの表現不足をLPで強化**
   - ✅ ユーザー向けLP（7プロジェクト × 6言語 = 42 LP）
   - ✅ アフィリエイターリクルートLP（`orientation-lp`）
   - ✅ CVR_DATA / AFFILIATE_COPY_DATA統合
   - ✅ Whop Checkout統合

3. **Whop BotによるTelegramチャットグループ管理**
   - ✅ Whop Dashboardで設定済み
   - ✅ 6言語別のTelegramチャットグループ接続済み
   - ✅ 自動アクセス管理が動作中

---

## 🎯 結論

### 3つの基本原則の統合

1. **Whop APIで制御できないことは外部機能を配置**
   - ✅ Puppeteer自動化、アフィリエイタースカウトワークフローで補完
   - ✅ Whop APIの制限を外部機能で完全にカバー

2. **Whopの表現不足をLPで強化**
   - ✅ ストーリーテリング、CVR最適化、多言語対応でWhop標準機能を強化
   - ✅ ユーザー体験とコンバージョンを最大化

3. **Whop BotがユーザーのTelegramチャットグループ管理を担当**
   - ✅ 完全自動化されたアクセス管理
   - ✅ メンバーシップ状態に応じた自動制御

### アーキテクチャの特徴

- **Whop中心**: Whop API/Botを基本・中核として配置
- **補完レイヤー**: 外部機能とLPでWhopの制限・表現不足を補完
- **完全自動化**: ユーザー入退会、アフィリエイター管理、アクセス制御が自動化

---

**関連ドキュメント**:
- `docs/CORRECT_ARCHITECTURE_WHOP_CENTRIC.md` - Whop中心設計の詳細
- `docs/WHOP_BOT_MCP_ROLE_DIVISION.md` - Whop BotとMCPの役割分担
- `docs/WHOP_API_CAPABILITIES_COMPLETE.md` - Whop APIの機能リスト
- `docs/ALL_LP_CHECK_COMPLETE.md` - 全LPのチェック結果

---

**最終更新**: 2026-01-11  
**ステータス**: ✅ 基本原則確定

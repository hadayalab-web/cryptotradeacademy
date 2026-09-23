# 「隠された敵」× 「島への招待」ハイブリッド戦略 - 関連コンテンツ完全リスト

**作成日**: 2026-01-09  
**最終更新**: 2026-01-09  
**プロダクト名**: **Trap Defence BTC**  
**基準日**: 2026-01-08（昨日以降に更新されたファイルのみが最新情報）  
**目的**: ハイブリッド戦略に関連して作成されたすべてのコンテンツを網羅的に整理

---

## ⚠️ 重要：ストーリーの適用先

### ✅ 正しい適用先

- **Two Young Menストーリー** → **ユーザー向けLPのみ** (`app/[market]/page.tsx`)
- **「隠された敵」×「島への招待」ハイブリッド** → **アフィリエイター向けLPのみ** (`app/affiliate/[market]/page.tsx`)

### ❌ 誤った理解（二度と参照しない）

- ❌ Two Young Menストーリーをアフィリエイター向けLPに使用
- ❌ 「隠された敵」×「島への招待」をユーザー向けLPに使用
- ❌ プロダクト名を「TrapShield」と記載（正しくは「Trap Defence BTC」）

---

## ⚠️ 重要

**このドキュメントには、すべての関連コンテンツが含まれていますが、2026-01-08以降に更新されたファイルのみが「最新情報」として扱われます。**  
**最新情報のみを確認する場合は、`HYBRID_STRATEGY_CURRENT_CONTENT_ONLY.md`を参照してください。**

---

## 📋 目次

1. [LPページファイル](#lpページファイル)
2. [CVRデータ](#cvrデータ)
3. [VSLスクリプト関連](#vslスクリプト関連)
4. [Notion Database統合](#notion-database統合)
5. [アフィリエイト招待メール](#アフィリエイト招待メール)
6. [画像生成プロンプト](#画像生成プロンプト)
7. [データファイル](#データファイル)
8. [スクリプト・ツール](#スクリプトツール)
9. [ドキュメント](#ドキュメント)

---

## 📄 LPページファイル

### 1. Orientation LP - アフィリエイター向けLP ⭐ **最新**
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/app/affiliate/[market]/page.tsx`  
**更新日時**: 2026/01/09 23:39:30  
**ステータス**: ✅ 最新（2026-01-08以降）  
**ストーリー**: 「隠された敵」×「島への招待」ハイブリッド専用

**内容**:
- Hero Section（「隠された敵」型VSL統合）
- アフィリエイター対比画像セクション（絶望するアフィリエイター vs 成功するアフィリエイター）
- Hidden Enemy Section
- Island Invitation Section（地獄の島 vs 天国の島）
- Reward Structure Section
- Registration Form Section
- Success Stories Section
- FAQ Section
- CTA Section

**特徴**:
- 6市場対応（EN, AR, KO, JA, ES, PT-BR）
- Notion Database連携（`getLPCopy`）
- HeyGen VSL統合
- **プロダクト名**: Trap Defence BTC

**注意**: Two Young Menストーリーは含まれません（ユーザー向けLP専用）

---

### 2. CryptoTrade Academy LP (JA) - アフィリエイター向けLP ⭐ **最新**
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-ja/app/affiliate/[market]/page.tsx`  
**更新日時**: 2026/01/09 23:39:30  
**ステータス**: ✅ 最新（2026-01-08以降）

**内容**:
- JA市場固定版
- 日本語コピー最適化
- 詳細なNanoBanana画像生成プロンプト（TODOコメント内）

**特徴**:
- より詳細な画像生成プロンプト
- JA市場専用のコピー最適化

---

### 3. Orientation LP - ユーザー向けLP（Two Young Menストーリー専用） ⭐ **最新**
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/app/[market]/page.tsx`  
**更新日時**: 2026/01/09 23:39:30  
**ステータス**: ✅ 最新（2026-01-08以降）  
**ストーリー**: Two Young Menストーリー専用

**内容**:
- Two Young Menストーリー統合
- Trader A vs Trader Bの対比
- CVRデータを使用したコピー
- **プロダクト名**: Trap Defence BTC

**注意**: 「隠された敵」×「島への招待」ハイブリッドは含まれません（アフィリエイター向けLP専用）

---

### 4. CryptoTrade Academy LP (EN) - ユーザー向けLP ⭐ **最新**
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-en/app/[market]/page.tsx`  
**更新日時**: 2026/01/09 23:39:30  
**ステータス**: ✅ 最新（2026-01-08以降）

**内容**:
- EN市場専用
- Two Young Menストーリー統合

---

## 📊 CVRデータ

### 1. Orientation LP - CVR Data ⭐ **最新**
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/lib/cvr-data.ts`  
**更新日時**: 2026/01/09 23:39:30  
**ステータス**: ✅ 最新（2026-01-08以降）

**内容**:
- 6市場（JA, EN, AR, ES, KO, PT-BR）のLPコピーとVSLスクリプト
- Two Young Menストーリーの`opening`セクションを含む
- CVR最大化戦略データ

**Two Young Menストーリー例（EN）**:
```typescript
script: {
  opening: 'Two traders, Trader A and Trader B. Yesterday, Trader A lost months of accumulated profits in an instant. Meanwhile, Trader B earned $5K while drinking coffee. Which one are you?',
  // ...
}
```

**Two Young Menストーリー例（JA）**:
```typescript
script: {
  opening: '二人のトレーダー、トレーダーAとトレーダーB。昨日、トレーダーAは数ヶ月分の利益を一瞬で失いました。一方、トレーダーBはコーヒーを飲みながら$5Kを稼ぎました。あなたはどちらですか？',
  // ...
}
```

---

### 2. CryptoTrade Academy LP (EN) - CVR Data
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-en/lib/cvr-data.ts`

**内容**:
- EN市場専用のCVRデータ
- orientation-lpと同様の構造

---

## 🎬 VSLスクリプト関連

### 1. VSLスクリプト生成スクリプト
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/scripts/improve-phase4-output-quality.js`

**機能**:
- スワイプファイルからVSLスクリプトを生成
- 市場別テンプレートを使用
- CVR最大化戦略データの出力品質を改善

**関連関数**:
- `generateVSLScriptFromSwipeFile()` - スワイプファイルからVSLスクリプトを生成

---

### 2. VSLスクリプト保存スクリプト
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/scripts/save-vsl-script.ts`

**機能**:
- VSLスクリプトをNotion Databaseに保存
- バージョン管理
- 市場別管理

---

### 3. Notion Database統合 - VSLスクリプト
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/app/actions/notion-content.ts`

**関数**:
- `getVSLScript()` - VSLスクリプトを取得
- `saveVSLScript()` - VSLスクリプトを保存

**Database構造**:
- Name (Title)
- Market (Select: EN, AR, KO, JA, ES, PT-BR)
- Script (Rich Text)
- Version (Number)
- Status (Select: Active, Draft, Archived)
- Description (Rich Text)
- Created At (Date)
- Updated At (Date)

---

## 📚 Notion Database統合

### 1. LPコピー管理
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/app/actions/notion-content.ts`

**関数**:
- `getLPCopy()` - LPコピーを取得
- `saveLPCopy()` - LPコピーを保存

**Database構造**:
- Name (Title)
- Market (Select: EN, AR, KO, JA, ES, PT-BR)
- Section (Select: Hero, Pain Points, Solution, Social Proof, Offer, FAQ, CTA)
- Content (Rich Text)
- Version (Number)
- Status (Select: Active, Draft, Archived)
- Description (Rich Text)
- Created At (Date)
- Updated At (Date)

**使用箇所**:
- `app/affiliate/[market]/page.tsx` - アフィリエイター向けLP
- `heroCopy = await getLPCopy(market, 'Hero')`
- `rewardCopy = await getLPCopy(market, 'Solution')`

---

### 2. Database設定ドキュメント
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/docs/NOTION_DATABASE_SETUP_CHECKLIST.md`

**内容**:
- Database作成手順
- 環境変数設定
- Database構造の詳細

---

### 3. データ保存ガイド
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/docs/NOTION_DATA_SAVE_GUIDE.md`

**内容**:
- LPコピーの保存方法
- VSLスクリプトの保存方法
- Database構造の詳細

---

## 📧 アフィリエイト招待メール

### 1. Orientation LP - アフィリエイト招待メール ❌ **古い情報**
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/lib/resend/affiliate-invitation.ts`  
**更新日時**: 2026/01/08 22:39:50  
**ステータス**: ❌ 古い情報（2026-01-08以前）

**内容**:
- 6市場対応のメールテンプレート
- CVRスコア表示機能
- 報酬構造の説明
- トップアフィリエイターの収益例

**主要メッセージ（EN）**:
```typescript
EN: {
  subject: 'Join CryptoTrade Academy - BTC TrapShield Affiliate Program',
  body: (name?: string, cvrScore?: number) => `
    <p>We found your content about crypto trading and would like to invite you to join our affiliate program.</p>
    ${cvrScore ? `<p><strong>Your CVR Score:</strong> ${cvrScore}/10 - You're a high-priority candidate!</p>` : ''}
    <p><strong>BTC TrapShield</strong> is a revolutionary trap detection system...</p>
    // ...
  `,
}
```

**報酬構造**:
- 1-month plan: $34.5/month (recurring)
- 3-month plan: $82.5/sale ⭐ RECOMMENDED
- 1-year plan: $294/sale

**トップアフィリエイターの収益例**:
- 10 customers/month (3-month plan): $825/month
- 20 customers/month (3-month plan): $1,650/month
- 5 customers/month (1-year plan): $1,470/month

---

### 2. 各市場版のアフィリエイト招待メール
**パス**:
- `cryptotradeacademy-lp-en/lib/resend/affiliate-invitation.ts`
- `cryptotradeacademy-lp-ja/lib/resend/affiliate-invitation.ts`
- `cryptotradeacademy-lp-ar/lib/resend/affiliate-invitation.ts`
- `cryptotradeacademy-lp-es/lib/resend/affiliate-invitation.ts`
- `cryptotradeacademy-lp-ko/lib/resend/affiliate-invitation.ts`
- `cryptotradeacademy-lp-pt-br/lib/resend/affiliate-invitation.ts`

**内容**:
- 各市場の言語に最適化されたメールテンプレート
- 市場別の文化的文脈に合わせたコピー

---

## 🎨 画像生成プロンプト

### ⚠️ 注意：ストーリーの適用先

- **Two Young Men画像プロンプト** → ユーザー向けLP専用（`app/[market]/page.tsx`）
- **アフィリエイター対比画像プロンプト** → アフィリエイター向けLP専用（`app/affiliate/[market]/page.tsx`）

---

### 1. アフィリエイター対比画像プロンプト（アフィリエイター向けLP専用）

#### 絶望するアフィリエイター（地獄の島）
**プロンプト**:
```
"Desperate affiliate marketer, low conversion rate, frustrated expression, red declining chart showing 0% conversion, dark room with only screen light, dramatic side lighting emphasizing despair"
```

**詳細版（JA版）**:
```
"Desperate affiliate marketer, aggressive sales pitch, angry customers, 0% conversion rate, dark atmosphere, professional photography style, cinematic composition, dramatic lighting, despair mood"
```

**場所**: 
- `orientation-lp/app/affiliate/[market]/page.tsx` (行73)
- `cryptotradeacademy-lp-ja/app/affiliate/[market]/page.tsx` (行73, 136)

---

#### 成功するアフィリエイター（天国の島）
**プロンプト**:
```
"Confident affiliate marketer, cool and relaxed expression, casually checking smartphone with Trap Defense affiliate dashboard showing $1,650/month earnings, green rising chart displaying +50% conversion, coffee cup on desk, bright modern office with natural light, calm and successful atmosphere"
```

**詳細版（JA版）**:
```
"Confident affiliate marketer, gentle recommendation, grateful customers, +50% conversion rate, bright atmosphere, professional photography style, cinematic composition, soft lighting, success mood"
```

**場所**: 
- `orientation-lp/app/affiliate/[market]/page.tsx` (行78)
- `cryptotradeacademy-lp-ja/app/affiliate/[market]/page.tsx` (行78, 148)

---

### 2. Two Young Men画像プロンプト（ユーザー向けLP専用）

#### Trader A（損失）
**プロンプト**:
```
"Desperate trader, lost profits, frustrated expression, red declining chart, dark room, dramatic lighting"
```

**場所**: `orientation-lp/app/[market]/page.tsx` (行75)

---

#### Trader B（成功）
**プロンプト**:
```
"Confident trader, earned profits, relaxed expression, green rising chart, bright office, calm atmosphere"
```

**場所**: `orientation-lp/app/[market]/page.tsx` (行80)

---

### 3. NanoBanana画像生成実装
**パス**: 
- `cryptosignal-ai/services/gemini/imageGenerator.js`
- `scripts/gemini-mcp-server.js`
- `hadayalab-website-dev/cryptotradeacademy-lp-dev/scripts/gemini-mcp-server.js`

**機能**:
- Gemini NanoBanana Proを使用した画像生成
- 市場分析画像の生成
- アスペクト比と画像サイズの設定

**ドキュメント**:
- `docs/NANOBANANA_IMPLEMENTATION_UPDATE.md` - 実装更新情報

---

## 📁 データファイル

### 1. CVR最大化戦略データ
**パス**: `data/cvr-maximizer/results/cvr-strategy-CryptoSignalAI___1_Day_Test_CryptoSignalAI___1_Day_Test-EN-1767322381772.json`

**内容**:
- CVR最大化戦略のJSONデータ
- プロダクト最適化データ
- マーケティング戦略データ
- スワイプファイルデータ

---

### 2. マーケティング戦略データ
**パス**: `data/marketing-strategy/results/marketing-strategy-CryptoSignalAI___1_Day_Test-EN-1767322314600.json`

**内容**:
- マーケティング戦略の最適化データ
- 市場分析
- ペルソナ分析

---

### 3. プロダクト最適化データ
**パス**: 
- `data/product-optimization/results/product-optimization-CryptoSignalAI___1_Day_Test-EN-1767322290601.json`
- `data/product-optimization/results/product-optimization-CryptoTrade_Academy-EN-1767315379660.json`

**内容**:
- プロダクト最適化の分析データ
- リバースシンキング
- エッセンス追求

---

## 🛠️ スクリプト・ツール

### 1. CVR Maximizer MCP Server ❌ **古い情報**
**パス**: `scripts/cvr-maximizer-mcp-server.js`  
**更新日時**: 2026/01/02 9:11:35  
**ステータス**: ❌ 古い情報（2026-01-08以前）

**機能**:
- CVR最大化戦略の生成
- 3つのデータソース（プロダクト最適化、マーケティング戦略、スワイプファイル）の統合
- 6理論フレームワークの適用

**関連関数**:
- `generateCVRMaximizationStrategy()` - CVR最大化戦略を生成
- `maximizeCVR()` - CVR最大化を実行

---

### 2. Swipe File Generator MCP Server ❌ **古い情報**
**パス**: `scripts/swipe-file-generator-mcp-server.js`  
**更新日時**: 2026/01/02 9:11:35  
**ステータス**: ❌ 古い情報（2026-01-08以前）

**機能**:
- スワイプファイルの生成
- プロダクト最適化データからスワイプファイルを生成
- マーケティング戦略データからスワイプファイルを生成
- 統合スワイプファイルの生成

**関連関数**:
- `generateSwipeFromProductOptimization()` - プロダクト最適化データからスワイプファイルを生成
- `generateIntegratedSwipeFile()` - 統合スワイプファイルを生成

---

### 3. Marketing Strategy Optimizer MCP Server ❌ **古い情報**
**パス**: `scripts/marketing-strategy-optimizer-mcp-server.js`  
**更新日時**: 2026/01/02 9:11:35  
**ステータス**: ❌ 古い情報（2026-01-08以前）

**機能**:
- マーケティング戦略の最適化
- 市場分析
- ペルソナ分析

---

### 4. Telegram Affiliate DM MCP Server ❌ **古い情報**
**パス**: `scripts/telegram-affiliate-dm-mcp-server.js`  
**更新日時**: 2025/12/30 11:00:19  
**ステータス**: ❌ 古い情報（2026-01-08以前）

**機能**:
- アフィリエイターへのTelegram DM送信
- 言語別メッセージテンプレート

---

### 5. Phase 4出力品質改善スクリプト ❌ **古い情報**
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/scripts/improve-phase4-output-quality.js`  
**更新日時**: 2026/01/02以前（推定）  
**ステータス**: ❌ 古い情報（2026-01-08以前）

**機能**:
- CVR最大化戦略データの出力品質を改善
- VSLスクリプトの生成
- スワイプファイルからのコピー生成

---

## 📖 ドキュメント

### 1. ハイブリッド戦略ドキュメント
**パス**: `docs/TWO_YOUNG_MEN_HIDDEN_ENEMY_ISLAND_HYBRID_STRATEGY.md`

**内容**:
- ハイブリッド戦略の詳細説明
- 各パターンの役割
- 実装詳細
- CVR最大化のポイント

---

### 2. LP更新情報
**パス**: `docs/LP_RECENT_UPDATES_2026-01-09.md`

**内容**:
- 過去2時間以内に更新されたLPファイルの一覧
- 更新内容の詳細

---

### 3. Frontier Template統合情報
**パス**: `docs/LP_FRONTIER_TEMPLATE_UPGRADE_INFO.md`

**内容**:
- Frontier Templateの情報
- 既存LPとの比較
- アップグレード方針

---

### 4. アフィリエイト戦略ドキュメント
**パス**: `cryptosignal-ai/docs/CryptoTrade Academy - Zero-Budget Affiliate DRM Strategy v1.1 + APDS v1.0.md`

**内容**:
- ゼロ予算アフィリエイト戦略
- Cold Outreach戦略
- DRM戦略

---

### 5. Creative Execution Master Guide
**パス**: `cryptosignal-ai/docs/CryptoTrade Academy - Creative Execution Master Guide v1.0.md`

**内容**:
- HeyGen VSL制作手順
- Adobe Creative Cloud活用
- 4大ツール統合Architecture

---

### 6. SSOTドキュメント
**パス**: `cryptosignal-ai/docs/SSOT_TRAP_DEFENSE_BTC.md`

**内容**:
- Trap Defense BTCのSSOT
- LP+Website構築ワークフロー
- アフィリエイト戦略

---

## 🔗 関連コンポーネント

### 1. HeyGen VSLコンポーネント
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/components/lp/HeyGenVSL.tsx`

**機能**:
- HeyGen VSLの埋め込み
- 市場別VSLの表示

---

### 2. Registration Formコンポーネント
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/components/RegistrationForm.tsx`

**機能**:
- アフィリエイター登録フォーム
- 市場別フォーム

---

### 3. Footerコンポーネント
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/components/lp/Footer.tsx`

**機能**:
- LPフッター
- 市場別フッター

---

## 📊 データフロー

### 1. CVRデータ → LPページ
```
lib/cvr-data.ts
    ↓
app/[market]/page.tsx (ユーザー向けLP)
app/affiliate/[market]/page.tsx (アフィリエイター向けLP)
```

---

### 2. Notion Database → LPページ
```
Notion Database (LP Copy Content)
    ↓
app/actions/notion-content.ts (getLPCopy)
    ↓
app/affiliate/[market]/page.tsx
```

---

### 3. スワイプファイル → VSLスクリプト
```
Swipe File Generator MCP
    ↓
improve-phase4-output-quality.js
    ↓
Notion Database (VSL Scripts)
    ↓
HeyGen VSL生成
```

---

### 4. アフィリエイター招待フロー
```
Whop Affiliate Monitor MCP
    ↓
アフィリエイター候補検索
    ↓
Telegram Affiliate DM MCP / Resend Email
    ↓
アフィリエイター向けLP
    ↓
Registration Form
```

---

## 🎯 コンテンツの関連性

### ✅ Two Young Menストーリー（ユーザー向けLP専用）
- **実装**: ユーザー向けLP（`app/[market]/page.tsx`）のみ
- **データソース**: `lib/cvr-data.ts`の`script.opening`
- **画像生成**: NanoBananaプロンプト（TODOコメント内）
- **プロダクト名**: Trap Defence BTC

**注意**: アフィリエイター向けLPには使用されていません

---

### ✅ 「隠された敵」×「島への招待」ハイブリッド（アフィリエイター向けLP専用）
- **実装**: アフィリエイター向けLP（`app/affiliate/[market]/page.tsx`）のみ
- **構成**: 「隠された敵」型VSL + 「島への招待」セクション
- **VSL統合**: HeyGen VSLコンポーネント
- **スクリプト**: Notion DatabaseまたはCVRデータから取得
- **画像生成**: NanoBananaプロンプト（TODOコメント内）
- **プロダクト名**: Trap Defence BTC

**注意**: ユーザー向けLPには使用されていません

---

## 📝 TODO項目

### 1. NanoBanana画像統合
**場所**: 
- `orientation-lp/app/affiliate/[market]/page.tsx` (行73, 78)
- `cryptotradeacademy-lp-ja/app/affiliate/[market]/page.tsx` (行73, 78, 136, 148)

**プロンプト**: 上記「画像生成プロンプト」セクション参照

---

### 2. 多言語対応
**現状**: JA市場固定（`cryptotradeacademy-lp-ja/app/affiliate/[market]/page.tsx`）
**必要**: 6市場（EN, AR, KO, JA, ES, PT-BR）への拡張

---

### 3. VSLスクリプト作成
**必要**: 「隠された敵」型VSLスクリプトの作成
**統合**: Two Young Menストーリーと島への招待の統合

---

## 🔍 検索キーワード

以下のキーワードで関連コンテンツを検索できます：

- `Two Young Men`
- `Two Traders`
- `Trader A`
- `Trader B`
- `隠された敵`
- `残酷な真実`
- `島への招待`
- `地獄の島`
- `天国の島`
- `Trap Defense`
- `TrapShield`
- `affiliate`
- `アフィリエイト`
- `CVR`
- `VSL`
- `NanoBanana`

---

## 📌 まとめ

このハイブリッド戦略に関連して作成されたコンテンツは、以下のカテゴリに分類されます：

1. **LPページファイル**: 4ファイル（ユーザー向け2、アフィリエイター向け2）
2. **CVRデータ**: 2ファイル（orientation-lp、cryptotradeacademy-lp-en）
3. **VSLスクリプト関連**: 3ファイル（生成スクリプト、保存スクリプト、Notion統合）
4. **Notion Database統合**: 2ファイル（LPコピー、VSLスクリプト）
5. **アフィリエイト招待メール**: 7ファイル（orientation-lp + 6市場版）
6. **画像生成プロンプト**: 4プロンプト（Two Young Men × 2、島への招待 × 2）
7. **データファイル**: 3ファイル（CVR戦略、マーケティング戦略、プロダクト最適化）
8. **スクリプト・ツール**: 5ファイル（CVR Maximizer、Swipe File Generator、Marketing Strategy Optimizer、Telegram DM、Phase 4改善）
9. **ドキュメント**: 6ファイル（ハイブリッド戦略、LP更新情報、Frontier Template、アフィリエイト戦略、Creative Execution、SSOT）

**合計**: 約30ファイル以上の関連コンテンツ

---

## 📊 最新情報 vs 古い情報の分類

### ✅ 最新情報（2026-01-08以降に更新）
- LPページファイル: 4ファイル
- CVRデータ: 1ファイル
- Whop統合ファイル: 3ファイル
- ドキュメント: 4ファイル

**合計**: 12ファイル以上

### ❌ 古い情報（2026-01-08以前に更新）
- スクリプト・ツール: 4ファイル
- アフィリエイト招待メール: 7ファイル以上
- データファイル: 3ファイル以上
- VSLスクリプト関連: 2ファイル以上
- Notion Database統合: 1ファイル以上
- その他のコンポーネント: 3ファイル以上

**合計**: 20ファイル以上

---

## 🔗 関連ドキュメント

- **最新情報のみ**: `docs/HYBRID_STRATEGY_CURRENT_CONTENT_ONLY.md` - 2026-01-08以降に更新されたファイルのみ
- **完全リスト**: このドキュメント - すべての関連コンテンツ（最新・古い情報を含む）

---

**このドキュメントは、ハイブリッド戦略に関連するすべてのコンテンツを網羅的に整理したものです。最新情報のみを確認する場合は、`HYBRID_STRATEGY_CURRENT_CONTENT_ONLY.md`を参照してください。**

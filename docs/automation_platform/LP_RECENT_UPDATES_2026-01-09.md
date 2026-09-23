# LP基本ファイル - 最近更新（過去2時間以内）

**更新日時**: 2026/01/09 23:39:30  
**プロダクト名**: **Trap Defence BTC**  
**検索対象**: `hadayalab-website-dev` ディレクトリ

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

## 📋 更新されたLP基本ファイル一覧

### 1. Orientation LP - ユーザー向けLP ⭐ **Two Young Menストーリー専用**
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/app/[market]/page.tsx`  
**更新日時**: 2026/01/09 23:39:30  
**プロダクト名**: Trap Defence BTC

**主要機能**:
- ✅ Hero Section with VSL（Two Young Menストーリー統合）
- ✅ Problem & Solution Section（VSLスクリプトデータ使用）
- ✅ Pricing & CTA Section（Whopチェックアウト統合）
- ✅ Social Proof Section
- ✅ FloatingCTA、Chatbot、Footer統合

**特徴**:
- 6市場対応（EN, AR, KO, JA, ES, PT-BR）
- CVR最大化戦略データ（`lib/cvr-data.ts`）を使用
- Two Young Menストーリーの視覚化（NanoBanana画像統合予定）
- モバイルファーストデザイン

**注意**: 「隠された敵」×「島への招待」ハイブリッドは含まれません（アフィリエイター向けLP専用）

---

### 2. Orientation LP - アフィリエイター向けLP ⭐ **「隠された敵」×「島への招待」ハイブリッド専用**
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/app/affiliate/[market]/page.tsx`  
**更新日時**: 2026/01/09 23:39:30  
**プロダクト名**: Trap Defence BTC

**主要機能**:
- ✅ Hero Section（「隠された敵」型VSL統合）
- ✅ Hidden Enemy Section（業界の「残酷な真実」）
- ✅ Island Invitation Section（地獄の島 vs 天国の島）
- ✅ Reward Structure Section（報酬構造表示）
- ✅ Registration Form Section
- ✅ Success Stories Section
- ✅ FAQ Section

**特徴**:
- 6市場対応（EN, AR, KO, JA, ES, PT-BR）
- Notion Database連携（`getLPCopy`）
- SSOT仕様に基づく報酬構造
- アフィリエイター向けのCVR最適化コピー

---

### 3. CryptoTrade Academy LP (EN) - ユーザー向けLP
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-en/app/[market]/page.tsx`  
**更新日時**: 2026/01/09 23:39:30

**主要機能**:
- ✅ Hero Section with VSL（Two Young Menストーリー統合）
- ✅ Problem & Solution Section
- ✅ Pricing & CTA Section（Whopチェックアウト統合）
- ✅ Social Proof Section
- ✅ FloatingCTA、Chatbot統合

**特徴**:
- EN市場専用
- orientation-lpとほぼ同じ構造
- CVR最大化戦略データ（`lib/cvr-data.ts`）を使用

---

### 4. CryptoTrade Academy LP (JA) - アフィリエイター向けLP
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-ja/app/affiliate/[market]/page.tsx`  
**更新日時**: 2026/01/09 23:39:30

**主要機能**:
- ✅ Hero Section（日本語コピー）
- ✅ Hidden Enemy Section
- ✅ Island Invitation Section
- ✅ Reward Structure Section（JA市場固定）
- ✅ Registration Form Section

**特徴**:
- JA市場固定（`market = 'JA' as const`）
- 日本語コピー最適化
- アフィリエイター向けのCVR最適化

---

### 5. CVR Data - コピー・スクリプトデータ
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/lib/cvr-data.ts`  
**更新日時**: 2026/01/09 23:39:30

**内容**:
- CVR最大化戦略データ
- 各市場のLPコピー（headline, subheadline, cta, body）
- VSLスクリプト（opening, intro, problem, solution, proof, cta）
- 6市場対応（JA, EN, AR, ES, KO, PT-BR）

**使用箇所**:
- `app/[market]/page.tsx` - ユーザー向けLP
- `app/affiliate/[market]/page.tsx` - アフィリエイター向けLP

---

### 6. Whop統合ファイル
**更新日時**: 2026/01/09 23:39:30

**ファイル**:
- `orientation-lp/lib/whop.ts`
- `orientation-lp/lib/whop/constants.ts`
- `orientation-lp/lib/whop/product-export.ts`

**機能**:
- Whop Checkout統合
- プランID管理
- プロダクトエクスポート機能

---

## 🎯 主要な更新内容

### 1. Two Young Menストーリー統合
- Hero Sectionに「Two Traders. One Choice. Which One Are You?」を追加
- Trader A（損失）とTrader B（成功）の対比表示
- NanoBanana画像統合予定（TODOコメントあり）

### 2. CVR最大化戦略データの統合
- `lib/cvr-data.ts`から各市場のコピーとスクリプトを取得
- VSLスクリプトデータを使用
- Notion Database依存を削減（mdドキュメントベース）

### 3. モバイルファーストデザイン
- レスポンシブ対応（`md:`, `lg:`ブレークポイント）
- モバイルファーストのCTA配置
- タッチフレンドリーなUI要素

### 4. Whop Checkout統合
- `WhopCheckoutEmbed`コンポーネントを使用
- 3プラン構成（MONTHLY, QUARTERLY, YEARLY）
- プラン別の価格表示とCTA

### 5. アフィリエイター向けLPの強化
- 「隠された敵」型VSL統合
- 「地獄の島 vs 天国の島」セクション
- 報酬構造の明確化
- 登録フォーム統合

---

## 📊 ファイル構造

```
hadayalab-website-dev/cryptotradeacademy-lp-dev/
├── orientation-lp/
│   ├── app/
│   │   ├── [market]/page.tsx          ← ユーザー向けLP（更新）
│   │   └── affiliate/[market]/page.tsx ← アフィリエイター向けLP（更新）
│   └── lib/
│       ├── cvr-data.ts                ← CVRデータ（更新）
│       └── whop/
│           ├── constants.ts            ← Whop定数（更新）
│           └── product-export.ts       ← プロダクトエクスポート（更新）
├── cryptotradeacademy-lp-en/
│   └── app/
│       └── [market]/page.tsx          ← EN版ユーザー向けLP（更新）
└── cryptotradeacademy-lp-ja/
    └── app/
        └── affiliate/[market]/page.tsx ← JA版アフィリエイター向けLP（更新）
```

---

## 🔍 次のステップ（Frontier Template統合）

### 優先度1: Hero Sectionの改善
- [ ] Frontier TemplateのHero Sectionデザインパターンを適用
- [ ] Two Young Menストーリーの視覚化を強化
- [ ] NanoBanana画像統合

### 優先度2: セクション構造の最適化
- [ ] Problem & Solution SectionのCVR最適化
- [ ] Pricing Sectionのデザイン改善
- [ ] Social Proof Sectionの強化

### 優先度3: コンポーネントの統一
- [ ] Frontier Templateのコンポーネント構造を参考
- [ ] 既存の統合機能（Whop、HeyGen、Notion）を維持
- [ ] アクセシビリティの向上

---

## 📝 注意事項

1. **既存統合の維持**
   - Whop Checkout統合は維持する必要がある
   - HeyGen VSL統合は維持する必要がある
   - Notion Database連携は維持する必要がある

2. **多言語対応**
   - 6市場対応（EN, AR, KO, JA, ES, PT-BR）は継続
   - CVRデータの多言語対応は維持

3. **CVRデータの使用**
   - `lib/cvr-data.ts`からのデータ取得は継続
   - VSLスクリプトデータは維持

---

## 🔗 関連ファイル

- `docs/LP_FRONTIER_TEMPLATE_UPGRADE_INFO.md` - Frontier Template統合情報
- `cryptosignal-ai/docs/SSOT_TRAP_DEFENSE_BTC.md` - SSOTドキュメント
- `hadayalab-website-dev/cryptotradeacademy-lp-dev/README.md` - LPプロジェクトREADME

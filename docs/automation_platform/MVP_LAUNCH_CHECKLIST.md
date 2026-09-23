# MVPローンチ チェックリスト

## ローンチ予定日
明日（2025年1月）

## 目的
Trap Defence BTCのMVPを正式にローンチし、アフィリエイター募集展開を開始する

---

## ✅ 完了済み項目

### MCPサーバー統合
- ✅ Gemini MCP: マルチモーダルAI（Veo、NanoBanana、思考機能、CIO機能）
- ✅ OpenAI MCP: CTO/CPO機能（コードレビュー、アーキテクチャ設計、製品戦略）
- ✅ XAI MCP: CFO/CSO機能（財務分析、市場調査、戦略立案）
- ✅ Whop MCP: プロダクト管理・カスタマー対応（最適化済み）
- ✅ Telegram MCP: マルチ言語配信
- ✅ Document Speed Loader: 高速ドキュメント検索

### メッセージUI
- ✅ NanoBanana/Veoコンテンツ挿入仕様の実装
- ✅ エラーハンドリングの改善
- ✅ メッセージ送信フローの最適化

---

## 🚧 未実装項目（優先順位順）

### 🔴 最優先（MVPローンチに必須）

#### 1. LP: Whopアフィリエイトリンク生成の実装
**ファイル**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/lib/whop.ts`

**現状**: 
- `generateAffiliateLink`がモック実装（TODOコメントあり）
- Whop MCPサーバーの実装は完了している

**実装内容**:
- ✅ Whop APIを直接呼び出す実装に変更
- ✅ アフィリエイト存在確認
- ✅ プロダクト情報取得
- ✅ アフィリエイトリンク生成（プラン指定/プロダクトページ）

**ステータス**: ✅ 実装完了

---

#### 2. LP: SSOTの内容をLPセクションに反映
**ファイル**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/`

**実装内容**:
- [ ] `HeroSection.tsx` - SSOTのheadline + HeyGen VSL
- [ ] `ProblemSection.tsx` - 5つの課題を表示
- [ ] `SolutionSection.tsx` - 3つのUSPを表示
- [ ] `FeaturesSection.tsx` - 5つの特徴を表示
- [ ] `BenefitsSection.tsx` - 10個の感情的ベネフィットを表示
- [ ] `PricingSection.tsx` - Whop Embed統合（既存を確認）
- [ ] `SocialProofSection.tsx` - 証拠・レビュー
- [ ] `CTASection.tsx` - 最終CTA

**参考**: `cryptosignal-ai/docs/SSOT_TRAP_DEFENSE_BTC.md` (3310-3336行目)

**ステータス**: ⏳ 未実装

---

#### 3. LP: NanoBanana生成コンテンツ挿入
**ファイル**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/components/lp/`

**実装内容**:
- [ ] `NanoBananaImage.tsx`コンポーネント作成
- [ ] `HeroSection.tsx`にヒーロー画像として挿入
- [ ] `FeaturesSection.tsx`に各特徴の説明画像として挿入
- [ ] `BenefitsSection.tsx`にベネフィットの視覚化として挿入

**プロンプト例** (SSOT参照):
- Hero: 'Bitcoin trap defense visualization, professional trading academy, modern UI, blue ocean strategy'
- Feature1: 'High-resolution trap detection engine, CryptoQuant data visualization, professional design'

**ステータス**: ⏳ 未実装

---

#### 4. アフィリエイト: Whop MCP経由のアフィリエイトリンク生成統合
**ファイル**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/lib/whop.ts`

**実装内容**:
- ✅ Whop API直接呼び出し実装完了
- [ ] MCPサーバー経由の呼び出しオプション追加（オプション）
- [ ] エラーハンドリングの強化
- [ ] キャッシュ機能の追加（オプション）

**ステータス**: ✅ 基本実装完了（MCP統合はオプション）

---

#### 5. アフィリエイト: アフィリエイター募集自動化フロー
**ファイル**: `scripts/whop-affiliate-monitor-mcp-server.js` (既存)

**実装内容**:
- [ ] 日次バッチ検索（Vercel Cron）
- [ ] CVRランキング更新
- [ ] 優先順位別DM送信（Telegram MCP統合）
- [ ] 進捗トラッキング（Notion Database）

**ステータス**: ⏳ 未実装（既存スクリプトあり）

---

### 🟡 次優先（MVP後1週間以内）

#### 6. LP: MCP最適化APIの実装
**ファイル**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/app/api/mcp/optimization/route.ts`

**現状**: TODOコメントのみ

**実装内容**:
- [ ] MCP経由でデータを取得する実装
- [ ] キャッシュ機能の追加

**ステータス**: ⏳ 未実装

---

#### 7. Trap Defense Alt Bundle（限定予約販売）
**ファイル**: `cryptosignal-ai/`

**実装内容**:
- [ ] Alt Bundle機能の実装（BTC版の焼き増し）
- [ ] 限定予約販売ステータスの設定

**ステータス**: ⏳ 未実装（SSOTに記載あり）

---

### 🟢 低優先度（MVP後）

#### 8. バックテスト改善
**ファイル**: `cryptosignal-ai/logic/core/deepMetrics.js`

**実装内容**:
- [ ] `calculateTrapScore`関数の完全実装
- [ ] Binanceデータ補正の統合

**ステータス**: ⏳ 未実装

---

## 📋 実装優先順位（MVPローンチ用）

### Phase 1: 必須項目（今日中）
1. ✅ **LP: Whopアフィリエイトリンク生成の実装** - 完了
2. ⏳ **LP: SSOTの内容をLPセクションに反映** - 最優先
3. ⏳ **LP: NanoBanana生成コンテンツ挿入** - 次優先

### Phase 2: アフィリエイト自動化（ローンチ後1週間以内）
4. ⏳ **アフィリエイター募集自動化フロー** - ローンチ後すぐに必要

### Phase 3: 最適化（ローンチ後）
5. ⏳ **MCP最適化APIの実装**
6. ⏳ **Trap Defense Alt Bundle**

---

## 🎯 次のアクション

1. **LP: SSOTの内容反映**を最優先で実装
2. **LP: NanoBanana生成コンテンツ挿入**を実装
3. **アフィリエイター募集自動化フロー**の基本実装
4. **最終動作確認**とデプロイ準備

---

## 📝 参考ドキュメント

- SSOT: `cryptosignal-ai/docs/SSOT_TRAP_DEFENSE_BTC.md`
- 実装計画: `cryptosignal-ai/docs/IMPLEMENTATION_PLAN_MCP_FOCUSED.md`
- Whop MCP: `scripts/whop-mcp-server.js`

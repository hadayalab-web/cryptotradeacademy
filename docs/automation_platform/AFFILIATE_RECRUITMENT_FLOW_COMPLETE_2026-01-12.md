# アフィリエイターリクルートフロー - 完全整理版（2026-01-12）

**作成日**: 2026-01-12  
**目的**: 最近2～3日で決めて断片化している情報を正確に整理  
**状態**: ✅ **情報整理完了**

---

## 🎯 フローの全体像

### 完全なリクルートフロー

```
Phase 1: 候補発見・分析（Tri-Force Architecture）
  ↓
Phase 2: リクルートDM送信・LP遷移
  ↓
Phase 3: アフィリエイト登録・リンク発行
  ↓
Phase 4: コンテンツ提供（Gemini生成）⭐ NEW
  ↓
Phase 5: 自動販売・トラッキング
```

---

## 📊 Phase 1: 候補発見・分析（Tri-Force Architecture）

### 🏗️ Tri-Force Architecture（2026-01-10決定）

**3つのAIモデルの役割分担**:

| AIモデル | 役割 (Role) | 担当タスク | キーワード |
|---------|------------|-----------|-----------|
| **1. Grok** | **Hunter (狩人)** | • リアルタイムX検索<br>• トレンド検知<br>• クエリ自動生成<br>• 初期分析 | **Real-time**<br>**Speed** |
| **2. Gemini** | **Analyst (分析官)** | • **マルチモーダル分析** (サイト/動画の見た目)<br>• **1次スクリーニング** (Flashで安価に大量処理)<br>• ロングコンテキストによる重複チェック<br>• トレンド相関分析 | **Vision**<br>**Bulk & Cost** |
| **3. GPT** | **Closer (交渉人)** | • 戦略的インサイトの最終決定<br>• **超高品質DMの作成** (心理的アプローチ)<br>• リスクの最終評価<br>• 将来予測 | **Reasoning**<br>**Quality** |

### 🔄 統合ワークフロー（Tri-Force）

```
Phase 1: Grok (Hunter) - リアルタイム検索
  1. Grokクエリ自動生成
  2. Grokエンハンスト候補検索（バッチ処理）
  3. Grok初期分析

Phase 2: Gemini (Analyst) - マルチモーダル分析と1次スクリーニング
  4. Gemini 1次スクリーニング（コスト効率）
  5. Gemini重複・競合チェック（ロングコンテキスト）
  6. Gemini視覚的信頼性分析（マルチモーダル）
  7. Geminiトレンド相関分析（オプション）

Phase 3: GPT (Closer) - 深い推論と高品質DM
  8. GPTでGrok分析結果を強化（絞り込まれた候補のみ）
  9. GPT戦略的インサイト生成
  10. GPT高品質DM生成（高優先度候補のみ）
```

### 📁 実装ファイル

- **Tri-Force統合ワークフロー**: `workflows/affiliate-recruitment/src/workflows/tri-force-synergy.ts`
- **Grokエンハンスト**: `workflows/affiliate-recruitment/src/utils/grok-enhanced.ts`
- **Geminiエンハンスト**: `workflows/affiliate-recruitment/src/utils/gemini-enhanced.ts`
- **GPTエンハンスト**: `workflows/affiliate-recruitment/src/utils/gpt-enhanced.ts`

### 📊 期待される効果

- **検索精度**: +50-70%（Grok + Gemini視覚分析）
- **スクリーニング効率**: +80%（Gemini 1次スクリーニング）
- **コスト削減**: -40-60%（Gemini Flash活用）
- **DM品質**: +50-70%（GPT高品質DM）

---

## 📧 Phase 2: リクルートDM送信・LP遷移

### 🔄 フロー

```
1. データベースから候補を取得（AffiliateCandidateテーブル）
   ↓
2. GPTでパーソナライズされたDM生成
   ↓
3. Telegram DM送信（6言語対応）
   ↓
4. LPリンクを含むDMテンプレート
   ↓
5. 候補がLPリンクをクリック → LPに遷移
```

### 📁 実装ファイル

- **DM送信API**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-ja/app/api/workflows/affiliate-dm/route.ts`
- **データベース**: `database/prisma/schema.prisma` - `AffiliateCandidate`テーブル

### ✨ 機能

- ✅ データベースから候補を取得
- ✅ パーソナライズされたDM生成（GPT使用）
- ✅ Telegram DM送信
- ✅ LPリンクを含むDMテンプレート
- ✅ 実績データの自動組み込み（CMO提案）

---

## 🎯 Phase 3: アフィリエイト登録・リンク発行

### 🔄 フロー

```
1. アフィリエイターがLPでアフィリエイトプログラムに参加を決意
   ↓
2. LPからWhop APIを呼び出し（/api/affiliate-link）
   ↓
3. Whop APIでアフィリエイターを検索（全ページ検索）
   ↓
4. Whop APIでアフィリエイトリンクを生成
   ↓
5. データベースに保存（Affiliate, AffiliateLink, AffiliateCandidate）
   ↓
6. Telegram DMでアフィリエイトリンクを送信
```

### 📁 実装ファイル

- **アフィリエイトリンク生成API**: `app/api/affiliate-link/route.ts`
- **Whopダッシュボード自動化**: `scripts/whop-dashboard-automation.ts`（事前登録用）

### ⚠️ 注意事項

- **Whop API v2の制約**: アフィリエイター作成がAPI経由でできないため、事前にWhopダッシュボード自動化で登録するか、手動登録が必要

---

## 🎨 Phase 4: コンテンツ提供（Gemini生成）⭐ NEW

### 🎯 意図

**アフィリエイターにGeminiでコンテンツを生成して提供する**

アフィリエイターが自分でプロモーションする際に使えるコンテンツをGeminiで生成して提供することで、より効果的なプロモーションを可能にする。

### 📋 提供コンテンツの種類

#### 1. Content Template Injection（コンテンツ注入）⭐ 重要

**問題**: Affiliateはコンテンツ作成が苦手 → Link送るだけ → 成果ゼロ

**解決策**: 即使用可能なContent Template完全提供

**提供Template（6種類）**:

1. **X(Twitter) Thread Template（7 tweets）**
   - Topic: "How I Avoided a $16K Loss Using This Tool"
   - Structure: Problem → Agitation → Solution → CTA
   - 所要時間: 5分（Copy & Paste）

2. **Reddit Comment Template（300語）**
   - Topic: "Why 83% of Traders Lose Money (And How to Stop)"
   - Structure: Empathy → Data → Solution → Soft CTA
   - 所要時間: 3分

3. **YouTube Description Template（500語）**
   - Topic: "Crypto Trap Detection: Complete Guide 2025"
   - Structure: Hook → Value → Features → Affiliate Link
   - 所要時間: 2分

4. **Medium Article Template（1500語）**
   - Topic: "The Hidden Cost of FOMO: A $16K Lesson"
   - Structure: Story → Analysis → Solution → Deep Dive
   - 所要時間: 15分（穴埋め式）

5. **Instagram Caption Template（150語）**
   - Topic: "3 Signs You're About to Fall for a Trap"
   - Structure: List → Visual → CTA
   - 所要時間: 2分

6. **Email Newsletter Template（400語）**
   - Topic: "Weekly Market Trap Alert"
   - Structure: Intro → This Week's Trap → Academy Link
   - 所要時間: 5分

**実装方法**:
- Google Docs共有（編集可能）
- {Name}/{Link}/{Stats}穴埋め式
- Whop Partner Portal内リンク
- Weekly新Template追加（継続Doping）

**効果予測**:
- Content投稿率: 20% → 80%（+60pt）
- Referral数: 10/月 → 25/月（+150%）
- Bottom 50% → Top 30%達成

**参考**: `cryptosignal-ai/docs/CryptoTrade Academy - Zero-Budget Affiliate DRM Strategy v1.1 + APDS v1.0.md`（Doping #1）

---

#### 2. Market Intelligence Injection（市場理解注入）⭐ 重要

**問題**: Affiliateは市場理解が浅い → Generic Pitch → 刺さらない → 成果ゼロ

**解決策**: Weekly Market Intelligence Brief提供

**提供Content（毎週月曜配信）**:
- This Week's Top Trap（今週の注目トラップ）
- Market Trend Analysis（市場トレンド分析）
- Content Angle Suggestions（コンテンツ角度の提案）

**参考**: `cryptosignal-ai/docs/CryptoTrade Academy - Zero-Budget Affiliate DRM Strategy v1.1 + APDS v1.0.md`（Doping #2）

---

#### 3. LP用コンテンツ（Gemini生成）

**生成内容**:
- ヘッドライン
- サブヘッドライン
- タグライン
- セクション別コピー
- CTAコピー

**タスク1: ユーザー向けLP用のコンテンツ（Two Young Menストーリー）**
- Hero Section
- Pain Points（5つの課題）
- USPs（3つの独自の価値提案）
- Features（5つの特徴）
- Emotional Benefits（10個の感情的ベネフィット）
- CTA Copy

**タスク2: アフィリエイター向けLP用のコンテンツ（「隠された敵」×「島への招待」ハイブリッド）**
- Hero Section（「隠された敵」型）
- Affiliate Comparison（アフィリエイター対比）
- Hidden Enemy Section
- Island Invitation Section
- Reward Structure Section
- CTA Copy

**市場別対応**: EN, AR, KO, JA, ES, PT-BR

**参考**: `scripts/gemini-content-order.md` - Geminiコンテンツオーダー

---

#### 4. 動画スクリプト（VSL用）

**生成内容**:
- VSLスクリプト（Video Sales Letter）
- タイムスタンプ付きスクリプト（.srt形式）

**タスク3: VSL用のコンテンツ（Video Sales Letterスクリプト）**
- Opening（オープニング）- 30-60秒
- Problem（問題提起）- 30-60秒
- Solution（解決策）- 60-90秒
- Proof（証拠）- 30-60秒
- CTA（行動喚起）- 30秒

**参考**: `data/vsl-heygen/` - VSLスクリプトファイル
**参考**: `scripts/gemini-content-order.md` - タスク3

---

#### 5. メールコンテンツ

**生成内容**:
- リクルートメール
- フォローアップメール
- ニュースレター

### 🔧 実装方法（予定）

#### Geminiコンテンツ生成API

```typescript
// app/api/affiliate-content/generate/route.ts（予定）

export async function generateAffiliateContent(options: {
  affiliateId: string;
  contentType: 'sns' | 'lp' | 'vsl' | 'email';
  marketCode: MarketCode;
  platform?: 'twitter' | 'telegram' | 'instagram' | 'linkedin';
  tone?: 'professional' | 'casual' | 'storytelling';
}): Promise<{
  content: string;
  metadata: {
    generatedAt: string;
    contentType: string;
    marketCode: string;
  };
}> {
  // Gemini APIでコンテンツ生成
  // アフィリエイターのプロフィール情報を考慮
  // 市場別・プラットフォーム別に最適化
}
```

#### コンテンツ提供ダッシュボード（予定）

アフィリエイターがログインして、必要なコンテンツをリクエストできるダッシュボード

**機能**:
- コンテンツタイプ選択（SNS投稿、LP用、VSL用、メール用）
- 市場選択（EN, AR, KO, JA, ES, PT-BR）
- プラットフォーム選択（Twitter, Telegram, Instagram等）
- トーン選択（Professional, Casual, Storytelling）
- 生成されたコンテンツのダウンロード
- 過去の生成履歴

### 📊 Geminiの強みを活かした機能

#### 1. マルチモーダル分析
- アフィリエイターの既存コンテンツ（SNS投稿、LP等）を分析
- コンテンツスタイルを学習
- アフィリエイターのスタイルに合わせたコンテンツ生成

#### 2. ロングコンテキスト活用
- プロダクト情報、LPコンテンツ、VSLスクリプトを一度に読み込む
- 一貫性のあるコンテンツ生成

#### 3. コスト効率
- Gemini Flashで大量のコンテンツを安価に生成
- 市場別・プラットフォーム別のバッチ生成

### 📁 関連ファイル

- **Geminiコンテンツオーダー**: `scripts/gemini-content-order.md`
- **VSLスクリプト**: `data/vsl-heygen/`
- **LPコンテンツ**: `data/lp-content-gemini-order.md`
- **Content Template戦略**: `cryptosignal-ai/docs/CryptoTrade Academy - Zero-Budget Affiliate DRM Strategy v1.1 + APDS v1.0.md`

### ⏳ 実装ステータス

- ⏳ **コンテンツ生成API**: 未実装（予定）
- ⏳ **コンテンツ提供ダッシュボード**: 未実装（予定）
- ✅ **Geminiコンテンツオーダー**: 実装済み（`scripts/gemini-content-order.md`）
- ✅ **VSLスクリプト**: 実装済み（`data/vsl-heygen/`）

---

## 🚀 Phase 5: 自動販売・トラッキング

### 🔄 フロー

```
1. アフィリエイターがアフィリエイトリンクを共有
   ↓
2. ユーザーがアフィリエイトリンク経由でLPにアクセス
   ↓
3. ユーザーがWhopチェックアウトでコンバージョン
   ↓
4. Whop Webhookでコンバージョンをカウント
   ↓
5. コミッションの自動計算・支払い処理
```

### ✨ Whopの自動機能

- ✅ **アフィリエイトリンクの自動トラッキング**: Whopが自動的にクリック・コンバージョンを追跡
- ✅ **コミッションの自動計算**: Whopが自動的にコミッションを計算
- ✅ **支払いの自動処理**: Whopが自動的に支払いを処理

### 📁 データベース補完

- ✅ `AffiliateLink`テーブル - アフィリエイトリンクの管理
- ✅ `AffiliateCommission`テーブル - コミッション追跡
- ✅ `AffiliatePerformance`テーブル - パフォーマンス分析

---

## 📋 最近の決定事項（2026-01-09 ～ 2026-01-12）

### 1. Tri-Force Architecture（2026-01-10）

**決定**: Grok × GPT × Gemini の3者統合戦略を採用

**理由**:
- Grokのリアルタイム検索能力
- Geminiのマルチモーダル分析とコスト効率
- GPTの深い推論と高品質DM生成

**実装**: `workflows/affiliate-recruitment/src/workflows/tri-force-synergy.ts`

---

### 2. 安全ロック設計（2026-01-09）

**決定**: Grokで大量ストック → GPTで分析

**理由**:
- データの保護（GrokでストックしたデータはCSVに保存）
- エラーの分離（GrokのエラーとGPTのエラーが分離）
- コスト最適化（Grokで大量ストック、GPTで必要な分だけ分析）

**実装**: `docs/AFFILIATE_WORKFLOW_UPDATE_2026-01-09.md`

---

### 3. Geminiコンテンツ生成（2026-01-12）⭐ NEW

**決定**: アフィリエイターにGeminiでコンテンツを生成して提供

**理由**:
- アフィリエイターが自分でコンテンツを作成する手間を省く
- より効果的なプロモーションを可能にする
- 市場別・プラットフォーム別に最適化されたコンテンツを提供

**実装**: ⏳ 未実装（予定）

**重要な戦略**:
- **Content Template Injection**: 6種類のテンプレート（X Thread、Reddit Comment、YouTube Description、Medium Article、Instagram Caption、Email Newsletter）を提供
- **Market Intelligence Injection**: Weekly Market Intelligence Briefを毎週月曜配信

**参考**: `cryptosignal-ai/docs/CryptoTrade Academy - Zero-Budget Affiliate DRM Strategy v1.1 + APDS v1.0.md`

---

### 4. Whop機能補完インフラの再編成（2026-01-11）

**決定**: `affiliate-recruitment-workflow`をWhop機能を補完するインフラとして再編成

**原則**: Whop APIで制御できないことは外部機能を配置

**再編成後の構造**:
- `whop-complement/`: Whop APIでできない機能（候補検索、分析、DM送信、データベース化）
- `whop-integration/`: Whop APIを活用（アフィリエイトリンク生成、同期）
- `workflows/daily-recruitment.ts`: 毎日50人×6市場のリクルート実行

**実装**: ⏳ 未実装（予定）

**参考**: `docs/AFFILIATE_RECRUITMENT_WORKFLOW_REORGANIZATION.md`

---

## 🔧 実装ファイル一覧

### ワークフロー

- `workflows/affiliate-recruitment/src/workflows/tri-force-synergy.ts` - Tri-Force統合ワークフロー
- `workflows/affiliate-recruitment/src/workflows/integrated.ts` - 統合ワークフロー
- `workflows/affiliate-recruitment/src/workflows/deployment.ts` - 展開ワークフロー

### ユーティリティ

- `workflows/affiliate-recruitment/src/utils/grok-enhanced.ts` - Grokエンハンスト
- `workflows/affiliate-recruitment/src/utils/gemini-enhanced.ts` - Geminiエンハンスト
- `workflows/affiliate-recruitment/src/utils/gpt-enhanced.ts` - GPTエンハンスト

### APIエンドポイント

- `app/api/affiliate-link/route.ts` - アフィリエイトリンク生成
- `hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-ja/app/api/workflows/affiliate-dm/route.ts` - DM送信

### ドキュメント

- `workflows/affiliate-recruitment/README_TRI_FORCE.md` - Tri-Force Architecture
- `workflows/affiliate-recruitment/GEMINI_REVIEW.md` - Geminiレビュー
- `docs/AFFILIATE_WORKFLOW_UPDATE_2026-01-09.md` - 安全ロック設計
- `docs/AFFILIATE_FLOW_IMPLEMENTATION_STATUS.md` - 実装状況

---

## 🎯 次のステップ

### 優先度: 高

1. ⏳ **Content Template Injectionの実装**
   - 6種類のテンプレート（X Thread、Reddit Comment、YouTube Description、Medium Article、Instagram Caption、Email Newsletter）の作成
   - Google Docs共有機能
   - Whop Partner Portal内リンク統合
   - Weekly新Template追加機能

2. ⏳ **Market Intelligence Injectionの実装**
   - Weekly Market Intelligence Briefの自動生成
   - 毎週月曜配信機能
   - 市場トレンド分析の自動化

3. ⏳ **Geminiコンテンツ生成APIの実装**
   - `app/api/affiliate-content/generate/route.ts`の作成
   - Gemini API統合
   - 市場別・プラットフォーム別最適化

4. ⏳ **コンテンツ提供ダッシュボードの実装**
   - アフィリエイター向けダッシュボード
   - コンテンツリクエスト機能
   - 生成履歴管理

### 優先度: 中

5. ⏳ **Whop機能補完インフラの再編成**
   - `src/whop-complement/`ディレクトリの作成
   - `src/whop-integration/`ディレクトリの作成
   - `workflows/daily-recruitment.ts`の実装

6. ⏳ **Tri-Force統合ワークフローのテスト**
   - ローカルテスト
   - 本番環境でのテスト

7. ⏳ **コンテンツ生成の品質向上**
   - アフィリエイターの既存コンテンツ分析
   - スタイル学習機能

---

## 📝 注意事項

### 1. Whop API v2の制約

- アフィリエイター作成がAPI経由でできない
- 事前にWhopダッシュボード自動化で登録するか、手動登録が必要

### 2. Geminiコンテンツ生成の品質

- アフィリエイターの既存コンテンツを分析してスタイルを学習
- 市場別・プラットフォーム別に最適化
- プロダクト情報との一貫性を保つ

### 3. コスト管理

- Gemini Flashで大量のコンテンツを安価に生成
- 市場別・プラットフォーム別のバッチ生成で効率化

---

**最終更新**: 2026-01-12  
**作成者**: COO（Cursor/Composer）  
**状態**: ✅ 情報整理完了

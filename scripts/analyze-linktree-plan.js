// scripts/analyze-linktree-plan.js
// Linktreeプラン選択の分析

const OpenAI = require('openai');

const XAI_API_KEY = process.env.XAI_API_KEY || 'xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii';
const XAI_BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is not set');
  process.exit(1);
}

const grokClient = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: XAI_BASE_URL,
});

/**
 * Grok CFOでLinktreeプラン選択を分析
 */
async function analyzeLinktreePlan() {
  const prompt = `あなたはTrap Defence BTCのCFO（Chief Financial Officer）として、Linktreeプランの選択を分析してください。

## 📊 Trap Defence BTCの現状

### ビジネスモデル
- **サービス**: Trap Defence BTC - 防御優先の暗号通貨トレーディングツール
- **収益モデル**: Whop経由のサブスクリプション（月額$69、3ヶ月$165、年間$588）
- **ターゲット**: グローバル（6言語対応: EN, ES, PT-BR, AR, KO, JA）
- **主要チャネル**: X（Twitter）、Telegram Bot、YouTube（VSL1/VSL2）

### Linktreeの用途
- **XプロフィールBio**: 160文字制限内でLinktreeリンクを配置
- **誘導先**: 
  1. Telegram Bot（メイン）: https://t.me/TrapDefenceBot
  2. Whop（購入ページ）: https://whop.com/aio-media-llc
  3. YouTube（VSL1）: https://youtu.be/OqvqngJOiXc
  4. YouTube（VSL2）: https://youtu.be/fXgVsKhqDjI
  5. X（Twitter）: https://x.com/trapdefence
  6. Discord（将来的に）: [Discordサーバーリンク]
  7. ウェブサイト（将来的に）: [ウェブサイトURL]

### 現在の状況
- Xプロフィール最適化を実施中
- 認証済みアカウント（青いチェックマーク）
- フォロワー数: 0（新規アカウント）
- 月間収益目標: Xアルゴリズム最適化で$1.8M（1週間シミュレーション）

## 💰 Linktreeプラン詳細

### 1. Free Plan（無料）
- **価格**: $0/月（永久無料）
- **機能**: 
  - 基本的なLinktree + モネタイゼーションツール
  - 無制限リンク、クリーンデザイン
  - デジタル製品・コース販売、ブランドオファーで収益化可能

### 2. Starter Plan
- **価格**: $6/月（年払い）または$8/月（月払い）
- **機能**: 
  - Freeの全機能 +
  - パーソナライズドLinktree（無制限リンク、複数デザインスタイル）
  - 低い売上手数料（9%）

### 3. Pro Plan（推奨）
- **価格**: $12/月（年払い）または$15/月（月払い）
- **機能**: 
  - Starterの全機能 +
  - **Link in Bio**: Linktreeロゴ削除（ブランド前面化）、カスタムデザイン・レイアウト
  - **成長ツール**: SNSスケジューリング（AI支援）、Link短縮（カスタム短縮リンク+UTM自動追加）
  - **Audience CRM**: Instagram DM自動化、メール連携（Mailchimp、Google Sheets、Kit、Klaviyo）
  - 売上手数料（9%）

### 4. Premium Plan
- **価格**: $30/月（年払い）または$35/月（月払い）
- **機能**: 
  - Proの全機能 +
  - **Link in Bio**: 包括的分析（全期間、常時利用可能）
  - **無制限成長・CRM**: 無制限SNS投稿（3ブランド）、無制限Instagram DM
  - **収益化**: 売上手数料0%（全額が銀行口座へ）、Linktreeアフィリエイトショップ
  - 優先サポート（コンシェルジュオンボーディング）

### 5. Agency/Enterprise
- **価格**: カスタム
- **機能**: 大規模チーム向けカスタムプラン

## 🎯 分析依頼事項

以下の視点から、Trap Defence BTCに最適なLinktreeプランを分析してください：

### 1. エグゼクティブサマリー（300-400字）
Trap Defence BTCの用途と目標を考慮した、最適なLinktreeプランの推奨と理由を要約

### 2. 各プランの評価
- **Free Plan**: 初期段階での適性、制限事項、アップグレードの必要性
- **Starter Plan**: コスト対効果、Freeとの差別化要素
- **Pro Plan**: ブランド強化、成長ツールの価値、ROI
- **Premium Plan**: 大規模運用時の価値、コスト対効果

### 3. 用途別の必要機能分析
- **Xプロフィール誘導**: どのプランで十分か
- **ブランド一貫性**: Linktreeロゴ削除の重要性
- **モネタイゼーション**: Whop経由販売での売上手数料の影響
- **成長ツール**: SNSスケジューリング、Link短縮の必要性
- **CRM機能**: Instagram DM自動化、メール連携の必要性

### 4. コスト分析
- **初期コスト**: 各プランの月額・年額コスト
- **ROI計算**: プランアップグレードによる収益増加予測
- **コスト回収期間**: アップグレードコストの回収期間

### 5. 段階的アプローチ
- **Phase 1（初期）**: どのプランから始めるべきか
- **Phase 2（成長期）**: いつアップグレードすべきか（KPI基準）
- **Phase 3（成熟期）**: Premiumへの移行タイミング

### 6. リスク分析
- Free Planの制限による機会損失
- 過剰投資（Premium Plan）のリスク
- プラン変更の柔軟性

### 7. 推奨プランと理由
- **即座に選択すべきプラン**: 具体的なプラン名と理由（3-5項目）
- **期待される効果**: プラン選択による具体的な効果
- **実装優先度**: 即座に実装すべきか、テスト後にアップグレードか

### 8. 結論と次のアクション
- 総合的な結論
- 即座に実行すべき具体的なアクション（3-5項目）
- モニタリングすべきKPI

日本語で回答してください。`;

  try {
    console.log('🔄 Grok CFO（grok-4-1-fast-reasoning）でLinktreeプラン選択分析を実行中...');
    console.log('📊 Trap Defence BTCの用途と目標を考慮した最適プランを分析...\n');

    const completion = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'You are a CFO (Chief Financial Officer) for Trap Defence BTC, specializing in cost-benefit analysis, ROI calculations, and strategic financial planning for marketing tools and platforms.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 8000
    });

    const analysis = completion.choices[0]?.message?.content || '';
    const usage = completion.usage || {};

    console.log('✅ 分析完了\n');
    console.log('='.repeat(80));
    console.log('📊 Linktreeプラン選択分析結果');
    console.log('='.repeat(80));
    console.log(analysis);
    console.log('='.repeat(80));
    console.log(`\n📈 Token使用量: ${usage.total_tokens || 0} tokens`);
    console.log(`   - Prompt: ${usage.prompt_tokens || 0} tokens`);
    console.log(`   - Completion: ${usage.completion_tokens || 0} tokens`);

    // 結果をファイルに保存
    const fs = require('fs');
    const path = require('path');
    const outputDir = path.join(__dirname, '../docs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const outputFile = path.join(outputDir, `LINKTREE_PLAN_ANALYSIS_${timestamp}.md`);

    const output = `# Linktreeプラン選択分析結果

生成日時: ${new Date().toISOString()}

## 分析対象
Trap Defence BTCに最適なLinktreeプランの選択

## Linktreeプラン詳細

### Free Plan（無料）
- 価格: $0/月（永久無料）
- 機能: 基本的なLinktree + モネタイゼーションツール、無制限リンク

### Starter Plan
- 価格: $6/月（年払い）または$8/月（月払い）
- 機能: Free + パーソナライズドLinktree、売上手数料9%

### Pro Plan（推奨）
- 価格: $12/月（年払い）または$15/月（月払い）
- 機能: Starter + Linktreeロゴ削除、カスタムデザイン、SNSスケジューリング、Link短縮、Instagram DM自動化、メール連携

### Premium Plan
- 価格: $30/月（年払い）または$35/月（月払い）
- 機能: Pro + 包括的分析、無制限SNS投稿、無制限Instagram DM、売上手数料0%

## 分析結果

${analysis}

## Token使用量
- 合計: ${usage.total_tokens || 0} tokens
- Prompt: ${usage.prompt_tokens || 0} tokens
- Completion: ${usage.completion_tokens || 0} tokens
`;

    fs.writeFileSync(outputFile, output, 'utf8');
    console.log(`\n💾 分析結果を保存しました: ${outputFile}`);

    return {
      analysis,
      usage
    };
  } catch (error) {
    console.error('❌ Grok API呼び出しエラー:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// 実行
if (require.main === module) {
  analyzeLinktreePlan()
    .then(() => {
      console.log('\n✅ 分析完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { analyzeLinktreePlan };

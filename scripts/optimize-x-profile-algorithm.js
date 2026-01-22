// scripts/optimize-x-profile-algorithm.js
// Xプロフィールのアルゴリズム最適化分析

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
 * 現在のプロフィール情報
 */
const CURRENT_PROFILE = {
  name: 'AIO Media LLC CEO',
  handle: '@trapdefence',
  bio: 'Defense-First Trading by AIO Media. Powered by CryptoQuant & AI. The 1st "Anti-Trap" protocol for all assets. Stop being liquidity.',
  bannerImage: {
    description: 'カスタマイズされたバナー画像。左側: 世界地図上に光る線とビットコインシンボル、「+Q CryptoQuant」「BITCOIN NETWORK FLOWS」のテキスト。右側: ドクターのような衣装を着たマリオに似たキャラクター（「DR. GROK」）、「FEAR & GREED INDEX」「SENTIMENT」のグラフ。',
    keywords: ['CryptoQuant', 'BITCOIN NETWORK FLOWS', 'DR. GROK', 'FEAR & GREED INDEX', 'SENTIMENT']
  },
  profileImage: {
    description: '茶色い髪と眼鏡をかけた人物のイラスト。ビジネスや専門家としての信頼性を表現。'
  },
  location: null, // 現在設定されていない可能性
  website: null, // 現在設定されていない可能性
  pinnedTweet: null, // 現在設定されていない可能性
};

/**
 * Grok CMO+アルゴリズム専門家でプロフィール最適化分析
 */
async function optimizeXProfileWithGrok() {
  const prompt = `あなたはTrap Defence BTCのCMO（Chief Marketing Officer）兼Xアルゴリズム専門家として、Xプロフィールのアルゴリズム最適化を分析してください。

## 📊 現在のプロフィール情報

### 基本情報
- **名前**: ${CURRENT_PROFILE.name}
- **ハンドル**: ${CURRENT_PROFILE.handle}
- **自己紹介 (Bio)**: "${CURRENT_PROFILE.bio}"
- **バナー画像**: ${CURRENT_PROFILE.bannerImage.description}
- **プロフィール画像**: ${CURRENT_PROFILE.profileImage.description}
- **所在地**: ${CURRENT_PROFILE.location || '未設定'}
- **ウェブサイト**: ${CURRENT_PROFILE.website || '未設定'}
- **固定ツイート**: ${CURRENT_PROFILE.pinnedTweet || '未設定'}

## 🎯 Xアルゴリズムのプロフィール評価要素

### 1. 検索性（Discoverability）
- **キーワード最適化**: 名前、Bio、ハンドルに含まれるキーワードが検索で見つかりやすいか
- **関連性スコア**: ユーザーの興味・関心とプロフィールの関連性
- **トレンド連動**: 現在のトレンドキーワードとの関連性

### 2. エンゲージメント指標
- **プロフィールクリック率**: プロフィールがクリックされる頻度
- **フォロー率**: プロフィール閲覧からフォローへの転換率
- **プロフィール滞在時間**: プロフィールページでの滞在時間
- **リンククリック率**: Bio内のリンククリック率

### 3. 信頼性・権威性
- **認証バッジ**: 認証済みアカウントか（青いチェックマーク）
- **専門性の表現**: 専門知識・経験の明確な提示
- **社会的証明**: フォロワー数、エンゲージメント率

### 4. 視覚的要素
- **バナー画像**: 視覚的なインパクト、情報密度、ブランド一貫性
- **プロフィール画像**: 認識しやすさ、ブランドアイデンティティ
- **視覚的階層**: 重要な情報の視覚的強調

### 5. コンテンツ要素
- **Bioの長さ**: 160文字以内の最適化
- **CTA（Call To Action）**: 明確な行動喚起
- **キーワード密度**: 重要キーワードの適切な配置
- **感情的な訴求**: 感情に訴えるメッセージ

### 6. アルゴリズム評価基準
- **初期エンゲージメント**: プロフィール閲覧後の初期行動（フォロー、リンククリック等）
- **エンゲージメント率**: プロフィール閲覧に対するエンゲージメントの割合
- **時間経過**: プロフィールの持続的なエンゲージメント
- **クロスプラットフォーム連動**: 他のプラットフォーム（Telegram等）への誘導

## 📋 分析依頼事項

以下の視点から、Xプロフィールのアルゴリズム最適化を詳細に分析してください：

### 1. エグゼクティブサマリー（300-400字）
現在のプロフィールの強みと弱み、アルゴリズム最適化の重要性を要約

### 2. 現在のプロフィール分析
- **強み**: 現在のプロフィールの優れている点（3-5項目）
- **弱み**: 改善が必要な点（5-7項目）
- **機会**: 最適化により向上できる可能性（5-7項目）
- **脅威**: 競合やアルゴリズム変更によるリスク（3-5項目）

### 3. 名前の最適化
- 現在の名前「AIO Media LLC CEO」の評価
- アルゴリズムに最適化された名前案（3-5案）
- 検索性とブランド認知のバランス
- キーワード戦略

### 4. Bio（自己紹介）の最適化
- 現在のBioの評価（長さ、キーワード、CTA、感情的な訴求）
- アルゴリズム最適化版Bio案（3-5案、各160文字以内）
- キーワード密度と配置の最適化
- CTAの明確化と効果的な配置
- 感情的な訴求の強化

### 5. バナー画像の最適化
- 現在のバナー画像の評価（視覚的インパクト、情報密度、ブランド一貫性）
- アルゴリズム最適化版バナー画像の提案
- 視覚的階層の改善
- キーワードの視覚的表現
- モバイル最適化

### 6. プロフィール画像の最適化
- 現在のプロフィール画像の評価
- アルゴリズム最適化版プロフィール画像の提案
- ブランドアイデンティティの強化
- 認識しやすさの向上

### 7. 追加要素の最適化
- **所在地**: 設定すべきか、どのように設定すべきか
- **ウェブサイト**: 設定すべきか、どのURLを設定すべきか
- **固定ツイート**: どのようなツイートを固定すべきか
- **ピン留め戦略**: 固定ツイートの選定基準

### 8. キーワード戦略
- **主要キーワード**: プロフィールに含めるべき主要キーワード（10-15個）
- **トレンドキーワード**: 現在のトレンドに合わせたキーワード
- **ニッチキーワード**: 競合が少なく効果的なキーワード
- **言語別最適化**: 6言語（EN, ES, PT-BR, AR, KO, JA）でのキーワード戦略

### 9. CTA（Call To Action）戦略
- Bio内のCTA最適化
- リンク配置の最適化
- 行動喚起の明確化
- コンバージョン率向上のためのCTA改善

### 10. エンゲージメント最大化戦略
- プロフィールクリック率向上策
- フォロー率向上策
- リンククリック率向上策
- プロフィール滞在時間延長策

### 11. アルゴリズム評価基準への対応
- 初期エンゲージメント向上策
- エンゲージメント率向上策
- 持続的なエンゲージメント確保策
- クロスプラットフォーム連動強化策

### 12. 実装優先度
- **Phase 1（即座）**: 優先度の高い最適化（5-7項目）
- **Phase 2（1週間以内）**: 短期実装最適化（5-7項目）
- **Phase 3（1ヶ月以内）**: 中期実装最適化（3-5項目）

### 13. 期待される効果
- プロフィールクリック率の向上予測
- フォロー率の向上予測
- リンククリック率の向上予測
- コンバージョン率の向上予測

### 14. 結論と次のアクション
- 総合的な結論
- 即座に実行すべき具体的なアクション（5-7項目）
- 期待される効果の数値予測

日本語で回答してください。`;

  try {
    console.log('🔄 Grok CMO+アルゴリズム専門家（grok-4-1-fast-reasoning）でXプロフィール最適化分析を実行中...');
    console.log('📊 現在のプロフィール情報を分析対象として共有...\n');

    const completion = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'You are a CMO (Chief Marketing Officer) and X algorithm expert for Trap Defence BTC, specializing in optimizing X (Twitter) profiles for maximum discoverability, engagement, and conversion.'
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
    console.log('📊 Xプロフィールアルゴリズム最適化分析結果');
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
    const outputFile = path.join(outputDir, `X_PROFILE_ALGORITHM_OPTIMIZATION_${timestamp}.md`);

    const output = `# Xプロフィールアルゴリズム最適化分析結果

生成日時: ${new Date().toISOString()}

## 分析対象
Xプロフィールのアルゴリズム最適化

## 現在のプロフィール情報

### 基本情報
- **名前**: ${CURRENT_PROFILE.name}
- **ハンドル**: ${CURRENT_PROFILE.handle}
- **自己紹介 (Bio)**: "${CURRENT_PROFILE.bio}"
- **バナー画像**: ${CURRENT_PROFILE.bannerImage.description}
- **プロフィール画像**: ${CURRENT_PROFILE.profileImage.description}
- **所在地**: ${CURRENT_PROFILE.location || '未設定'}
- **ウェブサイト**: ${CURRENT_PROFILE.website || '未設定'}
- **固定ツイート**: ${CURRENT_PROFILE.pinnedTweet || '未設定'}

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
  optimizeXProfileWithGrok()
    .then(() => {
      console.log('\n✅ 分析完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { optimizeXProfileWithGrok, CURRENT_PROFILE };

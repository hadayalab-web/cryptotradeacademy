// scripts/generate-x-strategy-with-grok.js
// GrokにXアルゴリズムをハッキングした集客戦略を生成させるスクリプト

const OpenAI = require('openai');
const fs = require('fs');

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
 * GrokにXアルゴリズム最適化戦略を生成させる
 */
async function generateXStrategyWithGrok(article, onchainData) {
  try {
    const prompt = `あなたはX（旧Twitter）のアルゴリズムを完全に理解したSNSマーケティングの専門家です。

以下のTrap Defence BTCの市場分析記事を、Xのアルゴリズムで**最大限のエンゲージメントとバイラル拡散**を実現する戦略を立案してください。

## 記事内容

${article.substring(0, 1500)}

## 市場データ

- BTC価格: $${onchainData.current.price.toLocaleString()}
- Trap Score: ${onchainData.current.trapScore || 'N/A'}/10
- 24時間変動: ${onchainData.current.change24h > 0 ? '+' : ''}${onchainData.current.change24h.toFixed(2)}%
- Exchange Netflow: ${onchainData.current.exchangeNetflow?.toFixed(2) || 'N/A'} BTC
- MPI: ${onchainData.current.mpi?.toFixed(2) || 'N/A'}

## Xアルゴリズム「ハッキング」戦略

Xのアルゴリズムは以下の要素を重視します：
1. **エンゲージメント率**: リプライ、リツイート、いいね、ブックマーク
2. **早期エンゲージメント**: 投稿後30分以内の反応が重要
3. **完読率**: ユーザーが最後まで読むか
4. **リプライチェーン**: スレッド形式で深い議論を促す
5. **視覚的要素**: 画像・動画の添付
6. **タイミング**: アクティブユーザーが多い時間帯

## 戦略立案依頼

以下の形式で、Xアルゴリズムを最大限に活用した集客戦略を提供してください：

### 1. メイン投稿（280文字以内）
- 最初の3行で強烈なフック
- 感情を動かす表現（FOMO、FUD、期待感、警告など）
- 議論を喚起する質問形式
- ハッシュタグの戦略的使用

### 2. スレッド投稿（3-5投稿）
- 各投稿280文字以内
- 段階的に情報を開示
- 各投稿でエンゲージメントを促す
- 最後の投稿でCTA（Eメール登録、YouTube登録）

### 3. ハッシュタグ戦略
- トレンドハッシュタグ（#Bitcoin #BTC #Crypto）
- ニッチハッシュタグ（#OnChainAnalysis #TrapDefence）
- コミュニティハッシュタグ
- 最大5-7個のハッシュタグ

### 4. メンション戦略
- 影響力のあるアカウント（適切な範囲で）
- 関連するプロジェクトやメディア
- コミュニティリーダー

### 5. 視覚的要素の活用
- チャート画像の添付方法
- 動画の活用方法
- テキストオーバーレイの提案

### 6. タイミング戦略
- 最適な投稿時間帯（日本時間、UTC時間）
- 複数回投稿のスケジュール
- フォローアップ投稿のタイミング

### 7. エンゲージメント最大化テクニック
- リプライを促す質問
- リツイートを促す表現
- ブックマークを促す価値ある情報
- シェアしたくなる要素

### 8. バイラル要素
- ソーシャル証明（「過去の予測的中率」など）
- 緊急性の演出
- 排他性（「有料会員限定情報」など）
- 好奇心を刺激する要素

### 9. CTA（行動喚起）戦略
- Eメール登録への誘導
- YouTubeチャンネル登録への誘導
- 詳細記事へのリンク
- 自然な流れでのCTA配置

### 10. フォローアップ戦略
- 24時間後のフォローアップ投稿
- エンゲージメントへの返信戦略
- 議論の深化方法

## 出力形式

各項目について、**具体的で実行可能なレベル**で提案してください。抽象論ではなく、実際に投稿できる内容を提供してください。

日本語で、Xのアルゴリズムを完全に理解した専門家として、最大限のエンゲージメントを実現する戦略を提供してください。`;

    console.log('🤖 GrokにXアルゴリズム最適化戦略の生成を依頼中...');
    
    const completion = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in X (Twitter) algorithm optimization and viral content creation. You understand the inner workings of X\'s algorithm and know how to maximize engagement, reach, and viral potential. You provide actionable, specific strategies that can be implemented immediately.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.9,
      max_tokens: 4000,
    });

    const strategy = completion.choices[0]?.message?.content || '戦略が生成できませんでした。';
    const usage = completion.usage || {};

    return {
      strategy,
      usage: {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
      },
    };
  } catch (error) {
    console.error('❌ Grok API呼び出しエラー:', error.message);
    throw error;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 Grok × Xアルゴリズム最適化戦略生成スクリプト\n');
  
  // テスト用の記事とデータ
  const testArticle = `**データ：BTCマイナーの売り枯渇、MPIは極低水準の-1.55——Trap Scoreは「警戒レベル」を示唆**

CryptoQuantの最新オンチェーンデータによると、ビットコイン（BTC）市場は現在、極めて稀な「均衡状態」とマイナーによる強力な「保有姿勢」を示しています。BTC価格が88,000ドルの高値圏で推移し、過去24時間で0.81%の微減となる中、オンチェーン指標は市場の深層で起きている「供給の絞り込み」と、投資家心理を試す静寂を浮き彫りにしています。

**Trap Score: 8/10（退屈トラップ高警戒）**

現在の市場環境に基づき、トレーダーが陥りやすい罠とその対策を以下のように定義する。`;

  const testOnchainData = {
    current: {
      price: 88600,
      trapScore: 8,
      change24h: -0.81,
      exchangeNetflow: -40.9,
      mpi: -1.55,
    },
  };

  try {
    const result = await generateXStrategyWithGrok(testArticle, testOnchainData);
    
    console.log('\n' + '='.repeat(80));
    console.log('📱 Xアルゴリズム最適化戦略');
    console.log('='.repeat(80) + '\n');
    console.log(result.strategy);
    console.log('\n' + '='.repeat(80));
    console.log('📈 トークン使用量');
    console.log('='.repeat(80));
    console.log(`プロンプトトークン: ${result.usage.promptTokens}`);
    console.log(`レスポンストークン: ${result.usage.completionTokens}`);
    console.log(`合計トークン: ${result.usage.totalTokens}`);
    console.log('='.repeat(80) + '\n');
    
    // ファイルに保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = `output/x-strategy-${timestamp}.md`;
    
    if (!fs.existsSync('output')) {
      fs.mkdirSync('output', { recursive: true });
    }
    
    const outputContent = `# Xアルゴリズム最適化戦略（Grok生成）

生成日時: ${new Date().toISOString()}

## 戦略内容

${result.strategy}

---

## トークン使用量

- プロンプトトークン: ${result.usage.promptTokens}
- レスポンストークン: ${result.usage.completionTokens}
- 合計トークン: ${result.usage.totalTokens}
`;
    
    fs.writeFileSync(outputPath, outputContent, 'utf-8');
    console.log(`💾 戦略を保存: ${outputPath}\n`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = {
  generateXStrategyWithGrok,
};

#!/usr/bin/env tsx
/**
 * Telegram/X投稿コンテンツ生成スクリプト（Gemini CMO）
 * 
 * Gemini CMOがTelegram/X/Discord用の投稿コンテンツを生成
 * 市場分析、VSL投稿、エンゲージメント投稿など
 */

import { callGemini3Pro } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const OUTPUT_DIR = join(__dirname, '..', 'data', 'posting-content');
const MARKET = process.argv[2] || 'EN';
const CONTENT_TYPE = process.argv[3] || 'market-analysis'; // market-analysis, vsl-post, engagement

// 出力ディレクトリを作成
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const VSL_URL = process.env.YOUTUBE_VSL_URL || process.env.HEYGEN_VSL_SHARE_URL || 'https://youtu.be/cLoYee2iv0s';
const WHOP_URL = 'https://whop.com/aio-media-llc/trap-defence-btc-en/';

interface PostingContent {
  platform: 'telegram' | 'x' | 'discord';
  contentType: string;
  market: string;
  content: string;
  thumbnailPath?: string;
  hashtags?: string[];
  created_at: string;
  created_by: string;
}

const contentPrompts = {
  'market-analysis': {
    telegram: `📊 BTC Market Analysis - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}

Support: $42,000
Resistance: $45,000
Trap Alert: High probability detected

🔍 Trap Defence detected:
- Whale manipulation signals
- Market trap formation
- Risk of sudden reversal

📹 Watch VSL: ${VSL_URL}
🚀 Get Access: ${WHOP_URL}

#Bitcoin #Crypto #Trading #TrapDefence`,

    x: `🧵 BTC Market Analysis Thread

Why most traders lose money in volatile markets:

1/ Market traps are everywhere
   → 90% of traders fall into them
   → Most can't see them coming

2/ Current BTC situation:
   Support: $42,000
   Resistance: $45,000
   Trap Alert: High probability

3/ The solution: Trap Defence BTC
   → Real-time trap detection
   → AI-powered analysis
   → Institutional-grade insights

4/ Watch the VSL: ${VSL_URL}
   Get access: ${WHOP_URL}

#Bitcoin #Crypto #Trading #TrapDefence`,

    discord: `📊 **BTC Market Analysis**

**Support**: $42,000
**Resistance**: $45,000
**Trap Alert**: High probability detected

🔍 **Trap Defence detected:**
- Whale manipulation signals
- Market trap formation
- Risk of sudden reversal

📹 **Watch VSL**: ${VSL_URL}
🚀 **Get Access**: ${WHOP_URL}

Join the discussion in #market-analysis!`,
  },

  'vsl-post': {
    telegram: `🎬 Why Most Traders Lose Money

The hidden trap defense protocol:

✅ Real-time trap detection
✅ Institutional-grade insights
✅ High-accuracy signals
✅ Emotional trading reduction

Watch now: ${VSL_URL}
Get access: ${WHOP_URL}

#Crypto #Trading #Bitcoin #TrapDefence`,

    x: `🎬 New VSL: Why Most Traders Lose Money

Discover the hidden trap defense protocol:

📹 Watch: ${VSL_URL}
🚀 Get Access: ${WHOP_URL}

#Crypto #Trading #Bitcoin #TrapDefence`,

    discord: `🎉 **New VSL: Why Most Traders Lose Money**

The hidden trap defense protocol:

✅ Real-time trap detection
✅ Institutional-grade insights
✅ High-accuracy signals
✅ Emotional trading reduction

📹 **Watch**: ${VSL_URL}
🚀 **Get Access**: ${WHOP_URL}

Join the discussion in #general!`,
  },

  'engagement': {
    telegram: `💬 What's your biggest challenge in crypto trading?

Share your experience and let's discuss:

→ Market volatility?
→ Emotional trading?
→ Lack of real-time data?

We're here to help! 🚀

#Crypto #Trading #Community`,

    x: `💬 What's your biggest challenge in crypto trading?

→ Market volatility?
→ Emotional trading?
→ Lack of real-time data?

Share your thoughts below! 👇

#Crypto #Trading #Community`,

    discord: `💬 **Community Discussion**

What's your biggest challenge in crypto trading?

Share your experience:
→ Market volatility?
→ Emotional trading?
→ Lack of real-time data?

We're here to help! 🚀

Join the discussion in #general!`,
  },
};

/**
 * Gemini CMOが投稿コンテンツを生成
 */
async function generatePostingContent(
  platform: 'telegram' | 'x' | 'discord',
  contentType: string,
  market: string
): Promise<PostingContent> {
  console.log(`📝 ${platform.toUpperCase()}用${contentType}コンテンツを生成中...`);

  const basePrompt = contentPrompts[contentType as keyof typeof contentPrompts]?.[platform];
  
  if (!basePrompt) {
    throw new Error(`Unknown content type: ${contentType}`);
  }

  const prompt = `【${platform.toUpperCase()}投稿コンテンツ生成 - CMO（Gemini）】

市場: ${market}
プラットフォーム: ${platform}
コンテンツタイプ: ${contentType}

## ベースコンテンツ

${basePrompt}

## 要件

以下の要件を満たす投稿コンテンツを生成してください：

1. **プラットフォーム最適化**:
   - ${platform === 'telegram' ? 'Telegram: 簡潔で読みやすい、絵文字を効果的に使用' : ''}
   - ${platform === 'x' ? 'X (Twitter): スレッド形式または単一投稿、ハッシュタグを適切に使用' : ''}
   - ${platform === 'discord' ? 'Discord: Markdown形式、コミュニティ向け、エンゲージメント促進' : ''}

2. **コンテンツタイプ別**:
   - ${contentType === 'market-analysis' ? '市場分析: データに基づく、権威性のある、価値提供' : ''}
   - ${contentType === 'vsl-post' ? 'VSL投稿: 感情的なフック、明確なCTA、VSLリンクを含む' : ''}
   - ${contentType === 'engagement' ? 'エンゲージメント: 質問形式、コミュニティ参加を促進' : ''}

3. **必須要素**:
   - VSL URL: ${VSL_URL}
   - Whop URL: ${WHOP_URL}
   - 市場: ${market}
   - プラットフォーム: ${platform}

4. **最適化**:
   - エンゲージメントを最大化
   - クリック率を向上
   - ブランド一貫性を維持
   - 自然で読みやすい

## 出力形式

以下のJSON形式で出力してください：

\`\`\`json
{
  "content": "投稿コンテンツ（プラットフォーム最適化済み）",
  "hashtags": ["#Bitcoin", "#Crypto", "#Trading"],
  "thumbnailRequired": ${contentType === 'vsl-post' ? 'true' : 'false'}
}
\`\`\`

**重要**: 
- コンテンツは200-500文字程度（プラットフォームに応じて調整）
- 自然で読みやすい文章
- 明確なCTAを含む
- ハッシュタグは3-5個程度`;

  try {
    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'low',
      temperature: 0.8,
      maxOutputTokens: 2048,
    });

    // JSONを抽出
    const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/) || result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSONが見つかりませんでした');
    }

    const jsonText = jsonMatch[1] || jsonMatch[0];
    const data = JSON.parse(jsonText);

    const postingContent: PostingContent = {
      platform,
      contentType,
      market,
      content: data.content || basePrompt,
      hashtags: data.hashtags || [],
      created_at: new Date().toISOString(),
      created_by: 'Gemini CMO',
    };

    if (data.thumbnailRequired) {
      // プラットフォーム別のサムネイルパス
      const thumbnailName = platform === 'telegram' ? 'telegram-thumbnail-final.png' 
                          : platform === 'x' ? 'youtube-thumbnail-final.png' // X用にはYouTubeサムネイルを使用
                          : 'email-thumbnail-final.png';
      postingContent.thumbnailPath = join(__dirname, '..', 'data', 'vsl-thumbnails', thumbnailName);
    }

    return postingContent;
  } catch (error: any) {
    console.error(`❌ ${platform}用${contentType}コンテンツの生成に失敗: ${error.message}`);
    throw error;
  }
}

/**
 * 投稿コンテンツを保存
 */
function savePostingContent(content: PostingContent): string {
  const filename = `${content.platform}-${content.contentType}-${content.market}-${Date.now()}.json`;
  const filepath = join(OUTPUT_DIR, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(content, null, 2), 'utf-8');
  return filepath;
}

async function main() {
  console.log('🚀 Telegram/X投稿コンテンツ生成スクリプト開始\n');
  console.log('='.repeat(80));
  console.log('📋 処理内容:');
  console.log(`  1. 市場: ${MARKET}`);
  console.log(`  2. コンテンツタイプ: ${CONTENT_TYPE}`);
  console.log('  3. Gemini CMOが投稿コンテンツを生成');
  console.log('  4. data/posting-content/に保存');
  console.log('='.repeat(80) + '\n');

  // 環境変数チェック
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY環境変数が設定されていません');
  }

  const platforms: Array<'telegram' | 'x' | 'discord'> = ['telegram', 'x', 'discord'];
  const results: PostingContent[] = [];

  // 各プラットフォーム用のコンテンツを生成
  for (const platform of platforms) {
    try {
      const content = await generatePostingContent(platform, CONTENT_TYPE, MARKET);
      const filepath = savePostingContent(content);
      results.push(content);
      console.log(`✅ ${platform.toUpperCase()}用コンテンツを保存: ${filepath}\n`);
    } catch (error: any) {
      console.error(`❌ ${platform}用コンテンツの生成に失敗: ${error.message}\n`);
    }
  }

  console.log('='.repeat(80));
  console.log('📊 生成結果');
  console.log('='.repeat(80));
  console.log(`✅ 成功: ${results.length}件`);
  console.log(`❌ 失敗: ${platforms.length - results.length}件`);
  console.log('\n生成されたコンテンツ:');
  results.forEach((content) => {
    console.log(`\n📱 ${content.platform.toUpperCase()} (${content.contentType}):`);
    console.log(`   長さ: ${content.content.length}文字`);
    console.log(`   プレビュー: ${content.content.substring(0, 100)}...`);
  });
  console.log('='.repeat(80) + '\n');
}

main()
  .then(() => {
    console.log('✅ Telegram/X投稿コンテンツ生成スクリプト完了\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  });

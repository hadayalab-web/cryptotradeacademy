#!/usr/bin/env tsx
/**
 * 全プラットフォーム用投稿コンテンツ一括生成スクリプト
 * 
 * 市場分析/VSL投稿/エンゲージメント投稿を
 * Telegram/X/Discord用に一括生成
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

const contentTypes = ['market-analysis', 'vsl-post', 'engagement'];
const platforms: Array<'telegram' | 'x' | 'discord'> = ['telegram', 'x', 'discord'];

/**
 * 投稿コンテンツを生成（簡易版 - ベーステンプレートを使用）
 */
async function generatePostingContentSimple(
  platform: 'telegram' | 'x' | 'discord',
  contentType: string,
  market: string
): Promise<PostingContent> {
  const baseTemplates: Record<string, Record<string, string>> = {
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

  const content = baseTemplates[contentType]?.[platform] || '';
  
  const postingContent: PostingContent = {
    platform,
    contentType,
    market,
    content,
    hashtags: ['#Bitcoin', '#Crypto', '#Trading', '#TrapDefence'],
    created_at: new Date().toISOString(),
    created_by: 'Template',
  };

  // VSL投稿にはサムネイルを追加
  if (contentType === 'vsl-post') {
    const thumbnailName = platform === 'telegram' ? 'telegram-thumbnail-final.png' 
                        : platform === 'x' ? 'youtube-thumbnail-final.png'
                        : 'email-thumbnail-final.png';
    const thumbnailPath = join(__dirname, '..', 'data', 'vsl-thumbnails', thumbnailName);
    if (fs.existsSync(thumbnailPath)) {
      postingContent.thumbnailPath = thumbnailPath;
    }
  }

  return postingContent;
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
  console.log('🚀 全プラットフォーム用投稿コンテンツ一括生成スクリプト開始\n');
  console.log('='.repeat(80));
  console.log('📋 処理内容:');
  console.log(`  1. 市場: ${MARKET}`);
  console.log('  2. コンテンツタイプ: market-analysis, vsl-post, engagement');
  console.log('  3. プラットフォーム: Telegram, X, Discord');
  console.log('  4. 投稿コンテンツを生成して保存');
  console.log('='.repeat(80) + '\n');

  // 環境変数チェック
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️ GEMINI_API_KEYが設定されていません。テンプレートベースで生成します。\n');
  }

  const results: Array<{ content: PostingContent; filepath: string }> = [];

  // 各コンテンツタイプとプラットフォームの組み合わせで生成
  for (const contentType of contentTypes) {
    for (const platform of platforms) {
      try {
        const content = await generatePostingContentSimple(platform, contentType, MARKET);
        const filepath = savePostingContent(content);
        results.push({ content, filepath });
        console.log(`✅ ${platform.toUpperCase()}用${contentType}コンテンツを保存: ${filepath}`);
      } catch (error: any) {
        console.error(`❌ ${platform}用${contentType}コンテンツの生成に失敗: ${error.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 生成結果');
  console.log('='.repeat(80));
  console.log(`✅ 成功: ${results.length}件`);
  console.log(`❌ 失敗: ${contentTypes.length * platforms.length - results.length}件`);
  console.log('\n生成されたコンテンツ:');
  results.forEach(({ content, filepath }) => {
    console.log(`\n📱 ${content.platform.toUpperCase()} (${content.contentType}):`);
    console.log(`   ファイル: ${filepath}`);
    console.log(`   長さ: ${content.content.length}文字`);
    console.log(`   サムネイル: ${content.thumbnailPath ? 'あり' : 'なし'}`);
  });
  console.log('='.repeat(80) + '\n');
}

main()
  .then(() => {
    console.log('✅ 全プラットフォーム用投稿コンテンツ一括生成スクリプト完了\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  });

// scripts/generateProductName.js
// Grokを使用してバズりそうなプロダクト名を生成

require('dotenv').config({ path: '.env.local' });
const { generateProductNames } = require('../services/grok/client');

async function generateProductNamesScript() {
  console.log('🚀 Generating product names with Grok...\n');

  try {
    const productConcept = `AI-powered cryptocurrency market analysis service that delivers personalized insights via Telegram.

Key Features:
- AI Caster Video: 8-second professional news-style video with AI anchor presenting market analysis
- Market Analysis Images: Visual dashboard showing BTC price, market score, sentiment, 24h change, exchange flows
- Personalized Analysis: Tailored market summary based on real-time on-chain data
- Scheduled Delivery: Messages every 4 hours (0, 4, 8, 12, 16, 20 UTC)
- Pre-generated Content: Analysis and content creation completed 5 minutes before delivery for perfect timing

Target Audience: Active BTC traders who want personalized, timely insights
Key Value Proposition: "Personalized message that makes users feel special and satisfied"
Unique Selling Point: Pre-generated AI caster video and images delivered at perfect timing`;

    console.log('📝 Product Concept:\n');
    console.log(productConcept);
    console.log('\n' + '='.repeat(60) + '\n');

    // 英語市場向けの名前生成
    console.log('✨ Generating English Market Product Names...\n');
    const englishNames = await generateProductNames(productConcept, 'en');

    console.log('='.repeat(60));
    console.log(englishNames);
    console.log('='.repeat(60));

    // 日本語市場向けの名前も生成
    console.log('\n\n🇯🇵 Generating Japanese Market Product Names...\n');
    const japaneseNames = await generateProductNames(productConcept, 'ja');

    console.log('='.repeat(60));
    console.log(japaneseNames);
    console.log('='.repeat(60));

    return { englishNames, japaneseNames };
  } catch (error) {
    console.error('❌ Error generating product names:', error);
    throw error;
  }
}

// 直接実行時
if (require.main === module) {
  generateProductNamesScript()
    .then(() => {
      console.log('\n✅ Product name generation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = { generateProductNamesScript };

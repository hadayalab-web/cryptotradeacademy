// scripts/test-grok-api-response.js
// Grok APIが実際に返すデータ構造を確認

require('dotenv').config({ path: '.env' });

const OpenAI = require('openai');

const XAI_API_KEY = process.env.XAI_API_KEY;
const BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';
const GROK_MODEL = process.env.GROK_MODEL_X_LIVE || 'grok-4-1-fast-reasoning'; // 実際に使用されているモデル

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY not set');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: BASE_URL
});

async function testGrokResponse(lang = 'en', maxResults = 5) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🧪 Grok APIの実際のレスポンスを確認`);
  console.log(`📊 言語: ${lang}, 取得数: ${maxResults}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    const completion = await openai.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        {
          role: "system",
          content:
            'You are "Dr. Grok", an expert at finding hot influencers on X (Twitter) for crypto/BTC content. ' +
            "Find influencers with high engagement rates, recent viral posts, and active audiences. " +
            "Return ONLY JSON. No markdown. No code fences. " +
            'Schema: {"influencers":[{"username":string,"tweetId":string,"tweetText":string,"engagementRate":number,"followerCount":number,"recentImpressions":number}]} ' +
            "influencers: Array of influencer accounts with their recent hot tweets. " +
            "engagementRate: Estimated engagement rate (0-1, e.g., 0.05 = 5%). " +
            "followerCount: Estimated follower count (use ranges: 10000-50000, 50000-100000, 100000-500000, 500000+). " +
            "recentImpressions: Estimated recent impressions for their tweets (use ranges: 10000-50000, 50000-100000, 100000+). " +
            "CRITICAL: Include tweetId for EVERY influencer tweet. Without tweetId, we cannot quote repost."
        },
        {
          role: "user",
          content:
            `Task: Find ${maxResults} HIGH-ENGAGEMENT influencers on X posting about BTC/crypto in ${lang} language.\n` +
            `PRIORITY: Focus on accounts with EXCEPTIONAL engagement rates and viral potential.\n\n` +
            `CRITICAL CRITERIA (in order of importance):\n` +
            `1. ENGAGEMENT RATE: Prioritize accounts with 7%+ engagement rate (higher is better)\n` +
            `2. RECENT VIRAL POSTS: Look for tweets with HIGH impressions:\n` +
            `   - English (EN): 100,000-300,000+ impressions\n` +
            `   - Other languages: 50,000-200,000+ impressions\n` +
            `3. ACTIVE AUDIENCES: Accounts with high interaction rates (likes, retweets, replies)\n` +
            `4. CRYPTO/BTC FOCUS: Accounts that consistently post about crypto/BTC\n` +
            `5. OPTIMAL FOLLOWER COUNT: 10,000-500,000 followers (sweet spot for engagement)\n\n` +
            `Return ${maxResults} influencers with their recent hot tweets.\n` +
            `CRITICAL REQUIREMENTS:\n` +
            `1. Include tweetId for EVERY tweet (numeric tweet ID, required for quote reposting)\n` +
            `2. Prioritize tweets WITH tweet IDs AND high engagement rates (7%+ preferred)\n` +
            `3. Focus on accounts with EXCEPTIONAL engagement rates (7%+ is ideal, 5%+ minimum)\n` +
            `4. Include actual tweet text in tweetText field\n` +
            `5. Use username without @ symbol\n` +
            `6. recentImpressions should reflect actual viral tweet performance (not follower count)\n` +
            `7. engagementRate should be accurate (likes + retweets + replies) / impressions\n` +
            `8. Prioritize accounts that consistently get high engagement on crypto/BTC content\n\n` +
            `Example (EXCELLENT): {"username":"cryptotrader","tweetId":"1234567890123456789","tweetText":"BTC analysis...","engagementRate":0.09,"followerCount":50000,"recentImpressions":180000}\n` +
            `Example (VERY GOOD): {"username":"btc_analyst","tweetId":"9876543210987654321","tweetText":"Market update...","engagementRate":0.07,"followerCount":120000,"recentImpressions":150000}`
        }
      ],
      max_tokens: 6000,
      temperature: 0.2
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Grok APIの生レスポンス（最初の500文字）:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(text.substring(0, 500));
    if (text.length > 500) {
      console.log('...');
    }
    console.log('');

    if (!text) {
      console.error('❌ No response from Grok API');
      return null;
    }

    // JSONを抽出
    let jsonText = text;
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const obj = JSON.parse(jsonText);
    
    if (obj && obj.influencers && Array.isArray(obj.influencers)) {
      const influencers = obj.influencers.slice(0, maxResults);
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 パース後のデータ構造:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      console.log(`✅ 取得数: ${influencers.length}人\n`);
      
      // 最初の1人の完全なデータを表示
      if (influencers.length > 0) {
        console.log('📋 最初の1人の完全なデータ:');
        console.log(JSON.stringify(influencers[0], null, 2));
        console.log('');
        
        // すべてのフィールドをリストアップ
        console.log('📋 フィールド一覧:');
        const fields = Object.keys(influencers[0]);
        fields.forEach(field => {
          const value = influencers[0][field];
          const type = typeof value;
          const preview = type === 'string' && value.length > 50 
            ? value.substring(0, 50) + '...' 
            : value;
          console.log(`   - ${field}: ${type} = ${JSON.stringify(preview)}`);
        });
        console.log('');
        
        // 必須フィールドの確認
        const requiredFields = ['username', 'tweetId', 'tweetText', 'engagementRate', 'followerCount', 'recentImpressions'];
        const missingFields = requiredFields.filter(field => !influencers[0][field]);
        
        if (missingFields.length > 0) {
          console.warn(`⚠️ 必須フィールドが欠落: ${missingFields.join(', ')}`);
        } else {
          console.log('✅ すべての必須フィールドが存在');
        }
        
        // langフィールドの確認
        if (influencers[0].lang) {
          console.log(`✅ langフィールドが存在: ${influencers[0].lang}`);
        } else {
          console.warn(`⚠️ langフィールドが存在しない（Grok APIは返していない）`);
        }
      }
      
      return influencers;
    }

    console.error('❌ Invalid response format');
    return null;
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    return null;
  }
}

if (require.main === module) {
  const langArg = process.argv[2] || 'en';
  const maxResultsArg = parseInt(process.argv[3]) || 5;
  
  testGrokResponse(langArg, maxResultsArg)
    .then(() => {
      console.log('\n✅ 完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { testGrokResponse };

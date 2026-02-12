// scripts/update-influencers-with-grok-500-posts.js
// grok-4-1-fast-reasoningを使って1日500投稿を想定したインフルエンサーリストを更新

require('dotenv').config({ path: '.env' });

const OpenAI = require('openai');
const { saveInfluencersToStock } = require('../services/x/influencerStock');
const { LANG_DISTRIBUTION } = require('./calculate-influencer-distribution-500-posts');

const XAI_API_KEY = process.env.XAI_API_KEY;
const BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';
const GROK_MODEL = 'grok-4-1-fast-reasoning'; // 高速推論モデル

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY not set in environment variables');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: BASE_URL
});

// 言語別のストック数（500投稿/日想定）
const STOCK_COUNTS = {
  en: 150,   // 200投稿/日 → 75人（投稿用）×2 = 150人（ストック）
  es: 76,    // 100投稿/日 → 38人（投稿用）×2 = 76人（ストック）
  'pt-br': 58, // 75投稿/日 → 29人（投稿用）×2 = 58人（ストック）
  ar: 40,    // 50投稿/日 → 20人（投稿用）×2 = 40人（ストック）
  ja: 40,    // 50投稿/日 → 20人（投稿用）×2 = 40人（ストック）
  ko: 22,    // 25投稿/日 → 11人（投稿用）×2 = 22人（ストック）
};

/**
 * Grok APIでインフルエンサーを発見（grok-4-1-fast-reasoning使用）
 */
async function discoverInfluencersWithGrok(lang, targetCount) {
  const langName = {
    en: 'English',
    es: 'Spanish',
    'pt-br': 'Portuguese (Brazil)',
    ar: 'Arabic',
    ja: 'Japanese',
    ko: 'Korean',
  }[lang] || lang;

  console.log(`\n🔍 [${lang.toUpperCase()}] Discovering ${targetCount} influencers using ${GROK_MODEL}...`);

  try {
    const completion = await openai.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are "Dr. Grok", an expert at finding HIGH-ENGAGEMENT influencers on X (Twitter) for crypto/BTC content.

Your task: Find ${targetCount} influencers posting about BTC/crypto in ${langName} language.

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON. No markdown. No code fences.
2. Schema: {"influencers":[{"username":string,"tweetId":string,"tweetText":string,"engagementRate":number,"followerCount":number,"recentImpressions":number,"lang":string}]}
3. username: X username WITHOUT @ symbol (e.g., "saylor" not "@saylor")
4. tweetId: REQUIRED - numeric tweet ID for quote reposting (e.g., "1234567890123456789")
5. tweetText: Actual tweet text (first 200 chars)
6. engagementRate: 0-1 format (e.g., 0.15 = 15%)
7. followerCount: Number or range string (e.g., 50000 or "10000-50000")
8. recentImpressions: Number (e.g., 100000)
9. lang: Language code (e.g., "${lang}" for ${langName})

SELECTION CRITERIA (in order of priority):
1. ENGAGEMENT RATE: Prioritize 7%+ (0.07+), minimum 4%+ (0.04+)
2. RECENT VIRAL POSTS: High impressions
   - English: 100,000-300,000+ impressions
   - Other languages: 50,000-200,000+ impressions
3. ACTIVE AUDIENCES: High interaction rates
4. CRYPTO/BTC FOCUS: Consistent crypto/BTC content
5. OPTIMAL FOLLOWER COUNT: 10,000-500,000 (sweet spot)

Return EXACTLY ${targetCount} influencers with tweetId for EVERY entry.`
        },
        {
          role: 'user',
          content: `Task: Find ${targetCount} HIGH-ENGAGEMENT influencers on X posting about BTC/crypto in ${langName} language.

Target: ${targetCount} influencers
Language: ${langName}
Focus: Crypto/BTC content with high engagement rates (7%+ preferred, 4%+ minimum)

CRITICAL: Include tweetId for EVERY influencer. Without tweetId, we cannot quote repost.

Return ${targetCount} influencers in JSON format.`
        }
      ],
      max_tokens: 8000, // より多くのインフルエンサーを返すため増加
      temperature: 0.2 // 一貫性のある結果のため低く設定
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      console.error(`  ❌ No response from Grok API`);
      return [];
    }

    // JSONを抽出（コードブロックがある場合を考慮）
    let jsonText = text;
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const obj = JSON.parse(jsonText);
    
    if (obj && obj.influencers && Array.isArray(obj.influencers)) {
      const influencers = obj.influencers.slice(0, targetCount);
      
      // tweetIdの検証とlangフィールドの設定
      const validInfluencers = influencers
        .filter(inf => {
          if (!inf.tweetId) {
            console.warn(`  ⚠️ Skipping @${inf.username}: missing tweetId`);
            return false;
          }
          return true;
        })
        .map(inf => ({
          ...inf,
          lang: lang, // 明示的に言語を設定
        }));

      console.log(`  ✅ Found ${validInfluencers.length} valid influencers (${influencers.length - validInfluencers.length} skipped due to missing tweetId)`);
      
      return validInfluencers;
    }

    console.error(`  ❌ Invalid response format from Grok API`);
    return [];
  } catch (error) {
    console.error(`  ❌ Error discovering influencers: ${error.message}`);
    if (error.response) {
      console.error(`  Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return [];
  }
}

/**
 * すべての言語のインフルエンサーリストを更新
 */
async function updateAllInfluencers() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 1日500投稿を想定したインフルエンサーリスト更新');
  console.log(`📊 モデル: ${GROK_MODEL}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results = {};
  let totalFound = 0;
  let totalSaved = 0;

  const langs = Object.keys(STOCK_COUNTS);
  
  for (const lang of langs) {
    const targetCount = STOCK_COUNTS[lang];
    const distribution = LANG_DISTRIBUTION[lang];
    
    console.log(`\n📊 ${lang.toUpperCase()} 言語:`);
    console.log(`   目標: ${targetCount}人（ストック）`);
    console.log(`   配分: ${distribution.postsPerDay}投稿/日 (${(distribution.weight * 100).toFixed(0)}%)`);
    
    try {
      // Grok APIでインフルエンサーを発見
      const influencers = await discoverInfluencersWithGrok(lang, targetCount);
      
      if (influencers.length === 0) {
        console.error(`  ❌ No influencers found for ${lang}`);
        results[lang] = {
          success: false,
          error: 'No influencers found',
          count: 0,
        };
        continue;
      }

      // エンゲージメント率でフィルタリング（最低4%以上）
      const highEngagementInfluencers = influencers.filter(inf => {
        const engagementRate = inf.engagementRate || 0;
        return engagementRate >= 0.04; // 4%以上
      });

      console.log(`  📊 High engagement (4%+): ${highEngagementInfluencers.length}/${influencers.length}`);

      // エンゲージメント率でソート
      highEngagementInfluencers.sort((a, b) => {
        const erA = a.engagementRate || 0;
        const erB = b.engagementRate || 0;
        return erB - erA;
      });

      // 上位を選択
      const selectedInfluencers = highEngagementInfluencers.slice(0, targetCount);
      
      // 統計を表示
      if (selectedInfluencers.length > 0) {
        const avgER = selectedInfluencers.reduce((sum, inf) => sum + (inf.engagementRate || 0), 0) / selectedInfluencers.length;
        const avgImpressions = selectedInfluencers.reduce((sum, inf) => sum + (inf.recentImpressions || 0), 0) / selectedInfluencers.length;
        console.log(`  📈 Average engagement rate: ${(avgER * 100).toFixed(2)}%`);
        console.log(`  📈 Average impressions: ${avgImpressions.toLocaleString()}`);
        console.log(`  📋 Top 3 influencers:`);
        selectedInfluencers.slice(0, 3).forEach((inf, idx) => {
          console.log(`     ${idx + 1}. @${inf.username} - ER: ${((inf.engagementRate || 0) * 100).toFixed(2)}%, Impressions: ${(inf.recentImpressions || 0).toLocaleString()}`);
        });
      }

      // 🔒 言語整合性保証: すべてのインフルエンサーにlangフィールドを設定
      const influencersWithLang = selectedInfluencers.map(inf => ({
        ...inf,
        lang: lang, // 明示的に言語を設定
      }));

      // KVストレージに保存
      const saved = await saveInfluencersToStock(lang, influencersWithLang);
      
      if (saved) {
        results[lang] = {
          success: true,
          count: influencersWithLang.length,
          avgEngagementRate: influencersWithLang.length > 0 
            ? influencersWithLang.reduce((sum, inf) => sum + (inf.engagementRate || 0), 0) / influencersWithLang.length 
            : 0,
          avgImpressions: influencersWithLang.length > 0
            ? influencersWithLang.reduce((sum, inf) => sum + (inf.recentImpressions || 0), 0) / influencersWithLang.length
            : 0,
        };
        totalFound += influencers.length;
        totalSaved += influencersWithLang.length;
        console.log(`  ✅✅✅ Saved ${influencersWithLang.length} influencers to KV stock (all with lang=${lang})`);
      } else {
        results[lang] = {
          success: false,
          error: 'Failed to save to KV',
          count: 0,
        };
        console.error(`  ❌ Failed to save influencers to KV`);
      }

      // レート制限対策（言語間で3秒待機）
      if (lang !== langs[langs.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${lang}: ${error.message}`);
      results[lang] = {
        success: false,
        error: error.message,
        count: 0,
      };
    }
  }

  // サマリー
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 更新結果サマリー');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const [lang, result] of Object.entries(results)) {
    if (result.success) {
      console.log(`✅ ${lang.toUpperCase()}: ${result.count}人`);
      console.log(`   - 平均ER: ${(result.avgEngagementRate * 100).toFixed(2)}%`);
      console.log(`   - 平均インプレッション: ${result.avgImpressions.toLocaleString()}`);
    } else {
      console.log(`❌ ${lang.toUpperCase()}: ${result.error || 'Failed'}`);
    }
  }

  console.log(`\n✅✅✅ 合計 ${totalSaved}人のインフルエンサーをKVストレージに保存しました！`);
  console.log(`📊 発見数: ${totalFound}人 → 保存数: ${totalSaved}人\n`);

  return results;
}

if (require.main === module) {
  updateAllInfluencers()
    .then(() => {
      console.log('✅ 完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { updateAllInfluencers, discoverInfluencersWithGrok };

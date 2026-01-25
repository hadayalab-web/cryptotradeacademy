// scripts/calculate-conversion-expectations.js
// インプレッション・エンゲージメント分析を基に、無料版オプトイン数、Whopトラフィック数、Whopコンバージョン数の期待値を計算

require('dotenv').config({ path: '.env' });

const { getInfluencersFromStock } = require('../services/x/influencerStock');

// 現在の投稿パターン
const POSTING_PATTERN = {
  quoteRepost: {
    postsPerDay: 10,
    languages: ['AR', 'KO', 'EN', 'PT-BR', 'ES'],
    hasTelegramLink: false, // Quote RepostにはTelegramリンクなし
    hasWhopLink: false, // Quote RepostにはWhopリンクなし
  },
  freeReport: {
    postsPerDay: 5,
    languages: ['EN', 'KO', 'PT-BR', 'ES', 'AR'],
    hasTelegramLink: true, // Free ReportにはTelegram Deep Linkあり
    hasWhopLink: true, // Free ReportにはWhopリンクあり
  },
  minimalVersion: {
    postsPerDay: 1, // 全6言語で1投稿
    languages: ['EN', 'ES', 'PT-BR', 'AR', 'KO', 'JA'],
    hasTelegramLink: true, // Minimal VersionにはTelegram Deep Linkあり
    hasWhopLink: true, // Minimal VersionにはWhopリンクあり
  },
};

// コンバージョン率の推定値（業界標準 + プロジェクト固有の推定）
const CONVERSION_RATES = {
  // X投稿からのクリック率（エンゲージメント率10%の場合、URLクリック率は低め）
  xClickRate: {
    conservative: 0.01, // 1%（保守的）
    moderate: 0.02, // 2%（中程度）
    optimistic: 0.03, // 3%（楽観的）
  },
  // Telegram Deep Linkクリック率（CTAがある場合）
  telegramClickRate: {
    conservative: 0.02, // 2%
    moderate: 0.035, // 3.5%
    optimistic: 0.05, // 5%
  },
  // Whopリンククリック率（CTAがある場合）
  whopClickRate: {
    conservative: 0.01, // 1%
    moderate: 0.02, // 2%
    optimistic: 0.03, // 3%
  },
  // Telegram Botへのオプトイン率（クリック後）
  telegramOptInRate: {
    conservative: 0.30, // 30%
    moderate: 0.40, // 40%
    optimistic: 0.50, // 50%
  },
  // Whopコンバージョン率（クリック後）
  whopConversionRate: {
    conservative: 0.02, // 2%
    moderate: 0.035, // 3.5%
    optimistic: 0.05, // 5%
  },
};

// インフルエンサーの期待インプレッション数を取得
async function getExpectedImpressionsPerPost() {
  const languages = ['en', 'es', 'pt-br', 'ar', 'ko', 'ja'];
  const impressionsByLang = {};
  
  for (const lang of languages) {
    try {
      const influencers = await getInfluencersFromStock(lang);
      if (influencers && influencers.length > 0) {
        // 平均インプレッション数を計算
        const totalImpressions = influencers.reduce((sum, inf) => {
          const impressions = parseImpressions(inf.recentImpressions || '0');
          return sum + impressions;
        }, 0);
        const avgImpressions = totalImpressions / influencers.length;
        impressionsByLang[lang] = avgImpressions;
      } else {
        // ストックが空の場合は推定値を使用
        impressionsByLang[lang] = getEstimatedImpressions(lang);
      }
    } catch (error) {
      console.error(`[Calculate] Error getting influencers for ${lang}:`, error.message);
      impressionsByLang[lang] = getEstimatedImpressions(lang);
    }
  }
  
  return impressionsByLang;
}

// インプレッション数の文字列を数値に変換
function parseImpressions(impressionsStr) {
  if (typeof impressionsStr === 'number') return impressionsStr;
  if (!impressionsStr) return 0;
  
  // "100000-500000" や "300000+" などの形式を処理
  const match = impressionsStr.match(/(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0;
}

// ストックが空の場合の推定インプレッション数
function getEstimatedImpressions(lang) {
  const estimates = {
    'en': 237500, // EN言語の平均（INFLUENCER_PERFORMANCE_ANALYSISより）
    'es': 130000,
    'pt-br': 100000,
    'ar': 188000,
    'ko': 100000,
    'ja': 100000,
  };
  return estimates[lang] || 100000;
}

// 1日の期待インプレッション数を計算
async function calculateDailyImpressions() {
  const impressionsByLang = await getExpectedImpressionsPerPost();
  
  let totalImpressions = 0;
  
  // Quote Reposts: 10投稿/日
  // AR: UTC 0:00 (2投稿), KO: UTC 1:00 (2投稿), EN/PT-BR: UTC 20:00 (4投稿), ES: UTC 21:00 (2投稿)
  const quoteRepostImpressions = 
    (impressionsByLang['ar'] || 0) * 2 + // AR 2投稿
    (impressionsByLang['ko'] || 0) * 2 + // KO 2投稿
    (impressionsByLang['en'] || 0) * 2 + // EN 2投稿（EN/PT-BRの4投稿のうち2投稿）
    (impressionsByLang['pt-br'] || 0) * 2 + // PT-BR 2投稿
    (impressionsByLang['es'] || 0) * 2; // ES 2投稿
  
  // Free Reports: 5投稿/日
  // EN: UTC 12:00 (1投稿), KO: UTC 13:00 (1投稿), PT-BR: UTC 14:00 (1投稿), ES: UTC 15:00 (1投稿), AR: UTC 18:00 (1投稿)
  const freeReportImpressions = 
    (impressionsByLang['en'] || 0) * 1 +
    (impressionsByLang['ko'] || 0) * 1 +
    (impressionsByLang['pt-br'] || 0) * 1 +
    (impressionsByLang['es'] || 0) * 1 +
    (impressionsByLang['ar'] || 0) * 1;
  
  // Minimal Version: 1投稿/日（全6言語）
  const minimalVersionImpressions = 
    (impressionsByLang['en'] || 0) * 1 +
    (impressionsByLang['es'] || 0) * 1 +
    (impressionsByLang['pt-br'] || 0) * 1 +
    (impressionsByLang['ar'] || 0) * 1 +
    (impressionsByLang['ko'] || 0) * 1 +
    (impressionsByLang['ja'] || 0) * 1;
  
  totalImpressions = quoteRepostImpressions + freeReportImpressions + minimalVersionImpressions;
  
  return {
    quoteRepost: quoteRepostImpressions,
    freeReport: freeReportImpressions,
    minimalVersion: minimalVersionImpressions,
    total: totalImpressions,
  };
}

// 期待値を計算
async function calculateExpectations() {
  console.log('📊 期待値計算を開始...\n');
  
  const dailyImpressions = await calculateDailyImpressions();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 1日の期待インプレッション数');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Quote Reposts: ${dailyImpressions.quoteRepost.toLocaleString()}インプレッション`);
  console.log(`Free Reports: ${dailyImpressions.freeReport.toLocaleString()}インプレッション`);
  console.log(`Minimal Version: ${dailyImpressions.minimalVersion.toLocaleString()}インプレッション`);
  console.log(`合計: ${dailyImpressions.total.toLocaleString()}インプレッション/日\n`);
  
  // Telegram Deep Linkを含む投稿のインプレッション数
  const telegramLinkImpressions = dailyImpressions.freeReport + dailyImpressions.minimalVersion;
  
  // Whopリンクを含む投稿のインプレッション数
  const whopLinkImpressions = dailyImpressions.freeReport + dailyImpressions.minimalVersion;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 期待値計算結果');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // 1. 無料版（Minimal Version）のオプトイン数の期待値
  console.log('1️⃣ 無料版（Minimal Version）のオプトイン数の期待値\n');
  
  const telegramClicks = {
    conservative: Math.round(telegramLinkImpressions * CONVERSION_RATES.telegramClickRate.conservative),
    moderate: Math.round(telegramLinkImpressions * CONVERSION_RATES.telegramClickRate.moderate),
    optimistic: Math.round(telegramLinkImpressions * CONVERSION_RATES.telegramClickRate.optimistic),
  };
  
  const telegramOptIns = {
    conservative: Math.round(telegramClicks.conservative * CONVERSION_RATES.telegramOptInRate.conservative),
    moderate: Math.round(telegramClicks.moderate * CONVERSION_RATES.telegramOptInRate.moderate),
    optimistic: Math.round(telegramClicks.optimistic * CONVERSION_RATES.telegramOptInRate.optimistic),
  };
  
  console.log(`   📱 Telegram Deep Linkクリック数:`);
  console.log(`      - 保守的: ${telegramClicks.conservative.toLocaleString()}クリック/日`);
  console.log(`      - 中程度: ${telegramClicks.moderate.toLocaleString()}クリック/日`);
  console.log(`      - 楽観的: ${telegramClicks.optimistic.toLocaleString()}クリック/日\n`);
  
  console.log(`   ✅ オプトイン数（Telegram Bot登録）:`);
  console.log(`      - 保守的: ${telegramOptIns.conservative.toLocaleString()}人/日`);
  console.log(`      - 中程度: ${telegramOptIns.moderate.toLocaleString()}人/日`);
  console.log(`      - 楽観的: ${telegramOptIns.optimistic.toLocaleString()}人/日\n`);
  
  // 2. Whopの想定トラフィック数の期待値
  console.log('2️⃣ Whopの想定トラフィック数の期待値\n');
  
  const whopClicks = {
    conservative: Math.round(whopLinkImpressions * CONVERSION_RATES.whopClickRate.conservative),
    moderate: Math.round(whopLinkImpressions * CONVERSION_RATES.whopClickRate.moderate),
    optimistic: Math.round(whopLinkImpressions * CONVERSION_RATES.whopClickRate.optimistic),
  };
  
  console.log(`   🔗 Whopリンククリック数:`);
  console.log(`      - 保守的: ${whopClicks.conservative.toLocaleString()}クリック/日`);
  console.log(`      - 中程度: ${whopClicks.moderate.toLocaleString()}クリック/日`);
  console.log(`      - 楽観的: ${whopClicks.optimistic.toLocaleString()}クリック/日\n`);
  
  // 3. Whopの想定コンバージョン数の期待値
  console.log('3️⃣ Whopの想定コンバージョン数の期待値\n');
  
  const whopConversions = {
    conservative: Math.round(whopClicks.conservative * CONVERSION_RATES.whopConversionRate.conservative),
    moderate: Math.round(whopClicks.moderate * CONVERSION_RATES.whopConversionRate.moderate),
    optimistic: Math.round(whopClicks.optimistic * CONVERSION_RATES.whopConversionRate.optimistic),
  };
  
  console.log(`   💰 Whopコンバージョン数（購入）:`);
  console.log(`      - 保守的: ${whopConversions.conservative.toLocaleString()}件/日`);
  console.log(`      - 中程度: ${whopConversions.moderate.toLocaleString()}件/日`);
  console.log(`      - 楽観的: ${whopConversions.optimistic.toLocaleString()}件/日\n`);
  
  // 月間期待値
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📅 月間期待値（30日換算）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log(`📱 無料版オプトイン数:`);
  console.log(`   - 保守的: ${(telegramOptIns.conservative * 30).toLocaleString()}人/月`);
  console.log(`   - 中程度: ${(telegramOptIns.moderate * 30).toLocaleString()}人/月`);
  console.log(`   - 楽観的: ${(telegramOptIns.optimistic * 30).toLocaleString()}人/月\n`);
  
  console.log(`🔗 Whopトラフィック数:`);
  console.log(`   - 保守的: ${(whopClicks.conservative * 30).toLocaleString()}クリック/月`);
  console.log(`   - 中程度: ${(whopClicks.moderate * 30).toLocaleString()}クリック/月`);
  console.log(`   - 楽観的: ${(whopClicks.optimistic * 30).toLocaleString()}クリック/月\n`);
  
  console.log(`💰 Whopコンバージョン数:`);
  console.log(`   - 保守的: ${(whopConversions.conservative * 30).toLocaleString()}件/月`);
  console.log(`   - 中程度: ${(whopConversions.moderate * 30).toLocaleString()}件/月`);
  console.log(`   - 楽観的: ${(whopConversions.optimistic * 30).toLocaleString()}件/月\n`);
  
  return {
    dailyImpressions,
    telegramOptIns,
    whopClicks,
    whopConversions,
    monthly: {
      telegramOptIns: {
        conservative: telegramOptIns.conservative * 30,
        moderate: telegramOptIns.moderate * 30,
        optimistic: telegramOptIns.optimistic * 30,
      },
      whopClicks: {
        conservative: whopClicks.conservative * 30,
        moderate: whopClicks.moderate * 30,
        optimistic: whopClicks.optimistic * 30,
      },
      whopConversions: {
        conservative: whopConversions.conservative * 30,
        moderate: whopConversions.moderate * 30,
        optimistic: whopConversions.optimistic * 30,
      },
    },
  };
}

// 実行
if (require.main === module) {
  calculateExpectations()
    .then((results) => {
      console.log('✅ 期待値計算完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { calculateExpectations };

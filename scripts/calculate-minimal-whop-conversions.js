// scripts/calculate-minimal-whop-conversions.js
// 無料版（Minimal Version）オプトイン数、Whopトラフィック数、Whopコンバージョン数を予測

require('dotenv').config({ path: '.env' });

const { LANG_DISTRIBUTION } = require('./calculate-influencer-distribution-500-posts');

// すべての投稿（490投稿/日）に無料版（Minimal Version）とWhopリンクが実装されている
// したがって、490投稿/日全体から計算する
const TOTAL_POSTS_PER_DAY = 490; // 引用リポスト（すべてにMinimal VersionとWhopリンクが含まれる）

// コンバージョン率の仮定（業界標準と実績データに基づく）
const CONVERSION_RATES = {
  // エンゲージメントからクリックへの変換率（保守的）
  engagementToClick: {
    best: 0.03,      // 3%（最良のケース）
    realistic: 0.02, // 2%（現実的なケース）
    worst: 0.01,     // 1%（最悪のケース）
  },
  
  // クリックからTelegramオプトインへの変換率
  clickToOptIn: {
    best: 0.30,      // 30%（最良のケース）
    realistic: 0.20,  // 20%（現実的なケース）
    worst: 0.10,      // 10%（最悪のケース）
  },
  
  // Whopトラフィックからコンバージョンへの変換率（直接コンバージョン）
  whopTrafficToConversion: {
    best: 0.05,      // 5%（最良のケース）
    realistic: 0.03,  // 3%（現実的なケース）
    worst: 0.01,     // 1%（最悪のケース）
  },
  
  // 無料版オプトインからWhopコンバージョンへの変換率（無料版経由）
  optInToWhopConversion: {
    best: 0.15,      // 15%（最良のケース）
    realistic: 0.10,  // 10%（現実的なケース）
    worst: 0.05,     // 5%（最悪のケース）
  },
  
  // クリックのWhop vs Telegram配分（A/Bテスト: 50/50）
  whopClickRatio: 0.5,  // 50%がWhopリンクをクリック
  telegramClickRatio: 0.5, // 50%がTelegramリンクをクリック
  
  // クーポンキャンペーンの影響（50組限定50%オフ、品切れ即補充）
  // 早い者勝ちのため、Whop直接コンバージョンが増える可能性
  couponCampaignMultiplier: {
    best: 1.5,      // 1.5倍（クーポン効果で直接コンバージョンが増加）
    realistic: 1.3,  // 1.3倍（現実的なケース）
    worst: 1.1,     // 1.1倍（最悪のケース）
  },
};

// 実際のデータから取得（引用リポストのインプレッション・ERデータ）
// 現実的なケース: 490投稿/日のデータを使用
// すべての投稿に無料版（Minimal Version）とWhopリンクが実装されている
const REALISTIC_DATA = {
  postsPerDay: 490,
  totalImpressions: 115997648,
  avgER: 0.10236234758984755,
  totalEngagements: 11873791,
  impressionsPerPost: 236730, // 1投稿あたり平均インプレッション
  engagementsPerPost: 24232,  // 1投稿あたり平均エンゲージメント
  langData: {
    en: { postsPerDay: 195, impressionsPerDay: 85033000, engagementsPerDay: 8559988 },
    es: { postsPerDay: 98, impressionsPerDay: 9374473, engagementsPerDay: 960883 },
    'pt-br': { postsPerDay: 74, impressionsPerDay: 8680965, engagementsPerDay: 953409 },
    ar: { postsPerDay: 49, impressionsPerDay: 4830175, engagementsPerDay: 525281 },
    ja: { postsPerDay: 49, impressionsPerDay: 5175625, engagementsPerDay: 566730 },
    ko: { postsPerDay: 25, impressionsPerDay: 2903409, engagementsPerDay: 307497 },
  },
};

function calculateMinimalVersionMetrics() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 無料版（Minimal Version）オプトイン数・Whopトラフィック数・コンバージョン数予測');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`📊 総投稿数: ${TOTAL_POSTS_PER_DAY}投稿/日（すべてに無料版とWhopリンクが実装）\n`);

  const results = {};

  // 実際のデータから直接計算（現実的なケースのみ）
  // すべての投稿（490投稿/日）に無料版（Minimal Version）とWhopリンクが実装されている
  // したがって、490投稿/日全体のインプレッション・エンゲージメントから計算
  
  const totalImpressions = REALISTIC_DATA.totalImpressions;
  const totalEngagements = REALISTIC_DATA.totalEngagements;
  const avgER = REALISTIC_DATA.avgER;

  // コンバージョン率を取得（現実的なケース）
  const engagementToClick = CONVERSION_RATES.engagementToClick.realistic;
  const clickToOptIn = CONVERSION_RATES.clickToOptIn.realistic;
  const whopTrafficToConversion = CONVERSION_RATES.whopTrafficToConversion.realistic;
  const optInToWhopConversion = CONVERSION_RATES.optInToWhopConversion.realistic;
  const couponMultiplier = CONVERSION_RATES.couponCampaignMultiplier.realistic;
  const whopClickRatio = CONVERSION_RATES.whopClickRatio;
  const telegramClickRatio = CONVERSION_RATES.telegramClickRatio;

  // 計算
  const totalClicks = totalEngagements * engagementToClick;
  const whopTraffic = totalClicks * whopClickRatio;
  const telegramClicks = totalClicks * telegramClickRatio;
  const telegramOptIns = telegramClicks * clickToOptIn;
  
  // 2つの導線パターンに分けて計算
  // パターン1: Whop直接コンバージョン（クーポンキャンペーン経由、早い者勝ち）
  const whopDirectConversions = whopTraffic * whopTrafficToConversion * couponMultiplier;
  
  // パターン2: 無料版オプトイン → Whopコンバージョン（無料版経由）
  const optInToWhopConversions = telegramOptIns * optInToWhopConversion;
  
  // 合計Whopコンバージョン数
  const whopTotalConversions = whopDirectConversions + optInToWhopConversions;

  results.realistic = {
    scenarioName: '現実的なケース',
    totalPostsPerDay: TOTAL_POSTS_PER_DAY,
    totalImpressions,
    totalEngagements,
    avgER,
    totalClicks,
    whopTraffic,
    telegramClicks,
    telegramOptIns,
    // 2つの導線パターン
    whopDirectConversions,      // パターン1: Whop直接コンバージョン（クーポン経由）
    optInToWhopConversions,     // パターン2: 無料版経由コンバージョン
    whopTotalConversions,       // 合計Whopコンバージョン数
    engagementToClick,
    clickToOptIn,
    whopTrafficToConversion,
    optInToWhopConversion,
    couponMultiplier,
  };

  console.log(`📊 現実的なケース（実際のデータから計算）:`);
  console.log(`   総投稿数: ${TOTAL_POSTS_PER_DAY}投稿/日（すべてに無料版とWhopリンクが実装）`);
  console.log(`   合計インプレッション: ${Math.round(totalImpressions).toLocaleString()}/日`);
  console.log(`   合計エンゲージメント: ${Math.round(totalEngagements).toLocaleString()}/日`);
  console.log(`   平均ER: ${(avgER * 100).toFixed(2)}%`);
  console.log(`   エンゲージメント→クリック率: ${(engagementToClick * 100).toFixed(1)}%`);
  console.log(`   合計クリック数: ${Math.round(totalClicks).toLocaleString()}/日`);
  console.log(`   ──────────────────────────────`);
  console.log(`   📱 Telegram:`);
  console.log(`      Telegramクリック数: ${Math.round(telegramClicks).toLocaleString()}/日`);
  console.log(`      クリック→オプトイン率: ${(clickToOptIn * 100).toFixed(1)}%`);
  console.log(`      ✅ オプトイン数: ${Math.round(telegramOptIns).toLocaleString()}/日`);
  console.log(`   ──────────────────────────────`);
  console.log(`   💎 Whop（2つの導線パターン）:`);
  console.log(`      Whopトラフィック数: ${Math.round(whopTraffic).toLocaleString()}/日`);
  console.log(`      ──────────────────────────────`);
  console.log(`      📌 パターン1: Whop直接コンバージョン（クーポンキャンペーン経由）`);
  console.log(`         トラフィック→コンバージョン率: ${(whopTrafficToConversion * 100).toFixed(1)}%`);
  console.log(`         クーポン効果倍率: ${couponMultiplier.toFixed(1)}倍`);
  console.log(`         ✅ 直接コンバージョン数: ${Math.round(whopDirectConversions).toLocaleString()}/日`);
  console.log(`      ──────────────────────────────`);
  console.log(`      📌 パターン2: 無料版経由コンバージョン`);
  console.log(`         オプトイン→コンバージョン率: ${(optInToWhopConversion * 100).toFixed(1)}%`);
  console.log(`         ✅ 無料版経由コンバージョン数: ${Math.round(optInToWhopConversions).toLocaleString()}/日`);
  console.log(`      ──────────────────────────────`);
  console.log(`      ✅ 合計Whopコンバージョン数: ${Math.round(whopTotalConversions).toLocaleString()}/日`);
  console.log('');

  // サマリー
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 サマリー（実際のデータから計算）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const realistic = results.realistic;
  console.log('| 総投稿/日 | インプレッション/日 | エンゲージメント/日 | 平均ER | クリック/日 | Telegramオプトイン/日 | Whopトラフィック/日 | Whop直接コンバージョン/日 | 無料版経由コンバージョン/日 | Whop合計コンバージョン/日 |');
  console.log('|---------|------------------|------------------|--------|-----------|-------------------|------------------|----------------------|------------------------|----------------------|');
  console.log(`| ${realistic.totalPostsPerDay} | ${Math.round(realistic.totalImpressions).toLocaleString()} | ${Math.round(realistic.totalEngagements).toLocaleString()} | ${(realistic.avgER * 100).toFixed(2)}% | ${Math.round(realistic.totalClicks).toLocaleString()} | ${Math.round(realistic.telegramOptIns).toLocaleString()} | ${Math.round(realistic.whopTraffic).toLocaleString()} | ${Math.round(realistic.whopDirectConversions).toLocaleString()} | ${Math.round(realistic.optInToWhopConversions).toLocaleString()} | ${Math.round(realistic.whopTotalConversions).toLocaleString()} |`);

  // 現実的なケースの詳細分析
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 現実的なケース（実際のデータから計算）の詳細分析');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`📊 ${realistic.scenarioName}:`);
  console.log(`   総投稿数: ${realistic.totalPostsPerDay}投稿/日（すべてに無料版とWhopリンクが実装）`);
  console.log(`   合計インプレッション: ${Math.round(realistic.totalImpressions).toLocaleString()}/日`);
  console.log(`   合計エンゲージメント: ${Math.round(realistic.totalEngagements).toLocaleString()}/日`);
  console.log(`   平均ER: ${(realistic.avgER * 100).toFixed(2)}%`);
  console.log(`   1投稿あたり平均インプレッション: ${Math.round(realistic.totalImpressions / realistic.totalPostsPerDay).toLocaleString()}`);
  console.log(`   1投稿あたり平均エンゲージメント: ${Math.round(realistic.totalEngagements / realistic.totalPostsPerDay).toLocaleString()}`);
  console.log(`   合計クリック数: ${Math.round(realistic.totalClicks).toLocaleString()}/日`);
  console.log(`   1投稿あたり平均クリック数: ${Math.round(realistic.totalClicks / realistic.totalPostsPerDay).toLocaleString()}\n`);

  console.log(`📱 Telegram（無料版Minimal Version）:`);
  console.log(`   Telegramクリック数: ${Math.round(realistic.telegramClicks).toLocaleString()}/日`);
  console.log(`   ✅ オプトイン数: ${Math.round(realistic.telegramOptIns).toLocaleString()}/日`);
  console.log(`   1投稿あたり平均オプトイン数: ${Math.round(realistic.telegramOptIns / realistic.totalPostsPerDay).toFixed(1)}`);
  console.log(`   月間オプトイン数（30日）: ${Math.round(realistic.telegramOptIns * 30).toLocaleString()}\n`);

  console.log(`💎 Whop（2つの導線パターン）:`);
  console.log(`   Whopトラフィック数: ${Math.round(realistic.whopTraffic).toLocaleString()}/日`);
  console.log(`   ──────────────────────────────`);
  console.log(`   📌 パターン1: Whop直接コンバージョン（クーポンキャンペーン経由）`);
  console.log(`      ✅ 直接コンバージョン数: ${Math.round(realistic.whopDirectConversions).toLocaleString()}/日`);
  console.log(`      1投稿あたり平均直接コンバージョン数: ${Math.round(realistic.whopDirectConversions / realistic.totalPostsPerDay).toFixed(1)}`);
  console.log(`      月間直接コンバージョン数（30日）: ${Math.round(realistic.whopDirectConversions * 30).toLocaleString()}`);
  console.log(`   ──────────────────────────────`);
  console.log(`   📌 パターン2: 無料版経由コンバージョン`);
  console.log(`      ✅ 無料版経由コンバージョン数: ${Math.round(realistic.optInToWhopConversions).toLocaleString()}/日`);
  console.log(`      1投稿あたり平均無料版経由コンバージョン数: ${Math.round(realistic.optInToWhopConversions / realistic.totalPostsPerDay).toFixed(1)}`);
  console.log(`      月間無料版経由コンバージョン数（30日）: ${Math.round(realistic.optInToWhopConversions * 30).toLocaleString()}`);
  console.log(`   ──────────────────────────────`);
  console.log(`   ✅ 合計Whopコンバージョン数: ${Math.round(realistic.whopTotalConversions).toLocaleString()}/日`);
  console.log(`   1投稿あたり平均合計コンバージョン数: ${Math.round(realistic.whopTotalConversions / realistic.totalPostsPerDay).toFixed(1)}`);
  console.log(`   月間合計コンバージョン数（30日）: ${Math.round(realistic.whopTotalConversions * 30).toLocaleString()}\n`);

  // 言語別の内訳（現実的なケース）
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 言語別内訳（現実的なケース）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const langWeights = {
    en: 0.40,
    es: 0.20,
    'pt-br': 0.15,
    ar: 0.10,
    ja: 0.10,
    ko: 0.05,
  };

  console.log('| 言語 | 投稿/日 | インプレッション/日 | エンゲージメント/日 | ER | クリック/日 | Telegramオプトイン/日 | Whopトラフィック/日 | Whop直接コンバージョン/日 | 無料版経由コンバージョン/日 | Whop合計コンバージョン/日 |');
  console.log('|------|--------|------------------|------------------|-----|-----------|-------------------|------------------|----------------------|------------------------|----------------------|');
  
  for (const [lang, langData] of Object.entries(REALISTIC_DATA.langData)) {
    const langPosts = langData.postsPerDay; // 各言語の投稿数
    // 実際のデータから計算
    const langImpressions = langData.impressionsPerDay;
    const langEngagements = langData.engagementsPerDay;
    const langER = langImpressions > 0 ? langEngagements / langImpressions : 0;
    const langClicks = langEngagements * realistic.engagementToClick;
    const langTelegramClicks = langClicks * CONVERSION_RATES.telegramClickRatio;
    const langTelegramOptIns = langTelegramClicks * realistic.clickToOptIn;
    const langWhopTraffic = langClicks * CONVERSION_RATES.whopClickRatio;
    
    // 2つの導線パターンに分けて計算
    const langWhopDirectConversions = langWhopTraffic * realistic.whopTrafficToConversion * realistic.couponMultiplier;
    const langOptInToWhopConversions = langTelegramOptIns * realistic.optInToWhopConversion;
    const langWhopTotalConversions = langWhopDirectConversions + langOptInToWhopConversions;

    console.log(`| ${lang.toUpperCase()} | ${langPosts} | ${Math.round(langImpressions).toLocaleString()} | ${Math.round(langEngagements).toLocaleString()} | ${(langER * 100).toFixed(2)}% | ${Math.round(langClicks).toLocaleString()} | ${Math.round(langTelegramOptIns).toLocaleString()} | ${Math.round(langWhopTraffic).toLocaleString()} | ${Math.round(langWhopDirectConversions).toLocaleString()} | ${Math.round(langOptInToWhopConversions).toLocaleString()} | ${Math.round(langWhopTotalConversions).toLocaleString()} |`);
  }

  // JSONファイルに保存
  const fs = require('fs');
  const path = require('path');
  const outputPath = path.join(__dirname, '../data/minimal-whop-conversions-prediction.json');
  
  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalPostsPerDay: TOTAL_POSTS_PER_DAY,
    conversionRates: CONVERSION_RATES,
    predictions: results,
    languageBreakdown: Object.entries(REALISTIC_DATA.langData).map(([lang, langData]) => {
      const realistic = results.realistic;
      const langPosts = langData.postsPerDay;
      
      const langImpressions = langData.impressionsPerDay;
      const langEngagements = langData.engagementsPerDay;
      const langER = langImpressions > 0 ? langEngagements / langImpressions : 0;
      const langClicks = langEngagements * realistic.engagementToClick;
      const langTelegramClicks = langClicks * CONVERSION_RATES.telegramClickRatio;
      const langTelegramOptIns = langTelegramClicks * realistic.clickToOptIn;
      const langWhopTraffic = langClicks * CONVERSION_RATES.whopClickRatio;
      
      // 2つの導線パターンに分けて計算
      const langWhopDirectConversions = langWhopTraffic * realistic.whopTrafficToConversion * realistic.couponMultiplier;
      const langOptInToWhopConversions = langTelegramOptIns * realistic.optInToWhopConversion;
      const langWhopTotalConversions = langWhopDirectConversions + langOptInToWhopConversions;
      
      return {
        lang,
        postsPerDay: langPosts,
        impressionsPerDay: Math.round(langImpressions),
        engagementsPerDay: Math.round(langEngagements),
        avgER: langER,
        clicksPerDay: Math.round(langClicks),
        telegramOptInsPerDay: Math.round(langTelegramOptIns),
        whopTrafficPerDay: Math.round(langWhopTraffic),
        whopDirectConversionsPerDay: Math.round(langWhopDirectConversions),
        optInToWhopConversionsPerDay: Math.round(langOptInToWhopConversions),
        whopTotalConversionsPerDay: Math.round(langWhopTotalConversions),
      };
    }),
  }, null, 2), 'utf8');
  
  console.log(`\n✅ 結果を保存: ${outputPath}\n`);

  return results;
}

if (require.main === module) {
  const results = calculateMinimalVersionMetrics();
  console.log('✅ 完了');
  process.exit(0);
}

module.exports = { calculateMinimalVersionMetrics };

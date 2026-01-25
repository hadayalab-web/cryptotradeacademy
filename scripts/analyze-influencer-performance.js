// scripts/analyze-influencer-performance.js
// インフルエンサーのパフォーマンス分析（インプレッション・エンゲージメント期待値調査）

require('dotenv').config({ path: '.env' });

const { analyzeInfluencerPerformance } = require('../services/x/influencerAnalyzer');
const { getPostsByType } = require('../services/x/postTracker');
const { getDailyEngagementMetrics } = require('../api/x-engagement-metrics');
const { getImpressionTargetForLang } = require('../config/influencerStrategy');

// KVストレージから直接取得（getInfluencersFromStockを使わない）
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[Analyze Influencer Performance] @vercel/kv not available:', error.message);
}

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
const STOCK_KEY_PREFIX = 'x:influencer_stock:';
const STOCK_UPDATE_TIME_KEY_PREFIX = 'x:influencer_stock_update:';

// KVから直接インフルエンサーを取得
async function getInfluencersFromStockDirect(lang) {
  if (!kv) {
    return [];
  }
  try {
    const stockKey = `${STOCK_KEY_PREFIX}${lang.toLowerCase()}`;
    const influencers = await kv.get(stockKey);
    if (!influencers || !Array.isArray(influencers) || influencers.length === 0) {
      return [];
    }
    return influencers;
  } catch (error) {
    console.error(`[Analyze Influencer Performance] Failed to get influencers for ${lang}:`, error.message);
    return [];
  }
}

// KVから直接更新時刻を取得
async function getStockUpdateTimeDirect(lang) {
  if (!kv) {
    return null;
  }
  try {
    const updateTimeKey = `${STOCK_UPDATE_TIME_KEY_PREFIX}${lang.toLowerCase()}`;
    return await kv.get(updateTimeKey) || null;
  } catch (error) {
    return null;
  }
}

/**
 * インフルエンサーのパフォーマンス分析レポートを生成
 */
async function analyzeInfluencerPerformanceReport() {
  console.log('📊 インフルエンサーパフォーマンス分析レポートを生成中...\n');
  
  const report = {
    generatedAt: new Date().toISOString(),
    stockAnalysis: {},
    historicalPerformance: {},
    expectedPerformance: {},
    recommendations: {},
  };
  
  // 1. ストックされているインフルエンサーの分析
  console.log('📋 ストックされているインフルエンサーを分析中...\n');
  
  for (const lang of SUPPORTED_LANGS) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 ${lang.toUpperCase()} 言語のインフルエンサー分析`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    // ストックからインフルエンサーを取得（KVから直接取得）
    const stockInfluencers = await getInfluencersFromStockDirect(lang);
    const updateTime = await getStockUpdateTimeDirect(lang);
    
    if (stockInfluencers.length === 0) {
      console.log(`⚠️ ${lang}言語のストックが空です`);
      report.stockAnalysis[lang] = {
        count: 0,
        status: 'empty',
        avgEngagementRate: 0,
        avgImpressions: 0,
        avgFollowerCount: 0,
        topInfluencers: [],
      };
      report.expectedPerformance[lang] = {
        expectedImpressions: 0,
        expectedEngagements: 0,
        targetMin: getImpressionTargetForLang(lang).min,
        targetMax: getImpressionTargetForLang(lang).max,
        targetAchievement: 'below_target',
        avgEngagementRate: 0,
      };
      report.historicalPerformance[lang] = {
        count: 0,
        topInfluencers: [],
      };
      report.recommendations[lang] = [
        `ストックが空です。\`/api/x-update-influencer-stock?lang=${lang}\`を実行してストックを更新してください`,
      ];
      console.log(`  💡 推奨アクション: /api/x-update-influencer-stock?lang=${lang}を実行`);
      continue;
    }
    
    console.log(`✅ ストック数: ${stockInfluencers.length}人`);
    console.log(`📅 最終更新: ${updateTime || '不明'}\n`);
    
    // ストックインフルエンサーの統計
    const stats = {
      count: stockInfluencers.length,
      avgEngagementRate: 0,
      avgImpressions: 0,
      avgFollowerCount: 0,
      topInfluencers: [],
    };
    
    let totalEngagementRate = 0;
    let totalImpressions = 0;
    let totalFollowerCount = 0;
    
    // フォロワー数を数値に変換するヘルパー関数
    const parseFollowerCount = (followerCount) => {
      if (typeof followerCount === 'number') {
        return followerCount;
      }
      if (typeof followerCount === 'string') {
        // "100000-500000" のような範囲形式を処理（平均値を計算）
        const rangeMatch = followerCount.match(/(\d+)-(\d+)/);
        if (rangeMatch) {
          return (parseInt(rangeMatch[1], 10) + parseInt(rangeMatch[2], 10)) / 2;
        }
        // 単一の数値文字列
        const match = followerCount.match(/(\d+)/);
        if (match) {
          return parseInt(match[1], 10);
        }
      }
      return 0;
    };
    
    // インプレッション数を数値に変換するヘルパー関数
    const parseImpressions = (impressions) => {
      if (typeof impressions === 'number') {
        return impressions;
      }
      if (typeof impressions === 'string') {
        // "300000+" や "100000-200000" のような形式を処理
        const match = impressions.match(/(\d+)/);
        if (match) {
          return parseInt(match[1], 10);
        }
        // 範囲の場合は平均値を計算
        const rangeMatch = impressions.match(/(\d+)-(\d+)/);
        if (rangeMatch) {
          return (parseInt(rangeMatch[1], 10) + parseInt(rangeMatch[2], 10)) / 2;
        }
      }
      return 0;
    };
    
    for (const inf of stockInfluencers) {
      const engagementRate = inf.engagementRate || 0;
      const impressions = parseImpressions(inf.recentImpressions);
      const followerCount = parseFollowerCount(inf.followerCount);
      
      totalEngagementRate += engagementRate;
      totalImpressions += impressions;
      totalFollowerCount += followerCount;
    }
    
    stats.avgEngagementRate = stockInfluencers.length > 0 
      ? (totalEngagementRate / stockInfluencers.length) * 100 
      : 0;
    stats.avgImpressions = stockInfluencers.length > 0 
      ? totalImpressions / stockInfluencers.length 
      : 0;
    stats.avgFollowerCount = stockInfluencers.length > 0 
      ? totalFollowerCount / stockInfluencers.length 
      : 0;
    
    // トップインフルエンサー（エンゲージメント率順）
    stats.topInfluencers = stockInfluencers
      .map(inf => ({
        username: inf.username,
        engagementRate: (inf.engagementRate || 0) * 100,
        impressions: parseImpressions(inf.recentImpressions),
        followerCount: parseFollowerCount(inf.followerCount),
      }))
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 10);
    
    console.log(`📊 平均エンゲージメント率: ${stats.avgEngagementRate.toFixed(2)}%`);
    console.log(`📊 平均インプレッション数: ${stats.avgImpressions.toLocaleString()}`);
    console.log(`📊 平均フォロワー数: ${stats.avgFollowerCount.toLocaleString()}\n`);
    
    console.log(`🏆 トップ10インフルエンサー（エンゲージメント率順）:`);
    stats.topInfluencers.forEach((inf, index) => {
      console.log(`  ${index + 1}. @${inf.username}`);
      console.log(`     - エンゲージメント率: ${inf.engagementRate.toFixed(2)}%`);
      console.log(`     - インプレッション数: ${inf.impressions.toLocaleString()}`);
      console.log(`     - フォロワー数: ${inf.followerCount.toLocaleString()}`);
    });
    
    report.stockAnalysis[lang] = stats;
    
    // 2. 過去の実績データ分析
    console.log(`\n📈 過去7日間の実績データを分析中...`);
    const historicalData = await analyzeInfluencerPerformance(7);
    
    const langHistoricalData = historicalData.filter(inf => {
      // 言語別のフィルタリング（現時点では全データを表示）
      return true;
    });
    
    if (langHistoricalData.length > 0) {
      console.log(`✅ ${langHistoricalData.length}人のインフルエンサーに実績データがあります`);
      
      const topHistorical = langHistoricalData.slice(0, 5);
      console.log(`\n🏆 過去7日間のトップ5インフルエンサー:`);
      topHistorical.forEach((inf, index) => {
        console.log(`  ${index + 1}. @${inf.username}`);
        console.log(`     - エンゲージメント率: ${inf.avgEngagementRate.toFixed(2)}%`);
        console.log(`     - 総インプレッション: ${inf.totalImpressions.toLocaleString()}`);
        console.log(`     - 総エンゲージメント: ${inf.totalEngagements.toLocaleString()}`);
        console.log(`     - 引用リポスト数: ${inf.count}`);
      });
      
      report.historicalPerformance[lang] = {
        count: langHistoricalData.length,
        topInfluencers: topHistorical.map(inf => ({
          username: inf.username,
          avgEngagementRate: inf.avgEngagementRate,
          totalImpressions: inf.totalImpressions,
          totalEngagements: inf.totalEngagements,
          count: inf.count,
        })),
      };
    } else {
      console.log(`⚠️ 過去7日間の実績データがありません`);
      report.historicalPerformance[lang] = {
        count: 0,
        topInfluencers: [],
      };
    }
    
    // 3. 期待されるパフォーマンスの計算
    console.log(`\n🎯 期待されるパフォーマンスを計算中...`);
    const target = getImpressionTargetForLang(lang);
    
    // ストックインフルエンサーから期待値を計算
    const expectedImpressions = stats.avgImpressions * stockInfluencers.length;
    const expectedEngagements = expectedImpressions * (stats.avgEngagementRate / 100);
    
    console.log(`📊 期待される総インプレッション: ${expectedImpressions.toLocaleString()}`);
    console.log(`📊 期待される総エンゲージメント: ${expectedEngagements.toLocaleString()}`);
    console.log(`📊 目標インプレッション範囲: ${target.min.toLocaleString()} - ${target.max.toLocaleString()}`);
    
    const targetAchievement = expectedImpressions >= target.min 
      ? (expectedImpressions >= target.max ? 'exceeded' : 'achieved')
      : 'below_target';
    
    console.log(`📊 目標達成状況: ${targetAchievement === 'exceeded' ? '✅ 目標超過' : targetAchievement === 'achieved' ? '✅ 目標達成' : '⚠️ 目標未達'}`);
    
    report.expectedPerformance[lang] = {
      expectedImpressions,
      expectedEngagements,
      targetMin: target.min,
      targetMax: target.max,
      targetAchievement,
      avgEngagementRate: stats.avgEngagementRate,
    };
    
    // 4. 推奨事項
    console.log(`\n💡 推奨事項:`);
    const recommendations = [];
    
    if (stats.avgEngagementRate < 5) {
      recommendations.push(`- エンゲージメント率が低い（${stats.avgEngagementRate.toFixed(2)}%）。より高エンゲージメント率のインフルエンサーを探すことを推奨`);
    }
    
    if (expectedImpressions < target.min) {
      recommendations.push(`- 期待インプレッション数が目標未達。より高インプレッションのインフルエンサーを追加することを推奨`);
    }
    
    if (stockInfluencers.length < 10) {
      recommendations.push(`- ストック数が少ない（${stockInfluencers.length}人）。より多くのインフルエンサーをストックすることを推奨`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push(`- 現在のストックは良好です。継続的な監視を推奨`);
    }
    
    recommendations.forEach(rec => console.log(`  ${rec}`));
    
    report.recommendations[lang] = recommendations;
  }
  
  // 5. 全体サマリー
  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 全体サマリー`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  let totalStockCount = 0;
  let totalExpectedImpressions = 0;
  let totalExpectedEngagements = 0;
  
  for (const lang of SUPPORTED_LANGS) {
    const stock = report.stockAnalysis[lang];
    const expected = report.expectedPerformance[lang];
    
    if (stock && stock.count > 0) {
      totalStockCount += stock.count;
      totalExpectedImpressions += expected?.expectedImpressions || 0;
      totalExpectedEngagements += expected?.expectedEngagements || 0;
    }
  }
  
  console.log(`📊 総ストック数: ${totalStockCount}人`);
  console.log(`📊 総期待インプレッション: ${totalExpectedImpressions.toLocaleString()}`);
  console.log(`📊 総期待エンゲージメント: ${totalExpectedEngagements.toLocaleString()}`);
  
  report.summary = {
    totalStockCount,
    totalExpectedImpressions,
    totalExpectedEngagements,
  };
  
  // レポートをファイルに保存
  const fs = require('fs');
  const path = require('path');
  const reportPath = path.join(__dirname, '../docs/INFLUENCER_PERFORMANCE_ANALYSIS_2026-01-25.md');
  
  let markdownReport = `# インフルエンサーパフォーマンス分析レポート（2026-01-25）

**生成日時**: ${report.generatedAt}  
**分析者**: COO（Cursor/Composer 1）

---

## 📊 全体サマリー

- **総ストック数**: ${totalStockCount}人
- **総期待インプレッション**: ${totalExpectedImpressions.toLocaleString()}
- **総期待エンゲージメント**: ${totalExpectedEngagements.toLocaleString()}

---

## 📋 言語別詳細分析

`;

  for (const lang of SUPPORTED_LANGS) {
    const stock = report.stockAnalysis[lang];
    const expected = report.expectedPerformance[lang];
    const historical = report.historicalPerformance[lang];
    const recommendations = report.recommendations[lang];
    
    if (!stock || stock.count === 0) {
      markdownReport += `### ${lang.toUpperCase()} 言語\n\n`;
      markdownReport += `#### 📊 ストック統計\n\n`;
      markdownReport += `- **ストック数**: 0人 ⚠️ **ストックが空です**\n\n`;
      
      if (expected) {
        markdownReport += `#### 🎯 期待されるパフォーマンス\n\n`;
        markdownReport += `- **期待される総インプレッション**: 0（ストックが空のため計算不可）\n`;
        markdownReport += `- **期待される総エンゲージメント**: 0（ストックが空のため計算不可）\n`;
        markdownReport += `- **目標インプレッション範囲**: ${expected.targetMin.toLocaleString()} - ${expected.targetMax.toLocaleString()}\n`;
        markdownReport += `- **目標達成状況**: ⚠️ **目標未達**（ストックが空のため）\n\n`;
      }
      
      if (recommendations && recommendations.length > 0) {
        markdownReport += `#### 💡 推奨事項\n\n`;
        recommendations.forEach(rec => {
          markdownReport += `- ${rec}\n`;
        });
        markdownReport += `\n`;
      }
      
      markdownReport += `---\n\n`;
      continue;
    }
    
    markdownReport += `### ${lang.toUpperCase()} 言語\n\n`;
    markdownReport += `#### 📊 ストック統計\n\n`;
    markdownReport += `- **ストック数**: ${stock.count}人\n`;
    markdownReport += `- **平均エンゲージメント率**: ${stock.avgEngagementRate.toFixed(2)}%\n`;
    markdownReport += `- **平均インプレッション数**: ${stock.avgImpressions.toLocaleString()}\n`;
    markdownReport += `- **平均フォロワー数**: ${stock.avgFollowerCount.toLocaleString()}\n\n`;
    
    markdownReport += `#### 🏆 トップ10インフルエンサー（エンゲージメント率順）\n\n`;
    stock.topInfluencers.forEach((inf, index) => {
      markdownReport += `${index + 1}. **@${inf.username}**\n`;
      markdownReport += `   - エンゲージメント率: ${inf.engagementRate.toFixed(2)}%\n`;
      markdownReport += `   - インプレッション数: ${inf.impressions.toLocaleString()}\n`;
      markdownReport += `   - フォロワー数: ${inf.followerCount.toLocaleString()}\n\n`;
    });
    
    if (historical && historical.count > 0) {
      markdownReport += `#### 📈 過去7日間の実績データ\n\n`;
      markdownReport += `- **実績データがあるインフルエンサー数**: ${historical.count}人\n\n`;
      markdownReport += `**トップ5インフルエンサー:**\n\n`;
      historical.topInfluencers.forEach((inf, index) => {
        markdownReport += `${index + 1}. **@${inf.username}**\n`;
        markdownReport += `   - エンゲージメント率: ${inf.avgEngagementRate.toFixed(2)}%\n`;
        markdownReport += `   - 総インプレッション: ${inf.totalImpressions.toLocaleString()}\n`;
        markdownReport += `   - 総エンゲージメント: ${inf.totalEngagements.toLocaleString()}\n`;
        markdownReport += `   - 引用リポスト数: ${inf.count}\n\n`;
      });
    }
    
    markdownReport += `#### 🎯 期待されるパフォーマンス\n\n`;
    markdownReport += `- **期待される総インプレッション**: ${expected.expectedImpressions.toLocaleString()}\n`;
    markdownReport += `- **期待される総エンゲージメント**: ${expected.expectedEngagements.toLocaleString()}\n`;
    markdownReport += `- **目標インプレッション範囲**: ${expected.targetMin.toLocaleString()} - ${expected.targetMax.toLocaleString()}\n`;
    markdownReport += `- **目標達成状況**: ${expected.targetAchievement === 'exceeded' ? '✅ 目標超過' : expected.targetAchievement === 'achieved' ? '✅ 目標達成' : '⚠️ 目標未達'}\n\n`;
    
    markdownReport += `#### 💡 推奨事項\n\n`;
    recommendations.forEach(rec => {
      markdownReport += `- ${rec}\n`;
    });
    
    markdownReport += `\n---\n\n`;
  }
  
  markdownReport += `**最終更新**: 2026-01-25  
**分析者**: COO（Cursor/Composer 1）
`;
  
  fs.writeFileSync(reportPath, markdownReport, 'utf-8');
  console.log(`\n✅ レポートを保存しました: ${reportPath}`);
  
  return report;
}

// 実行
if (require.main === module) {
  analyzeInfluencerPerformanceReport()
    .then(() => {
      console.log('\n✅ 分析完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { analyzeInfluencerPerformanceReport };

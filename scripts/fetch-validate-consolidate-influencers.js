// scripts/fetch-validate-consolidate-influencers.js
// Grokから取得→検証→統合の全プロセスを自動化（最適解）

const fs = require('fs');
const path = require('path');
const { discoverInfluencersForQuoteRepost } = require('../services/grok/client');

const TARGET_DISTRIBUTION = {
  'en': 210,
  'es': 168,
  'pt-br': 168,
  'ar': 112,
  'ja': 98,
  'ko': 84
};

const FINAL_DIR = path.join(__dirname, '..', 'data', 'influencers');

// ディレクトリ作成
if (!fs.existsSync(FINAL_DIR)) {
  fs.mkdirSync(FINAL_DIR, { recursive: true });
}

function determineTier(followerCount) {
  if (typeof followerCount === 'string') {
    const match = followerCount.match(/(\d+)/);
    if (match) {
      followerCount = parseInt(match[1]);
    } else {
      return 'mid';
    }
  }
  
  if (typeof followerCount !== 'number') {
    return 'mid';
  }
  
  if (followerCount >= 10000) {
    return 'top';
  } else if (followerCount >= 1000) {
    return 'mid';
  } else {
    return 'bottom';
  }
}

function validateAndNormalize(rawInfluencers, lang) {
  return rawInfluencers
    .filter(inf => {
      // tweetId検証: 18-19桁の数値
      if (!inf.tweetId) {
        console.warn(`[Validate] Skipping @${inf.username || 'unknown'}: No tweetId`);
        return false;
      }
      const tweetIdStr = String(inf.tweetId).trim();
      if (!/^\d{18,19}$/.test(tweetIdStr)) {
        console.warn(`[Validate] Skipping @${inf.username || 'unknown'}: Invalid tweetId (${tweetIdStr})`);
        return false;
      }
      // username検証
      if (!inf.username || !inf.username.trim()) {
        console.warn(`[Validate] Skipping: No username`);
        return false;
      }
      // tweetText検証
      if (!inf.tweetText || !inf.tweetText.trim()) {
        console.warn(`[Validate] Skipping @${inf.username || 'unknown'}: No tweetText`);
        return false;
      }
      return true;
    })
    .map(inf => ({
      username: String(inf.username).trim().replace(/^@/, ''),
      tweetId: String(inf.tweetId).trim(),
      tweetText: inf.tweetText.substring(0, 280),
      lang: lang.toLowerCase(),
      engagementRate: inf.engagementRate || 0,
      followerCount: inf.followerCount || 0,
      recentImpressions: inf.recentImpressions || 0,
      tier: determineTier(inf.followerCount),
      discoveredAt: new Date().toISOString(),
      lastQuoteAt: null,
      quoteCount: 0,
      totalQuotes: 0,
      totalImpressions: 0,
      totalEngagements: 0,
      conversions: 0,
      shadowbanFlagged: false,
      isActive: true
    }));
}

// CSV削除: JSONのみで管理

async function fetchAndSaveLang(lang, targetCount) {
  console.log(`\n[${lang.toUpperCase()}] Grokから取得開始（目標${targetCount}人）`);
  
  try {
    // Grokから取得
    const influencers = await discoverInfluencersForQuoteRepost(lang, {
      maxResults: targetCount
    });
    
    if (!influencers || influencers.length === 0) {
      console.error(`[${lang.toUpperCase()}] ❌ Grokから取得失敗`);
      return { lang, success: false, count: 0 };
    }
    
    console.log(`[${lang.toUpperCase()}] ✅ Grokから取得: ${influencers.length}人`);
    
    // 検証・正規化
    const validated = validateAndNormalize(influencers, lang);
    console.log(`[${lang.toUpperCase()}] ✅ 検証後: ${validated.length}人（元: ${influencers.length}人）`);
    
    if (validated.length === 0) {
      console.error(`[${lang.toUpperCase()}] ❌ 検証後0人`);
      return { lang, success: false, count: 0 };
    }
    
    return { lang, success: true, count: validated.length, influencers: validated };
    
  } catch (error) {
    console.error(`[${lang.toUpperCase()}] ❌ エラー: ${error.message}`);
    return { lang, success: false, count: 0, error: error.message };
  }
}

function saveAllLanguages(results) {
  console.log('\n' + '='.repeat(80));
  console.log('データ保存');
  console.log('='.repeat(80));
  
  const allInfluencers = [];
  const byLang = {};
  
  // 言語別にJSONファイルを保存
  for (const result of results) {
    if (result.success && result.influencers) {
      const langFile = path.join(FINAL_DIR, `influencers-${result.lang}.json`);
      const langData = {
        lang: result.lang,
        updatedAt: new Date().toISOString(),
        count: result.influencers.length,
        influencers: result.influencers
      };
      fs.writeFileSync(langFile, JSON.stringify(langData, null, 2), 'utf-8');
      console.log(`✅ [${result.lang.toUpperCase()}] ${result.influencers.length}人を保存: ${langFile}`);
      
      allInfluencers.push(...result.influencers);
      byLang[result.lang] = result.influencers.length;
    } else {
      byLang[result.lang] = 0;
    }
  }
  
  // 統合データも保存（全言語まとめて）
  const consolidated = {
    updatedAt: new Date().toISOString(),
    total: allInfluencers.length,
    byLang: byLang,
    influencers: allInfluencers
  };
  
  const jsonFile = path.join(FINAL_DIR, 'influencers.json');
  fs.writeFileSync(jsonFile, JSON.stringify(consolidated, null, 2), 'utf-8');
  console.log(`✅ 統合データ保存: ${jsonFile} (${allInfluencers.length}人)`);
  
  return consolidated;
}

async function main() {
  console.log('='.repeat(80));
  console.log('Grokから取得→検証→統合の全プロセス（最適解）');
  console.log('='.repeat(80));
  console.log();
  
  const results = [];
  
  // ステップ1-2: 各言語を取得・検証
  for (const [lang, targetCount] of Object.entries(TARGET_DISTRIBUTION)) {
    const result = await fetchAndSaveLang(lang, targetCount);
    results.push(result);
    
    // 言語間で待機（APIレート制限対策）
    if (lang !== 'ko') {
      console.log(`\n次の言語処理前に10秒待機...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  // データ保存（言語別 + 統合）
  const consolidated = saveAllLanguages(results);
  
  // サマリー
  console.log('\n' + '='.repeat(80));
  console.log('📊 最終結果');
  console.log('='.repeat(80));
  
  const success = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const total = results.reduce((sum, r) => sum + r.count, 0);
  
  console.log(`✅ 成功: ${success.length}言語 (${total}人)`);
  console.log(`❌ 失敗: ${failed.length}言語`);
  console.log(`📊 合計: ${total}人 / 目標840人 (${((total/840)*100).toFixed(1)}%)`);
  console.log();
  
  console.log('言語別分布:');
  Object.entries(consolidated.byLang).forEach(([lang, count]) => {
    const target = TARGET_DISTRIBUTION[lang];
    const status = count >= target * 0.9 ? '✅' : count > 0 ? '⚠️' : '❌';
    console.log(`  ${status} [${lang.toUpperCase()}] ${count}人 / 目標${target}人`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('💡 次のステップ:');
  console.log('   1. git add data/influencers/');
  console.log('   2. git commit -m "Update influencers data"');
  console.log('   3. git push');
  console.log('   4. Vercelで自動デプロイ');
  console.log('   5. CronJobsが自動実行（6言語別、1分ごとにローテーション）');
  console.log('='.repeat(80));
}

main().catch(error => {
  console.error('❌ 致命的なエラー:', error.message);
  console.error('スタックトレース:', error.stack);
  process.exit(1);
});

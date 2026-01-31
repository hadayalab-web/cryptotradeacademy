// scripts/save-influencers-to-json-csv.js
// Grokから取得したインフルエンサーをJSON/CSVで保存（Git管理用）

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

const DATA_DIR = path.join(__dirname, '..', 'data', 'influencers');
const JSON_FILE = path.join(DATA_DIR, 'influencers.json');
const CSV_FILE = path.join(DATA_DIR, 'influencers.csv');

// データディレクトリを作成
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
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

function enrichInfluencerData(influencer, lang) {
  if (!influencer.tweetId) {
    throw new Error(`CRITICAL: enrichInfluencerData called with influencer without tweetId: @${influencer.username || 'unknown'}`);
  }
  
  const tweetIdStr = String(influencer.tweetId).trim();
  if (!/^\d{18,19}$/.test(tweetIdStr)) {
    throw new Error(`CRITICAL: Invalid tweetId format: ${tweetIdStr}`);
  }
  
  const followerCount = influencer.followerCount || 0;
  const tier = determineTier(followerCount);
  
  return {
    username: String(influencer.username).trim().replace(/^@/, ''),
    tweetId: tweetIdStr,
    tweetText: (influencer.tweetText || '').substring(0, 280), // 280文字制限
    lang: lang.toLowerCase(),
    engagementRate: influencer.engagementRate || 0,
    followerCount: followerCount,
    recentImpressions: influencer.recentImpressions || 0,
    tier: tier,
    discoveredAt: new Date().toISOString(),
    lastQuoteAt: null,
    quoteCount: 0,
    totalQuotes: 0,
    totalImpressions: 0,
    totalEngagements: 0,
    conversions: 0,
    shadowbanFlagged: false,
    isActive: true
  };
}

function saveToJSON(allInfluencers) {
  const data = {
    updatedAt: new Date().toISOString(),
    total: allInfluencers.length,
    byLang: {},
    influencers: allInfluencers
  };
  
  // 言語別に分類
  Object.keys(TARGET_DISTRIBUTION).forEach(lang => {
    data.byLang[lang] = allInfluencers.filter(inf => inf.lang === lang).length;
  });
  
  fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ JSON保存完了: ${JSON_FILE} (${allInfluencers.length}人)`);
}

function saveToCSV(allInfluencers) {
  const headers = [
    'username',
    'tweetId',
    'tweetText',
    'lang',
    'tier',
    'followerCount',
    'engagementRate',
    'recentImpressions',
    'discoveredAt',
    'isActive'
  ];
  
  const rows = allInfluencers.map(inf => {
    return headers.map(header => {
      const value = inf[header] || '';
      // CSVエスケープ: カンマ、改行、ダブルクォートを含む場合はダブルクォートで囲む
      if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
  });
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  fs.writeFileSync(CSV_FILE, csv, 'utf-8');
  console.log(`✅ CSV保存完了: ${CSV_FILE} (${allInfluencers.length}人)`);
}

async function fetchAndSaveLang(lang, targetCount) {
  console.log(`\n[${lang.toUpperCase()}] 取得開始: 目標${targetCount}人`);
  
  try {
    const influencers = await discoverInfluencersForQuoteRepost(lang, {
      maxResults: targetCount
    });
    
    if (!influencers || influencers.length === 0) {
      console.error(`[${lang.toUpperCase()}] ❌ 取得失敗`);
      return [];
    }
    
    console.log(`[${lang.toUpperCase()}] ✅ 取得: ${influencers.length}人`);
    
    // データ検証と拡張
    const validInfluencers = influencers
      .filter(inf => {
        if (!inf.tweetId) return false;
        const tweetIdStr = String(inf.tweetId).trim();
        if (!/^\d{18,19}$/.test(tweetIdStr)) return false;
        if (!inf.username || !inf.username.trim()) return false;
        if (!inf.tweetText || !inf.tweetText.trim()) return false;
        return true;
      })
      .map(inf => {
        try {
          const normalizedInf = {
            ...inf,
            tweetId: String(inf.tweetId).trim(),
            username: String(inf.username).trim().replace(/^@/, ''),
          };
          return enrichInfluencerData(normalizedInf, lang);
        } catch (error) {
          console.warn(`[${lang.toUpperCase()}] ❌ エラー: ${error.message}`);
          return null;
        }
      })
      .filter(inf => inf !== null);
    
    console.log(`[${lang.toUpperCase()}] ✅ 検証後: ${validInfluencers.length}人`);
    return validInfluencers;
    
  } catch (error) {
    console.error(`[${lang.toUpperCase()}] ❌ エラー: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('Grokからインフルエンサーを取得してJSON/CSVで保存');
  console.log('='.repeat(80));
  console.log(`保存先: ${DATA_DIR}`);
  console.log();
  
  const allInfluencers = [];
  
  for (const [lang, targetCount] of Object.entries(TARGET_DISTRIBUTION)) {
    const influencers = await fetchAndSaveLang(lang, targetCount);
    allInfluencers.push(...influencers);
    
    // 言語間で待機
    if (lang !== 'ko') {
      console.log(`\n次の言語処理前に10秒待機...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`合計: ${allInfluencers.length}人`);
  console.log('='.repeat(80));
  
  if (allInfluencers.length === 0) {
    console.error('❌ CRITICAL: インフルエンサーが0人です');
    process.exit(1);
  }
  
  // JSONとCSVで保存
  saveToJSON(allInfluencers);
  saveToCSV(allInfluencers);
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ 保存完了');
  console.log('='.repeat(80));
  console.log(`📁 JSON: ${JSON_FILE}`);
  console.log(`📁 CSV: ${CSV_FILE}`);
  console.log();
  console.log('💡 次のステップ:');
  console.log('   1. git add data/influencers/');
  console.log('   2. git commit -m "Update influencers data"');
  console.log('   3. git push');
  console.log('   4. Vercelでデプロイ');
  console.log('='.repeat(80));
}

main().catch(error => {
  console.error('❌ 致命的なエラー:', error.message);
  console.error('スタックトレース:', error.stack);
  process.exit(1);
});

// scripts/import-influencers-from-docs.js
// ドキュメントからインフルエンサーリストを抽出してKVストレージに保存

require('dotenv').config({ path: '.env' });

const fs = require('fs');
const path = require('path');
const { kv } = require('../utils/kv');
const { saveInfluencersToStock } = require('../services/x/influencerStock');

// ドキュメントから抽出したインフルエンサーデータ
const INFLUENCERS_DATA = {
  en: [
    { username: 'saylor', engagementRate: 0.15, followerCount: 500000, recentImpressions: 500000 },
    { username: 'CryptoHayes', engagementRate: 0.15, followerCount: 400000, recentImpressions: 250000 },
    { username: 'saifedean', engagementRate: 0.14, followerCount: 400000, recentImpressions: 250000 },
    { username: 'CryptoBirb', engagementRate: 0.13, followerCount: 400000, recentImpressions: 250000 },
    { username: 'LarkDavis', engagementRate: 0.13, followerCount: 500000, recentImpressions: 220000 },
    { username: 'CryptoWhale', engagementRate: 0.13, followerCount: 250000, recentImpressions: 200000 },
    { username: 'CryptoEd_NL', engagementRate: 0.12, followerCount: 500000, recentImpressions: 300000 },
    { username: 'guy', engagementRate: 0.12, followerCount: 300000, recentImpressions: 200000 },
    { username: 'CryptoCred', engagementRate: 0.12, followerCount: 500000, recentImpressions: 300000 },
    { username: 'CryptoCobain', engagementRate: 0.11, followerCount: 400000, recentImpressions: 220000 },
    { username: 'CryptoWendyO', engagementRate: 0.11, followerCount: 300000, recentImpressions: 200000 },
    { username: 'CryptoYoda', engagementRate: 0.11, followerCount: 400000, recentImpressions: 200000 },
    { username: 'CryptoMillionaire', engagementRate: 0.10, followerCount: 300000, recentImpressions: 180000 },
    { username: 'CryptoBull', engagementRate: 0.10, followerCount: 250000, recentImpressions: 150000 },
    { username: 'CryptoMaven', engagementRate: 0.10, followerCount: 200000, recentImpressions: 150000 },
    { username: 'CryptoGuru', engagementRate: 0.09, followerCount: 300000, recentImpressions: 180000 },
    { username: 'CryptoPro', engagementRate: 0.09, followerCount: 250000, recentImpressions: 150000 },
    { username: 'CryptoExpert', engagementRate: 0.09, followerCount: 200000, recentImpressions: 120000 },
    { username: 'CryptoAnalyst', engagementRate: 0.08, followerCount: 150000, recentImpressions: 100000 },
    { username: 'CryptoTrader', engagementRate: 0.08, followerCount: 100000, recentImpressions: 80000 },
  ],
  es: [
    { username: 'criptoexpert_es', engagementRate: 0.12, followerCount: 300000, recentImpressions: 100000 },
    { username: 'criptoespana', engagementRate: 0.12, followerCount: 300000, recentImpressions: 200000 },
    { username: 'btc_analyst_es', engagementRate: 0.11, followerCount: 75000, recentImpressions: 100000 },
    { username: 'tradermx_crypto', engagementRate: 0.11, followerCount: 300000, recentImpressions: 100000 },
    { username: 'criptonoticias', engagementRate: 0.10, followerCount: 300000, recentImpressions: 200000 },
    { username: 'criptoconserje', engagementRate: 0.10, followerCount: 75000, recentImpressions: 150000 },
    { username: 'elcriptotrader', engagementRate: 0.09, followerCount: 75000, recentImpressions: 100000 },
    { username: 'criptoinsider_es', engagementRate: 0.09, followerCount: 75000, recentImpressions: 100000 },
    { username: 'elbitcoinero', engagementRate: 0.09, followerCount: 75000, recentImpressions: 100000 },
    { username: 'criptolatino', engagementRate: 0.08, followerCount: 300000, recentImpressions: 150000 },
  ],
  'pt-br': [
    { username: 'btcturbo', engagementRate: 0.13, followerCount: 75000, recentImpressions: 100000 },
    { username: 'criptobtcbr', engagementRate: 0.12, followerCount: 300000, recentImpressions: 100000 },
    { username: 'btcwhalebr', engagementRate: 0.12, followerCount: 300000, recentImpressions: 100000 },
    { username: 'btcbrasilpro', engagementRate: 0.11, followerCount: 75000, recentImpressions: 100000 },
    { username: 'criptomasterbr', engagementRate: 0.11, followerCount: 75000, recentImpressions: 100000 },
    { username: 'bitcoinbrasilofc', engagementRate: 0.10, followerCount: 300000, recentImpressions: 100000 },
    { username: 'bitcoinheiros', engagementRate: 0.09, followerCount: 300000, recentImpressions: 100000 },
    { username: 'criptobrnews', engagementRate: 0.09, followerCount: 300000, recentImpressions: 100000 },
    { username: 'proptraderbr', engagementRate: 0.09, followerCount: 75000, recentImpressions: 100000 },
    { username: 'ethbtcbr', engagementRate: 0.09, followerCount: 75000, recentImpressions: 100000 },
  ],
  ar: [
    { username: 'saudi_crypto', engagementRate: 0.14, followerCount: 200000, recentImpressions: 350000 },
    { username: 'uae_crypto', engagementRate: 0.13, followerCount: 95000, recentImpressions: 300000 },
    { username: 'cryptoarabia', engagementRate: 0.12, followerCount: 150000, recentImpressions: 250000 },
    { username: 'jordan_btc', engagementRate: 0.12, followerCount: 35000, recentImpressions: 100000 },
    { username: 'btc_ksa', engagementRate: 0.11, followerCount: 80000, recentImpressions: 180000 },
    { username: 'arab_crypto', engagementRate: 0.10, followerCount: 120000, recentImpressions: 220000 },
    { username: 'arabic_btc', engagementRate: 0.10, followerCount: 60000, recentImpressions: 160000 },
    { username: 'mena_bitcoin', engagementRate: 0.09, followerCount: 45000, recentImpressions: 120000 },
    { username: 'crypto_qatar', engagementRate: 0.09, followerCount: 40000, recentImpressions: 110000 },
    { username: 'egy_btc', engagementRate: 0.08, followerCount: 30000, recentImpressions: 90000 },
  ],
  ja: [
    { username: 'meme_coin_hunter', engagementRate: 0.15, followerCount: 75000, recentImpressions: 100000 },
    { username: 'defi_master_jp', engagementRate: 0.14, followerCount: 75000, recentImpressions: 100000 },
    { username: 'link_oracle_jp', engagementRate: 0.14, followerCount: 30000, recentImpressions: 100000 },
    { username: 'crypto_news_jp', engagementRate: 0.13, followerCount: 300000, recentImpressions: 100000 },
    { username: 'doge_army_jp', engagementRate: 0.13, followerCount: 300000, recentImpressions: 100000 },
    { username: 'crypto_jppro', engagementRate: 0.12, followerCount: 300000, recentImpressions: 100000 },
    { username: 'eth_trader_jp', engagementRate: 0.12, followerCount: 30000, recentImpressions: 100000 },
    { username: 'solana_jp', engagementRate: 0.11, followerCount: 30000, recentImpressions: 100000 },
    { username: 'polygon_news', engagementRate: 0.11, followerCount: 75000, recentImpressions: 100000 },
    { username: 'whale_alert_jp', engagementRate: 0.10, followerCount: 30000, recentImpressions: 100000 },
  ],
  ko: [
    { username: 'bithumb_news', engagementRate: 0.097, followerCount: 300000, recentImpressions: 100000 },
    { username: 'btcpro_kr', engagementRate: 0.096, followerCount: 300000, recentImpressions: 100000 },
    { username: 'koreabitcoin', engagementRate: 0.095, followerCount: 75000, recentImpressions: 100000 },
    { username: 'btc_korea', engagementRate: 0.092, followerCount: 300000, recentImpressions: 100000 },
    { username: 'sol_korea', engagementRate: 0.091, followerCount: 30000, recentImpressions: 100000 },
    { username: 'btc_analyst_kr', engagementRate: 0.089, followerCount: 75000, recentImpressions: 100000 },
    { username: 'cryptokim_kr', engagementRate: 0.088, followerCount: 75000, recentImpressions: 100000 },
    { username: 'upbit_trader', engagementRate: 0.087, followerCount: 300000, recentImpressions: 100000 },
    { username: 'eth_kr', engagementRate: 0.086, followerCount: 75000, recentImpressions: 100000 },
    { username: 'crypto_hyun', engagementRate: 0.079, followerCount: 75000, recentImpressions: 100000 },
  ],
};

async function importInfluencers() {
  console.log('🔍 ドキュメントからインフルエンサーリストをKVストレージにインポート中...\n');
  
  const results = {};
  let totalImported = 0;
  
  for (const [lang, influencers] of Object.entries(INFLUENCERS_DATA)) {
    try {
      console.log(`📊 ${lang.toUpperCase()} 言語: ${influencers.length}人`);
      
      // tweetIdがないので、Grok APIで最新のツイートIDを取得する必要がある
      // ただし、今は一旦tweetIdなしで保存（後でGrok APIで更新可能）
      const influencersWithTweetId = influencers.map(inf => ({
        ...inf,
        tweetId: null, // 後でGrok APIで取得
        tweetText: null, // 後でGrok APIで取得
      }));
      
      // KVストレージに保存
      const saved = await saveInfluencersToStock(lang, influencersWithTweetId);
      
      if (saved) {
        results[lang] = {
          success: true,
          count: influencers.length,
        };
        totalImported += influencers.length;
        console.log(`  ✅ ${lang.toUpperCase()}: ${influencers.length}人をKVストレージに保存`);
      } else {
        results[lang] = {
          success: false,
          error: 'Failed to save to KV',
        };
        console.log(`  ❌ ${lang.toUpperCase()}: KVストレージへの保存に失敗`);
      }
    } catch (error) {
      console.error(`  ❌ ${lang.toUpperCase()}: エラー - ${error.message}`);
      results[lang] = {
        success: false,
        error: error.message,
      };
    }
  }
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 インポート結果サマリー`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  for (const [lang, result] of Object.entries(results)) {
    if (result.success) {
      console.log(`✅ ${lang.toUpperCase()}: ${result.count}人`);
    } else {
      console.log(`❌ ${lang.toUpperCase()}: ${result.error || 'Failed'}`);
    }
  }
  
  console.log(`\n✅✅✅ 合計 ${totalImported}人のインフルエンサーをKVストレージにインポートしました！`);
  console.log(`\n⚠️ 注意: tweetIdがまだ設定されていません。`);
  console.log(`   引用リポストを実行する前に、Grok APIで最新のツイートIDを取得してください。`);
  console.log(`   実行方法: node scripts/discover-max-influencers.js または /api/x-update-influencer-stock を呼び出し\n`);
  
  return results;
}

if (require.main === module) {
  importInfluencers()
    .then(() => {
      console.log('✅ 完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { importInfluencers };

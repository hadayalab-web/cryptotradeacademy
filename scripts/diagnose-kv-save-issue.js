// scripts/diagnose-kv-save-issue.js
// KV保存問題の診断スクリプト

const { kv } = require('../utils/kv');
const { saveInfluencersToStock } = require('../services/x/influencerStock');

const STOCK_KEY_PREFIX = 'x:influencer_stock:';

function getStockKey(lang) {
  return `${STOCK_KEY_PREFIX}${lang.toLowerCase()}`;
}

async function diagnoseKVSaveIssue() {
  console.log('='.repeat(80));
  console.log('KV保存問題の診断');
  console.log('='.repeat(80));
  console.log('');

  // 1. KV接続確認
  console.log('1️⃣ KV接続確認');
  console.log('-'.repeat(80));
  if (!kv) {
    console.error('❌ KVインスタンスがnullです');
    console.error('環境変数を確認してください:');
    console.error('  - KV_REST_API_URL');
    console.error('  - KV_REST_API_TOKEN');
    console.error('  - KV_URL');
    process.exit(1);
  }
  console.log('✅ KVインスタンス存在確認');

  // 2. KV接続テスト
  console.log('\n2️⃣ KV接続テスト');
  console.log('-'.repeat(80));
  try {
    const testKey = `x:diagnostic:test:${Date.now()}`;
    const testValue = { test: true, timestamp: new Date().toISOString() };
    
    console.log(`テストキー: ${testKey}`);
    console.log(`テスト値:`, JSON.stringify(testValue, null, 2));
    
    const setResult = await kv.set(testKey, testValue);
    console.log(`kv.set() 結果:`, setResult);
    
    if (!setResult) {
      console.error('❌ kv.set()がfalseを返しました');
      console.error('KVへの書き込みが失敗しています');
      process.exit(1);
    }
    
    const getValue = await kv.get(testKey);
    console.log(`kv.get() 結果:`, getValue);
    
    if (!getValue || JSON.stringify(getValue) !== JSON.stringify(testValue)) {
      console.error('❌ kv.get()で保存した値が取得できません');
      console.error('期待値:', JSON.stringify(testValue, null, 2));
      console.error('実際の値:', JSON.stringify(getValue, null, 2));
      process.exit(1);
    }
    
    await kv.del(testKey);
    console.log('✅ KV接続テスト成功');
  } catch (error) {
    console.error('❌ KV接続テスト失敗:', error.message);
    console.error('スタック:', error.stack);
    process.exit(1);
  }

  // 3. 既存ストック確認
  console.log('\n3️⃣ 既存ストック確認');
  console.log('-'.repeat(80));
  const langs = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
  const stockStatus = {};
  
  for (const lang of langs) {
    const stockKey = getStockKey(lang);
    try {
      const stock = await kv.get(stockKey);
      const count = Array.isArray(stock) ? stock.length : 0;
      stockStatus[lang] = {
        exists: stock !== null,
        count: count,
        sample: count > 0 ? stock[0] : null
      };
      
      if (count > 0) {
        console.log(`✅ ${lang}: ${count}人（キー: ${stockKey}）`);
        if (stock[0]) {
          console.log(`   サンプル:`, JSON.stringify({
            username: stock[0].username,
            tweetId: stock[0].tweetId,
            lang: stock[0].lang,
            tier: stock[0].tier
          }, null, 2));
        }
      } else {
        if (stock === null) {
          console.log(`⚠️  ${lang}: キーが存在しません（${stockKey}）`);
        } else {
          console.log(`⚠️  ${lang}: 空配列（0人）`);
        }
      }
    } catch (error) {
      console.error(`❌ ${lang}の取得エラー:`, error.message);
      stockStatus[lang] = { exists: false, count: 0, error: error.message };
    }
  }

  // 4. テスト保存（1人のインフルエンサー）
  console.log('\n4️⃣ テスト保存（1人のインフルエンサー）');
  console.log('-'.repeat(80));
  const testLang = 'en';
  const testInfluencer = {
    username: 'test_influencer_' + Date.now(),
    tweetId: '123456789012345678',
    tweetText: 'Test tweet for KV diagnostic',
    lang: testLang,
    engagementRate: 0.05,
    followerCount: 10000,
    recentImpressions: 50000,
    tier: 'mid',
    discoveredAt: new Date().toISOString(),
    lastQuoteAt: null,
    quoteCount: 0,
    lastQuoteDate: null,
    totalQuotes: 0,
    totalImpressions: 0,
    totalEngagements: 0,
    conversions: 0,
    shadowbanFlagged: false,
    shadowbanDetectedAt: null,
    rotationCycle: 0,
    isActive: true,
    notes: '',
    tags: []
  };
  
  console.log(`テストインフルエンサー:`, JSON.stringify(testInfluencer, null, 2));
  
  try {
    const saveResult = await saveInfluencersToStock(testLang, [testInfluencer]);
    console.log(`saveInfluencersToStock() 結果:`, saveResult);
    
    if (!saveResult) {
      console.error('❌ saveInfluencersToStock()がfalseを返しました');
      console.error('保存が失敗しています');
    } else {
      console.log('✅ saveInfluencersToStock()成功');
      
      // 保存確認
      const savedStock = await kv.get(getStockKey(testLang));
      const savedCount = Array.isArray(savedStock) ? savedStock.length : 0;
      console.log(`保存後のストック数: ${savedCount}`);
      
      if (savedCount > 0) {
        const found = savedStock.find(inf => inf.username === testInfluencer.username);
        if (found) {
          console.log('✅ テストインフルエンサーがKVに保存されていることを確認');
        } else {
          console.error('❌ テストインフルエンサーがKVに見つかりません');
        }
      } else {
        console.error('❌ 保存後もストックが空です');
      }
    }
  } catch (error) {
    console.error('❌ テスト保存エラー:', error.message);
    console.error('スタック:', error.stack);
  }

  // 5. サマリー
  console.log('\n' + '='.repeat(80));
  console.log('📊 診断サマリー');
  console.log('='.repeat(80));
  
  const totalStocked = Object.values(stockStatus).reduce((sum, s) => sum + (s.count || 0), 0);
  console.log(`総ストック数: ${totalStocked}人`);
  
  const stockedLangs = Object.entries(stockStatus).filter(([lang, s]) => s.count > 0);
  console.log(`ストック済み言語: ${stockedLangs.length}言語`);
  stockedLangs.forEach(([lang, s]) => {
    console.log(`  - ${lang}: ${s.count}人`);
  });
  
  const emptyLangs = Object.entries(stockStatus).filter(([lang, s]) => s.count === 0);
  console.log(`空の言語: ${emptyLangs.length}言語`);
  emptyLangs.forEach(([lang, s]) => {
    console.log(`  - ${lang}: ${s.exists ? '空配列' : 'キーなし'}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ 診断完了');
  console.log('='.repeat(80));
}

// 実行
diagnoseKVSaveIssue().catch(error => {
  console.error('❌ 致命的なエラー:', error.message);
  console.error('スタック:', error.stack);
  process.exit(1);
});

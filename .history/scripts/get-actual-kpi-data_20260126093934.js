// scripts/get-actual-kpi-data.js
// 実際のKPIデータを取得（Whopコンバージョン、Telegramオプトイン、収益など）

const { kv } = require('@vercel/kv');
const { getInfluencersFromStock } = require('../services/x/influencerStock');
const { getPostsForDate } = require('../services/x/postTracker');
const { loadFreeUsers } = require('../services/free-users/manager');

// Whop APIクライアント（必要に応じて）
let whopClient = null;
try {
  const whopModule = require('../services/whop/client');
  whopClient = whopModule;
} catch (error) {
  console.warn('[Get Actual KPI] Whop client not available:', error.message);
}

/**
 * 実際のKPIデータを取得
 */
async function getActualKpiData() {
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = yesterday.toISOString().split('T')[0];

  console.log('📊 実際のKPIデータを取得中...\n');
  console.log(`📅 対象日: ${yesterdayString} (昨日)`);
  console.log(`📅 今日: ${todayString}\n`);

  const results = {
    date: {
      today: todayString,
      yesterday: yesterdayString,
    },
    xPosts: {
      yesterday: null,
      today: null,
    },
    telegramOptIns: {
      total: null,
      yesterday: null,
      today: null,
    },
    whopConversions: {
      total: null,
      yesterday: null,
      today: null,
      revenue: null,
    },
    impressions: {
      yesterday: null,
      today: null,
    },
    errors: [],
  };

  try {
    // 1. X投稿データを取得
    console.log('1️⃣ X投稿データを取得中...');
    try {
      const yesterdayPosts = await getPostsForDate(yesterdayString);
      const todayPosts = await getPostsForDate(todayString);
      
      results.xPosts.yesterday = yesterdayPosts.length;
      results.xPosts.today = todayPosts.length;
      
      console.log(`   ✅ 昨日の投稿数: ${yesterdayPosts.length}件`);
      console.log(`   ✅ 今日の投稿数: ${todayPosts.length}件`);
      
      // インプレッション数の集計（投稿データから）
      let yesterdayImpressions = 0;
      let todayImpressions = 0;
      
      // 注意: 投稿データにインプレッション数が含まれている場合のみ集計
      // 実際のメトリクスはX APIから取得する必要がある
      
      results.impressions.yesterday = yesterdayImpressions;
      results.impressions.today = todayImpressions;
    } catch (error) {
      console.error(`   ❌ X投稿データ取得エラー: ${error.message}`);
      results.errors.push(`X投稿データ取得エラー: ${error.message}`);
    }

    // 2. Telegramオプトインデータを取得
    console.log('\n2️⃣ Telegramオプトインデータを取得中...');
    try {
      const freeUsers = await loadFreeUsers();
      
      if (freeUsers && Array.isArray(freeUsers)) {
        // 日付別にフィルタリング
        const yesterdayUsers = freeUsers.filter(user => {
          if (!user.createdAt) return false;
          const userDate = new Date(user.createdAt).toISOString().split('T')[0];
          return userDate === yesterdayString;
        });
        
        const todayUsers = freeUsers.filter(user => {
          if (!user.createdAt) return false;
          const userDate = new Date(user.createdAt).toISOString().split('T')[0];
          return userDate === todayString;
        });
        
        results.telegramOptIns.total = freeUsers.length;
        results.telegramOptIns.yesterday = yesterdayUsers.length;
        results.telegramOptIns.today = todayUsers.length;
        
        console.log(`   ✅ 総オプトイン数: ${freeUsers.length}人`);
        console.log(`   ✅ 昨日のオプトイン: ${yesterdayUsers.length}人`);
        console.log(`   ✅ 今日のオプトイン: ${todayUsers.length}人`);
      } else {
        console.warn('   ⚠️ フリーユーザーデータが取得できませんでした');
        results.errors.push('フリーユーザーデータが取得できませんでした');
      }
    } catch (error) {
      console.error(`   ❌ Telegramオプトインデータ取得エラー: ${error.message}`);
      results.errors.push(`Telegramオプトインデータ取得エラー: ${error.message}`);
    }

    // 3. Whopコンバージョンデータを取得
    console.log('\n3️⃣ Whopコンバージョンデータを取得中...');
    try {
      // Whop APIからメンバー情報を取得
      if (whopClient && whopClient.getMembers) {
        const members = await whopClient.getMembers();
        
        if (members && Array.isArray(members)) {
          // 日付別にフィルタリング
          const yesterdayMembers = members.filter(member => {
            if (!member.created_at) return false;
            const memberDate = new Date(member.created_at).toISOString().split('T')[0];
            return memberDate === yesterdayString;
          });
          
          const todayMembers = members.filter(member => {
            if (!member.created_at) return false;
            const memberDate = new Date(member.created_at).toISOString().split('T')[0];
            return memberDate === todayString;
          });
          
          results.whopConversions.total = members.length;
          results.whopConversions.yesterday = yesterdayMembers.length;
          results.whopConversions.today = todayMembers.length;
          
          // 収益の計算（メンバーのプラン情報から）
          // 注意: 実際の収益はWhop APIから取得する必要がある
          
          console.log(`   ✅ 総メンバー数: ${members.length}人`);
          console.log(`   ✅ 昨日のコンバージョン: ${yesterdayMembers.length}人`);
          console.log(`   ✅ 今日のコンバージョン: ${todayMembers.length}人`);
        } else {
          console.warn('   ⚠️ Whopメンバーデータが取得できませんでした');
          results.errors.push('Whopメンバーデータが取得できませんでした');
        }
      } else {
        console.warn('   ⚠️ Whop APIクライアントが利用できません');
        results.errors.push('Whop APIクライアントが利用できません');
      }
    } catch (error) {
      console.error(`   ❌ Whopコンバージョンデータ取得エラー: ${error.message}`);
      results.errors.push(`Whopコンバージョンデータ取得エラー: ${error.message}`);
    }

    // 4. KVから追加データを取得
    console.log('\n4️⃣ KVから追加データを取得中...');
    try {
      if (kv) {
        // 投稿IDからメトリクスを取得
        const postKeys = await kv.keys('x:post:*');
        console.log(`   ✅ 投稿キー数: ${postKeys.length}件`);
        
        // メトリクスキーを取得
        const metricsKeys = await kv.keys('x:metrics:*');
        console.log(`   ✅ メトリクスキー数: ${metricsKeys.length}件`);
      } else {
        console.warn('   ⚠️ KVが利用できません');
        results.errors.push('KVが利用できません');
      }
    } catch (error) {
      console.error(`   ❌ KVデータ取得エラー: ${error.message}`);
      results.errors.push(`KVデータ取得エラー: ${error.message}`);
    }

    // 結果を表示
    console.log('\n📊 実際のKPIデータサマリー:');
    console.log('='.repeat(60));
    console.log(`📅 対象日: ${yesterdayString} (昨日)`);
    console.log(`📅 今日: ${todayString}`);
    console.log('');
    console.log('📝 X投稿:');
    console.log(`   昨日: ${results.xPosts.yesterday || 0}件`);
    console.log(`   今日: ${results.xPosts.today || 0}件`);
    console.log('');
    console.log('👥 Telegramオプトイン:');
    console.log(`   総数: ${results.telegramOptIns.total || 0}人`);
    console.log(`   昨日: ${results.telegramOptIns.yesterday || 0}人`);
    console.log(`   今日: ${results.telegramOptIns.today || 0}人`);
    console.log('');
    console.log('💰 Whopコンバージョン:');
    console.log(`   総数: ${results.whopConversions.total || 0}人`);
    console.log(`   昨日: ${results.whopConversions.yesterday || 0}人`);
    console.log(`   今日: ${results.whopConversions.today || 0}人`);
    console.log('');
    
    if (results.errors.length > 0) {
      console.log('⚠️ エラー:');
      results.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    console.log('='.repeat(60));

    return results;
  } catch (error) {
    console.error('❌ KPIデータ取得エラー:', error);
    throw error;
  }
}

// スクリプト実行
if (require.main === module) {
  getActualKpiData()
    .then((results) => {
      console.log('\n✅ スクリプト実行完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ スクリプト実行エラー:', error);
      process.exit(1);
    });
}

module.exports = { getActualKpiData };

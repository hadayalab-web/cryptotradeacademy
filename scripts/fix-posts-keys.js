// scripts/fix-posts-keys.js
// 既存の数値データをクリアして、投稿履歴を正しく保存できるようにする

require('dotenv').config({ path: '.env' });

let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.error('❌ @vercel/kv not available:', error.message);
  process.exit(1);
}

async function fixPostsKeys() {
  console.log('🔧 投稿履歴キーの修正を開始...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const now = new Date();
  const results = {};
  
  // 過去7日間のキーを確認・修正
  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    const postsKey = `x:posts:${dateString}`;
    const countKey = `x:posts_count:${dateString}`;
    
    console.log(`📅 ${dateString}:`);
    
    try {
      const postsData = await kv.get(postsKey);
      const countData = await kv.get(countKey);
      
      // 数値が保存されている場合は、投稿カウントキーに移行してからクリア
      if (typeof postsData === 'number') {
        console.log(`   ⚠️ 数値データが見つかりました: ${postsData}`);
        
        // 投稿カウントキーに移行（まだ存在しない場合）
        if (typeof countData !== 'number') {
          await kv.set(countKey, postsData, { ex: 86400 * 2 });
          console.log(`   ✅ 投稿カウントを ${countKey} に移行しました`);
        }
        
        // 投稿履歴キーを空配列に変換
        await kv.set(postsKey, [], { ex: 86400 * 30 });
        console.log(`   ✅ 投稿履歴キーを空配列にクリアしました`);
        
        results[dateString] = {
          fixed: true,
          oldValue: postsData,
          action: 'migrated_count_and_cleared',
        };
      } else if (Array.isArray(postsData)) {
        console.log(`   ✅ 投稿履歴: ${postsData.length}件`);
        results[dateString] = {
          fixed: false,
          postCount: postsData.length,
          action: 'already_array',
        };
      } else if (postsData === null || postsData === undefined) {
        console.log(`   ℹ️ データなし`);
        results[dateString] = {
          fixed: false,
          action: 'no_data',
        };
      } else {
        console.log(`   ⚠️ 予期しないデータ形式: ${typeof postsData}`);
        results[dateString] = {
          fixed: false,
          dataType: typeof postsData,
          action: 'unexpected_type',
        };
      }
      
      // 投稿カウントの状態を表示
      if (typeof countData === 'number') {
        console.log(`   📊 投稿カウント: ${countData}件`);
      }
      
    } catch (error) {
      console.error(`   ❌ エラー: ${error.message}`);
      results[dateString] = {
        fixed: false,
        error: error.message,
      };
    }
    
    console.log('');
  }
  
  // サマリー
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 修正結果サマリー\n');
  
  const fixedDates = Object.keys(results).filter(date => results[date].fixed);
  const arrayDates = Object.keys(results).filter(date => results[date].postCount !== undefined);
  
  if (fixedDates.length > 0) {
    console.log(`✅ 修正完了: ${fixedDates.length}日`);
    fixedDates.forEach(date => {
      const result = results[date];
      console.log(`   - ${date}: 数値(${result.oldValue}) → 空配列に変換`);
    });
  }
  
  if (arrayDates.length > 0) {
    console.log(`\n📊 投稿履歴あり: ${arrayDates.length}日`);
    arrayDates.forEach(date => {
      const result = results[date];
      console.log(`   - ${date}: ${result.postCount}件`);
    });
  }
  
  const totalPosts = arrayDates.reduce((sum, date) => sum + (results[date].postCount || 0), 0);
  if (totalPosts > 0) {
    console.log(`\n📊 総投稿履歴数: ${totalPosts}件`);
  }
  
  return results;
}

// 実行
if (require.main === module) {
  fixPostsKeys()
    .then(() => {
      console.log('\n✅ 修正完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { fixPostsKeys };

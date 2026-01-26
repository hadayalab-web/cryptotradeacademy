// scripts/get-post-logs.js
// KVストレージから投稿ログを取得して表示

const { getLogsForDate, getRecentLogs } = require('../services/core/postLogger');

async function getPostLogs() {
  const args = process.argv.slice(2);
  const dateArg = args.find(arg => arg.startsWith('--date='));
  const daysArg = args.find(arg => arg.startsWith('--days='));
  
  const date = dateArg ? dateArg.split('=')[1] : null;
  const days = daysArg ? parseInt(daysArg.split('=')[1]) : 7;
  
  console.log('='.repeat(100));
  console.log('📊 投稿ログ取得');
  console.log('='.repeat(100));
  console.log();
  
  try {
    let logs = [];
    
    if (date) {
      console.log(`📅 指定日のログを取得: ${date}`);
      logs = await getLogsForDate(date);
    } else {
      console.log(`📅 最近${days}日間のログを取得`);
      logs = await getRecentLogs(days);
    }
    
    console.log(`\n✅ 取得したログ数: ${logs.length}件`);
    
    if (logs.length === 0) {
      console.log('\n⚠️  ログが見つかりませんでした');
      return;
    }
    
    // 統計情報
    const successLogs = logs.filter(log => log.type === 'POST_SUCCESS');
    const failureLogs = logs.filter(log => log.type === 'POST_FAILURE');
    
    console.log('\n' + '='.repeat(100));
    console.log('📊 統計情報');
    console.log('='.repeat(100));
    console.log(`\n総ログ数: ${logs.length}件`);
    console.log(`成功: ${successLogs.length}件`);
    console.log(`失敗: ${failureLogs.length}件`);
    
    // タイプ別
    const byType = {};
    logs.forEach(log => {
      const postType = log.postType || 'unknown';
      byType[postType] = (byType[postType] || 0) + 1;
    });
    
    if (Object.keys(byType).length > 0) {
      console.log('\n投稿タイプ別:');
      for (const [type, count] of Object.entries(byType)) {
        console.log(`   ${type}: ${count}件`);
      }
    }
    
    // 言語別
    const byLang = {};
    logs.forEach(log => {
      const lang = log.lang || 'unknown';
      byLang[lang] = (byLang[lang] || 0) + 1;
    });
    
    if (Object.keys(byLang).length > 0) {
      console.log('\n言語別:');
      for (const [lang, count] of Object.entries(byLang).sort((a, b) => b[1] - a[1])) {
        console.log(`   ${lang}: ${count}件`);
      }
    }
    
    // 成功ログの詳細
    if (successLogs.length > 0) {
      console.log('\n' + '='.repeat(100));
      console.log('✅ 投稿成功ログ');
      console.log('='.repeat(100));
      
      successLogs.slice(0, 20).forEach((log, idx) => {
        console.log(`\n${idx + 1}. [${log.timestamp}]`);
        console.log(`   タイプ: ${log.postType}`);
        console.log(`   言語: ${log.lang}`);
        console.log(`   Quote Tweet ID: ${log.quoteTweetId || 'N/A'}`);
        console.log(`   Original Tweet ID: ${log.originalTweetId || 'N/A'}`);
        console.log(`   インフルエンサー: @${log.influencerUsername || 'N/A'}`);
        console.log(`   推定インプレッション: ${(log.estimatedImpressions || 0).toLocaleString()}`);
        if (log.impressions !== undefined) {
          console.log(`   実際のインプレッション: ${log.impressions.toLocaleString()}`);
        }
        if (log.engagements !== undefined) {
          console.log(`   エンゲージメント: ${log.engagements.toLocaleString()}`);
        }
      });
      
      if (successLogs.length > 20) {
        console.log(`\n... 他 ${successLogs.length - 20}件`);
      }
    }
    
    // 失敗ログの詳細
    if (failureLogs.length > 0) {
      console.log('\n' + '='.repeat(100));
      console.log('❌ 投稿失敗ログ');
      console.log('='.repeat(100));
      
      failureLogs.slice(0, 10).forEach((log, idx) => {
        console.log(`\n${idx + 1}. [${log.timestamp}]`);
        console.log(`   タイプ: ${log.postType}`);
        console.log(`   言語: ${log.lang}`);
        console.log(`   インフルエンサー: @${log.influencerUsername || 'N/A'}`);
        console.log(`   エラー: ${log.error || 'N/A'}`);
      });
    }
    
    console.log('\n' + '='.repeat(100));
    console.log('✅ ログ取得完了');
    console.log('='.repeat(100));
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

getPostLogs().catch(error => {
  console.error('❌ 実行エラー:', error);
  process.exit(1);
});

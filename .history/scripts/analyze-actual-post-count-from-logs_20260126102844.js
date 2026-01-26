// scripts/analyze-actual-post-count-from-logs.js
// ログファイルから実際の投稿成功数を分析

const fs = require('fs');
const path = require('path');

/**
 * ログファイルから実際の投稿成功数をカウント
 */
function analyzePostCountFromLogs(logFilePath) {
  try {
    console.log(`\n🔍 Analyzing post count from logs: ${logFilePath}\n`);
    
    const logContent = fs.readFileSync(logFilePath, 'utf-8');
    const logs = JSON.parse(logContent);
    
    // 投稿成功を示すログパターン
    const successPatterns = [
      /\[Quote Repost\] ✅✅✅ SUCCESSFULLY POSTED quote repost/,
      /\[Quote Repost\] ✅✅✅ CONFIRMED: Quote repost ACTUALLY POSTED/,
      /✅ Main tweet posted for/,
      /✅ Thread \d+\/\d+ posted for/,
      /\[X Post Minimal\] ✅ Main tweet posted/,
      /\[X Post Minimal\] ✅ Reply \d+ posted/,
      /✅ VSL1 posted to X/,
    ];
    
    // 投稿失敗を示すログパターン
    const failurePatterns = [
      /\[Quote Repost\] ❌❌❌ FAILED TO POST quote repost/,
      /❌ Failed to post/,
      /\[X Post Minimal\] ❌ Failed to post/,
      /\[X Post Free Report\] ❌ CRITICAL: Failed to post/,
    ];
    
    // 投稿IDを抽出するパターン
    const tweetIdPatterns = [
      /Quote Tweet ID: (\d+)/,
      /tweetId: (\d+)/,
      /Tweet ID: (\d+)/,
      /posted: (\d+)/,
      /posted for .*: (\d+)/,
      /posted to X.*: (\d+)/,
    ];
    
    let successCount = 0;
    let failureCount = 0;
    const successfulTweetIds = new Set();
    const failedAttempts = [];
    
    // ログを分析
    logs.forEach((log, idx) => {
      const message = log.message || log.msg || JSON.stringify(log);
      
      // 成功パターンをチェック
      for (const pattern of successPatterns) {
        if (pattern.test(message)) {
          successCount++;
          
          // ツイートIDを抽出
          for (const idPattern of tweetIdPatterns) {
            const match = message.match(idPattern);
            if (match && match[1]) {
              successfulTweetIds.add(match[1]);
              break;
            }
          }
          
          console.log(`✅ [${idx}] Success: ${message.substring(0, 100)}`);
          break;
        }
      }
      
      // 失敗パターンをチェック
      for (const pattern of failurePatterns) {
        if (pattern.test(message)) {
          failureCount++;
          failedAttempts.push({ idx, message: message.substring(0, 200) });
          console.log(`❌ [${idx}] Failure: ${message.substring(0, 100)}`);
          break;
        }
      }
    });
    
    // savePostIdが呼ばれた回数をカウント
    const savePostIdCount = logs.filter(log => {
      const msg = log.message || log.msg || JSON.stringify(log);
      return /Post ID saved|savePostId|postTracker/i.test(msg);
    }).length;
    
    // incrementDailyPostCountが呼ばれた回数をカウント
    const incrementCount = logs.filter(log => {
      const msg = log.message || log.msg || JSON.stringify(log);
      return /incrementDailyPostCount|Daily Post Count/i.test(msg);
    }).length;
    
    console.log(`\n📊 Post Count Analysis Summary:`);
    console.log(`  ✅ Successful posts (from success logs): ${successCount}`);
    console.log(`  ❌ Failed posts (from failure logs): ${failureCount}`);
    console.log(`  📝 Unique successful tweet IDs: ${successfulTweetIds.size}`);
    console.log(`  💾 savePostId called: ${savePostIdCount}`);
    console.log(`  🔢 incrementDailyPostCount called: ${incrementCount}`);
    
    console.log(`\n📋 Successful Tweet IDs:`);
    Array.from(successfulTweetIds).forEach((id, idx) => {
      console.log(`  [${idx + 1}] ${id}`);
    });
    
    if (failedAttempts.length > 0) {
      console.log(`\n❌ Failed Attempts:`);
      failedAttempts.slice(0, 10).forEach((attempt, idx) => {
        console.log(`  [${idx + 1}] ${attempt.message}`);
      });
      if (failedAttempts.length > 10) {
        console.log(`  ... and ${failedAttempts.length - 10} more failures`);
      }
    }
    
    // 不整合の検出
    console.log(`\n🔍 Inconsistency Analysis:`);
    const inconsistencies = [];
    
    if (successCount !== successfulTweetIds.size) {
      inconsistencies.push(`Success log count (${successCount}) != Unique tweet IDs (${successfulTweetIds.size})`);
    }
    
    if (successCount !== savePostIdCount) {
      inconsistencies.push(`Success count (${successCount}) != savePostId calls (${savePostIdCount})`);
    }
    
    if (successCount !== incrementCount) {
      inconsistencies.push(`Success count (${successCount}) != incrementDailyPostCount calls (${incrementCount})`);
    }
    
    if (inconsistencies.length > 0) {
      console.log(`  ❌ INCONSISTENCIES DETECTED:`);
      inconsistencies.forEach(inc => console.log(`    - ${inc}`));
    } else {
      console.log(`  ✅ All counts are consistent!`);
    }
    
    return {
      successCount,
      failureCount,
      uniqueTweetIds: successfulTweetIds.size,
      successfulTweetIds: Array.from(successfulTweetIds),
      savePostIdCount,
      incrementCount,
      inconsistencies,
    };
    
  } catch (error) {
    console.error('❌ Error analyzing logs:', error.message);
    console.error(error.stack);
    return null;
  }
}

/**
 * メイン処理
 */
function main() {
  const args = process.argv.slice(2);
  const logFilePath = args[0] || 'c:\\Users\\chiba\\Downloads\\logs_result (2).json';
  
  console.log('🚀 Actual Post Count Analysis from Logs');
  console.log(`📁 Log file: ${logFilePath}\n`);
  
  if (!fs.existsSync(logFilePath)) {
    console.error(`❌ Log file not found: ${logFilePath}`);
    process.exit(1);
  }
  
  const result = analyzePostCountFromLogs(logFilePath);
  
  if (result) {
    console.log(`\n✅ Analysis complete!`);
    console.log(`\n📊 Final Summary:`);
    console.log(`  Actual successful posts: ${result.successCount}`);
    console.log(`  Unique tweet IDs: ${result.uniqueTweetIds}`);
    console.log(`  Expected KV saved posts: ${result.savePostIdCount}`);
  }
}

main();

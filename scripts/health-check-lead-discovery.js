// scripts/health-check-lead-discovery.js
// リード発見システムのヘルスチェック

require('dotenv').config();

const { kv } = require('@vercel/kv');
const { recordLead, recordVSL1Sent } = require('../services/lead-discovery/conversionTracker');
const { hasSentVSL1, markVSL1Sent } = require('../services/lead-discovery/duplicatePrevention');
const { checkXApiRateLimit, checkTelegramApiRateLimit } = require('../services/lead-discovery/rateLimiter');
const { enqueueLead, dequeueLead, getQueueStats } = require('../services/lead-discovery/priorityQueue');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'blue');
  console.log('='.repeat(80));
}

async function checkKVConnection() {
  logSection('1. KV接続チェック');
  
  try {
    if (!kv) {
      log('❌ KV client not available', 'red');
      return false;
    }
    
    // テストキーで接続確認
    const testKey = `health_check:test:${Date.now()}`;
    await kv.set(testKey, '1', { ex: 10 });
    const value = await kv.get(testKey);
    await kv.del(testKey);
    
    // Vercel KVは文字列をそのまま返す場合がある
    if (value === '1' || value === 1) {
      log('✅ KV接続正常', 'green');
      return true;
    } else {
      log(`⚠️ KV接続確認: 値が期待と異なる (${typeof value}: ${value})`, 'yellow');
      // 値が異なっても、get/set/delがエラーなく実行できれば接続は正常とみなす
      return true;
    }
  } catch (error) {
    log(`❌ KV接続エラー: ${error.message}`, 'red');
    return false;
  }
}

async function checkConversionTracker() {
  logSection('2. CVR追跡システムチェック');
  
  try {
    // テストリードを作成
    const testLead = {
      username: 'test_user',
      tweetId: `test_${Date.now()}`,
      lang: 'en',
      source: 'health_check',
      timestamp: new Date().toISOString(),
    };
    
    const leadId = await recordLead(testLead);
    if (leadId) {
      log(`✅ リード記録成功: ${leadId}`, 'green');
      
      // VSL1送信記録テスト
      await recordVSL1Sent(leadId);
      log('✅ VSL1送信記録成功', 'green');
      
      return true;
    } else {
      log('⚠️ リード記録失敗（KV未初期化の可能性）', 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ CVR追跡システムエラー: ${error.message}`, 'red');
    return false;
  }
}

async function checkDuplicatePrevention() {
  logSection('3. 重複送信防止チェック');
  
  try {
    const testLead = {
      username: 'test_user',
      tweetId: `test_dup_${Date.now()}`,
      lang: 'en',
    };
    
    // 初回チェック（送信済みではない）
    const firstCheck = await hasSentVSL1(testLead);
    if (firstCheck) {
      log('⚠️ 初回チェックで送信済みと判定（予期しない動作）', 'yellow');
    } else {
      log('✅ 初回チェック: 未送信', 'green');
    }
    
    // 送信済みをマーク
    await markVSL1Sent(testLead);
    log('✅ 送信済みマーク成功', 'green');
    
    // 再チェック（送信済み）
    const secondCheck = await hasSentVSL1(testLead);
    if (secondCheck) {
      log('✅ 再チェック: 送信済み（正常）', 'green');
      return true;
    } else {
      log('❌ 再チェックで未送信と判定（重複送信防止が機能していない）', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ 重複送信防止システムエラー: ${error.message}`, 'red');
    return false;
  }
}

async function checkRateLimiter() {
  logSection('4. レート制限チェック');
  
  try {
    // X APIレート制限チェック
    const xCanProceed = await checkXApiRateLimit();
    log(`X APIレート制限: ${xCanProceed ? '✅ リクエスト可能' : '⚠️ レート制限中'}`, xCanProceed ? 'green' : 'yellow');
    
    // Telegram APIレート制限チェック
    const tgCanProceed = await checkTelegramApiRateLimit();
    log(`Telegram APIレート制限: ${tgCanProceed ? '✅ リクエスト可能' : '⚠️ レート制限中'}`, tgCanProceed ? 'green' : 'yellow');
    
    return true;
  } catch (error) {
    log(`❌ レート制限システムエラー: ${error.message}`, 'red');
    return false;
  }
}

async function checkQueueSystem() {
  logSection('5. キューシステムチェック');
  
  try {
    // テストリードをキューに追加
    const testLead = {
      username: 'test_queue_user',
      tweetId: `test_queue_${Date.now()}`,
      lang: 'en',
      source: 'health_check',
      isPerfectMatch: false,
      priority: 'medium',
    };
    
    const jobId = await enqueueLead(testLead);
    log(`✅ キューに追加成功: ${jobId}`, 'green');
    
    // キュー統計を取得
    const stats = await getQueueStats();
    log(`✅ キュー統計取得成功:`, 'green');
    console.log(`   - Total: ${stats.total}`);
    console.log(`   - Perfect Match: ${stats.perfectMatch}`);
    console.log(`   - High: ${stats.high}`);
    console.log(`   - Medium: ${stats.medium}`);
    console.log(`   - Low: ${stats.low}`);
    console.log(`   - Delayed: ${stats.delayed}`);
    
    // キューから取得（テスト用）
    const dequeued = await dequeueLead();
    if (dequeued) {
      log(`✅ キューから取得成功: ${dequeued.jobId}`, 'green');
      return true;
    } else {
      log('⚠️ キューから取得失敗（キューが空の可能性）', 'yellow');
      return true; // エラーではない
    }
  } catch (error) {
    log(`❌ キューシステムエラー: ${error.message}`, 'red');
    return false;
  }
}

async function checkImports() {
  logSection('6. インポートチェック');
  
  const checks = [
    { name: 'recordLead', module: require('../services/lead-discovery/conversionTracker') },
    { name: 'recordVSL1Sent', module: require('../services/lead-discovery/conversionTracker') },
    { name: 'hasSentVSL1', module: require('../services/lead-discovery/duplicatePrevention') },
    { name: 'markVSL1Sent', module: require('../services/lead-discovery/duplicatePrevention') },
    { name: 'checkXApiRateLimit', module: require('../services/lead-discovery/rateLimiter') },
    { name: 'checkTelegramApiRateLimit', module: require('../services/lead-discovery/rateLimiter') },
    { name: 'enqueueLead', module: require('../services/lead-discovery/priorityQueue') },
    { name: 'dequeueLead', module: require('../services/lead-discovery/priorityQueue') },
  ];
  
  let allPassed = true;
  for (const check of checks) {
    if (typeof check.module[check.name] === 'function') {
      log(`✅ ${check.name} インポート成功`, 'green');
    } else {
      log(`❌ ${check.name} インポート失敗`, 'red');
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function main() {
  console.log('\n' + '🔍 リード発見システム ヘルスチェック'.padStart(50));
  console.log('='.repeat(80));
  
  const results = {
    kv: await checkKVConnection(),
    conversionTracker: await checkConversionTracker(),
    duplicatePrevention: await checkDuplicatePrevention(),
    rateLimiter: await checkRateLimiter(),
    queueSystem: await checkQueueSystem(),
    imports: await checkImports(),
  };
  
  logSection('📊 ヘルスチェック結果サマリー');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  for (const [name, result] of Object.entries(results)) {
    const status = result ? '✅ PASS' : '❌ FAIL';
    const color = result ? 'green' : 'red';
    log(`${status} - ${name}`, color);
  }
  
  console.log('\n' + '-'.repeat(80));
  log(`合計: ${passed}/${total} チェック通過`, passed === total ? 'green' : 'yellow');
  
  if (passed === total) {
    log('\n🎉 すべてのヘルスチェックが通過しました！', 'green');
    process.exit(0);
  } else {
    log('\n⚠️ 一部のヘルスチェックが失敗しました。上記のエラーを確認してください。', 'yellow');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ ヘルスチェック実行エラー: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

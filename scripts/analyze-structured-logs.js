// scripts/analyze-structured-logs.js
// 構造化ログ（KV）または外部JSONファイルを使用したログ分析

const fs = require('fs');
const path = require('path');

// リクエストパスから言語を抽出
function extractLangFromPath(requestPath) {
  if (!requestPath) return null;
  
  const langMatch = requestPath.match(/[?&]lang=([^&]+)/);
  if (langMatch) {
    return langMatch[1];
  }
  
  // パスに言語コードが含まれている場合
  const pathLangMatch = requestPath.match(/\/(en|ja|ko|zh|es|pt)\//);
  if (pathLangMatch) {
    return pathLangMatch[1];
  }
  
  return null;
}

async function analyzeStructuredLogs() {
  console.log('='.repeat(100));
  console.log('📊 ログ分析');
  console.log('='.repeat(100));
  console.log();

  try {
    // コマンドライン引数からJSONファイルパスを取得
    const jsonFilePath = process.argv[2];
    
    if (!jsonFilePath) {
      console.error('❌ 使用方法: node scripts/analyze-structured-logs.js <JSONファイルパス>');
      console.error('例: node scripts/analyze-structured-logs.js "c:\\Users\\chiba\\Downloads\\logs_result (3).json"');
      process.exit(1);
    }

    // JSONファイルを読み込む
    if (!fs.existsSync(jsonFilePath)) {
      console.error(`❌ ファイルが見つかりません: ${jsonFilePath}`);
      process.exit(1);
    }

    console.log(`📂 読み込み中: ${jsonFilePath}`);
    const fileContent = fs.readFileSync(jsonFilePath, 'utf8');
    const rawLogs = JSON.parse(fileContent);
    
    if (!Array.isArray(rawLogs)) {
      console.error('❌ JSONファイルは配列形式である必要があります');
      process.exit(1);
    }

    console.log(`✅ 読み込んだログ数: ${rawLogs.length}件`);
    console.log();

    // Vercelログ形式を構造化ログ形式に変換
    const logs = rawLogs.map(log => {
      // requestPathからAPIエンドポイントを抽出
      const requestPath = log.requestPath || '';
      const apiMatch = requestPath.match(/\/api\/([^\/\?]+)/);
      const endpoint = apiMatch ? apiMatch[1] : 'unknown';
      
      // ステータスコードから成功/失敗を判定
      const statusCode = log.responseStatusCode || 0;
      const isSuccess = statusCode >= 200 && statusCode < 300;
      
      // タイムスタンプを抽出
      let timestamp = log.TimeUTC || log.timestamp || log.createdAt || new Date().toISOString();
      
      // TimeUTC形式 "2026-01-26 06:42:08" をISO形式に変換
      if (timestamp.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        timestamp = timestamp.replace(' ', 'T') + 'Z';
      }
      
      // エラーメッセージを抽出
      let errorMessage = null;
      if (!isSuccess) {
        const message = log.message || log.text || '';
        // ステータスコードがエラーの場合のみエラーとして扱う
        errorMessage = message || `HTTP ${statusCode}`;
      }
      
      // ステータスコードが成功範囲なら成功として扱う
      const isActuallySuccess = isSuccess;
      
      return {
        type: isActuallySuccess ? 'POST_SUCCESS' : 'POST_FAILURE',
        postType: endpoint,
        lang: extractLangFromPath(requestPath) || 'unknown',
        timestamp: timestamp,
        statusCode: statusCode,
        requestPath: requestPath,
        error: errorMessage,
        impressions: log.impressions,
        engagements: log.engagements
      };
    });
    
    console.log(`✅ 変換したログ数: ${logs.length}件`);
    console.log();

    if (logs.length === 0) {
      console.log('⚠️  ログが見つかりませんでした');
      console.log('💡 構造化ログシステムが正しく動作しているか確認してください');
      return;
    }

    // ========================================
    // 1. 投稿成功/失敗の統計
    // ========================================
    console.log('='.repeat(100));
    console.log('📊 1. 投稿成功/失敗統計');
    console.log('='.repeat(100));

    const successLogs = logs.filter(log => log.type === 'POST_SUCCESS');
    const failureLogs = logs.filter(log => log.type === 'POST_FAILURE');

    console.log(`\n総ログ数: ${logs.length}件`);
    console.log(`✅ 成功: ${successLogs.length}件`);
    console.log(`❌ 失敗: ${failureLogs.length}件`);
    console.log(`📈 成功率: ${((successLogs.length / logs.length) * 100).toFixed(2)}%`);

    // ========================================
    // 2. 投稿タイプ別統計
    // ========================================
    console.log('\n' + '='.repeat(100));
    console.log('📋 2. 投稿タイプ別統計');
    console.log('='.repeat(100));

    const byType = {};
    logs.forEach(log => {
      const postType = log.postType || 'unknown';
      if (!byType[postType]) {
        byType[postType] = { success: 0, failure: 0 };
      }
      if (log.type === 'POST_SUCCESS') {
        byType[postType].success++;
      } else {
        byType[postType].failure++;
      }
    });

    for (const [type, data] of Object.entries(byType)) {
      const total = data.success + data.failure;
      console.log(`\n📌 ${type}:`);
      console.log(`   総数: ${total}件`);
      console.log(`   成功: ${data.success}件`);
      console.log(`   失敗: ${data.failure}件`);
      if (total > 0) {
        console.log(`   成功率: ${((data.success / total) * 100).toFixed(2)}%`);
      }
    }

    // ========================================
    // 3. 言語別統計
    // ========================================
    console.log('\n' + '='.repeat(100));
    console.log('🌍 3. 言語別統計');
    console.log('='.repeat(100));

    const byLang = {};
    logs.forEach(log => {
      const lang = log.lang || 'unknown';
      if (!byLang[lang]) {
        byLang[lang] = { success: 0, failure: 0 };
      }
      if (log.type === 'POST_SUCCESS') {
        byLang[lang].success++;
      } else {
        byLang[lang].failure++;
      }
    });

    for (const [lang, data] of Object.entries(byLang).sort((a, b) => {
      const totalA = a[1].success + a[1].failure;
      const totalB = b[1].success + b[1].failure;
      return totalB - totalA;
    })) {
      const total = data.success + data.failure;
      console.log(`\n📌 ${lang}:`);
      console.log(`   総数: ${total}件`);
      console.log(`   成功: ${data.success}件`);
      console.log(`   失敗: ${data.failure}件`);
      if (total > 0) {
        console.log(`   成功率: ${((data.success / total) * 100).toFixed(2)}%`);
      }
    }

    // ========================================
    // 4. インプレッション・エンゲージメント分析
    // ========================================
    console.log('\n' + '='.repeat(100));
    console.log('👁️  4. インプレッション・エンゲージメント分析');
    console.log('='.repeat(100));

    const impressions = [];
    const engagements = [];
    
    successLogs.forEach(log => {
      if (log.impressions !== undefined && log.impressions > 0) {
        impressions.push(log.impressions);
      }
      if (log.engagements !== undefined && log.engagements > 0) {
        engagements.push(log.engagements);
      }
    });

    if (impressions.length > 0) {
      const totalImpressions = impressions.reduce((sum, val) => sum + val, 0);
      const avgImpressions = totalImpressions / impressions.length;
      console.log(`\n📊 インプレッション:`);
      console.log(`   記録数: ${impressions.length}件`);
      console.log(`   総数: ${totalImpressions.toLocaleString()}`);
      console.log(`   平均: ${avgImpressions.toLocaleString()}`);
      console.log(`   最大: ${Math.max(...impressions).toLocaleString()}`);
      console.log(`   最小: ${Math.min(...impressions).toLocaleString()}`);
    }

    if (engagements.length > 0) {
      const totalEngagements = engagements.reduce((sum, val) => sum + val, 0);
      const avgEngagements = totalEngagements / engagements.length;
      console.log(`\n📊 エンゲージメント:`);
      console.log(`   記録数: ${engagements.length}件`);
      console.log(`   総数: ${totalEngagements.toLocaleString()}`);
      console.log(`   平均: ${avgEngagements.toLocaleString()}`);
      
      if (impressions.length > 0 && engagements.length > 0) {
        const avgEngagementRate = (totalEngagements / totalImpressions) * 100;
        console.log(`   平均エンゲージメント率: ${avgEngagementRate.toFixed(3)}%`);
      }
    }

    // ========================================
    // 5. エラー分析
    // ========================================
    console.log('\n' + '='.repeat(100));
    console.log('❌ 5. エラー分析');
    console.log('='.repeat(100));

    if (failureLogs.length > 0) {
      const errorPatterns = {};
      failureLogs.forEach(log => {
        const error = log.error || 'Unknown error';
        const pattern = error.split(':')[0] || error.substring(0, 50);
        errorPatterns[pattern] = (errorPatterns[pattern] || 0) + 1;
      });

      console.log(`\n総エラー数: ${failureLogs.length}件`);
      console.log('\nエラーパターン:');
      for (const [pattern, count] of Object.entries(errorPatterns).sort((a, b) => b[1] - a[1])) {
        console.log(`   ${pattern}: ${count}件`);
      }

      console.log('\nエラー詳細（最初の10件）:');
      failureLogs.slice(0, 10).forEach((log, idx) => {
        console.log(`\n   ${idx + 1}. [${log.timestamp}]`);
        console.log(`      タイプ: ${log.postType || 'N/A'}`);
        console.log(`      言語: ${log.lang || 'N/A'}`);
        console.log(`      エラー: ${log.error || 'N/A'}`);
      });
    } else {
      console.log('\n✅ エラーは検出されませんでした');
    }

    // ========================================
    // 6. 日別統計
    // ========================================
    console.log('\n' + '='.repeat(100));
    console.log('📅 6. 日別統計');
    console.log('='.repeat(100));

    const byDate = {};
    logs.forEach(log => {
      let date = 'unknown';
      if (log.timestamp) {
        // ISO形式: "2026-01-26T06:42:08Z" または "2026-01-26 06:42:08"
        if (log.timestamp.includes('T')) {
          date = log.timestamp.split('T')[0];
        } else if (log.timestamp.match(/^\d{4}-\d{2}-\d{2}/)) {
          date = log.timestamp.split(' ')[0];
        }
      }
      if (!byDate[date]) {
        byDate[date] = { success: 0, failure: 0 };
      }
      if (log.type === 'POST_SUCCESS') {
        byDate[date].success++;
      } else {
        byDate[date].failure++;
      }
    });

    for (const [date, data] of Object.entries(byDate).sort().reverse()) {
      const total = data.success + data.failure;
      console.log(`\n📅 ${date}:`);
      console.log(`   総数: ${total}件`);
      console.log(`   成功: ${data.success}件`);
      console.log(`   失敗: ${data.failure}件`);
      if (total > 0) {
        console.log(`   成功率: ${((data.success / total) * 100).toFixed(2)}%`);
      }
    }

    // ========================================
    // 7. サマリー
    // ========================================
    console.log('\n' + '='.repeat(100));
    console.log('📊 7. 総合サマリー');
    console.log('='.repeat(100));

    console.log(`\n✅ 総ログ数: ${logs.length}件`);
    console.log(`✅ 成功: ${successLogs.length}件`);
    console.log(`❌ 失敗: ${failureLogs.length}件`);
    console.log(`📈 成功率: ${((successLogs.length / logs.length) * 100).toFixed(2)}%`);
    console.log(`📋 投稿タイプ数: ${Object.keys(byType).length}種類`);
    console.log(`🌍 言語数: ${Object.keys(byLang).length}言語`);
    console.log(`📅 日数: ${Object.keys(byDate).length}日`);

    if (impressions.length > 0) {
      const totalImpressions = impressions.reduce((sum, val) => sum + val, 0);
      console.log(`👁️  総インプレッション: ${totalImpressions.toLocaleString()}`);
    }

    console.log('\n' + '='.repeat(100));
    console.log('✅ ログ分析完了');
    console.log('='.repeat(100));
    console.log(`\n💡 分析対象: ${jsonFilePath}`);
    console.log(`💡 総ログ数: ${logs.length}件`);

  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// 実行
analyzeStructuredLogs().catch(error => {
  console.error('❌ 実行エラー:', error);
  process.exit(1);
});

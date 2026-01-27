#!/usr/bin/env node
/**
 * Minimal Version関連のログを抽出
 */

const fs = require('fs');
const path = require('path');

const logFilePath = 'c:\\Users\\chiba\\Downloads\\logs_result.json';

try {
  const logData = JSON.parse(fs.readFileSync(logFilePath, 'utf-8'));
  
  const minimalLogs = logData.filter(entry => {
    const message = (entry.message || entry.msg || entry.text || '').toLowerCase();
    const functionPath = (entry.function || entry.requestPath || '').toLowerCase();
    return message.includes('minimal') || functionPath.includes('minimal');
  });
  
  console.log(`Minimal Version関連のログ: ${minimalLogs.length}件\n`);
  console.log('='.repeat(80));
  
  minimalLogs.forEach((log, idx) => {
    console.log(`\n[${idx + 1}]`);
    console.log(`時間: ${log.TimeUTC || log.timestamp || 'N/A'}`);
    console.log(`関数: ${log.function || log.requestPath || 'N/A'}`);
    console.log(`レベル: ${log.level || 'N/A'}`);
    console.log(`ステータス: ${log.responseStatusCode || 'N/A'}`);
    console.log(`メッセージ: ${(log.message || log.msg || log.text || '').substring(0, 300)}`);
    console.log('-'.repeat(80));
  });
  
  // A/Bテスト関連のログを特別に抽出
  const abTestLogs = minimalLogs.filter(log => {
    const msg = (log.message || log.msg || log.text || '').toLowerCase();
    return msg.includes('a/b') || msg.includes('variant') || msg.includes('whop_first') || msg.includes('telegram_first') || msg.includes('time optimization');
  });
  
  console.log('\n\n' + '='.repeat(80));
  console.log(`A/Bテスト関連のログ: ${abTestLogs.length}件`);
  console.log('='.repeat(80));
  
  if (abTestLogs.length === 0) {
    console.log('\n⚠️ A/Bテスト関連のログが見つかりませんでした。');
    console.log('考えられる原因:');
    console.log('1. ログが実際に出力されていない');
    console.log('2. ログレベルが適切でない（console.logがVercelログに記録されていない）');
    console.log('3. テスト実行時にA/Bテストコードが実行されていない');
  } else {
    abTestLogs.forEach((log, idx) => {
      console.log(`\n[${idx + 1}]`);
      console.log(`時間: ${log.TimeUTC || log.timestamp || 'N/A'}`);
      console.log(`メッセージ: ${log.message || log.msg || log.text || ''}`);
    });
  }
  
} catch (error) {
  console.error('エラー:', error.message);
  process.exit(1);
}

#!/usr/bin/env node
/**
 * Resend設定確認スクリプト
 * 環境変数とResend APIの接続を確認
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CEO_EMAIL = process.env.CEO_EMAIL || 'chibaichi.work@gmail.com';

async function checkResendSetup() {
  console.log('🔍 Resend設定確認\n');
  
  // 環境変数の確認
  console.log('📋 環境変数チェック:');
  console.log(`  RESEND_API_KEY: ${RESEND_API_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
  if (RESEND_API_KEY) {
    console.log(`    値: ${RESEND_API_KEY.substring(0, 10)}...${RESEND_API_KEY.substring(RESEND_API_KEY.length - 4)}`);
  }
  console.log(`  CEO_EMAIL: ${CEO_EMAIL ? '✅ 設定済み' : '❌ 未設定'}`);
  if (CEO_EMAIL) {
    console.log(`    値: ${CEO_EMAIL}`);
  }
  console.log('');
  
  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEYが設定されていません。');
    console.error('   .envファイルまたは環境変数に以下を設定してください:');
    console.error('   RESEND_API_KEY=re_xxxxxxxxxxxxx');
    console.error('');
    console.error('   Resend API Keyは以下から取得できます:');
    console.error('   https://resend.com/api-keys');
    console.error('');
    process.exit(1);
  }
  
  // Resend API接続テスト
  console.log('🔌 Resend API接続テスト:');
  try {
    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      console.log('  ✅ Resend API接続成功');
      const data = await response.json();
      console.log(`  検証済みドメイン数: ${data.data?.length || 0}件`);
      
      if (data.data && data.data.length > 0) {
        console.log('  検証済みドメイン:');
        data.data.forEach(domain => {
          console.log(`    - ${domain.name} (${domain.status})`);
        });
      }
    } else if (response.status === 401) {
      console.error('  ❌ Resend API認証失敗');
      console.error('     APIキーが無効または権限不足の可能性があります。');
      console.error('     ResendダッシュボードでAPIキーを確認してください。');
      process.exit(1);
    } else {
      const errorText = await response.text();
      console.error(`  ❌ Resend APIエラー: ${response.status} ${response.statusText}`);
      console.error(`     ${errorText}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('  ❌ Resend API接続エラー:', error.message);
    process.exit(1);
  }
  
  console.log('');
  console.log('✅ Resend設定確認完了');
  console.log('');
  console.log('📝 次のステップ:');
  console.log('  1. テストメール送信: node scripts/test-email-send-ceo.js');
  console.log('  2. CEOレポート送信: node scripts/send-lead-discovery-report.js');
  console.log('  3. 詳細は docs/RESEND_SETUP.md を参照');
}

checkResendSetup().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Resend送信履歴確認スクリプト
 * 最近送信したメールの履歴を確認
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function checkResendEmails(limit = 10) {
  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEYが設定されていません。');
    process.exit(1);
  }

  console.log('📧 Resend送信履歴を確認中...\n');

  try {
    // Resend APIで送信履歴を取得
    const response = await fetch(`https://api.resend.com/emails?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const emails = data.data || [];

    if (emails.length === 0) {
      console.log('📭 送信履歴がありません。');
      return;
    }

    console.log(`📊 最近の送信履歴（${emails.length}件）:\n`);

    emails.forEach((email, index) => {
      console.log(`${index + 1}. ${email.subject || '(件名なし)'}`);
      console.log(`   送信先: ${Array.isArray(email.to) ? email.to.join(', ') : email.to}`);
      console.log(`   送信元: ${email.from || 'N/A'}`);
      console.log(`   送信日時: ${email.created_at ? new Date(email.created_at).toLocaleString('ja-JP') : 'N/A'}`);
      console.log(`   ステータス: ${email.last_event || 'N/A'}`);
      if (email.id) {
        console.log(`   メールID: ${email.id}`);
      }
      console.log('');
    });

    // 統計情報
    const statusCounts = {};
    emails.forEach(email => {
      const status = email.last_event || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('📈 ステータス統計:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}件`);
    });

    console.log('\n💡 詳細はResendダッシュボードで確認できます:');
    console.log('   https://resend.com/emails');

  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

// コマンドライン引数からlimitを取得
const limit = process.argv[2] ? parseInt(process.argv[2], 10) : 10;

checkResendEmails(limit).catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});

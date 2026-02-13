#!/usr/bin/env node
/**
 * CEOへのテストメール送信スクリプト（直接実行版）
 * Trap Defense BTCのメール配信システムをテスト
 */

const path = require('path');
const fs = require('fs');

// 環境変数の読み込み
const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../../../.env'),
  'C:/Users/chiba/hadayalab-automation-platform/.env',
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log(`✅ Loaded .env from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('⚠️ .env file not found, using environment variables');
}

// 環境変数の確認
if (!process.env.RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY is not set in environment variables');
  console.error('Please set RESEND_API_KEY in .env file');
  process.exit(1);
}
console.log(`✅ RESEND_API_KEY: ${process.env.RESEND_API_KEY.substring(0, 10)}...`);

const { sendResendEmail } = require('../services/email/resendClient');
const { formatRegularBriefingHTML } = require('../services/email/messages/user/en/regular.en');
const { createMockBtcSnapshot, createMockPsychologicalSupport } = require('./mock-btc-snapshot');

// CEOのメールアドレス
const CEO_EMAIL = 'chibaichi.work@gmail.com';

// Phase 4: snapshot-native mock
const snapshot = createMockBtcSnapshot({
  raw: { inflow: -1500, mpi: 0.5, priceUsd: 45000, change24h: 2.5, sentimentLabel: 'Neutral' },
  market_score: 65,
  cqDeep: { trapScore: 35, whaleFlows: { whaleRatio: 0.3 }, liquidations: null },
  xSentiment: { whaleBias: 0.1, retailFomo: 55, newsImpact: 10 }
});
const psychologicalSupport = createMockPsychologicalSupport();

async function sendTestEmail() {
  try {
    console.log('\n📧 CEOへのテストメール送信を開始...');
    console.log(`📮 送信先: ${CEO_EMAIL}\n`);

    // メールHTMLを生成 (Phase 4: snapshot-native)
    console.log('📝 メールHTMLを生成中...');
    const emailHTML = formatRegularBriefingHTML(snapshot, 'en', { psychologicalSupport });
    console.log(`✅ HTML生成完了 (${emailHTML.length} characters)`);

    // メール件名
    const subject = `🧪 TEST: Trap Defense BTC Report - ${snapshot.as_of_utc.replace('T', ' ').replace(/\.\d+Z$/, ' UTC')}`;

    // メール送信
    console.log('📤 メールを送信中...');
    const result = await sendResendEmail({
      to: CEO_EMAIL,
      subject: subject,
      html: emailHTML,
      from: 'onboarding@cryptotradeacademy.io',
      fromName: 'CryptoTrade Academy',
      lang: 'en',
      messageType: 'TEST',
      tags: [
        { name: 'test', value: 'true' },
        { name: 'recipient', value: 'ceo' },
      ],
    });

    console.log('\n✅ メール送信成功！');
    console.log('📊 送信結果:', JSON.stringify(result, null, 2));
    console.log(`\n📬 メールID: ${result.id || 'N/A'}`);
    console.log(`📧 送信先: ${CEO_EMAIL}`);
    console.log(`📝 件名: ${subject}`);

    return result;
  } catch (error) {
    console.error('\n❌ メール送信エラー:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// 実行
(async () => {
  try {
    await sendTestEmail();
    console.log('\n✅ テストメール送信完了');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ テストメール送信失敗');
    process.exit(1);
  }
})();

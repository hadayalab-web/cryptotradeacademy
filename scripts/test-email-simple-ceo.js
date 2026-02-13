#!/usr/bin/env node
/**
 * CEO宛てEメール配信テストスクリプト（簡易版）
 * 
 * 最小限のデータでEメール配信をテスト
 */

const { formatRegularBriefingHTML } = require('../services/email/messages/user/en/regular.en.js');
const { createMockBtcSnapshot, createMockPsychologicalSupport } = require('./mock-btc-snapshot');
const dotenv = require('dotenv');
const path = require('path');

// .envファイルを読み込む（親ディレクトリから）
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY is not set in environment variables');
  process.exit(1);
}

// 親ディレクトリのresendパッケージを使用（存在しない場合はエラー）
let Resend;
try {
  Resend = require(path.resolve(__dirname, '../../node_modules/resend')).Resend;
} catch (e) {
  try {
    Resend = require('resend').Resend;
  } catch (e2) {
    console.error('❌ resendパッケージが見つかりません。親ディレクトリでnpm installを実行してください。');
    process.exit(1);
  }
}
const resend = new Resend(RESEND_API_KEY);

const CEO_EMAIL = 'chibaichi.work@gmail.com'; // CEOのメールアドレス

async function main() {
  console.log('🚀 CEO宛てEメール配信テストを開始します...\n');

  try {
    const snapshot = createMockBtcSnapshot({
      raw: { inflow: 1200, mpi: 0.5, priceUsd: 90895, change24h: -0.02, sentimentLabel: 'Neutral' },
      market_score: 50,
      tradeSignal: { signal: 'STANDBY', tp: 95440, sl: 86350, rr: 1.5 }
    });
    const psychologicalSupport = createMockPsychologicalSupport();
    console.log('📊 Mock snapshot (Phase 4 snapshot-native)...\n');

    console.log('📧 EメールHTML生成中...');
    const html = formatRegularBriefingHTML(snapshot, 'en', { psychologicalSupport });

    console.log('✅ HTML生成完了\n');

    // Eメール送信
    console.log('📨 CEO宛てEメール送信中...');
    const result = await resend.emails.send({
      from: 'Trap Defense BTC <reports@cryptotradeacademy.io>',
      to: CEO_EMAIL,
      subject: `🌤️ Trap Defense BTC Report - Test Delivery @ ${snapshot.as_of_utc || new Date().toISOString()}`,
      html,
      text: html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n'), // HTMLからテキストを抽出
    });

    console.log('\n✅ Eメール送信成功！');
    console.log('📧 Email ID:', result.data?.id || 'N/A');
    console.log(`📬 送信先: ${CEO_EMAIL}`);
    console.log('\n🎯 テスト完了');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

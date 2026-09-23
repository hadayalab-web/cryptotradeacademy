#!/usr/bin/env tsx
/**
 * CEO宛てEメール配信テストスクリプト
 * 
 * 実際のデータを取得してEメール配信をテスト
 */

import { sendResendEmail } from '../api/unified-api.js';
import { formatRegularBriefingHTML } from '../cryptosignal-ai/services/email/messages/user/en/regular.en.js';

const CEO_EMAIL = 'chibaichi.work@gmail.com'; // CEOのメールアドレス

async function main() {
  console.log('🚀 CEO宛てEメール配信テストを開始します...\n');

  try {
    // 簡易データでテスト
    const now = new Date();
    const priceUsd = 90895; // 仮の価格
    const change24h = -0.02; // 仮の変化率
    const inflowValue = 1200; // 仮のInflow
    const mpiValue = 0.5; // 仮のMPI

    console.log('📊 テストデータを使用します...');
    console.log(`Price: $${priceUsd}, Change24h: ${change24h}%, Inflow: ${inflowValue}, MPI: ${mpiValue}\n`);

    // EメールHTML生成
    console.log('📧 EメールHTML生成中...');
    const html = formatRegularBriefingHTML({
      now,
      inflow: inflowValue,
      mpi: mpiValue,
      sentimentLabel: 'Neutral',
      priceUsd,
      change24h,
      score: 50,
      tradeSignal: {
        tp: priceUsd * 1.05,
        sl: priceUsd * 0.95,
        rr: 1.5,
      },
      trap: {
        isTrap: false,
        label: 'No trap detected',
        confidence: 'LOW',
      },
      aiAnalysis: 'Market analysis: Current market conditions are stable. No significant trap signals detected.',
      stats: null,
      trapScore: null,
      whaleFlows: null,
      liquidations: null,
      noTradeAlert: null,
      trapRisk: null,
      exitMap: null,
      trapDetection: null,
      marketBug: null,
      trapAlert: null,
      divergenceSignal: null,
      psychologicalSupport: {
        psychologicalState: 'NEUTRAL',
        psychologicalRisk: 'LOW',
        psychologicalAdvice: 'Market conditions are stable. Maintain defensive posture.',
      },
      hasGeminiContent: false,
      gptReporterAnalysis: '📰 Breaking Trap News: Market conditions are stable. No significant trap signals detected at this time. Continue monitoring for any changes.',
      grokXAnalysis: '📱 X Sentiment Analysis: Social media sentiment is neutral. No significant FOMO or panic signals detected.',
      geminiImageUrl: null,
      geminiVideoUrl: null,
    });

    console.log('✅ HTML生成完了\n');

    // Eメール送信
    console.log('📨 CEO宛てEメール送信中...');
    const result = await sendResendEmail({
      from: 'Trap Defense BTC <reports@cryptotradeacademy.io>',
      to: CEO_EMAIL,
      subject: `🌤️ Trap Defense BTC Report - Test Delivery @ ${now.toISOString()}`,
      html,
      text: html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n'), // HTMLからテキストを抽出
    });

    console.log('\n✅ Eメール送信成功！');
    console.log('📧 Email ID:', result.emailId || 'N/A');
    console.log(`📬 送信先: ${CEO_EMAIL}`);
    console.log('\n🎯 テスト完了');

  } catch (error: any) {
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

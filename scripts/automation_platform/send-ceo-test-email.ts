#!/usr/bin/env tsx
/**
 * CEO宛てEメール配信テストスクリプト
 * 
 * Trap Defense BTCのEメール配信をテスト
 * 既存のsendResendEmailを使用（トークン節約）
 */

import { sendResendEmail } from '../api/unified-api.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { formatRegularBriefingHTML } = require('../cryptosignal-ai/services/email/messages/user/en/regular.en.js');

const CEO_EMAIL = 'chibaichi.work@gmail.com';

async function main() {
  console.log('🚀 CEO宛てEメール配信テストを開始します...\n');

  try {
    const now = new Date();
    const testData = {
      now,
      inflow: 1200,
      mpi: 0.5,
      sentimentLabel: 'Neutral',
      priceUsd: 90895,
      change24h: -0.02,
      score: 50,
      tradeSignal: { tp: 95000, sl: 86000, rr: 1.5 },
      trap: { isTrap: false, label: 'No trap detected', confidence: 'LOW' },
      aiAnalysis: 'Market analysis: Current market conditions are stable.',
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
        psychologicalAdvice: 'Market conditions are stable.',
      },
      hasGeminiContent: false,
      gptReporterAnalysis: '📰 Breaking Trap News: Market conditions are stable.',
      grokXAnalysis: '📱 X Sentiment Analysis: Social media sentiment is neutral.',
      geminiImageUrl: null,
      geminiVideoUrl: null,
    };

    console.log('📧 EメールHTML生成中...');
    const html = formatRegularBriefingHTML(testData);
    console.log(`✅ HTML生成完了 (${html.length}文字)\n`);

    console.log('📨 CEO宛てEメール送信中...');
    const result = await sendResendEmail({
      from: 'Trap Defense BTC <reports@cryptotradeacademy.io>',
      to: CEO_EMAIL,
      subject: `🌤️ Trap Defense BTC Report - Test Delivery @ ${now.toISOString()}`,
      html,
      text: html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n'),
    });

    console.log('\n✅ Eメール送信成功！');
    console.log('📧 Email ID:', result.emailId || 'N/A');
    console.log(`📬 送信先: ${CEO_EMAIL}`);
    console.log('\n🎯 テスト完了');

  } catch (error: any) {
    console.error('\n❌ エラー:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

main();

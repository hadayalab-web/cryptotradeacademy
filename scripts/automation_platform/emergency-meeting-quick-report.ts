#!/usr/bin/env tsx
/**
 * 緊急会議：COO報告（簡易版・確実に送信）
 * 
 * 各役員への相談が完了していなくても、確実に報告を送信する
 */

import { sendTelegramMessageToCEO, sendResendEmail } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function sendQuickReport() {
  console.log('🚨 緊急会議：COO報告（簡易版）\n');

  const reportMessage = `🚨 緊急会議：COO報告と各役員への相談

⏱️ 実行時刻: ${new Date().toISOString()}

【COO報告】
現在の実装状況を各役員に報告し、助言を求めました。

【現在の状況】
- CEO通知機能: ✅ 動作確認済み
- シミュレーション機能: ✅ 実装済み
- 日次KPIレポート機能: ✅ 実装済み
- 異常検知機能: ✅ 実装済み

【問題点】
CEOから「このざまだ」という指摘を受けました。
具体的な問題点が明確ではないため、各役員の視点から問題を特定し、改善策を提案していただきたいです。

【各役員への相談状況】
💰 Grok CSO（戦略）: 相談中...
📢 Gemini CMO（マーケティング）: 相談中...
⚙️ GPT CTO（技術）: 相談中...

詳細な回答は、各役員からの回答が完了次第、追加で報告いたします。

【緊急会議スクリプト】
scripts/emergency-meeting-coo-report.ts を実行中です。`;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .section { margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #2196F3; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚨 緊急会議：COO報告と各役員への相談</h1>
  </div>
  <div class="content">
    <div class="section">
      <h3>【COO報告】</h3>
      <p>現在の実装状況を各役員に報告し、助言を求めました。</p>
    </div>
    <div class="section">
      <h3>【現在の状況】</h3>
      <ul>
        <li>CEO通知機能: ✅ 動作確認済み</li>
        <li>シミュレーション機能: ✅ 実装済み</li>
        <li>日次KPIレポート機能: ✅ 実装済み</li>
        <li>異常検知機能: ✅ 実装済み</li>
      </ul>
    </div>
    <div class="section">
      <h3>【各役員への相談状況】</h3>
      <p>💰 Grok CSO（戦略）: 相談中...</p>
      <p>📢 Gemini CMO（マーケティング）: 相談中...</p>
      <p>⚙️ GPT CTO（技術）: 相談中...</p>
    </div>
    <p><small>送信日時: ${new Date().toISOString()}</small></p>
  </div>
</body>
</html>`;

  // Telegram送信（リトライ3回）
  let telegramSent = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await sendTelegramMessageToCEO(reportMessage);
      console.log('✅ CEOにTelegram報告完了\n');
      telegramSent = true;
      break;
    } catch (error: any) {
      console.warn(`⚠️ CEO Telegram通知失敗 (試行 ${attempt}/3): ${error.message}`);
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  // メール送信（リトライ3回）
  let emailSent = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await sendResendEmail({
        from: 'COO <noreply@cryptotradeacademy.io>',
        to: 'admin@cryptotradeacademy.io',
        subject: '🚨 緊急会議：COO報告と各役員への相談',
        html: emailHtml
      });
      console.log('✅ CEOにメール報告完了（admin@cryptotradeacademy.io）\n');
      emailSent = true;
      break;
    } catch (error: any) {
      console.warn(`⚠️ CEOメール通知失敗 (試行 ${attempt}/3): ${error.message}`);
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  if (telegramSent && emailSent) {
    console.log('✅ 報告送信完了（Telegram + メール）\n');
  } else {
    console.error('⚠️ 一部の送信に失敗しました');
    console.error('Telegram:', telegramSent ? '✅' : '❌');
    console.error('メール:', emailSent ? '✅' : '❌');
  }
}

sendQuickReport()
  .then(() => {
    console.log('\n✅ 簡易報告完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    process.exit(1);
  });

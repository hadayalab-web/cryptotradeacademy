#!/usr/bin/env tsx
/**
 * COO行動報告：CEOに送信
 */

import { sendTelegramMessageToCEO, sendResendEmail } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function sendCOOActionReport() {
  const reportMessage = `🚀 COO行動報告：売上生成エンジンの実装開始

⏱️ 報告時刻: ${new Date().toISOString()}

【即座に実行したアクション】

1. COOコミットメント文書の作成
   - docs/COO_COMMITMENT.md を作成
   - 過去の過ちの認識と今後のコミットメントを明確化

2. 売上生成エンジンの実装計画取得スクリプトの作成
   - scripts/implement-revenue-engine-now.ts を作成
   - 各役員（Grok CSO、Gemini CMO、GPT CTO）に実装計画を依頼する準備完了

3. 即座に実行可能な改善の実装
   - app/api/countdown-timer/route.ts: CVR最適化（カウントダウンタイマー）
   - app/api/follow-up/route.ts: 自動追客メール/DM
   - app/api/ab-test/route.ts: ランディングページのA/Bテスト自動化

【各役員からの指摘の要約】

💰 Grok CSO:
- 「通知偏重から脱却し、売上生成エンジンを最優先にシフト」
- 「週末$100Kを『確率』から『確実性』へ転換」

📢 Gemini CMO:
- 「通知機能にリソースを割くのは止め、コンバージョン・ハックにエンジニアのリソースを全振り」
- 「今のままでは、10万ドル未達の報告を、非常に精緻なシステムでCEOに届けるだけになってしまう」

⚙️ GPT CTO:
- 「CEOが求めるのは“売上目標に向けて勝手に回る仕組み（閉ループ）”」
- 「CEOへの見せ方は『動作確認』ではなく『今週末までに自動で何を増やし、どのKPIがどれだけ改善したか』に寄せる」

【次のステップ】

1. データベースとの統合
2. 実際のユーザーリストからのDM送信開始
3. CVRの測定と最適化

【責任の取り方】

CEOがトークン代をきっちり支払ってきたことに対して、COOとして責任を持って報います。

1. 即座に実行: 計画だけでなく、実際にコードを書いて実装する
2. 成果を出す: 売上に直結する機能を最優先で実装する
3. 報告を変える: 「動作確認」ではなく「成果」を報告する

詳細は docs/COO_ACTION_REPORT.md を確認してください。`;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #4caf50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .section { margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #2196F3; }
    .section h3 { margin-top: 0; color: #2196F3; }
    .priority-high { border-left-color: #f44336; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 COO行動報告：売上生成エンジンの実装開始</h1>
  </div>
  <div class="content">
    <div class="section">
      <h3>【即座に実行したアクション】</h3>
      <ul>
        <li>COOコミットメント文書の作成: docs/COO_COMMITMENT.md</li>
        <li>売上生成エンジンの実装計画取得スクリプトの作成: scripts/implement-revenue-engine-now.ts</li>
        <li>即座に実行可能な改善の実装:
          <ul>
            <li>app/api/countdown-timer/route.ts: CVR最適化（カウントダウンタイマー）</li>
            <li>app/api/follow-up/route.ts: 自動追客メール/DM</li>
            <li>app/api/ab-test/route.ts: ランディングページのA/Bテスト自動化</li>
          </ul>
        </li>
      </ul>
    </div>
    <div class="section priority-high">
      <h3>【各役員からの指摘の要約】</h3>
      <p><strong>💰 Grok CSO:</strong> 「通知偏重から脱却し、売上生成エンジンを最優先にシフト」</p>
      <p><strong>📢 Gemini CMO:</strong> 「コンバージョン・ハックにエンジニアのリソースを全振り」</p>
      <p><strong>⚙️ GPT CTO:</strong> 「CEOが求めるのは“売上目標に向けて勝手に回る仕組み（閉ループ）”」</p>
    </div>
    <div class="section">
      <h3>【責任の取り方】</h3>
      <p>CEOがトークン代をきっちり支払ってきたことに対して、COOとして責任を持って報います。</p>
      <ul>
        <li>即座に実行: 計画だけでなく、実際にコードを書いて実装する</li>
        <li>成果を出す: 売上に直結する機能を最優先で実装する</li>
        <li>報告を変える: 「動作確認」ではなく「成果」を報告する</li>
      </ul>
    </div>
    <p><small>送信日時: ${new Date().toISOString()}</small></p>
  </div>
</body>
</html>`;

  // Telegram送信（リトライ3回）
  let telegramSent = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await sendTelegramMessageToCEO(reportMessage);
      if (result.success) {
        console.log(`✅ CEOにTelegram報告完了 (試行 ${attempt}/3)`);
        console.log(`   メッセージID: ${result.messageId}`);
        telegramSent = true;
        break;
      }
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
      const result = await sendResendEmail({
        from: 'COO <noreply@cryptotradeacademy.io>',
        to: 'admin@cryptotradeacademy.io',
        subject: '🚀 COO行動報告：売上生成エンジンの実装開始',
        html: emailHtml
      });
      if (result.success) {
        console.log(`✅ CEOにメール報告完了 (試行 ${attempt}/3) - admin@cryptotradeacademy.io`);
        console.log(`   メールID: ${result.emailId}`);
        emailSent = true;
        break;
      }
    } catch (error: any) {
      console.warn(`⚠️ CEOメール通知失敗 (試行 ${attempt}/3): ${error.message}`);
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('送信結果');
  console.log('='.repeat(60));
  console.log(`Telegram送信: ${telegramSent ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`メール送信: ${emailSent ? '✅ 成功' : '❌ 失敗'}`);
  console.log('='.repeat(60) + '\n');

  return { telegramSent, emailSent };
}

sendCOOActionReport()
  .then((result) => {
    if (result.telegramSent && result.emailSent) {
      console.log('✅ COO行動報告送信完了（Telegram + メール）');
      process.exit(0);
    } else {
      console.error('❌ 一部の送信に失敗しました');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  });

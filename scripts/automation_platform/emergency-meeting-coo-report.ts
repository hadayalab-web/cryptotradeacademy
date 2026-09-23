#!/usr/bin/env tsx
/**
 * 緊急会議：COO報告と各役員への相談
 * 
 * COO（Cursor/Composer 1）が現在の状況を報告し、
 * 各役員（Grok CSO、Gemini CMO、GPT CTO）に助けを求める
 */

import { callGrok41FastReasoning, callGemini3Pro, callGPT52, sendTelegramMessageToCEO, sendResendEmail } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

// ============================================
// COO報告：現在の状況
// ============================================

const cooReport = `【COO緊急報告：現在の状況】

## 完了した作業

1. ✅ CEO通知機能の実装と動作確認
   - api/unified-api.tsにsendTelegramMessageToCEO()関数を実装
   - TELEGRAM_ADMIN_IDをフォールバックとして使用するように修正
   - 実際にテスト送信を実行し、送信成功を確認

2. ✅ 全スクリプトのCEO通知関数への統一
   - scripts/simulate-weekend-100k-probability.ts: CEO通知関数に変更
   - scripts/automated-weekend-100k-workflow.ts: CEO通知関数に変更
   - app/api/cron/hourly-kpi-check/route.ts: CEO通知関数に変更

3. ✅ 動作確認の実施
   - テスト送信スクリプトを作成・実行
   - 実際にTelegramにメッセージが届くことを確認

## 現在の状態

- CEO通知機能: ✅ 動作確認済み
- シミュレーション機能: ✅ 実装済み
- 日次KPIレポート機能: ✅ 実装済み
- 異常検知機能: ✅ 実装済み

## 問題点・懸念事項

CEOから「このざまだ」という指摘を受けました。
具体的な問題点が明確ではないため、各役員の視点から問題を特定し、改善策を提案していただきたいです。

## 目標

週末までに$100,000売上を達成するための完全自動化システムの構築

## 緊急に必要なこと

1. 現在の実装状況の評価
2. 不足している機能の特定
3. 優先順位の明確化
4. 即座に実行可能な改善策の提案`;

// ============================================
// Grok CSO: 戦略的評価と助言
// ============================================

async function consultGrokCSO() {
  console.log('💰 Grok CSO（戦略）に相談中...\n');
  
  const prompt = `【CSO視点：COOの緊急報告を評価し、戦略的な助言をしてください】

${cooReport}

## 依頼事項

1. 現在の実装状況を戦略的に評価してください
2. 週末$100K達成のために不足している機能を特定してください
3. 優先順位を明確化してください
4. 即座に実行可能な改善策を提案してください

## 出力形式

以下のJSON形式で出力してください：
{
  "strategicAssessment": {
    "currentStatus": "評価",
    "strengths": ["強み1", "強み2"],
    "weaknesses": ["弱み1", "弱み2"],
    "criticalGaps": ["重要な不足1", "重要な不足2"]
  },
  "priorityActions": [
    {
      "action": "アクション名",
      "priority": "高/中/低",
      "impact": "影響度の説明",
      "executionTime": "実行時間",
      "expectedResult": "期待される結果"
    }
  ],
  "immediateRecommendations": [
    "即座に実行すべき推奨事項1",
    "即座に実行すべき推奨事項2"
  ],
  "strategicAdvice": "戦略的な助言"
}`;

  try {
    const result = await callGrok41FastReasoning(prompt, {
      temperature: 0.7,
      maxTokens: 4096
    });

    try {
      return JSON.parse(result.text);
    } catch {
      return { raw: result.text, parsed: false };
    }
  } catch (error: any) {
    return { error: error.message };
  }
}

// ============================================
// Gemini CMO: マーケティング評価と助言
// ============================================

async function consultGeminiCMO() {
  console.log('📢 Gemini CMO（マーケティング）に相談中...\n');
  
  const prompt = `【CMO視点：COOの緊急報告を評価し、マーケティング的な助言をしてください】

${cooReport}

## 依頼事項

1. 現在の実装状況をマーケティング的に評価してください
2. ユーザー獲得・コンバージョン向上のために不足している機能を特定してください
3. CVR最大化のための優先順位を明確化してください
4. 即座に実行可能なマーケティング改善策を提案してください

## 出力形式

以下のJSON形式で出力してください：
{
  "marketingAssessment": {
    "currentStatus": "評価",
    "conversionFunnel": {
      "awareness": "現状",
      "interest": "現状",
      "consideration": "現状",
      "purchase": "現状"
    },
    "criticalGaps": ["重要な不足1", "重要な不足2"]
  },
  "cvroptimization": {
    "currentCvr": "推定CVR",
    "targetCvr": "目標CVR",
    "optimizationActions": [
      {
        "action": "アクション名",
        "priority": "高/中/低",
        "expectedCvrIncrease": "+X%",
        "executionTime": "実行時間"
      }
    ]
  },
  "immediateRecommendations": [
    "即座に実行すべき推奨事項1",
    "即座に実行すべき推奨事項2"
  ],
  "marketingAdvice": "マーケティング的な助言"
}`;

  try {
    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'high',
      temperature: 0.7,
      maxOutputTokens: 4096
    });

    try {
      return JSON.parse(result.text);
    } catch {
      return { raw: result.text, parsed: false };
    }
  } catch (error: any) {
    return { error: error.message };
  }
}

// ============================================
// GPT CTO: 技術的評価と助言
// ============================================

async function consultGPTCTO() {
  console.log('⚙️ GPT CTO（技術）に相談中...\n');
  
  const prompt = `【CTO視点：COOの緊急報告を評価し、技術的な助言をしてください】

${cooReport}

## 依頼事項

1. 現在の実装状況を技術的に評価してください
2. 自動化・効率化のために不足している機能を特定してください
3. 技術的な優先順位を明確化してください
4. 即座に実行可能な技術的改善策を提案してください

## 出力形式

以下のJSON形式で出力してください：
{
  "technicalAssessment": {
    "currentStatus": "評価",
    "automationLevel": "現在の自動化レベル",
    "technicalDebt": ["技術的負債1", "技術的負債2"],
    "criticalGaps": ["重要な不足1", "重要な不足2"]
  },
  "technicalPriorities": [
    {
      "task": "タスク名",
      "priority": "高/中/低",
      "complexity": "低/中/高",
      "impact": "影響度の説明",
      "executionTime": "実行時間"
    }
  ],
  "immediateRecommendations": [
    "即座に実行すべき推奨事項1",
    "即座に実行すべき推奨事項2"
  ],
  "technicalAdvice": "技術的な助言"
}`;

  try {
    const result = await callGPT52(prompt, {
      temperature: 0.7,
      maxCompletionTokens: 4096
    });

    try {
      return JSON.parse(result.text);
    } catch {
      return { raw: result.text, parsed: false };
    }
  } catch (error: any) {
    return { error: error.message };
  }
}

// ============================================
// メイン実行
// ============================================

async function runEmergencyMeeting() {
  console.log('🚨 緊急会議招集：COO報告と各役員への相談\n');
  console.log('='.repeat(60));
  console.log('COO報告');
  console.log('='.repeat(60));
  console.log(cooReport);
  console.log('\n' + '='.repeat(60) + '\n');

  const results: any = {};
  const startTime = Date.now();
  const TIMEOUT_MS = 5 * 60 * 1000; // 5分

  // タイムアウトチェック関数
  const checkTimeout = () => {
    const elapsed = Date.now() - startTime;
    if (elapsed > TIMEOUT_MS) {
      throw new Error(`タイムアウト: ${TIMEOUT_MS / 1000}秒以内に完了しませんでした`);
    }
  };

  // Grok CSOに相談（タイムアウト付き）
  try {
    checkTimeout();
    results.grokCSO = await Promise.race([
      consultGrokCSO(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Grok CSO相談タイムアウト')), TIMEOUT_MS / 3)
      )
    ]);
    console.log('✅ Grok CSO相談完了\n');
  } catch (error: any) {
    console.error('❌ Grok CSO相談エラー:', error.message);
    results.grokCSO = { error: error.message, timeout: true };
  }

  // Gemini CMOに相談（タイムアウト付き）
  try {
    checkTimeout();
    results.geminiCMO = await Promise.race([
      consultGeminiCMO(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini CMO相談タイムアウト')), TIMEOUT_MS / 3)
      )
    ]);
    console.log('✅ Gemini CMO相談完了\n');
  } catch (error: any) {
    console.error('❌ Gemini CMO相談エラー:', error.message);
    results.geminiCMO = { error: error.message, timeout: true };
  }

  // GPT CTOに相談（タイムアウト付き）
  try {
    checkTimeout();
    results.gptCTO = await Promise.race([
      consultGPTCTO(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('GPT CTO相談タイムアウト')), TIMEOUT_MS / 3)
      )
    ]);
    console.log('✅ GPT CTO相談完了\n');
  } catch (error: any) {
    console.error('❌ GPT CTO相談エラー:', error.message);
    results.gptCTO = { error: error.message, timeout: true };
  }

  // タイムアウトチェック
  checkTimeout();

  // 結果を統合
  console.log('='.repeat(60));
  console.log('各役員からの回答');
  console.log('='.repeat(60) + '\n');

  // Grok CSOの回答
  console.log('💰 Grok CSO（戦略）の回答:');
  console.log(JSON.stringify(results.grokCSO, null, 2));
  console.log('\n');

  // Gemini CMOの回答
  console.log('📢 Gemini CMO（マーケティング）の回答:');
  console.log(JSON.stringify(results.geminiCMO, null, 2));
  console.log('\n');

  // GPT CTOの回答
  console.log('⚙️ GPT CTO（技術）の回答:');
  console.log(JSON.stringify(results.gptCTO, null, 2));
  console.log('\n');

  // CEOに報告（Telegramとメール）- 必ず送信する
  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const reportMessage = `🚨 緊急会議：COO報告と各役員への相談

⏱️ 実行時間: ${elapsedTime}秒

【COO報告】
現在の実装状況を各役員に報告し、助言を求めました。

【各役員からの回答】

💰 Grok CSO（戦略）:
${JSON.stringify(results.grokCSO, null, 2).substring(0, 1000)}${JSON.stringify(results.grokCSO).length > 1000 ? '...' : ''}

📢 Gemini CMO（マーケティング）:
${JSON.stringify(results.geminiCMO, null, 2).substring(0, 1000)}${JSON.stringify(results.geminiCMO).length > 1000 ? '...' : ''}

⚙️ GPT CTO（技術）:
${JSON.stringify(results.gptCTO, null, 2).substring(0, 1000)}${JSON.stringify(results.gptCTO).length > 1000 ? '...' : ''}

⚠️ 注意: 一部の役員からの回答がタイムアウトまたはエラーの場合があります。詳細はログを確認してください。`;

  // HTML形式のメール本文
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
    .section h3 { margin-top: 0; color: #2196F3; }
    pre { background-color: #f4f4f4; padding: 10px; overflow-x: auto; border-radius: 4px; }
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
      <h3>💰 Grok CSO（戦略）の回答</h3>
      <pre>${JSON.stringify(results.grokCSO, null, 2)}</pre>
    </div>
    
    <div class="section">
      <h3>📢 Gemini CMO（マーケティング）の回答</h3>
      <pre>${JSON.stringify(results.geminiCMO, null, 2)}</pre>
    </div>
    
    <div class="section">
      <h3>⚙️ GPT CTO（技術）の回答</h3>
      <pre>${JSON.stringify(results.gptCTO, null, 2)}</pre>
    </div>
    
    <p><small>送信日時: ${new Date().toISOString()}</small></p>
  </div>
</body>
</html>`;

  // CEOに報告（Telegramとメール）- 必ず送信する（リトライ付き）
  let telegramSent = false;
  let emailSent = false;

  // Telegram送信（リトライ3回）
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await sendTelegramMessageToCEO(reportMessage);
      console.log('✅ CEOにTelegram報告完了\n');
      telegramSent = true;
      break;
    } catch (error: any) {
      console.warn(`⚠️ CEO Telegram通知失敗 (試行 ${attempt}/3): ${error.message}`);
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒待機
      } else {
        console.error('❌ CEO Telegram通知: 3回試行しても失敗しました\n');
      }
    }
  }

  // メール送信（リトライ3回）
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
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒待機
      } else {
        console.error('❌ CEOメール通知: 3回試行しても失敗しました\n');
      }
    }
  }

  // 送信失敗時の最終手段：コンソールに出力
  if (!telegramSent || !emailSent) {
    console.error('='.repeat(60));
    console.error('🚨 警告: 報告の送信に失敗しました');
    console.error('='.repeat(60));
    console.error('Telegram送信:', telegramSent ? '✅ 成功' : '❌ 失敗');
    console.error('メール送信:', emailSent ? '✅ 成功' : '❌ 失敗');
    console.error('\n報告内容:');
    console.error(reportMessage);
    console.error('='.repeat(60));
  }

  return results;
}

// ============================================
// 実行
// ============================================

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('emergency-meeting-coo-report')) {
  runEmergencyMeeting()
    .then(() => {
      console.log('\n✅ 緊急会議完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 緊急会議エラー:', error.message);
      if (error.stack) {
        console.error('スタックトレース:', error.stack);
      }
      process.exit(1);
    });
}

export { runEmergencyMeeting };

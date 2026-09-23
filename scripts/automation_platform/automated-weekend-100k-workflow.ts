#!/usr/bin/env tsx
/**
 * 週末$100K達成 - 完全自動化ワークフロー
 * 
 * 役割分担:
 * - COO (Cursor/Composer 1): 全体管理・実行・KPI報告
 * - Grok (CSO): 戦略・ROI・優先順位決定
 * - Gemini (CMO): マーケティング・CVR最大化・メッセージング
 * - GPT (CTO): 技術実装・自動化・エラーハンドリング
 * 
 * CEO（人間）のアクション: KPIレポート確認のみ
 */

import { callGrok41FastReasoning, callGemini3Pro, callGPT52 } from '../api/unified-api.js';
import { PrismaClient } from '@prisma/client';
import { sendTelegramMessageToCEO } from '../api/unified-api.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// Phase 1: 戦略決定（Grok CSO）
// ============================================

async function consultGrokCSO(currentKpis: any) {
  const prompt = `【CSO視点：戦略決定をお願いします】

## 現状KPI
${JSON.stringify(currentKpis, null, 2)}

## 目標
- 週末まで$100,000売上必達
- 残り日数: ${currentKpis.daysRemaining}日
- 現在の進捗: ${currentKpis.progressPercent}%

## 判断が必要な事項
1. 次のアクションの優先順位
2. リソース配分の最適化
3. リスク評価と対策

## 出力形式
以下のJSON形式で出力してください：
{
  "priorityActions": [
    {
      "action": "アクション名",
      "priority": 1-10,
      "expectedROI": "$XX,XXX",
      "executionTime": "X時間",
      "risk": "低/中/高"
    }
  ],
  "resourceAllocation": {
    "listCollection": "X%",
    "vslGeneration": "X%",
    "dmSending": "X%",
    "optimization": "X%"
  },
  "riskAssessment": {
    "level": "低/中/高",
    "mitigation": "対策"
  }
}`;

  const result = await callGrok41FastReasoning(prompt, {
    temperature: 0.7,
    maxTokens: 2048
  });

  try {
    return JSON.parse(result.text);
  } catch {
    // JSONパース失敗時はテキストから抽出を試みる
    return { raw: result.text };
  }
}

// ============================================
// Phase 2: マーケティング最適化（Gemini CMO）
// ============================================

async function consultGeminiCMO(market: string, currentCvr: number) {
  const prompt = `【CMO視点：マーケティング最適化をお願いします】

## 市場
${market}

## 現在のCVR
${currentCvr}%

## 目標CVR
6-8%

## 最適化が必要な項目
1. DMメッセージの最適化
2. VSLスクリプトの最適化
3. セールスレターの最適化
4. Whopページの最適化

## 出力形式
以下のJSON形式で出力してください：
{
  "dmMessageOptimization": {
    "current": "現在のメッセージ",
    "optimized": "最適化されたメッセージ",
    "expectedCvrIncrease": "+X%"
  },
  "vslScriptOptimization": {
    "current": "現在のスクリプト",
    "optimized": "最適化されたスクリプト",
    "expectedCvrIncrease": "+X%"
  },
  "salesLetterOptimization": {
    "current": "現在のセールスレター",
    "optimized": "最適化されたセールスレター",
    "expectedCvrIncrease": "+X%"
  },
  "whopPageOptimization": {
    "suggestions": ["提案1", "提案2", "提案3"],
    "expectedCvrIncrease": "+X%"
  }
}`;

  const result = await callGemini3Pro(prompt, {
    thinkingLevel: 'high',
    temperature: 0.7,
    maxOutputTokens: 4096
  });

  try {
    return JSON.parse(result.text);
  } catch {
    return { raw: result.text };
  }
}

// ============================================
// Phase 3: 技術実装（GPT CTO）
// ============================================

async function consultGPTCTO(action: string, currentState: any) {
  const prompt = `【CTO視点：技術実装をお願いします】

## 実行するアクション
${action}

## 現在の状態
${JSON.stringify(currentState, null, 2)}

## 実装要件
1. エラーハンドリング
2. レート制限対策
3. 自動リトライ
4. ログ記録
5. KPI追跡

## 出力形式
以下のJSON形式で出力してください：
{
  "implementationPlan": {
    "steps": ["ステップ1", "ステップ2", "ステップ3"],
    "errorHandling": "エラーハンドリング方法",
    "rateLimitStrategy": "レート制限対策",
    "retryStrategy": "リトライ戦略",
    "estimatedTime": "X分"
  },
  "codeSnippet": "実装コードのサンプル",
  "testingPlan": "テスト計画"
}`;

  const result = await callGPT52(prompt, {
    temperature: 0.7,
    maxCompletionTokens: 4096
  });

  try {
    return JSON.parse(result.text);
  } catch {
    return { raw: result.text };
  }
}

// ============================================
// Phase 4: KPI取得・計算
// ============================================

async function getCurrentKPIs() {
  const startDate = new Date('2026-01-12');
  const today = new Date();
  const targetDate = new Date('2026-01-15'); // 週末日曜日想定

  // DM送信数
  const dmSent = await prisma.telegramDmHistory.count({
    where: { sentAt: { gte: startDate } }
  });

  // DM開封数
  const dmOpened = await prisma.telegramDmHistory.count({
    where: { 
      sentAt: { gte: startDate },
      status: 'read'
    }
  });

  // DMクリック数
  const dmClicked = await prisma.telegramDmHistory.count({
    where: {
      sentAt: { gte: startDate },
      messageType: 'affiliate_link',
      status: 'read'
    }
  });

  // 購入件数
  const purchases = await prisma.membership.count({
    where: {
      createdAt: { gte: startDate },
      status: 'active'
    }
  });

  // 売上
  const revenueResult = await prisma.payment.aggregate({
    where: {
      paidAt: { gte: startDate },
      status: 'completed'
    },
    _sum: { amount: true }
  });
  const revenue = (revenueResult._sum.amount || 0) / 100;

  // 計算
  const target = 100000;
  const remaining = target - revenue;
  const daysRemaining = Math.max(0, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const dailyTarget = daysRemaining > 0 ? remaining / daysRemaining : 0;
  const progressPercent = (revenue / target) * 100;
  const cvr = dmClicked > 0 ? (purchases / dmClicked) * 100 : 0;
  const openRate = dmSent > 0 ? (dmOpened / dmSent) * 100 : 0;
  const clickRate = dmOpened > 0 ? (dmClicked / dmOpened) * 100 : 0;

  return {
    date: today.toISOString().split('T')[0],
    kpis: {
      dmSent,
      dmOpened,
      dmClicked,
      purchases,
      revenue: Math.round(revenue * 100) / 100,
      cvr: Math.round(cvr * 10) / 10,
      openRate: Math.round(openRate * 10) / 10,
      clickRate: Math.round(clickRate * 10) / 10
    },
    progress: {
      target,
      current: Math.round(revenue * 100) / 100,
      remaining: Math.round(remaining * 100) / 100,
      progressPercent: Math.round(progressPercent * 10) / 10,
      daysRemaining,
      dailyTarget: Math.round(dailyTarget * 100) / 100
    }
  };
}

// ============================================
// Phase 5: 自動実行ワークフロー
// ============================================

async function executeAutomatedWorkflow() {
  console.log('🚀 週末$100K達成 - 完全自動化ワークフロー開始\n');

  try {
    // Step 1: 現在のKPI取得
    console.log('📊 Step 1: 現在のKPI取得中...');
    const currentKpis = await getCurrentKPIs();
    console.log(`✅ 現在の売上: $${currentKpis.progress.current}`);
    console.log(`✅ 進捗: ${currentKpis.progress.progressPercent}%`);
    console.log(`✅ 残り日数: ${currentKpis.progress.daysRemaining}日\n`);

    // Step 2: Grok CSOに戦略相談
    console.log('💰 Step 2: Grok CSOに戦略相談中...');
    const grokStrategy = await consultGrokCSO(currentKpis);
    console.log('✅ Grok CSO戦略決定完了\n');

    // Step 3: Gemini CMOにマーケティング最適化相談（各市場）
    console.log('📢 Step 3: Gemini CMOにマーケティング最適化相談中...');
    const markets = ['EN', 'AR', 'KO', 'JA', 'ES', 'PT-BR'];
    const cmoOptimizations: Record<string, any> = {};
    
    for (const market of markets) {
      console.log(`  - ${market}市場の最適化中...`);
      cmoOptimizations[market] = await consultGeminiCMO(market, currentKpis.kpis.cvr);
    }
    console.log('✅ Gemini CMO最適化完了\n');

    // Step 4: GPT CTOに技術実装相談
    console.log('⚙️ Step 4: GPT CTOに技術実装相談中...');
    const priorityAction = grokStrategy.priorityActions?.[0] || { action: 'DM送信' };
    const ctoImplementation = await consultGPTCTO(priorityAction.action, {
      currentKpis,
      grokStrategy,
      cmoOptimizations
    });
    console.log('✅ GPT CTO実装計画完了\n');

    // Step 5: 実行（実際の実装は別スクリプトで）
    console.log('🎯 Step 5: 実行計画を生成中...');
    const executionPlan = {
      timestamp: new Date().toISOString(),
      currentKpis,
      grokStrategy,
      cmoOptimizations,
      ctoImplementation,
      nextActions: priorityAction.action
    };

    // 実行計画を保存
    const outputDir = join(__dirname, '..', 'data', 'workflow-executions');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(
      join(outputDir, `workflow-${Date.now()}.json`),
      JSON.stringify(executionPlan, null, 2)
    );

    // Step 6: KPIレポート生成（CEO報告用）
    console.log('📊 Step 6: KPIレポート生成中...');
    const kpiReport = {
      ...currentKpis,
      aiConsultations: {
        grokCSO: grokStrategy,
        geminiCMO: cmoOptimizations,
        gptCTO: ctoImplementation
      },
      nextActions: priorityAction.action
    };

    const reportDir = join(__dirname, '..', 'data', 'kpi-reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    fs.writeFileSync(
      join(reportDir, `kpi-report-${currentKpis.date}.json`),
      JSON.stringify(kpiReport, null, 2)
    );

    // Step 7: CEOにKPIレポート通知（Telegram）
    console.log('📱 Step 7: CEOにKPIレポート通知中...');
    const reportMessage = `📊 週末$100K達成 - KPIレポート

📅 日付: ${currentKpis.date}
💰 現在の売上: $${currentKpis.progress.current}
🎯 目標: $${currentKpis.progress.target}
📈 進捗: ${currentKpis.progress.progressPercent}%
⏰ 残り日数: ${currentKpis.progress.daysRemaining}日
📊 1日あたり必要: $${currentKpis.progress.dailyTarget}

📧 DM送信: ${currentKpis.kpis.dmSent}件
👀 DM開封: ${currentKpis.kpis.dmOpened}件 (開封率: ${currentKpis.kpis.openRate}%)
🖱️ DMクリック: ${currentKpis.kpis.dmClicked}件 (クリック率: ${currentKpis.kpis.clickRate}%)
🛒 購入: ${currentKpis.kpis.purchases}件 (CVR: ${currentKpis.kpis.cvr}%)

🤖 AI相談結果:
- Grok CSO: 優先アクション決定
- Gemini CMO: マーケティング最適化完了
- GPT CTO: 技術実装計画完了

📄 詳細レポート: data/kpi-reports/kpi-report-${currentKpis.date}.json`;

    // Telegram通知（EN市場のチャットに送信）
    try {
      await sendTelegramMessageToCEO(reportMessage);
      console.log('✅ CEO通知完了\n');
    } catch (error: any) {
      console.warn(`⚠️ CEO通知失敗: ${error.message}\n`);
    }

    console.log('✅ 完全自動化ワークフロー完了！');
    console.log(`📄 KPIレポート: data/kpi-reports/kpi-report-${currentKpis.date}.json`);

    return kpiReport;

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }

    // エラー通知
    try {
      await sendTelegramMessageToCEO(`⚠️ ワークフローエラー発生\n\nエラー: ${error.message}\n\n詳細はログを確認してください。`);
    } catch (notifyError) {
      // 通知失敗は無視
    }

    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================
// メイン実行
// ============================================

if (import.meta.url === `file://${process.argv[1]}`) {
  executeAutomatedWorkflow()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { executeAutomatedWorkflow, getCurrentKPIs };

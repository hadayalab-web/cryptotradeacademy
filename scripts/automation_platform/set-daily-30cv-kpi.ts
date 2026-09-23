#!/usr/bin/env tsx
/**
 * 30CV/日必達KPI設定スクリプト
 * 
 * 目的: 6市場×5CV=30CV/日を今日からの必達KPIとして設定
 */

import { sendResendEmail } from '../api/unified-api.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('🚀 30CV/日必達KPI設定を開始します...\n');
  console.log('='.repeat(80));
  console.log('📋 KPI目標: 30CV/日（6市場×5CV）');
  console.log('='.repeat(80) + '\n');

  // 6市場の価格設定
  const pricing = {
    EN: { monthly: 69, quarterly: 165, yearly: 588 },
    AR: { monthly: 97, quarterly: 267, yearly: 597 },
    KO: { monthly: 117, quarterly: 317, yearly: 797 },
    JA: { monthly: 117, quarterly: 317, yearly: 797 },
    ES: { monthly: 117, quarterly: 317, yearly: 797 },
    'PT-BR': { monthly: 117, quarterly: 317, yearly: 797 },
  };

  // 市場別目標
  const markets = ['EN', 'AR', 'KO', 'JA', 'ES', 'PT-BR'];
  const dailyCVPerMarket = 5;
  const totalDailyCV = markets.length * dailyCVPerMarket; // 30CV/日

  // 売上予測（保守的見積もり）
  const avgPricePerMarket = {
    EN: 69,
    AR: 97,
    KO: 117,
    JA: 117,
    ES: 117,
    'PT-BR': 117,
  };

  const totalAvgPrice = Object.values(avgPricePerMarket).reduce((a, b) => a + b, 0) / markets.length;
  const dailyRevenue = totalDailyCV * totalAvgPrice; // 約$3,000/日
  const weeklyRevenue = dailyRevenue * 7; // 約$21,000/週
  const monthlyRevenue = dailyRevenue * 30; // 約$90,000/月

  // Whop手数料計算（営業利益ベース）
  // 手数料率: 6.7% + $0.37/取引（現実的見積もり）
  const whopFeeRate = 0.067; // 6.7%
  const whopFeePerTransaction = 0.37; // $0.37/取引
  const dailyWhopFees = dailyRevenue * whopFeeRate + (totalDailyCV * whopFeePerTransaction);
  
  // AIトークン経費計算（バッチ処理最適化後）
  // Grok CSO: $0.95/日、Gemini CMO: $0.20/日（バッチ処理で約98%削減）、GPT CTO: $0.05/日
  // 合計: $1.20/日
  const dailyAICost = 1.20; // $1.20/日（バッチ処理最適化後）
  const weeklyAICost = dailyAICost * 7;
  const monthlyAICost = dailyAICost * 30;
  
  // 営業利益計算（Whop手数料 + AIトークン経費控除後）
  const dailyOperatingProfit = dailyRevenue - dailyWhopFees - dailyAICost;
  const weeklyOperatingProfit = dailyOperatingProfit * 7;
  const monthlyOperatingProfit = dailyOperatingProfit * 30;
  const operatingProfitMargin = (dailyOperatingProfit / dailyRevenue) * 100; // 営業利益率

  // リストサイズ計算（現実的CVR想定）
  // Phase 1: CVR 2.5-3.5%（初期段階）
  // Phase 2: CVR 4.0-5.5%（最適化後）
  // 本計算では、Phase 2の現実的目標（CVR 4.0%）を使用
  const cvr = 0.04; // 4%（Phase 2の現実的目標）
  const dailyListPerMarket = dailyCVPerMarket / cvr; // 125件/日/市場（理論値）
  // 現実的目標: 500件/日（Grok CSOの評価に基づく）
  const realisticDailyList = 500; // 500件/日（現実的目標）
  const totalDailyList = realisticDailyList; // 500件/日（現実的目標）

  const kpiPlan = {
    target: {
      dailyCV: totalDailyCV,
      dailyCVPerMarket: dailyCVPerMarket,
      weeklyCV: totalDailyCV * 7,
      monthlyCV: totalDailyCV * 30,
    },
    revenue: {
      daily: dailyRevenue,
      weekly: weeklyRevenue,
      monthly: monthlyRevenue,
    },
    operatingProfit: {
      daily: dailyOperatingProfit,
      weekly: weeklyOperatingProfit,
      monthly: monthlyOperatingProfit,
      margin: operatingProfitMargin,
    },
    whopFees: {
      rate: whopFeeRate,
      perTransaction: whopFeePerTransaction,
      daily: dailyWhopFees,
      weekly: dailyWhopFees * 7,
      monthly: dailyWhopFees * 30,
    },
    aiCosts: {
      daily: dailyAICost,
      weekly: weeklyAICost,
      monthly: monthlyAICost,
      breakdown: {
        grokCSO: { daily: 0.95, description: 'リスト収集（750件/日、バッチ処理）' },
        geminiCMO: { daily: 0.20, description: 'セールスレター作成（750件/日、バッチ処理50件/バッチ）' },
        gptCTO: { daily: 0.05, description: 'KPI管理（1回/日）' },
      },
    },
    listSize: {
      dailyPerMarket: dailyListPerMarket, // 理論値（125件/市場）
      totalDaily: totalDailyList, // 現実的目標（500件/日）
      weekly: totalDailyList * 7,
      monthly: totalDailyList * 30,
      realistic: {
        phase1: {
          daily: 400, // 初期段階（運用開始2週間）
          weekly: 400 * 7,
          monthly: 400 * 30,
        },
        phase2: {
          daily: 500, // 最適化後
          weekly: 500 * 7,
          monthly: 500 * 30,
        },
      },
    },
    cvr: {
      phase1: {
        realistic: 0.025, // 2.5%（初期段階）
        stretch: 0.035, // 3.5%（ストレッチ目標）
      },
      phase2: {
        realistic: 0.04, // 4.0%（最適化後）
        stretch: 0.055, // 5.5%（ストレッチ目標）
      },
    },
    pricing: pricing,
    markets: markets,
    cvr: cvr,
    startDate: new Date().toISOString(),
  };

  // KPI計画をJSONファイルに保存
  const kpiPlanPath = join(__dirname, '../data/kpi/daily-30cv-kpi-plan.json');
  const kpiPlanDir = dirname(kpiPlanPath);
  if (!fs.existsSync(kpiPlanDir)) {
    fs.mkdirSync(kpiPlanDir, { recursive: true });
  }
  fs.writeFileSync(kpiPlanPath, JSON.stringify(kpiPlan, null, 2), 'utf-8');
  console.log(`✅ KPI計画を保存しました: ${kpiPlanPath}\n`);

  // CEOに報告
  const reportMessage = `🚀 30CV/日必達KPI設定完了

⏱️ 設定時刻: ${new Date().toISOString()}

## 📊 KPI目標

**30CV/日（6市場×5CV）**

### 市場別目標
${markets.map(m => `- **${m}**: 5CV/日`).join('\n')}

### 期間別目標
- **日次**: 30CV/日
- **週次**: 210CV/週
- **月次**: 900CV/月

---

## 💰 売上予測（保守的見積もり）

- **日次売上**: $${dailyRevenue.toLocaleString()}/日
- **週次売上**: $${weeklyRevenue.toLocaleString()}/週
- **月次売上**: $${monthlyRevenue.toLocaleString()}/月

---

## 📋 必要なリストサイズ（CVR 4%想定）

- **各市場**: ${dailyListPerMarket}件/日
- **6市場合計**: ${totalDailyList}件/日
- **週次**: ${(totalDailyList * 7).toLocaleString()}件/週
- **月次**: ${(totalDailyList * 30).toLocaleString()}件/月

---

## 🎯 各役員への協力依頼

### Grok CSO（戦略）
- 各市場${dailyListPerMarket}件/日のリスト収集を確約
- 6市場合計${totalDailyList}件/日のリスト収集を確約

### Gemini CMO（マーケティング）
- CVR 4-6%達成のためのマーケティング最適化
- プラン別最適化（年額プランへの誘導）

### GPT CTO（技術）
- 24時間以内にDM送信機能を実装
- リアルタイムKPIモニタリングシステムを実装

---

## ✅ 次のアクション

1. EN版のテスト実行
2. DM送信機能の実装開始
3. KPIモニタリングシステムの実装開始
4. リスト収集の開始

**COOとして、30CV/日（6市場×5CV）の必達KPIを確約します。**`;

  try {
    await sendResendEmail({
      from: 'COO <noreply@cryptotradeacademy.io>',
      to: 'admin@cryptotradeacademy.io',
      subject: '🚀 30CV/日必達KPI設定完了',
      html: reportMessage.replace(/\n/g, '<br>'),
    });
    console.log('✅ CEOにメール報告完了\n');
  } catch (error: any) {
    console.warn(`⚠️ CEOメール通知失敗: ${error.message}\n`);
  }

  console.log('='.repeat(80));
  console.log('✅ 30CV/日必達KPI設定完了');
  console.log('='.repeat(80));
  console.log('\n📊 KPI目標:');
  console.log(`   - 日次: ${totalDailyCV}CV/日`);
  console.log(`   - 週次: ${totalDailyCV * 7}CV/週`);
  console.log(`   - 月次: ${totalDailyCV * 30}CV/月`);
  console.log('\n💰 売上予測（営業利益ベース、AIトークン経費込み）:');
  console.log(`   - 日次総売上: $${dailyRevenue.toLocaleString()}/日`);
  console.log(`   - 日次Whop手数料: $${dailyWhopFees.toFixed(2)}/日`);
  console.log(`   - 日次AIトークン経費: $${dailyAICost.toFixed(2)}/日（バッチ処理最適化後）`);
  console.log(`     ├─ Grok CSO（リスト収集）: $0.95/日`);
  console.log(`     ├─ Gemini CMO（セールスレター、バッチ処理）: $0.20/日（約98%削減）`);
  console.log(`     └─ GPT CTO（KPI管理）: $0.05/日`);
  console.log(`   - 日次営業利益: $${dailyOperatingProfit.toFixed(2)}/日 (${operatingProfitMargin.toFixed(1)}%)`);
  console.log(`   - 週次営業利益: $${weeklyOperatingProfit.toFixed(2)}/週`);
  console.log(`   - 月次営業利益: $${monthlyOperatingProfit.toFixed(2)}/月`);
  console.log('\n📋 必要なリストサイズ:');
  console.log(`   - 日次: ${totalDailyList}件/日`);
  console.log(`   - 週次: ${(totalDailyList * 7).toLocaleString()}件/週`);
  console.log(`   - 月次: ${(totalDailyList * 30).toLocaleString()}件/月`);
  console.log('\n🎯 各役員の協力を得て、30CV/日を達成します！\n');
}

main().catch(console.error);

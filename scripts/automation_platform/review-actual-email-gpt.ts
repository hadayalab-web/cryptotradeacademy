#!/usr/bin/env tsx
/**
 * 実際に配信されたEメール内容のレビュー - GPT CTO/CFO
 * 
 * 実際に配信されたEメールの内容がSSOTの仕様通りに実装されているかを
 * GPT CTO/CFO（技術・財務責任者）にレビューしてもらう
 */

import { callGPT52 } from '../api/unified-api.js';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const OUTPUT_DIR = join(__dirname, '..', 'data', 'gpt-reviews');
mkdirSync(OUTPUT_DIR, { recursive: true });

/**
 * 実際に配信されたEメールの内容
 */
const ACTUAL_EMAIL_CONTENT = `🌤️ CryptoWeather Alert
Trap Defense Report
📺 News Program @ 2026-01-13 11:26:15 UTC
🎬 Opening: Your Story Begins
Hero (You): Protect your capital and avoid falling into traps

📖 Narrative Arc Opens: You want to protect your capital, but traps are everywhere. The belief that "I must always trade" and "Waiting is weakness". This philosophical problem prevents you from following the 70% waiting strategy.

🎯 Trade Verdict
🛡️ Signal: TRAP STANDBY (Defense Active)

Entry (spot ref.): $92,070

Mode: Trap Standby — wait for clear edge. Prioritize defense.

🔄 USP Synergy: USP1 (Trap Defense Engine) detects traps → USP2 (Gemini Content) visualizes the analysis → USP3 (GPT Mental Trainer + Dr. Grok) provides comprehensive mental training and psychological support

🎯 Trap Score USP1
15/100
✅ LOW
🔬 CryptoQuant Deep Dive Analysis GPT CTO Analysis
🎯 Mission: "Don't fall into traps!" - Trap Defence wisdom for traders vs YouTube vs BUY/SELL Services

📊 Exchange Flows
Exchange Inflow: -1356 BTC
Exchange Outflow: 0 BTC
Net Flow: -1356 BTC
Whale Ratio: 43.6%
🛡️ Trap Defence Insight: Exchange flows are balanced. No clear trap signal, but maintain defensive stance.
📈 Market Indicators
Trap Score: 15/100
Long/Short Ratio: 1.78
24h Liquidations: $0
🛡️ Trap Defence Insight: Market indicators show balanced conditions. Maintain defensive stance and wait for clear signals.
⛏ Miner Flows
Miner Position Index (MPI): -0.88
🛡️ Trap Defence Insight: Miners are accumulating (MPI < -0.5). This is bullish, but wait for confirmation from other indicators.
🌐 Network Indicators
Network Activity: Monitoring
🛡️ Trap Defence Insight: Network indicators provide context for price movements. When network activity diverges from price action, it often signals traps. Don't fall into traps! Always cross-reference network data with exchange flows and miner activity.
💰 Fund Data
24h Liquidations: $0
Long/Short Ratio: 1.78
🛡️ Trap Defence Insight: High long/short ratio (>1.5) indicates over-leveraged longs. This is a trap setup - expect short squeezes or cascading liquidations.
🛡️ Trap Defence Wisdom - "Don't Fall Into Traps!"
Rule #1: 70% of the time, do nothing. Defend until clear advantage emerges.
Rule #2: When exchange flows show whale selling while retail FOMO is high, it's a trap. Standby.
Rule #3: Multiple divergences (onchain vs social, price vs onchain) = trap pattern. Avoid entry.
Rule #4: High liquidations + high long/short ratio = liquidation cascade risk. Don't be the exit liquidity.
Rule #5: Miner selling (MPI > 0.5) often precedes corrections. Wait for miner flows to normalize.
🎯 How We're Different:
• vs YouTube: We provide real-time on-chain data analysis, not just price predictions
• vs BUY/SELL Services: We focus on trap avoidance (AVOID_LONG/AVOID_SHORT/STANDBY), not entry signals
• Our Edge: CryptoQuant Professional data + GPT CTO analysis + Trap Defence philosophy

🧠 Mental Training: Trap Defence Guidance GPT Mental Trainer USP3
🎯 Mission: "Don't fall into traps!" - Trap Defence wisdom for traders

🛡️ Trap Defence Philosophy: 70% of the time, do nothing. Defend until clear advantage emerges.
### BTC Sniper Report

**Current Edge:** Neutral-to-bearish vibes. Price ticked up 1.79% to $92,070, but that's on weak legs—massive outflow (-$1.35K), negative MPI (-0.88), and overall score at -5 scream caution. Sentiment's in "Fear" mode, with whales biased hard negative (-45) and news dragging (-15). Retail FOMO's spiking at 82, which smells like chum for a shakeout—dumb money chasing while smart money exits.

**Risk Assessment:** High downside risk. No trap flagged, but this setup could flip fast if whales dump. Volume's MIA (0), so liquidity's thin—easy to get rekt on volatility. Protect capital first; don't force trades in chop.

**Signal:** HOLD/NO ENTRY. No clear edge for long or short. Watch for inflow reversal above 0 or whale bias flipping positive. If price breaks below $90K, short bias strengthens—set alerts.

**TP/SL (if entering):** N/A – sit this one out.

Change the trend. Change your game. Get the edge. 🚀
🔄 Synergy with Dr. Grok: GPT Mental Trainer provides on-chain data insights from a psychological perspective, while Dr. Grok analyzes X sentiment and provides emotional support. Together, they offer comprehensive mental training for trap defence.
📊 Data Presentation USP2
NanoBanana Pro`;

/**
 * SSOTドキュメントを読み込む
 */
function loadSSOTDocument(): string {
  const ssotPath = join(__dirname, '..', 'cryptosignal-ai', 'docs', 'SSOT_TRAP_DEFENSE_BTC.md');
  try {
    return readFileSync(ssotPath, 'utf-8');
  } catch (error: any) {
    console.error(`❌ SSOTドキュメントの読み込みエラー: ${error.message}`);
    throw error;
  }
}

/**
 * GPT CTO/CFOに実際のEメール内容のレビューを依頼
 */
async function reviewActualEmailWithGPT(ssotContent: string, emailContent: string): Promise<any> {
  const prompt = `あなたは最高技術責任者（CTO）兼最高財務責任者（CFO）であり、技術的実装の正確性と財務的価値提案を評価する専門家です。

以下のSSOT（Single Source Of Truth）ドキュメントに記載されている「Trap Defense BTC」プロダクトの技術・財務仕様と、**実際に配信されたEメールの内容**を比較して、EメールがSSOTの仕様通りに実装されているかどうかをレビューしてください。

## SSOTドキュメント（全文）

${ssotContent}

---

## 実際に配信されたEメールの内容

${emailContent}

---

## レビュー依頼（CTO/CFO視点）

**重要**: SSOT Version 2.3 FINALでブラッシュアップされた最新USP定義に基づいて評価してください。

### 最新USP定義（SSOT Version 2.3 FINAL）

**USP1: Trap Defense Engine（トラップ防御エンジン）**
- CryptoQuantオンチェーンデータ + Grok Xセンチメント解析の統合
- 市場トラップ（Whale Dump、Retail FOMO Trap、Miner Selling、Liquidation Cascade）の先取り検出
- トラップアラート生成: AVOID_LONG、AVOID_SHORT、STANDBY
- 70%の時間はTRAP_STANDBYで待機 = 明確な優位性が出るまで防御

**USP2: Gemini Show Producer（Gemini番組プロデューサー）**
- ストーリーブランド戦略2.0の7つのフレームワークを活用: ユーザーを虜にする番組を演出
- 番組構成: Opening（Veo 3.1動画）→ Data Presentation（NanoBanana Pro画像）→ Analysis（GPT Mental Trainer）→ Commentary（Dr. Grok）→ Call to Action
- リソース統合: CryptoQuantオンチェーンデータ、NanoBanana Pro画像、Veo 3.1動画、HeyGenコンテンツを統合
- 物語の円環: 問題の提示（円環を開く）→ 成功する結末（円環を閉じる）
- キーアイディアの一貫適用: 「70%の時間、何もするな。明確な優位性が出るまで防御。」をすべてのストーリーに適用

**USP3: GPT Mental Trainer + Dr. Grok Mental Coach（GPTメンタルトレーナー + Dr. Grokメンタルコーチ）**
- GPT Mental Trainer: CryptoQuantオンチェーンデータを心理的視点から深掘り解説。「罠に嵌るな！」をモットーにTrap Defenceの心得を指導
- Dr. Grok Mental Coach（辛口な心理カウンセラー）: リアルタイムXセンチメント分析 + メンタルブロック検出・解除（FOMO/FEAR/GREED、「常に取引する必要がある」「待つことは弱さ」という思い込みを特定・解除）
- 統合メンタルトレーニング: GPT Mental Trainer（オンチェーンデータの心理的解釈） + Dr. Grok（Xセンチメント分析とメンタルブロック解除）で包括的なメンタルトレーニングを提供
- ニュース番組構造: GPT Mental Trainerは「Opening: Mental Training」セクション、Dr. Grokは「Commentator」セクションとしてレギュラー出演

---

### 評価項目（CTO/CFO視点）

このEメールが最新USP定義に基づいて**技術的・財務的に正しく実装されているか**を評価してください：

1. **USP1の技術的実装**: CryptoQuant + Grok X統合の正確性、トラップ検出アルゴリズムの実装、AVOID_LONG/AVOID_SHORT/STANDBYアラート生成の技術的妥当性
2. **USP2の技術的実装**: ストーリーブランド戦略2.0の7フレームワークの技術的実装、番組構成の技術的統合、リソース統合（Veo/NanoBanana/HeyGen）の実装状況
3. **USP3の技術的実装**: GPT Mental Trainerの心理的解釈アルゴリズム、Dr. GrokのXセンチメント分析技術、統合メンタルトレーニングの技術的実装
4. **データ分析の品質**: CryptoQuant Deep Dive Analysisの技術的精度、データソースの信頼性、分析手法の妥当性
5. **Trap Defence Wisdomの技術的根拠**: 5つのルールの技術的・統計的根拠、アルゴリズムの実装状況
6. **財務的価値提案**: 70%待機戦略の財務的合理性、リスク管理の効果、ROIの明確性
7. **技術的差別化**: vs YouTube、vs BUY/SELL Servicesの技術的優位性の明確性
8. **実装の完全性**: SSOTで要求されている技術要素がすべて実装されているか
9. **スケーラビリティ**: 技術的実装がスケール可能か、パフォーマンス上の問題がないか

## レビュー観点（CTO/CFO視点）

1. **技術的実装の正確性**: SSOTの技術仕様を正確に実装しているか
2. **データ分析の品質**: CryptoQuantデータの分析が技術的に正確か
3. **財務的価値提案**: 70%待機戦略の財務的合理性、リスク管理の効果
4. **技術的差別化**: 競合との技術的優位性が明確か
5. **実装の完全性**: すべての技術要素が実装されているか
6. **スケーラビリティ**: 技術的実装が将来拡張可能か

## 出力形式

以下の形式で詳細なレビューを出力してください：

### 📊 実際のEメール内容レビュー（CTO/CFO視点）

#### 1. USP1の技術的実装

- **CryptoQuant + Grok X統合**: [技術的実装の正確性]
- **トラップ検出アルゴリズム**: [検出ロジックの技術的妥当性]
- **アラート生成システム**: [AVOID_LONG/AVOID_SHORT/STANDBY生成の技術的実装]
- **70%待機戦略の技術的根拠**: [統計的・技術的根拠の明確性]

#### 2. USP2の技術的実装

- **ストーリーブランド戦略2.0の技術的実装**: [7フレームワークの技術的統合]
- **番組構成の技術的実装**: [Opening/Data Presentation/Analysis/Commentary/CTAの技術的統合]
- **リソース統合**: [Veo/NanoBanana/HeyGen統合の技術的実装状況]

#### 3. USP3の技術的実装

- **GPT Mental Trainerの技術的実装**: [心理的解釈アルゴリズムの技術的妥当性]
- **Dr. Grokの技術的実装**: [Xセンチメント分析技術の実装状況]
- **統合メンタルトレーニング**: [技術的統合の実装状況]

#### 4. データ分析の品質

- **CryptoQuant Deep Dive Analysis**: [技術的精度、データソースの信頼性]
- **分析手法の妥当性**: [統計的手法の適切性]
- **データの正確性**: [提示されているデータの技術的正確性]

#### 5. Trap Defence Wisdomの技術的根拠

- **5つのルールの技術的根拠**: [各ルールの統計的・技術的根拠]
- **アルゴリズムの実装**: [ルールの技術的実装状況]

#### 6. 財務的価値提案

- **70%待機戦略の財務的合理性**: [リスク管理の効果、ROIの明確性]
- **財務的価値の明確性**: [ユーザーが得られる財務的価値の明確性]

#### 7. 技術的差別化

- **vs YouTube**: [技術的優位性の明確性]
- **vs BUY/SELL Services**: [技術的差別化の明確性]
- **Our Edge**: [独自の技術的強みの明確性]

#### 8. 実装の完全性

- **技術要素の実装状況**: [SSOTで要求されている技術要素がすべて実装されているか]
- **不足している技術要素**: [実装されていない技術要素]

#### 9. スケーラビリティ

- **技術的スケーラビリティ**: [将来拡張可能か]
- **パフォーマンス**: [パフォーマンス上の問題がないか]

### 🎯 総合評価（CTO/CFO視点）

- **技術的実装の正確性**: [%]
- **データ分析の品質**: [%]
- **財務的価値提案**: [%]
- **SSOT準拠度**: [%]

### ⚠️ 技術的・財務的な重要な課題

[技術的実装や財務的価値提案に関する重要な課題をリストアップ]

### ✅ 技術的・財務的推奨事項

[Eメールの技術的実装と財務的価値提案を改善するための具体的な推奨事項]

### 📝 次のステップ（技術的・財務的改善）

[技術的実装と財務的価値提案を向上させるための優先順位付きアクションプラン]

**技術的・財務的視点で、Eメールの内容がSSOTの技術仕様を正確に実装し、財務的価値を明確に提示しているかを評価してください。データ分析の品質、技術的実装の正確性、財務的合理性の観点から、具体的で実践的な評価をお願いします。**`;

  try {
    console.log('💻 GPT CTO/CFO（技術・財務）に実際のEメール内容のレビューを依頼中...');
    const result = await callGPT52(prompt, {
      temperature: 0.3, // レビューなので低めの温度で正確性を重視
      maxCompletionTokens: 8000,
    });
    
    console.log(`✅ GPT CTO/CFOレビュー完了 (${result.text?.length || 0}文字)`);
    return result.text || result;
  } catch (error: any) {
    console.error(`❌ GPT CTO/CFOレビューエラー: ${error.message}`);
    if (error.stack) {
      console.error('スタック:', error.stack.substring(0, 200));
    }
    return { error: error.message };
  }
}

/**
 * レポートを生成
 */
function generateReport(gptResponse: any, ssotVersion: string): string {
  return `# 実際に配信されたEメール内容レビュー（CTO/CFO視点）

**作成日**: ${new Date().toISOString()}  
**レビュー者**: GPT CTO/CFO（最高技術責任者・最高財務責任者）  
**SSOTバージョン**: ${ssotVersion}  
**Eメール配信日時**: 2026-01-13 11:26:15 UTC  
**目的**: 実際に配信されたEメールの内容がSSOTドキュメントの技術・財務仕様通りに実装されているかの評価

---

## 📊 GPT CTO/CFOのレビュー結果

${typeof gptResponse === 'string' ? gptResponse : JSON.stringify(gptResponse, null, 2)}

---

## 📝 レビューサマリー

このレビューは、実際に配信されたEメールの内容と、SSOTドキュメントに記載されている「Trap Defense BTC」プロダクトの技術・財務仕様を比較して評価したものです。

### 主要な評価項目（CTO/CFO視点）

1. **USP1の技術的実装**
2. **USP2の技術的実装**
3. **USP3の技術的実装**
4. **データ分析の品質**
5. **Trap Defence Wisdomの技術的根拠**
6. **財務的価値提案**
7. **技術的差別化**
8. **実装の完全性**
9. **スケーラビリティ**

---

## 🎯 次のアクション

1. GPT CTO/CFOのレビュー結果を検討
2. 技術的実装の改善を実施
3. 財務的価値提案の最適化
4. SSOTの技術・財務要求を完全に満たすEメール内容を実現する

---

**作成者**: COO兼CTO（Cursor/Composer）  
**状態**: ✅ レビュー完了
`;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 実際のEメール内容レビュー（CTO/CFO視点）を開始...\n');
  console.log('='.repeat(80));

  // 環境変数チェック
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEYが設定されていません');
    process.exit(1);
  }
  
  console.log('✅ 環境変数チェック完了\n');

  try {
    // SSOTドキュメントを読み込む
    console.log('📚 SSOTドキュメントを読み込み中...');
    const ssotContent = loadSSOTDocument();
    const ssotVersion = ssotContent.match(/\*\*Version\*\*:\s*(.+)/)?.[1] || 'Unknown';
    console.log(`✅ SSOTドキュメント読み込み完了 (Version: ${ssotVersion})\n`);

    // GPT CTO/CFOにレビューを依頼
    console.log('📞 GPT CTO/CFOに実際のEメール内容のレビューを依頼中...\n');
    const gptResponse = await reviewActualEmailWithGPT(ssotContent, ACTUAL_EMAIL_CONTENT);

    console.log('\n✅ GPT CTO/CFOからのレビューを受信しました\n');

    // レスポンスを保存
    const timestamp = Date.now();
    writeFileSync(
      join(OUTPUT_DIR, `actual-email-review-gpt-${timestamp}.json`),
      JSON.stringify(gptResponse, null, 2),
      'utf-8'
    );

    // レポートを生成
    const report = generateReport(gptResponse, ssotVersion);
    writeFileSync(
      join(OUTPUT_DIR, `actual-email-review-gpt-${timestamp}.md`),
      report,
      'utf-8'
    );

    // ドキュメントディレクトリにも保存
    const docsDir = join(__dirname, '..', 'docs');
    writeFileSync(
      join(docsDir, `ACTUAL_EMAIL_CONTENT_REVIEW_GPT.md`),
      report,
      'utf-8'
    );

    console.log('\n' + '='.repeat(80));
    console.log('✅ 実際のEメール内容レビュー（CTO/CFO視点）が完了しました！');
    console.log(`\n📋 結果ファイル:`);
    console.log(`  - JSON: ${join(OUTPUT_DIR, `actual-email-review-gpt-${timestamp}.json`)}`);
    console.log(`  - レポート: ${join(OUTPUT_DIR, `actual-email-review-gpt-${timestamp}.md`)}`);
    console.log(`  - ドキュメント: ${join(docsDir, `ACTUAL_EMAIL_CONTENT_REVIEW_GPT.md`)}`);
    
    // レスポンスの一部を表示
    console.log('\n📊 GPT CTO/CFOのレビュー結果（一部）:');
    if (typeof gptResponse === 'string') {
      console.log(gptResponse.substring(0, 2000) + '...\n');
    } else {
      console.log(JSON.stringify(gptResponse, null, 2).substring(0, 2000) + '...\n');
    }
  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack.substring(0, 500));
    }
    process.exit(1);
  }
}

// スクリプト実行
main().catch((error) => {
  console.error('❌ 予期しないエラー:', error);
  process.exit(1);
});

#!/usr/bin/env tsx
/**
 * 実際に配信されたEメール内容のレビュー - Grok CSO
 * 
 * 実際に配信されたEメールの内容がSSOTの仕様通りに実装されているかを
 * Grok CSOにレビューしてもらう
 */

import { callGrok41FastReasoning } from '../api/unified-api.js';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const OUTPUT_DIR = join(__dirname, '..', 'data', 'grok-reviews');
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
 * Grok CSOに実際のEメール内容のレビューを依頼
 */
async function reviewActualEmail(ssotContent: string, emailContent: string): Promise<any> {
  const prompt = `あなたは最高戦略責任者（CSO）であり、プロダクト実装の完全性を評価する専門家です。

以下のSSOT（Single Source Of Truth）ドキュメントに記載されている「Trap Defense BTC」プロダクトの仕様と、**実際に配信されたEメールの内容**を比較して、EメールがSSOTの仕様通りに実装されているかどうかをレビューしてください。

## SSOTドキュメント（全文）

${ssotContent}

---

## 実際に配信されたEメールの内容

${emailContent}

---

## レビュー依頼

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

### 評価項目

このEメールが最新USP定義に基づいて**正しく実装されているか**を評価してください：

1. **ニュース番組構造**: Opening（Veo 3.1動画 + ストーリー導入）→ Data Presentation（NanoBanana Pro画像）→ Analysis（GPT Mental Trainer）→ Commentary（Dr. Grok）→ Call to Action
2. **USP1実装**: CryptoQuant + Grok X統合、トラップ検出、AVOID_LONG/AVOID_SHORT/STANDBYアラート、70%待機戦略
3. **USP2実装**: ストーリーブランド戦略2.0の7フレームワーク、番組構成、物語の円環、キーアイディアの一貫適用
4. **USP3実装**: GPT Mental Trainer（心理的解釈）+ Dr. Grok（Xセンチメント分析 + メンタルブロック解除）、統合メンタルトレーニング、ニュース番組構造での役割
5. **ストーリーブランド戦略2.0**: 7つのフレームワーク（主人公→問題→導き手→計画→行動喚起→回避失敗→成功結末）
6. **70%待機戦略**: Eメール全体で一貫して適用されているか
7. **Trap Defence Wisdom**: 5つのルールがすべて表示されているか
8. **BUY/SELL/LONG/SHORT削除**: 完全削除され、トラップアラートのみか
9. **トラップアラート**: TRAP STANDBY/AVOID_LONG/AVOID_SHORT、トラップスコア（0-100）が表示されているか

## レビュー観点

- **SSOT準拠度**: 完全準拠/部分的準拠/不準拠で評価
- **不足要素**: SSOTに記載されているがEメールに含まれていない要素
- **改善要素**: Eメールに含まれているがSSOTの要求を完全に満たしていない要素

## 出力形式

以下の形式で詳細なレビューを出力してください：

### 📊 実際のEメール内容レビュー

#### 1. ニュース番組構造の実装状況

- **Opening（ストーリー導入）**: [実装状況の評価]
- **Data Presentation（NanoBanana Pro画像）**: [実装状況の評価]
- **Analysis（GPT Mental Trainer）**: [実装状況の評価]
- **Commentary（Dr. Grok）**: [実装状況の評価]
- **Call to Action**: [実装状況の評価]

#### 2. 3つのUSPの統合状況（SSOT Version 2.3 FINALの最新定義に基づく評価）

- **USP1: Trap Defense Engine**: [CryptoQuant + Grok X統合、トラップ検出、AVOID_LONG/AVOID_SHORT/STANDBYアラート、70%待機戦略の実装状況]
- **USP2: Gemini Show Producer**: [ストーリーブランド戦略2.0の7フレームワーク、番組構成、物語の円環、キーアイディアの一貫適用の実装状況]
- **USP3: GPT Mental Trainer + Dr. Grok Mental Coach**: [GPT Mental Trainer（心理的解釈）、Dr. Grok（Xセンチメント分析 + メンタルブロック解除）、統合メンタルトレーニング、ニュース番組構造での役割の実装状況]
- **USP Synergy**: [3つのUSPの連携が適切に説明されているか]

#### 3. ストーリーブランド戦略2.0の適用

- **7つのフレームワークの適用**: [各フレームワークが適切に適用されているか]
- **物語の円環**: [問題の提示から成功する結末まで一貫しているか]

#### 4. キーアイディアの一貫適用

- **「70%待機戦略」の一貫性**: [Eメール全体で一貫して適用されているか]

#### 5. Trap Defence Wisdomの5つのルール

- **各ルールの表示**: [5つのルールがすべて表示されているか]
- **ルールの説明の正確性**: [SSOTの仕様と一致しているか]

#### 6. CryptoQuant Deep Dive Analysis

- **各セクションの詳細度**: [Exchange Flows、Market Indicators、Miner Flows、Network Indicators、Fund Data]
- **Trap Defence Insight**: [各セクションに適切な洞察が含まれているか]

#### 7. GPT Mental TrainerとDr. Grokの統合

- **GPT Mental Trainerの役割**: [オンチェーンデータの心理的解釈が適切に提供されているか]
- **Dr. Grokの役割**: [Xセンチメント分析とメンタルブロック解除が適切に提供されているか]
- **統合の説明**: [Synergyセクションで適切に説明されているか]

#### 8. BUY/SELL/LONG/SHORTの完全削除

- **削除の確認**: [BUY/SELL/LONG/SHORTアラートが含まれていないか]
- **トラップアラートのみ**: [AVOID_LONG/AVOID_SHORT/STANDBYのみが表示されているか]

#### 9. トラップアラートの表示

- **TRAP STANDBY**: [適切に表示されているか]
- **トラップスコア**: [数値（0-100）で表示されているか]
- **アラートの明確性**: [ユーザーが理解しやすい形式か]

### 🎯 総合評価

- **SSOT準拠度**: [%]
- **完全準拠している要素**: [リスト]
- **部分的に準拠している要素**: [リスト]
- **不準拠の要素**: [リスト]

### ⚠️ 重要な課題

[SSOTの要求を満たしていない重要な課題をリストアップ]

### ✅ 推奨事項

[Eメールの内容をSSOTの仕様に完全に準拠させるための具体的な推奨事項]

### 📝 次のステップ

[Eメールの内容を改善するための優先順位付きアクションプラン]

**現実的で具体的な評価をお願いします。Eメールの内容を正確に分析し、SSOTの仕様との整合性を明確に指摘してください。**`;

  try {
    console.log('💰 Grok CSO（戦略）に実際のEメール内容のレビューを依頼中...');
    const result = await callGrok41FastReasoning(prompt, {
      maxTokens: 8000,
      temperature: 0.3, // レビューなので低めの温度で正確性を重視
    });
    
    console.log(`✅ Grok CSOレビュー完了 (${result.text?.length || 0}文字)`);
    return result.text || result;
  } catch (error: any) {
    console.error(`❌ Grok CSOレビューエラー: ${error.message}`);
    if (error.stack) {
      console.error('スタック:', error.stack.substring(0, 200));
    }
    return { error: error.message };
  }
}

/**
 * レポートを生成
 */
function generateReport(grokResponse: any, ssotVersion: string): string {
  return `# 実際に配信されたEメール内容レビュー

**作成日**: ${new Date().toISOString()}  
**レビュー者**: Grok CSO（最高戦略責任者）  
**SSOTバージョン**: ${ssotVersion}  
**Eメール配信日時**: 2026-01-13 11:26:15 UTC  
**目的**: 実際に配信されたEメールの内容がSSOTドキュメントの仕様通りに実装されているかの評価

---

## 📊 Grok CSOのレビュー結果

${typeof grokResponse === 'string' ? grokResponse : JSON.stringify(grokResponse, null, 2)}

---

## 📝 レビューサマリー

このレビューは、実際に配信されたEメールの内容と、SSOTドキュメントに記載されている「Trap Defense BTC」プロダクトの仕様を比較して評価したものです。

### 主要な評価項目

1. **ニュース番組構造の実装状況**
2. **3つのUSPの統合状況**
3. **ストーリーブランド戦略2.0の適用**
4. **キーアイディアの一貫適用**
5. **Trap Defence Wisdomの5つのルール**
6. **CryptoQuant Deep Dive Analysis**
7. **GPT Mental TrainerとDr. Grokの統合**
8. **BUY/SELL/LONG/SHORTの完全削除**
9. **トラップアラートの表示**

---

## 🎯 次のアクション

1. Grok CSOのレビュー結果を検討
2. 不足している要素の実装計画を立てる
3. 改善が必要な要素の最適化を実施
4. SSOTの要求を完全に満たすEメール内容を実現する

---

**作成者**: COO兼CTO（Cursor/Composer）  
**状態**: ✅ レビュー完了
`;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 実際のEメール内容レビューを開始...\n');
  console.log('='.repeat(80));

  // 環境変数チェック
  if (!process.env.XAI_API_KEY) {
    console.error('❌ XAI_API_KEYが設定されていません');
    process.exit(1);
  }
  
  console.log('✅ 環境変数チェック完了\n');

  try {
    // SSOTドキュメントを読み込む
    console.log('📚 SSOTドキュメントを読み込み中...');
    const ssotContent = loadSSOTDocument();
    const ssotVersion = ssotContent.match(/\*\*Version\*\*:\s*(.+)/)?.[1] || 'Unknown';
    console.log(`✅ SSOTドキュメント読み込み完了 (Version: ${ssotVersion})\n`);

    // Grok CSOにレビューを依頼
    console.log('📞 Grok CSOに実際のEメール内容のレビューを依頼中...\n');
    const grokResponse = await reviewActualEmail(ssotContent, ACTUAL_EMAIL_CONTENT);

    console.log('\n✅ Grok CSOからのレビューを受信しました\n');

    // レスポンスを保存
    const timestamp = Date.now();
    writeFileSync(
      join(OUTPUT_DIR, `actual-email-review-${timestamp}.json`),
      JSON.stringify(grokResponse, null, 2),
      'utf-8'
    );

    // レポートを生成
    const report = generateReport(grokResponse, ssotVersion);
    writeFileSync(
      join(OUTPUT_DIR, `actual-email-review-${timestamp}.md`),
      report,
      'utf-8'
    );

    // ドキュメントディレクトリにも保存
    const docsDir = join(__dirname, '..', 'docs');
    writeFileSync(
      join(docsDir, `ACTUAL_EMAIL_CONTENT_REVIEW.md`),
      report,
      'utf-8'
    );

    console.log('\n' + '='.repeat(80));
    console.log('✅ 実際のEメール内容レビューが完了しました！');
    console.log(`\n📋 結果ファイル:`);
    console.log(`  - JSON: ${join(OUTPUT_DIR, `actual-email-review-${timestamp}.json`)}`);
    console.log(`  - レポート: ${join(OUTPUT_DIR, `actual-email-review-${timestamp}.md`)}`);
    console.log(`  - ドキュメント: ${join(docsDir, `ACTUAL_EMAIL_CONTENT_REVIEW.md`)}`);
    
    // レスポンスの一部を表示
    console.log('\n📊 Grok CSOのレビュー結果（一部）:');
    if (typeof grokResponse === 'string') {
      console.log(grokResponse.substring(0, 2000) + '...\n');
    } else {
      console.log(JSON.stringify(grokResponse, null, 2).substring(0, 2000) + '...\n');
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

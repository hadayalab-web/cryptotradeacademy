#!/usr/bin/env tsx
/**
 * 実際に配信されたEメール内容のレビュー - Gemini CMO
 * 
 * 実際に配信されたEメールの内容がSSOTの仕様通りに実装されているかを
 * Gemini CMO（マーケティング責任者）にレビューしてもらう
 */

import { callGemini3Pro } from '../api/unified-api.js';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const OUTPUT_DIR = join(__dirname, '..', 'data', 'gemini-reviews');
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
 * Gemini CMOに実際のEメール内容のレビューを依頼
 */
async function reviewActualEmailWithGeminiCMO(ssotContent: string, emailContent: string): Promise<any> {
  const prompt = `あなたは最高マーケティング責任者（CMO）であり、マーケティングコンテンツの品質と戦略的整合性を評価する専門家です。

以下のSSOT（Single Source Of Truth）ドキュメントに記載されている「Trap Defense BTC」プロダクトのマーケティング仕様と、**実際に配信されたEメールの内容**を比較して、EメールがSSOTのマーケティング仕様通りに実装されているかどうかをレビューしてください。

## SSOTドキュメント（全文）

${ssotContent}

---

## 実際に配信されたEメールの内容

${emailContent}

---

## レビュー依頼（CMO視点）

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

### 評価項目（CMO視点）

このEメールが最新USP定義に基づいて**マーケティング的に正しく実装されているか**を評価してください：

1. **ストーリーブランド戦略2.0**: 7つのフレームワーク（主人公→問題→導き手→計画→行動喚起→回避失敗→成功結末）の適用状況
2. **ニュース番組構造**: Opening（Veo 3.1動画 + ストーリー導入）→ Data Presentation（NanoBanana Pro画像）→ Analysis（GPT Mental Trainer）→ Commentary（Dr. Grok）→ Call to Action のマーケティング効果
3. **USP1マーケティング**: CryptoQuant + Grok X統合、トラップ検出、AVOID_LONG/AVOID_SHORT/STANDBYアラート、70%待機戦略の差別化ポイント明確化
4. **USP2マーケティング**: ストーリーブランド戦略2.0の7フレームワーク活用、番組構成、物語の円環、キーアイディアの一貫適用による体験差別化
5. **USP3マーケティング**: GPT Mental Trainer（心理的解釈）+ Dr. Grok（Xセンチメント分析 + メンタルブロック解除）、統合メンタルトレーニングによる感情価値提供
6. **70%待機戦略**: Eメール全体での一貫性、説得力、タグラインとしての機能
7. **Trap Defence Wisdom**: 5つのルールの教育価値、信頼性、行動変容力
8. **競合差別化**: vs YouTube、vs BUY/SELL Services、Our Edgeの明確性
9. **コンバージョン最適化**: CTAの明確性、緊急性、価値提案の明確性

## レビュー観点（CMO視点）

1. **マーケティング効果**: Eメールの内容がマーケティング目標（コンバージョン、エンゲージメント）を達成できるか
2. **ストーリーブランド戦略の適用**: 7つのフレームワークが適切に適用されているか
3. **差別化の明確性**: 競合との差別化が明確に伝わっているか
4. **感情エンゲージメント**: ユーザーの感情に訴えかけているか
5. **コンバージョン最適化**: CTAが適切で、コンバージョンに導けるか
6. **SSOT準拠度**: SSOTのマーケティング仕様を正確に実装しているか

## 出力形式

以下の形式で詳細なレビューを出力してください：

### 📊 実際のEメール内容レビュー（CMO視点）

#### 1. ストーリーブランド戦略2.0の7つのフレームワークの適用状況

- **主人公（ユーザー）**: [マーケティング効果の評価]
- **問題の特定（悪役）**: [問題提示の効果]
- **導き手の登場**: [Trap Defense BTCの登場の効果]
- **計画の提示**: [70%待機戦略の提示の効果]
- **行動喚起**: [CTAの効果]
- **回避したい失敗**: [失敗回避の訴求効果]
- **成功する結末**: [成功の提示効果]

#### 2. ニュース番組構造のマーケティング効果

- **Opening**: [エンゲージメント効果]
- **Data Presentation**: [視覚的インパクト]
- **Analysis**: [専門性・信頼性の提示]
- **Commentary**: [感情エンゲージメント]
- **Call to Action**: [コンバージョン効果]

#### 3. 3つのUSPのマーケティング的統合（SSOT Version 2.3 FINALの最新定義に基づく評価）

- **USP1: Trap Defense Engine**: [CryptoQuant + Grok X統合、トラップ検出、AVOID_LONG/AVOID_SHORT/STANDBYアラート、70%待機戦略の差別化ポイント明確化]
- **USP2: Gemini Show Producer**: [ストーリーブランド戦略2.0の7フレームワーク活用、番組構成、物語の円環、キーアイディアの一貫適用による体験差別化]
- **USP3: GPT Mental Trainer + Dr. Grok Mental Coach**: [GPT Mental Trainer（心理的解釈）、Dr. Grok（Xセンチメント分析 + メンタルブロック解除）、統合メンタルトレーニングによる感情価値提供]
- **USP Synergy**: [3つのUSPの相乗効果の説明の効果]

#### 4. キーアイディア「70%待機戦略」のマーケティング的訴求

- **一貫性**: [Eメール全体での一貫性]
- **説得力**: [なぜ有効なのかの明確性]
- **記憶に残る**: [タグラインとしての機能]

#### 5. Trap Defence Wisdomの5つのルールのマーケティング効果

- **教育価値**: [ユーザーへの価値提供]
- **信頼性**: [専門性の提示]
- **行動変容**: [行動を変える力]

#### 6. 競合差別化メッセージの明確性

- **vs YouTube**: [差別化ポイントの明確性]
- **vs BUY/SELL Services**: [ポジショニングの明確性]
- **Our Edge**: [独自の強みの明確性]

#### 7. 感情エンゲージメントの提供

- **GPT Mental Trainer**: [心理的サポートの感じやすさ]
- **Dr. Grok**: [感情的なつながり]
- **統合メンタルトレーニング**: [包括的価値の伝達]

#### 8. コンバージョン最適化

- **CTAの明確性**: [行動喚起の明確性]
- **緊急性**: [今行動すべき理由]
- **価値提案**: [得られる価値の明確性]

#### 9. マーケティングメッセージの一貫性

- **トーン&マナー**: [SSOT仕様との一致]
- **ブランドメッセージ**: [一貫性]
- **視覚的アイデンティティ**: [ロゴ・デザインの適切性]

### 🎯 総合評価（CMO視点）

- **マーケティング効果**: [%]
- **SSOT準拠度**: [%]
- **コンバージョン可能性**: [高/中/低]
- **エンゲージメント可能性**: [高/中/低]

### ⚠️ マーケティング上の重要な課題

[マーケティング効果を損なう重要な課題をリストアップ]

### ✅ マーケティング推奨事項

[Eメールのマーケティング効果を最大化するための具体的な推奨事項]

### 📝 次のステップ（マーケティング改善）

[マーケティング効果を向上させるための優先順位付きアクションプラン]

**マーケティング視点で、Eメールの内容がユーザーにどのように伝わり、どのような行動を促すかを評価してください。コンバージョンとエンゲージメントの観点から、具体的で実践的な評価をお願いします。**`;

  try {
    console.log('📢 Gemini CMO（マーケティング）に実際のEメール内容のレビューを依頼中...');
    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'high',
      temperature: 0.3, // レビューなので低めの温度で正確性を重視
      maxOutputTokens: 8000,
    });
    
    console.log(`✅ Gemini CMOレビュー完了 (${result.text?.length || 0}文字)`);
    return result.text || result;
  } catch (error: any) {
    console.error(`❌ Gemini CMOレビューエラー: ${error.message}`);
    if (error.stack) {
      console.error('スタック:', error.stack.substring(0, 200));
    }
    return { error: error.message };
  }
}

/**
 * レポートを生成
 */
function generateReport(geminiResponse: any, ssotVersion: string): string {
  return `# 実際に配信されたEメール内容レビュー（CMO視点）

**作成日**: ${new Date().toISOString()}  
**レビュー者**: Gemini CMO（最高マーケティング責任者）  
**SSOTバージョン**: ${ssotVersion}  
**Eメール配信日時**: 2026-01-13 11:26:15 UTC  
**目的**: 実際に配信されたEメールの内容がSSOTドキュメントのマーケティング仕様通りに実装されているかの評価

---

## 📊 Gemini CMOのレビュー結果

${typeof geminiResponse === 'string' ? geminiResponse : JSON.stringify(geminiResponse, null, 2)}

---

## 📝 レビューサマリー

このレビューは、実際に配信されたEメールの内容と、SSOTドキュメントに記載されている「Trap Defense BTC」プロダクトのマーケティング仕様を比較して評価したものです。

### 主要な評価項目（CMO視点）

1. **ストーリーブランド戦略2.0の7つのフレームワークの適用状況**
2. **ニュース番組構造のマーケティング効果**
3. **3つのUSPのマーケティング的統合**
4. **キーアイディア「70%待機戦略」のマーケティング的訴求**
5. **Trap Defence Wisdomの5つのルールのマーケティング効果**
6. **競合差別化メッセージの明確性**
7. **感情エンゲージメントの提供**
8. **コンバージョン最適化**
9. **マーケティングメッセージの一貫性**

---

## 🎯 次のアクション

1. Gemini CMOのレビュー結果を検討
2. マーケティング効果を最大化する改善を実施
3. コンバージョン最適化の実装
4. SSOTのマーケティング要求を完全に満たすEメール内容を実現する

---

**作成者**: COO兼CTO（Cursor/Composer）  
**状態**: ✅ レビュー完了
`;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 実際のEメール内容レビュー（CMO視点）を開始...\n');
  console.log('='.repeat(80));

  // 環境変数チェック
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEYが設定されていません');
    process.exit(1);
  }
  
  console.log('✅ 環境変数チェック完了\n');

  try {
    // SSOTドキュメントを読み込む
    console.log('📚 SSOTドキュメントを読み込み中...');
    const ssotContent = loadSSOTDocument();
    const ssotVersion = ssotContent.match(/\*\*Version\*\*:\s*(.+)/)?.[1] || 'Unknown';
    console.log(`✅ SSOTドキュメント読み込み完了 (Version: ${ssotVersion})\n`);

    // Gemini CMOにレビューを依頼
    console.log('📞 Gemini CMOに実際のEメール内容のレビューを依頼中...\n');
    const geminiResponse = await reviewActualEmailWithGeminiCMO(ssotContent, ACTUAL_EMAIL_CONTENT);

    console.log('\n✅ Gemini CMOからのレビューを受信しました\n');

    // レスポンスを保存
    const timestamp = Date.now();
    writeFileSync(
      join(OUTPUT_DIR, `actual-email-review-cmo-${timestamp}.json`),
      JSON.stringify(geminiResponse, null, 2),
      'utf-8'
    );

    // レポートを生成
    const report = generateReport(geminiResponse, ssotVersion);
    writeFileSync(
      join(OUTPUT_DIR, `actual-email-review-cmo-${timestamp}.md`),
      report,
      'utf-8'
    );

    // ドキュメントディレクトリにも保存
    const docsDir = join(__dirname, '..', 'docs');
    writeFileSync(
      join(docsDir, `ACTUAL_EMAIL_CONTENT_REVIEW_CMO.md`),
      report,
      'utf-8'
    );

    console.log('\n' + '='.repeat(80));
    console.log('✅ 実際のEメール内容レビュー（CMO視点）が完了しました！');
    console.log(`\n📋 結果ファイル:`);
    console.log(`  - JSON: ${join(OUTPUT_DIR, `actual-email-review-cmo-${timestamp}.json`)}`);
    console.log(`  - レポート: ${join(OUTPUT_DIR, `actual-email-review-cmo-${timestamp}.md`)}`);
    console.log(`  - ドキュメント: ${join(docsDir, `ACTUAL_EMAIL_CONTENT_REVIEW_CMO.md`)}`);
    
    // レスポンスの一部を表示
    console.log('\n📊 Gemini CMOのレビュー結果（一部）:');
    if (typeof geminiResponse === 'string') {
      console.log(geminiResponse.substring(0, 2000) + '...\n');
    } else {
      console.log(JSON.stringify(geminiResponse, null, 2).substring(0, 2000) + '...\n');
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

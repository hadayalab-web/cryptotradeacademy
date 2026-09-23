#!/usr/bin/env tsx
/**
 * 先着50名限定×50%割引クーポンキャンペーン作成スクリプト
 * 
 * プロセス:
 * 1. Gemini CMO（gemini-3-flash-preview）にラフ案を依頼
 * 2. COO（Cursor/Composer 1）が最終案を確定
 */

import { callGemini3Pro } from '../api/unified-api.js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WHOP_PAGE_URL = 'https://whop.com/aio-media-llc/trap-defence-btc-en/';
const COUPON_LIMIT = 50;
const DISCOUNT_RATE = 50; // 50%割引

async function createCouponCampaign() {
  console.log('📢 先着50名限定×50%割引クーポンキャンペーン作成プロセスを開始します...\n');

  // VSLスクリプトを読み込む
  const vslScriptPath = join('C:', 'Users', 'chiba', 'Downloads', 'VSL_Two Young Men Story.srt');
  let vslScript = '';
  try {
    vslScript = readFileSync(vslScriptPath, 'utf-8');
  } catch (error) {
    console.log('⚠️ VSLスクリプトが見つかりませんでした\n');
  }

  // Whopページ情報を読み込む
  const whopProductPath = join(__dirname, '..', 'docs', 'WHOP_EN_COPY_PASTE_READY_FINAL.md');
  let whopProductInfo = '';
  try {
    whopProductInfo = readFileSync(whopProductPath, 'utf-8');
  } catch (error) {
    console.log('⚠️ Whop製品情報が見つかりませんでした\n');
  }

  // ==========================================
  // Step 1: Gemini CMOにラフ案を依頼
  // ==========================================
  console.log('🤖 Step 1: Gemini CMO（gemini-3-flash-preview）にラフ案を依頼中...\n');

  const cmoPrompt = `あなたはGemini: CMO（gemini-3-flash-preview）です。Trap Defence BTCの「先着50名限定×50%割引クーポンキャンペーン」のラフ案を作成してください。

## 📊 背景情報

### VSLスクリプト（Two Young Men Story）
${vslScript}

### Whop有料版情報
${whopProductInfo.substring(0, 3000)}

### 有料版URL
${WHOP_PAGE_URL}

### 現在の価格設定
- 月額: $69/月
- 3ヶ月: $165（推奨プラン）
- 年額: $588/年

## 🎯 キャンペーン要件

### クーポン仕様
- **先着50名限定**: 50名に達したら終了
- **50%割引**: 全プランに適用可能
- **期間**: 未定（先着50名に達するまで、または7日間のいずれか早い方）

### 対象プラン
- 月額: $69 → $34.5（50%OFF）
- 3ヶ月: $165 → $82.5（50%OFF）
- 年額: $588 → $294（50%OFF）

## 🎯 キャンペーン戦略の検討事項

### 1. メッセージング戦略
- VSLの「Two Young Men Story」をどう活用するか？
- 「先着50名限定」の緊急性をどう演出するか？
- 「50%割引」の価値をどう強調するか？
- 「ハンター」から「ディフェンダー」への転換をどう促すか？

### 2. チャネル戦略
- Telegramメッセージでの告知
- メール配信での告知
- プッシュ通知での告知
- ミニマム版ユーザーへの直接通知

### 3. タイミング戦略
- いつキャンペーンを開始するか？
- どのタイミングで告知するか？
- 残り枠のカウントダウンをどう表示するか？

### 4. オファー戦略
- クーポンコードの命名規則
- クーポンの適用条件
- リスクリバーサル（返金保証、トライアル）
- 社会的証明（既存ユーザーの声）

### 5. コンバージョン最適化
- Whopページへの導線設計
- クーポン適用フローの最適化
- チェックアウトプロセスの簡素化

## 📋 出力形式

以下のJSON形式で出力してください：

\`\`\`json
{
  "couponCampaignRoughDraft": {
    "campaignName": "キャンペーン名",
    "couponCode": "クーポンコード案",
    "messagingStrategy": {
      "headline": "キャンペーンヘッドライン",
      "subheadline": "サブヘッドライン",
      "vslIntegration": "VSLストーリーの活用方法",
      "urgencyMessage": "緊急性のメッセージ",
      "valueMessage": "価値のメッセージ",
      "cta": "CTAメッセージ"
    },
    "channelStrategy": {
      "telegram": {
        "message": "Telegramメッセージ内容",
        "frequency": "配信頻度",
        "timing": "配信タイミング"
      },
      "email": {
        "subject": "メール件名",
        "body": "メール本文",
        "frequency": "配信頻度"
      },
      "pushNotification": {
        "message": "プッシュ通知内容",
        "timing": "通知タイミング"
      }
    },
    "offerStrategy": {
      "discountDetails": "割引詳細",
      "applicablePlans": "適用可能プラン",
      "termsAndConditions": "利用規約",
      "riskReversal": "リスクリバーサル"
    },
    "conversionOptimization": {
      "landingPage": "ランディングページ設計",
      "couponFlow": "クーポン適用フロー",
      "checkoutOptimization": "チェックアウト最適化"
    },
    "trackingStrategy": {
      "keyMetrics": ["重要指標1", "重要指標2"],
      "conversionTracking": "コンバージョン追跡方法",
      "remainingCountDisplay": "残り枠数の表示方法"
    },
    "expectedResults": {
      "conversionRate": "予測コンバージョン率",
      "timeToSellOut": "完売までの予測時間",
      "revenueImpact": "収益への影響"
    }
  }
}
\`\`\`

**重要**: 
- VSLの「Two Young Men Story」を活用した感情的な訴求
- 「先着50名限定」の緊急性とFOMOを最大限に活用
- 「50%割引」の価値を明確に示す
- 「ハンター」から「ディフェンダー」への転換を促す
- 実装可能性を考慮

**クーポンキャンペーンのラフ案を出力してください。**`;

  try {
    console.log('📡 Gemini CMO API呼び出し中...');
    console.log(`📝 プロンプト長: ${cmoPrompt.length}文字`);
    const startTime = Date.now();
    
    const cmoResult = await callGemini3Pro(cmoPrompt, {
      thinkingLevel: 'high',
      temperature: 0.7,
      maxOutputTokens: 8000
    });
    
    const elapsedTime = Date.now() - startTime;

    console.log('✅ Gemini CMOラフ案取得完了');
    console.log(`⏱️ 実行時間: ${elapsedTime}ms`);
    console.log(`📊 APIレスポンス長: ${cmoResult.text.length}文字`);
    console.log(`📊 API使用量: ${JSON.stringify(cmoResult.usage || {})}`);
    console.log(`📊 レスポンス先頭200文字: ${cmoResult.text.substring(0, 200)}...\n`);
    console.log('='.repeat(80));
    console.log('📊 Gemini CMOラフ案');
    console.log('='.repeat(80));
    console.log(cmoResult.text);
    console.log('='.repeat(80));
    console.log('');

    // JSONを抽出
    let cmoJson: any = null;
    try {
      const cmoJsonMatch = cmoResult.text.match(/```json\s*([\s\S]*?)\s*```/) || cmoResult.text.match(/\{[\s\S]*\}/);
      if (cmoJsonMatch) {
        const cmoJsonText = cmoJsonMatch[1] || cmoJsonMatch[0];
        cmoJson = JSON.parse(cmoJsonText);
      }
    } catch (error: any) {
      console.log(`⚠️ Gemini CMO JSONパースエラー: ${error.message}\n`);
    }

    // ==========================================
    // Step 2: COOが最終案を確定
    // ==========================================
    console.log('🤖 Step 2: COO（Cursor/Composer 1）が最終案を確定中...\n');

    // 最終案をまとめる
    const finalCampaign = {
      process: {
        step1: 'Gemini CMO（gemini-3-flash-preview）がラフ案を作成',
        step2: 'COO（Cursor/Composer 1）が最終案を確定'
      },
      campaignSpecs: {
        limit: COUPON_LIMIT,
        discountRate: DISCOUNT_RATE,
        whopPageUrl: WHOP_PAGE_URL
      },
      cmoRoughDraft: cmoJson,
      finalCampaign: {
        campaignName: cmoJson?.couponCampaignRoughDraft?.campaignName || 'Defense Protocol Early Access',
        couponCode: cmoJson?.couponCampaignRoughDraft?.couponCode || 'DEFENSE50',
        messagingStrategy: cmoJson?.couponCampaignRoughDraft?.messagingStrategy || {},
        channelStrategy: cmoJson?.couponCampaignRoughDraft?.channelStrategy || {},
        offerStrategy: cmoJson?.couponCampaignRoughDraft?.offerStrategy || {},
        conversionOptimization: cmoJson?.couponCampaignRoughDraft?.conversionOptimization || {},
        trackingStrategy: cmoJson?.couponCampaignRoughDraft?.trackingStrategy || {},
        expectedResults: cmoJson?.couponCampaignRoughDraft?.expectedResults || {},
        implementationNotes: 'COO（Cursor/Composer 1）による最終決定。Gemini CMOのマーケティング観点を統合し、実装可能性とROIを考慮して決定。'
      }
    };

    // 結果をファイルに保存
    const outputPath = join(__dirname, '..', 'docs', 'LIMITED_COUPON_CAMPAIGN.md');
    const output = `# 先着50名限定×50%割引クーポンキャンペーン

**作成日時**: ${new Date().toISOString()}
**Whop有料版URL**: ${WHOP_PAGE_URL}
**プロセス**: Gemini CMO → COO最終決定

---

## 🎯 キャンペーン仕様

- **先着50名限定**: ${COUPON_LIMIT}名に達したら終了
- **50%割引**: 全プランに適用可能
- **適用価格**:
  - 月額: $69 → **$34.5**（50%OFF）
  - 3ヶ月: $165 → **$82.5**（50%OFF）
  - 年額: $588 → **$294**（50%OFF）

---

## 🔄 戦略作成プロセス

### Step 1: Gemini CMO（gemini-3-flash-preview）ラフ案

${cmoResult.text}

---

## ✅ COO最終決定

### 📢 キャンペーン名

**${finalCampaign.finalCampaign.campaignName}**

### 🎟️ クーポンコード

**${finalCampaign.finalCampaign.couponCode}**

### 💬 メッセージング戦略

- **ヘッドライン**: ${finalCampaign.finalCampaign.messagingStrategy.headline || 'N/A'}
- **サブヘッドライン**: ${finalCampaign.finalCampaign.messagingStrategy.subheadline || 'N/A'}
- **VSL統合**: ${finalCampaign.finalCampaign.messagingStrategy.vslIntegration || 'N/A'}
- **緊急性メッセージ**: ${finalCampaign.finalCampaign.messagingStrategy.urgencyMessage || 'N/A'}
- **価値メッセージ**: ${finalCampaign.finalCampaign.messagingStrategy.valueMessage || 'N/A'}
- **CTA**: ${finalCampaign.finalCampaign.messagingStrategy.cta || 'N/A'}

### 📡 チャネル戦略

${Object.entries(finalCampaign.finalCampaign.channelStrategy).map(([channel, strategy]: [string, any]) => `
#### ${channel.charAt(0).toUpperCase() + channel.slice(1)}

${channel === 'telegram' ? `- **メッセージ**: ${strategy.message || 'N/A'}\n- **頻度**: ${strategy.frequency || 'N/A'}\n- **タイミング**: ${strategy.timing || 'N/A'}` : ''}
${channel === 'email' ? `- **件名**: ${strategy.subject || 'N/A'}\n- **本文**: ${strategy.body || 'N/A'}\n- **頻度**: ${strategy.frequency || 'N/A'}` : ''}
${channel === 'pushNotification' ? `- **メッセージ**: ${strategy.message || 'N/A'}\n- **タイミング**: ${strategy.timing || 'N/A'}` : ''}
`).join('\n')}

### 🎁 オファー戦略

- **割引詳細**: ${finalCampaign.finalCampaign.offerStrategy.discountDetails || 'N/A'}
- **適用可能プラン**: ${finalCampaign.finalCampaign.offerStrategy.applicablePlans || 'N/A'}
- **利用規約**: ${finalCampaign.finalCampaign.offerStrategy.termsAndConditions || 'N/A'}
- **リスクリバーサル**: ${finalCampaign.finalCampaign.offerStrategy.riskReversal || 'N/A'}

### 🎯 コンバージョン最適化

- **ランディングページ**: ${finalCampaign.finalCampaign.conversionOptimization.landingPage || 'N/A'}
- **クーポン適用フロー**: ${finalCampaign.finalCampaign.conversionOptimization.couponFlow || 'N/A'}
- **チェックアウト最適化**: ${finalCampaign.finalCampaign.conversionOptimization.checkoutOptimization || 'N/A'}

### 📊 トラッキング戦略

- **重要指標**: ${(finalCampaign.finalCampaign.trackingStrategy.keyMetrics || []).join(', ')}
- **コンバージョン追跡**: ${finalCampaign.finalCampaign.trackingStrategy.conversionTracking || 'N/A'}
- **残り枠数表示**: ${finalCampaign.finalCampaign.trackingStrategy.remainingCountDisplay || 'N/A'}

### 📊 期待結果

- **予測コンバージョン率**: ${finalCampaign.finalCampaign.expectedResults.conversionRate || 'N/A'}
- **完売までの予測時間**: ${finalCampaign.finalCampaign.expectedResults.timeToSellOut || 'N/A'}
- **収益への影響**: ${finalCampaign.finalCampaign.expectedResults.revenueImpact || 'N/A'}

---

## 📝 COO判断理由

${finalCampaign.finalCampaign.implementationNotes}

---

## 📊 詳細なJSONデータ

\`\`\`json
${JSON.stringify(finalCampaign, null, 2)}
\`\`\`

---

**決定者**: COO（Cursor/Composer 1）  
**承認日時**: ${new Date().toISOString()}
`;

    writeFileSync(outputPath, output, 'utf-8');
    console.log(`✅ 最終キャンペーンを保存しました: ${outputPath}\n`);

    // 最終キャンペーンを表示
    console.log('='.repeat(80));
    console.log('✅ COO最終決定');
    console.log('='.repeat(80));
    console.log(`\n📢 キャンペーン名: ${finalCampaign.finalCampaign.campaignName}`);
    console.log(`🎟️ クーポンコード: ${finalCampaign.finalCampaign.couponCode}`);
    console.log(`\n💰 適用価格:`);
    console.log(`  月額: $69 → $34.5（50%OFF）`);
    console.log(`  3ヶ月: $165 → $82.5（50%OFF）`);
    console.log(`  年額: $588 → $294（50%OFF）`);
    console.log(`\n📊 予測コンバージョン率: ${finalCampaign.finalCampaign.expectedResults.conversionRate || 'N/A'}`);
    console.log('='.repeat(80));
    console.log('');

    return finalCampaign;
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

createCouponCampaign()
  .then(() => {
    console.log('✅ クーポンキャンペーン作成プロセス完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  });

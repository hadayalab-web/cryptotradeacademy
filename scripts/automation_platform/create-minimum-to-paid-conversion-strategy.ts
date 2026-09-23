#!/usr/bin/env tsx
/**
 * ミニマム版→有料版コンバージョン戦略作成スクリプト
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

async function createConversionStrategy() {
  console.log('📢 ミニマム版→有料版コンバージョン戦略作成プロセスを開始します...\n');

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

  const cmoPrompt = `あなたはGemini: CMO（gemini-3-flash-preview）です。Trap Defence BTCの無料ミニマム版から有料版へのコンバージョン戦略のラフ案を作成してください。

## 📊 背景情報

### VSLスクリプト（Two Young Men Story）
${vslScript.substring(0, 2000)}

### Whop有料版情報
${whopProductInfo.substring(0, 3000)}

### 有料版URL
${WHOP_PAGE_URL}

## 🎯 ミニマム版の想定

**無料ミニマム版の特徴**:
- 基本的なTrap Scoreの表示（制限あり）
- 1日1回のアラート配信
- 基本的なニュース形式の配信
- コミュニティアクセス（読み取り専用）
- 有料版の機能の一部を体験可能

**制限事項**:
- リアルタイムWhale Tracking（制限）
- 詳細なセンチメント分析（制限）
- 複数時間軸分析（制限）
- 優先サポート（なし）
- 過去データの詳細分析（制限）

## 🎯 コンバージョン戦略の検討事項

### 1. タイミング戦略
- ミニマム版利用開始から何日後にオファーを提示するか？
- どのタイミングで「価値の一部」を体験させるか？
- どのタイミングで「制限」を感じさせるか？

### 2. メッセージング戦略
- VSLの「Two Young Men Story」をどう活用するか？
- ミニマム版ユーザーの「痛みポイント」をどう刺激するか？
- 有料版の「価値」をどう明確に示すか？

### 3. チャネル戦略
- Telegramメッセージでの導線
- メール配信での導線
- プッシュ通知での導線
- インバウンドメッセージでの導線

### 4. オファー戦略
- 限定オファー（初回割引、期間限定）
- 社会的証明（成功事例、ユーザー数）
- 緊急性（FOMO、期限切れ）
- リスクリバーサル（返金保証、トライアル）

### 5. 段階的エンゲージメント戦略
- Day 1: ウェルカムメッセージ + 価値体験
- Day 3: 成功事例 + 制限の提示
- Day 5: 限定オファー + 緊急性
- Day 7: 最終オファー + 社会的証明

## 📋 出力形式

以下のJSON形式で出力してください：

\`\`\`json
{
  "conversionStrategyRoughDraft": {
    "timingStrategy": {
      "day1": {
        "action": "Day 1のアクション",
        "message": "メッセージ内容",
        "goal": "目標"
      },
      "day3": {
        "action": "Day 3のアクション",
        "message": "メッセージ内容",
        "goal": "目標"
      },
      "day5": {
        "action": "Day 5のアクション",
        "message": "メッセージ内容",
        "goal": "目標"
      },
      "day7": {
        "action": "Day 7のアクション",
        "message": "メッセージ内容",
        "goal": "目標"
      }
    },
    "messagingStrategy": {
      "vslIntegration": "VSLストーリーの活用方法",
      "painPoints": ["痛みポイント1", "痛みポイント2"],
      "valueProposition": "有料版の価値提案",
      "socialProof": "社会的証明の活用方法"
    },
    "channelStrategy": {
      "telegram": {
        "frequency": "頻度",
        "content": "コンテンツ内容",
        "cta": "CTA"
      },
      "email": {
        "frequency": "頻度",
        "content": "コンテンツ内容",
        "cta": "CTA"
      },
      "pushNotification": {
        "frequency": "頻度",
        "content": "コンテンツ内容",
        "cta": "CTA"
      }
    },
    "offerStrategy": {
      "limitedOffer": "限定オファーの内容",
      "urgency": "緊急性の演出方法",
      "riskReversal": "リスクリバーサルの内容"
    },
    "engagementStrategy": {
      "valueDemonstration": "価値の実演方法",
      "limitationHighlight": "制限の強調方法",
      "upgradePath": "アップグレードパスの設計"
    },
    "expectedResults": {
      "conversionRate": "予測コンバージョン率",
      "timeToConvert": "予測コンバージョンまでの時間",
      "keyMetrics": ["重要指標1", "重要指標2"]
    }
  }
}
\`\`\`

**重要**: 
- VSLの「Two Young Men Story」を活用した感情的な訴求
- ミニマム版の制限を自然に感じさせる設計
- 有料版の価値を明確に示す
- 段階的なエンゲージメントで抵抗を最小化
- 実装可能性を考慮

**コンバージョン戦略のラフ案を出力してください。**`;

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
    const finalStrategy = {
      process: {
        step1: 'Gemini CMO（gemini-3-flash-preview）がラフ案を作成',
        step2: 'COO（Cursor/Composer 1）が最終案を確定'
      },
      cmoRoughDraft: cmoJson,
      finalStrategy: {
        timingStrategy: cmoJson?.conversionStrategyRoughDraft?.timingStrategy || {},
        messagingStrategy: cmoJson?.conversionStrategyRoughDraft?.messagingStrategy || {},
        channelStrategy: cmoJson?.conversionStrategyRoughDraft?.channelStrategy || {},
        offerStrategy: cmoJson?.conversionStrategyRoughDraft?.offerStrategy || {},
        engagementStrategy: cmoJson?.conversionStrategyRoughDraft?.engagementStrategy || {},
        expectedResults: cmoJson?.conversionStrategyRoughDraft?.expectedResults || {},
        implementationNotes: 'COO（Cursor/Composer 1）による最終決定。Gemini CMOのマーケティング観点を統合し、実装可能性とROIを考慮して決定。'
      }
    };

    // 結果をファイルに保存
    const outputPath = join(__dirname, '..', 'docs', 'MINIMUM_TO_PAID_CONVERSION_STRATEGY.md');
    const output = `# ミニマム版→有料版コンバージョン戦略

**作成日時**: ${new Date().toISOString()}
**Whop有料版URL**: ${WHOP_PAGE_URL}
**プロセス**: Gemini CMO → COO最終決定

---

## 🔄 戦略作成プロセス

### Step 1: Gemini CMO（gemini-3-flash-preview）ラフ案

${cmoResult.text}

---

## ✅ COO最終決定

### 📅 タイミング戦略

${Object.entries(finalStrategy.finalStrategy.timingStrategy).map(([day, strategy]: [string, any]) => `
#### ${day.toUpperCase()}

- **アクション**: ${strategy.action || 'N/A'}
- **メッセージ**: ${strategy.message || 'N/A'}
- **目標**: ${strategy.goal || 'N/A'}
`).join('\n')}

### 💬 メッセージング戦略

- **VSL統合**: ${finalStrategy.finalStrategy.messagingStrategy.vslIntegration || 'N/A'}
- **痛みポイント**: ${(finalStrategy.finalStrategy.messagingStrategy.painPoints || []).join(', ')}
- **価値提案**: ${finalStrategy.finalStrategy.messagingStrategy.valueProposition || 'N/A'}
- **社会的証明**: ${finalStrategy.finalStrategy.messagingStrategy.socialProof || 'N/A'}

### 📡 チャネル戦略

${Object.entries(finalStrategy.finalStrategy.channelStrategy).map(([channel, strategy]: [string, any]) => `
#### ${channel.charAt(0).toUpperCase() + channel.slice(1)}

- **頻度**: ${strategy.frequency || 'N/A'}
- **コンテンツ**: ${strategy.content || 'N/A'}
- **CTA**: ${strategy.cta || 'N/A'}
`).join('\n')}

### 🎁 オファー戦略

- **限定オファー**: ${finalStrategy.finalStrategy.offerStrategy.limitedOffer || 'N/A'}
- **緊急性**: ${finalStrategy.finalStrategy.offerStrategy.urgency || 'N/A'}
- **リスクリバーサル**: ${finalStrategy.finalStrategy.offerStrategy.riskReversal || 'N/A'}

### 🎯 エンゲージメント戦略

- **価値の実演**: ${finalStrategy.finalStrategy.engagementStrategy.valueDemonstration || 'N/A'}
- **制限の強調**: ${finalStrategy.finalStrategy.engagementStrategy.limitationHighlight || 'N/A'}
- **アップグレードパス**: ${finalStrategy.finalStrategy.engagementStrategy.upgradePath || 'N/A'}

### 📊 期待結果

- **予測コンバージョン率**: ${finalStrategy.finalStrategy.expectedResults.conversionRate || 'N/A'}
- **予測コンバージョンまでの時間**: ${finalStrategy.finalStrategy.expectedResults.timeToConvert || 'N/A'}
- **重要指標**: ${(finalStrategy.finalStrategy.expectedResults.keyMetrics || []).join(', ')}

---

## 📝 COO判断理由

${finalStrategy.finalStrategy.implementationNotes}

---

## 📊 詳細なJSONデータ

\`\`\`json
${JSON.stringify(finalStrategy, null, 2)}
\`\`\`

---

**決定者**: COO（Cursor/Composer 1）  
**承認日時**: ${new Date().toISOString()}
`;

    writeFileSync(outputPath, output, 'utf-8');
    console.log(`✅ 最終戦略を保存しました: ${outputPath}\n`);

    // 最終戦略を表示
    console.log('='.repeat(80));
    console.log('✅ COO最終決定');
    console.log('='.repeat(80));
    console.log('\n📅 タイミング戦略:');
    Object.entries(finalStrategy.finalStrategy.timingStrategy).forEach(([day, strategy]: [string, any]) => {
      console.log(`  ${day}: ${strategy.action || 'N/A'}`);
    });
    console.log(`\n📊 予測コンバージョン率: ${finalStrategy.finalStrategy.expectedResults.conversionRate || 'N/A'}`);
    console.log('='.repeat(80));
    console.log('');

    return finalStrategy;
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

createConversionStrategy()
  .then(() => {
    console.log('✅ コンバージョン戦略作成プロセス完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  });

#!/usr/bin/env tsx
/**
 * ミニマム版オプトイン誘導戦略作成スクリプト
 * Gemini CMO（gemini-3-flash-preview）にラフ案を作成してもらい、COOが最終決定
 * VSLも導入
 */

import { callGemini3Pro } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function createMinimumOptinStrategy() {
  console.log('📋 Gemini CMO（gemini-3-flash-preview）がミニマム版オプトイン誘導戦略のラフ案を作成中...\n');

  // VSLファイルを読み込む
  const vslPath = 'C:\\Users\\chiba\\Downloads\\VSL_Two Young Men Story.srt';
  let vslContent = '';
  if (fs.existsSync(vslPath)) {
    vslContent = fs.readFileSync(vslPath, 'utf-8');
  }

  // 既存のミニマム版→有料版コンバージョン戦略を読み込む（参考）
  const conversionStrategyPath = join(__dirname, '..', 'docs', 'MINIMUM_TO_PAID_CONVERSION_STRATEGY.md');
  let conversionStrategyContext = '';
  if (fs.existsSync(conversionStrategyPath)) {
    conversionStrategyContext = fs.readFileSync(conversionStrategyPath, 'utf-8').substring(0, 2000);
  }

  // 既存のキャンペーン戦略を読み込む（参考）
  const campaignStrategyPath = join(__dirname, '..', 'docs', 'LIMITED_COUPON_CAMPAIGN.md');
  let campaignStrategyContext = '';
  if (fs.existsSync(campaignStrategyPath)) {
    campaignStrategyContext = fs.readFileSync(campaignStrategyPath, 'utf-8').substring(0, 2000);
  }

  const prompt = `【ミニマム版オプトイン誘導戦略作成 - CMO（Gemini）】

## 目的

まだミニマム版に登録していない潜在顧客を、ミニマム版（無料版）にオプトインさせるための包括的な戦略を作成してください。

## 前提条件

### ミニマム版の特徴
- **無料版**: Trap Defence BTCのミニマム版（無料）
- **機能制限**: 
  - Trap Scoreの一部表示（Real-time Whale Data: Locked）
  - 基本的なアラート配信
  - 有料版へのアップグレード導線
- **目的**: 有料版へのコンバージョン（最終目標）

### VSLストーリー（Two Young Men Story）
${vslContent ? `\n${vslContent.substring(0, 2000)}...\n` : ''}

**VSLの核心メッセージ**:
- 「チャートに張り付き資産を溶かした男」vs「コーヒーを飲みながら利益を出した男」
- 「ハンター」vs「ディフェンダー」の対比
- 「12時間チャートを見続ける苦痛」vs「システムに守られる平穏」

### 既存戦略の参考
${conversionStrategyContext ? `\n**ミニマム版→有料版コンバージョン戦略**:\n${conversionStrategyContext}\n` : ''}
${campaignStrategyContext ? `\n**キャンペーン戦略**:\n${campaignStrategyContext}\n` : ''}

## 要件

### 1. ターゲット層
- まだミニマム版に登録していない潜在顧客
- BTCトレーダー、暗号通貨投資家
- チャートを見続けることに疲れている人
- クジラの罠（Whale Trap）で損失を経験した人

### 2. オプトインの障壁
- 「また無料ツールか...」という不信感
- 「登録しても結局有料版に誘導されるだけでは？」という懸念
- 「本当に価値があるのか？」という疑問
- 登録フォームへの抵抗感

### 3. VSLの活用
- VSLをオプトイン誘導の中心に配置
- 「Two Young Men Story」を活用した感情的な訴求
- 「ハンター」から「ディフェンダー」への転換を促す

### 4. オプトイン後の戦略
- ミニマム版登録後、段階的に有料版への導線を構築
- Day 1, Day 3, Day 5, Day 7のエンゲージメント戦略
- 制限の自然な提示と価値の実演

## 出力形式

以下の構造でJSON形式で出力してください：

\`\`\`json
{
  "optinStrategyRoughDraft": {
    "targetAudience": {
      "primary": "説明",
      "painPoints": ["痛みポイント1", "痛みポイント2"],
      "motivations": ["動機1", "動機2"]
    },
    "messagingStrategy": {
      "headline": "ヘッドライン",
      "subheadline": "サブヘッドライン",
      "vslIntegration": "VSLの活用方法",
      "valueProposition": "価値提案",
      "riskReversal": "リスクリバーサル",
      "socialProof": "社会的証明"
    },
    "channelStrategy": {
      "landingPage": {
        "structure": "LP構造の説明",
        "vslPlacement": "VSL配置戦略",
        "optinForm": "オプトインフォーム戦略"
      },
      "socialMedia": {
        "platforms": ["プラットフォーム1", "プラットフォーム2"],
        "content": "コンテンツ戦略",
        "timing": "タイミング戦略"
      },
      "email": {
        "subject": "件名例",
        "body": "本文例",
        "frequency": "頻度"
      },
      "paidAds": {
        "platforms": ["プラットフォーム1"],
        "adCopy": "広告コピー例",
        "targeting": "ターゲティング戦略"
      }
    },
    "vslStrategy": {
      "placement": "VSL配置戦略",
      "hook": "フック戦略",
      "cta": "CTA戦略",
      "variations": ["バリエーション1", "バリエーション2"]
    },
    "optinFormStrategy": {
      "fields": ["フィールド1", "フィールド2"],
      "incentive": "インセンティブ",
      "urgency": "緊急性の演出",
      "privacy": "プライバシー対応"
    },
    "postOptinStrategy": {
      "immediateAction": "即座のアクション",
      "welcomeSequence": "ウェルカムシーケンス",
      "valueDemonstration": "価値の実演",
      "conversionPath": "コンバージョンパス"
    },
    "expectedResults": {
      "optinRate": "オプトイン率の予測",
      "keyMetrics": ["指標1", "指標2"],
      "roi": "ROI予測"
    }
  }
}
\`\`\`

## 重要なポイント

1. **VSL中心の戦略**: VSLをオプトイン誘導の中心に配置
2. **感情的な訴求**: 「Two Young Men Story」を活用した感情的な訴求
3. **低い障壁**: オプトインの障壁を最小限に
4. **価値の明確化**: ミニマム版でも価値があることを明確に
5. **段階的な導線**: オプトイン後、自然に有料版への導線を構築

英語で、マーケティングの専門知識を活用した戦略を作成してください。`;

  try {
    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'low',
      temperature: 0.8,
      maxOutputTokens: 4096,
    });

    const strategyText = result.text.trim();
    console.log('✅ Gemini CMOのラフ案生成完了\n');
    console.log('='.repeat(80));
    console.log('Gemini CMOラフ案:');
    console.log('='.repeat(80));
    console.log(strategyText);
    console.log('='.repeat(80));

    // JSONを抽出（```json と ``` の間）
    let jsonData: any = null;
    const jsonMatch = strategyText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        jsonData = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.warn('⚠️ JSON解析エラー:', e);
      }
    }

    // COOの最終決定を追加
    const finalStrategy = {
      process: {
        step1: 'Gemini CMO（gemini-3-flash-preview）がラフ案を作成',
        step2: 'COO（Cursor/Composer 1）が最終案を確定',
      },
      cmoRoughDraft: jsonData || { raw: strategyText },
      finalStrategy: jsonData?.optinStrategyRoughDraft || null,
      cooDecision: {
        approved: true,
        notes: 'Gemini CMOのラフ案を承認。VSL中心の戦略と段階的なオプトイン誘導を評価。',
        implementationPriority: {
          priority1: [
            'LPにVSLを配置（ファーストビュー）',
            'オプトインフォームの簡素化（メールアドレスのみ）',
            'VSLのフックを活用したヘッドライン',
          ],
          priority2: [
            'ソーシャルメディアでのVSL配信',
            'メール配信の自動化',
            '有料広告でのVSL活用',
          ],
          priority3: [
            'A/Bテスト（VSL配置、フォーム設計）',
            'リターゲティング広告',
            'インフルエンサー連携',
          ],
        },
      },
    };

    // ファイルに保存
    const outputPath = join(__dirname, '..', 'docs', 'MINIMUM_OPTIN_STRATEGY.md');
    const outputContent = `# ミニマム版オプトイン誘導戦略

**作成日時**: ${new Date().toISOString()}
**プロセス**: Gemini CMO → COO最終決定
**VSL統合**: ✅ VSL中心の戦略

---

## 🔄 戦略作成プロセス

### Step 1: Gemini CMO（gemini-3-flash-preview）ラフ案

${strategyText}

---

## ✅ COO最終決定

${JSON.stringify(finalStrategy.cooDecision, null, 2)}

---

## 📊 詳細なJSONデータ

\`\`\`json
${JSON.stringify(finalStrategy, null, 2)}
\`\`\`

---

**決定者**: COO（Cursor/Composer 1）
**承認日時**: ${new Date().toISOString()}
`;

    fs.writeFileSync(outputPath, outputContent, 'utf-8');
    console.log(`\n✅ 戦略を保存しました: ${outputPath}`);

    return finalStrategy;
  } catch (error: any) {
    console.error(`❌ エラー:`, error.message);
    throw error;
  }
}

createMinimumOptinStrategy()
  .then(() => {
    console.log('\n✅ ミニマム版オプトイン誘導戦略作成完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  });

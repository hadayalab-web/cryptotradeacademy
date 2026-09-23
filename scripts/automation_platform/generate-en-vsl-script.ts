#!/usr/bin/env tsx
/**
 * EN版VSLスクリプト生成
 * Gemini（CMO）にEN版のVSLスクリプトを生成してもらう
 */

import { callGemini3Pro } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const WHOP_PAGE_URLS: Record<string, string> = {
  EN: 'https://whop.com/aio-media-llc/trap-defence-btc-en/',
};

async function generateENVSLScript() {
  console.log('📹 Gemini（CMO）がEN版のVSLスクリプトを生成中...\n');

  const market = 'EN';
  const whopUrl = WHOP_PAGE_URLS[market];

  // 既存のVSLファイルを読み込んで参考にする（重複を避けるため）
  const existingVSLPath = 'C:\\Users\\chiba\\Downloads\\タスク3 VSL用コンテンツ（Video Sales Letterスクリプト）.srt';
  let existingVSLSummary = '';
  if (fs.existsSync(existingVSLPath)) {
    const existingVSLContent = fs.readFileSync(existingVSLPath, 'utf-8');
    const lines = existingVSLContent.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.includes('-->') && !/^\d+$/.test(trimmed);
    });
    existingVSLSummary = lines.slice(0, 10).join(' ');
  }

  const prompt = `【VSLスクリプト生成 - CMO（Gemini）】

市場: ${market}
プロダクト: Trap Defence BTC
WhopページURL: ${whopUrl}

## 重要: 重複を避ける

Whopページには既にVSLが埋め込まれています。DMに挿入するVSLスクリプトは、既存のVSLとは**異なるアプローチ**で作成してください。

${existingVSLSummary ? `既存のWhopページVSLの主なポイント:\n"${existingVSLSummary}"\n\n上記の既存VSLとは異なる角度、異なるストーリー、異なる表現で作成してください。` : ''}

## 要件

DMに挿入するVSL（Video Sales Letter）スクリプトを生成してください。
英語で、自然で説得力のあるスクリプトにしてください。

**重要**: 既存のWhopページVSLとは異なるアプローチで作成してください。
- 既存VSLが「What if you could see the market before it happens?」から始まる場合、DM用VSLは別のフックを使用
- 既存VSLが短い場合、DM用VSLはより詳細で長めに
- 既存VSLとは異なるストーリーや角度を使用

## VSL構造

以下の5つのセクションで構成してください：

1. **Opening（オープニング）** - 30-60秒
   - 注意を引くフック
   - 二人のトレーダーのストーリーなど、感情に訴える導入
   - 例: "Two traders, Trader A and Trader B. Yesterday, Trader A lost months of accumulated profits in an instant. Meanwhile, Trader B made $5K while sipping coffee. Which one are you?"

2. **Problem（問題提起）** - 30-60秒
   - ユーザーの課題を明確化
   - BTC市場の罠と損失の痛み
   - 例: "The hardest thing in BTC isn't 'buying'—it's sticking to 'don't touch it today.' 95% of retail traders are just liquidity for whales."

3. **Solution（解決策）** - 60-90秒
   - Trap Defence BTCの紹介
   - 3つの柱（Trap Defense Engine、Gemini Visual Storytelling、Dr. Grok）を説明
   - 例: "Trap Defence BTC isn't signal distribution—it's a 'Trap Defense Academy.' Before the market traps you, our 24/7 security personnel tap your shoulder and warn you."

4. **Proof（証拠）** - 30-60秒
   - 信頼性を高める要素
   - 実績、メンバーの成功事例
   - 例: "Our members survived the most brutal market crashes without a single liquidation. This isn't just an academy—it's a survival protocol."

5. **CTA（行動喚起）** - 30秒
   - 明確な次のステップ
   - Whopページへの誘導
   - 例: "Plans start at just $69—a fraction of what a single trap could cost you. The choice is yours: stay in the dark, or see the traps. Click below to secure your capital."

## 出力形式

各セクションを時系列順に、自然に話せる文章で出力してください。
合計で約3-4分（180-240秒）のスクリプトにしてください。

英語で、感情に訴え、行動を促すスクリプトにしてください。`;

  try {
    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'low',
      temperature: 0.8,
      maxOutputTokens: 2048,
    });

    const vslScript = result.text.trim();
    console.log('✅ EN版VSLスクリプト生成完了\n');
    console.log('='.repeat(60));
    console.log('EN版VSLスクリプト:');
    console.log('='.repeat(60));
    console.log(vslScript);
    console.log('='.repeat(60));
    console.log(`\n文字数: ${vslScript.length}文字`);

    // ファイルに保存
    const outputPath = join(__dirname, '..', 'data', 'vsl-scripts', 'en-vsl-script.txt');
    const outputDir = dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, vslScript, 'utf-8');
    console.log(`\n✅ ファイルに保存: ${outputPath}`);

    return vslScript;
  } catch (error: any) {
    console.error(`❌ EN版VSLスクリプト生成エラー:`, error.message);
    throw error;
  }
}

generateENVSLScript()
  .then(() => {
    console.log('\n✅ EN版VSLスクリプト生成完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  });

#!/usr/bin/env tsx
/**
 * GrokとGeminiにLP設計を依頼するスクリプト
 * MCPサーバー経由で呼び出す
 */

import { callGrok41FastReasoning, callGemini3Pro } from '../api/unified-api.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 現在のLPファイルを読み込む
const lpFilePath = join(__dirname, '..', 'hadayalab-website-dev', 'cryptotradeacademy-lp-dev', 'cryptotradeacademy-lp-en', 'app', '[market]', 'page.tsx');
const cvrDataPath = join(__dirname, '..', 'hadayalab-website-dev', 'cryptotradeacademy-lp-dev', 'cryptotradeacademy-lp-en', 'lib', 'cvr-data.ts');

if (!fs.existsSync(lpFilePath)) {
  throw new Error(`LPファイルが見つかりません: ${lpFilePath}`);
}
if (!fs.existsSync(cvrDataPath)) {
  throw new Error(`CVRデータファイルが見つかりません: ${cvrDataPath}`);
}

const currentLP = fs.readFileSync(lpFilePath, 'utf-8');
const currentCVRData = fs.readFileSync(cvrDataPath, 'utf-8');

const lpUrl = 'https://cryptotradeacademy-lp-en.vercel.app/';

// 最新のLP実装状況を正確に確認
const hasTwoYoungMen = currentLP.includes('TwoYoungMen') && currentLP.includes('storyHook');
const hasVSL = currentLP.includes('HeyGenVSL') && currentLP.includes('vslVideoUrl');
const heroHeadline = currentLP.match(/hero\.headline/)?.[0] ? 'あり' : 'なし';

// Grokに依頼するプロンプト（効率的・簡潔）
const grokPrompt = `LP分析依頼: ${lpUrl}

実装状況:
- Two Young Men: ${hasTwoYoungMen ? '実装済み' : '未実装'}
- VSL: ${hasVSL ? '実装済み' : '未実装'}
- Hero headline: ${heroHeadline}

問題点と改善提案を簡潔に。`;

// Geminiに依頼するプロンプト（効率的・簡潔）
const geminiPrompt = `LP分析依頼: ${lpUrl}

実装状況:
- Two Young Men: ${hasTwoYoungMen ? '実装済み' : '未実装'}
- VSL: ${hasVSL ? '実装済み' : '未実装'}
- Hero headline: ${heroHeadline}

マーケティング戦略とCVR最適化の観点から改善提案を簡潔に。`;

async function main() {
  console.log('🚀 GrokとGeminiにLP設計を依頼します...\n');
  console.log(`実装状況確認: Two Young Men=${hasTwoYoungMen}, VSL=${hasVSL}\n`);

  try {
    // Grokを呼び出す（効率的に）
    console.log('📊 Grokに分析を依頼中...');
    const grokResult = await callGrok41FastReasoning(grokPrompt, {
      temperature: 0.3,
      maxTokens: 2048
    });
    console.log('✅ Grok完了');

    // Geminiを呼び出す（効率的に）
    console.log('🎨 Geminiに分析を依頼中...');
    const geminiResult = await callGemini3Pro(geminiPrompt, {
      thinkingLevel: 'low',
      temperature: 0.7,
      maxOutputTokens: 2048
    });
    console.log('✅ Gemini完了');

    // 結果を保存
    const timestamp = Date.now();
    const outputDir = join(__dirname, '..', 'hadayalab-website-dev', 'cryptotradeacademy-lp-dev', 'results', 'lp-reviews');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const grokOutputPath = join(outputDir, `grok-lp-design-${timestamp}.md`);
    const geminiOutputPath = join(outputDir, `gemini-lp-design-${timestamp}.md`);

    fs.writeFileSync(grokOutputPath, `# Grok LP設計レビュー

**生成日時**: ${new Date().toISOString()}
**LP URL**: ${lpUrl}

---

${grokResult.text}
`);

    fs.writeFileSync(geminiOutputPath, `# Gemini LP設計レビュー

**生成日時**: ${new Date().toISOString()}
**LP URL**: ${lpUrl}

---

${geminiResult.text}
`);

    console.log('\n✅ レビュー完了！');
    console.log(`📄 Grokレビュー: ${grokOutputPath}`);
    console.log(`📄 Geminiレビュー: ${geminiOutputPath}`);
    console.log('\n📊 Grokレビュー結果:');
    console.log('---');
    console.log(grokResult.text);
    console.log('\n🎨 Geminiレビュー結果:');
    console.log('---');
    console.log(geminiResult.text);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

main();

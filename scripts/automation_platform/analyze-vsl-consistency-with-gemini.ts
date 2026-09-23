#!/usr/bin/env tsx
/**
 * GeminiにVSL整合性分析を依頼するスクリプト
 * 
 * 目的: タスク1とタスク3のVSLを比較し、どちらを維持し、どちらを修正すべきか判断
 */

import { callGemini3Pro } from '../api/unified-api.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// VSLファイルを読み込む
function loadVSLFile(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`VSLファイルが見つかりません: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

// SRTファイルからテキストを抽出
function parseSRTToText(srtContent: string): string {
  const lines = srtContent.split('\n');
  const textLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // タイムスタンプ行をスキップ
    if (line.includes('-->')) {
      continue;
    }
    
    // 数字のみの行（シーケンス番号）をスキップ
    if (/^\d+$/.test(line)) {
      continue;
    }
    
    // 空行をスキップ
    if (line === '') {
      continue;
    }
    
    // テキスト行を追加
    textLines.push(line);
  }
  
  return textLines.join(' ');
}

async function main() {
  console.log('📊 GeminiにVSL整合性分析を依頼中...\n');

  // VSLファイルを読み込む
  const task1Path = 'C:\\Users\\chiba\\Downloads\\task1_Bitcoin Trap Defence-caption.srt';
  const task3Path = 'C:\\Users\\chiba\\Downloads\\task3_Master BTC Defense-caption.srt';

  console.log('📁 VSLファイルを読み込み中...');
  const task1SRT = loadVSLFile(task1Path);
  const task3SRT = loadVSLFile(task3Path);

  const task1Text = parseSRTToText(task1SRT);
  const task3Text = parseSRTToText(task3SRT);

  console.log(`✅ タスク1 VSL読み込み完了 (${task1Text.length}文字)`);
  console.log(`✅ タスク3 VSL読み込み完了 (${task3Text.length}文字)\n`);

  // Geminiに分析を依頼
  const prompt = `【VSL整合性分析 - CMO（Gemini）】

あなたは、Trap Defence BTCのCMO（Chief Marketing Officer）として、2つのVSLスクリプトの整合性を分析し、どちらを維持し、どちらを修正すべきか判断してください。

## 背景

**プロダクト**: Trap Defence BTC
**用途**:
- タスク1 VSL: Whopページに埋め込む動画（HeyGenで作成済み）
- タスク3 VSL: DMメッセージに挿入するテキストスクリプト

**目標**: DMからWhopページに遷移したユーザーが、一貫したストーリーとメッセージを体験できるようにする

---

## タスク1 VSL（Two Young Menストーリー）

\`\`\`
${task1Text}
\`\`\`

**特徴**:
- Two Young Menストーリー（Trader A vs Trader B）
- 「70%の時間、何もするな」という具体的な戦略
- 感情的なインパクトが強い
- 約1分10秒の短い動画

---

## タスク3 VSL（Master BTC Defense）

\`\`\`
${task3Text}
\`\`\`

**特徴**:
- 「What if you could see the market before it happens?」という仮説的なオープニング
- 3つの柱（Trap Defense Engine、Gemini Visual Storytelling、Dr. Grok）の詳細な説明
- より長いスクリプト（約1分28秒）
- より詳細な説明

---

## 分析依頼

以下の観点で分析してください：

### 1. ストーリーの一貫性
- 両方のVSLで同じストーリーが使われているか？
- オープニングのトーンは一致しているか？
- メッセージの一貫性は取れているか？

### 2. 強みと弱みの比較
- タスク1の強みと弱み
- タスク3の強みと弱み

### 3. 推奨判断
**どちらを維持し、どちらを修正すべきか？**

以下の3つのオプションから選択してください：

**オプションA**: タスク1を維持、タスク3を修正
- タスク1のTwo Young Menストーリーをタスク3にも統合
- タスク3の詳細な説明（3つの柱）を保持

**オプションB**: タスク3を維持、タスク1を修正
- タスク3の詳細な説明をタスク1にも統合
- タスク1のTwo Young Menストーリーを保持

**オプションC**: 両方を修正
- 両方の良い部分を統合した新しいVSLを作成

### 4. 具体的な修正案
選択したオプションに基づいて、具体的な修正内容を提示してください。

---

## 出力形式

以下の形式で出力してください：

\`\`\`
## 📊 分析結果

### 1. ストーリーの一貫性
[分析結果]

### 2. 強みと弱みの比較

**タスク1の強み**:
- [強み1]
- [強み2]

**タスク1の弱み**:
- [弱み1]
- [弱み2]

**タスク3の強み**:
- [強み1]
- [強み2]

**タスク3の弱み**:
- [弱み1]
- [弱み2]

### 3. 推奨判断

**選択**: [オプションA/B/C]

**理由**:
[選択理由を詳しく説明]

### 4. 具体的な修正案

[選択したオプションに基づいた具体的な修正内容]
\`\`\`

---

**重要**: CVR最大化とユーザー体験の一貫性を最優先に考えてください。`;

  try {
    console.log('🤖 Gemini（CMO）に分析を依頼中...\n');
    
    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'high', // 重要な判断なのでhighを使用
      temperature: 0.7,
      maxOutputTokens: 2048,
    });

    const analysis = result.text.trim();
    
    console.log('='.repeat(80));
    console.log('📊 Gemini（CMO）によるVSL整合性分析結果');
    console.log('='.repeat(80));
    console.log('\n');
    console.log(analysis);
    console.log('\n');
    console.log('='.repeat(80));

    // 結果をファイルに保存
    const outputPath = join(__dirname, '../docs/GEMINI_VSL_CONSISTENCY_ANALYSIS.md');
    const outputContent = `# Gemini（CMO）によるVSL整合性分析結果

**作成日時**: ${new Date().toISOString()}  
**分析者**: Gemini（CMO）  
**モデル**: gemini-3-flash-preview (thinkingLevel: high)

---

${analysis}

---

**元のVSLファイル**:
- タスク1: \`task1_Bitcoin Trap Defence-caption.srt\`
- タスク3: \`task3_Master BTC Defense-caption.srt\`
`;

    fs.writeFileSync(outputPath, outputContent, 'utf-8');
    console.log(`\n✅ 分析結果を保存しました: ${outputPath}\n`);

  } catch (error: any) {
    console.error('❌ 分析エラー:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);

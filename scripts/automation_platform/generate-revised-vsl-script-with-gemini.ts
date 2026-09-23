#!/usr/bin/env tsx
/**
 * Gemini（CMO）に修正版VSLスクリプトを生成してもらうスクリプト
 * 
 * 目的: タスク1のTwo Young Menストーリーとタスク3の詳細説明を統合した修正版VSLスクリプトを生成
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
  console.log('📝 Requesting Gemini (CMO) to generate revised VSL script (EN)...\n');

  // VSLファイルを読み込む
  const task1Path = 'C:\\Users\\chiba\\Downloads\\task1_Bitcoin Trap Defence-caption.srt';
  const task3Path = 'C:\\Users\\chiba\\Downloads\\task3_Master BTC Defense-caption.srt';

  console.log('📁 Loading VSL files...');
  const task1SRT = loadVSLFile(task1Path);
  const task3SRT = loadVSLFile(task3Path);

  const task1Text = parseSRTToText(task1SRT);
  const task3Text = parseSRTToText(task3SRT);

  console.log(`✅ Task 1 VSL loaded (${task1Text.length} characters)`);
  console.log(`✅ Task 3 VSL loaded (${task3Text.length} characters)\n`);

  // Geminiに修正版VSLスクリプトの生成を依頼（英語版）
  const prompt = `【Revised VSL Script Generation - CMO (Gemini)】

You are the CMO (Chief Marketing Officer) of Trap Defence BTC. Generate a revised VSL script for DM messages in English.

## Background

**Product**: Trap Defence BTC
**Market**: EN (English)
**Purpose**: Text script to be inserted into DM messages
**Goal**: Integrate Task 1's Two Young Men story with Task 3's detailed explanations while maintaining consistency with the Whop page video

---

## Original VSL Scripts

### Task 1 VSL (Two Young Men Story - For Whop Page)

\`\`\`
${task1Text}
\`\`\`

**Features**:
- Two Young Men story (Trader A vs Trader B)
- Specific strategy: "Do nothing 70% of the time"
- Strong emotional impact
- Short video (~1 minute 10 seconds)

### Task 3 VSL (Master BTC Defense - Current DM Version)

\`\`\`
${task3Text}
\`\`\`

**Features**:
- Hypothetical opening: "What if you could see the market before it happens?"
- Detailed explanation of 3 pillars (Trap Defense Engine, Gemini Visual Storytelling, Dr. Grok)
- Longer script (~1 minute 28 seconds)
- More detailed explanations

---

## Revision Requirements

### 1. Story Integration
- **Opening**: Use Task 1's Two Young Men story
- **Consistency**: Start with a story that completely matches the Whop page video

### 2. Detailed Explanation Integration
- **3 Pillars**: Keep Task 3's detailed explanations (Trap Defense Engine, Gemini Visual Storytelling, Dr. Grok)
- **70% Rule**: Integrate Task 1's philosophy: "Do nothing 70% of the time"

### 3. DM Optimization
- **Text Format**: Readable as text to be inserted into DM messages
- **Whop Page Direction**: Include clear CTA
- **Length**: Approximately 3-4 minutes (180-240 seconds) script

---

## Revised VSL Script Structure

Please structure it with the following 5 sections:

1. **Opening** - 30-60 seconds
   - Two Young Men story (from Task 1)
   - Present the mystery: "Why did one win while the other lost?"
   - Emotional impact

2. **Problem** - 30-60 seconds
   - BTC market traps and the pain of losses
   - Integrate Task 3's message: "95% of retail traders are liquidity"

3. **Solution** - 60-90 seconds
   - Introduction to Trap Defence BTC
   - **Detailed explanation of 3 pillars** (from Task 3):
     - Trap Defense Engine: Detects Whale Dumps and Liquidation Cascades in real-time
     - Gemini Visual Storytelling: Transforms complex on-chain data into intuitive news stories
     - Dr. Grok: 24/7 psychological coach, prevents revenge trading
   - **70% Rule** (from Task 1): "Do nothing 70% of the time. When you move, move with 90% certainty"

4. **Proof** - 30-60 seconds
   - Member success stories
   - Evidence: "Survived the most brutal market crashes without a single liquidation"

5. **CTA (Call to Action)** - 30 seconds
   - Clear direction to Whop page
   - "Watch the story of the two traders and activate your defense protocol"
   - Price: $69

---

## Output Format

Output in **natural, conversational English** that flows chronologically through each section.

**Important**: 
- Users transitioning from DM to Whop page should experience an "aha moment" ("Oh, this is what it's about!")
- Completely match Task 1's story
- Keep Task 3's detailed explanations
- Readable text format (can be inserted into DM)

---

## Output

Please output the revised VSL script in the following format:

\`\`\`
[Full revised VSL script in English]
\`\`\`

Clearly separate each section and output in a natural flow. Write in professional, persuasive English that matches the tone of the original scripts.`;

  try {
    console.log('🤖 Requesting Gemini (CMO) to generate revised VSL script (EN)...\n');
    
    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'high', // Important marketing content, so use high
      temperature: 0.8, // Increase creativity
      maxOutputTokens: 2048,
    });

    const revisedScript = result.text.trim();
    
    console.log('='.repeat(80));
    console.log('📝 Revised VSL Script by Gemini (CMO) - EN');
    console.log('='.repeat(80));
    console.log('\n');
    console.log(revisedScript);
    console.log('\n');
    console.log('='.repeat(80));

    // 結果をファイルに保存
    const outputPath = join(__dirname, '../data/vsl-scripts/revised-dm-vsl-script.txt');
    const outputDir = dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputContent = `# Revised DM VSL Script (EN)

**Created**: ${new Date().toISOString()}  
**Author**: Gemini (CMO)  
**Model**: gemini-3-flash-preview (thinkingLevel: high)
**Market**: EN (English)

**Integrated Content**:
- Task 1's Two Young Men story (opening)
- Task 3's detailed explanations (3 pillars)
- Task 1's 70% rule (philosophy)

**Purpose**: Text script to be inserted into DM messages

---

${revisedScript}

---

**Original VSL Files**:
- Task 1: \`task1_Bitcoin Trap Defence-caption.srt\`
- Task 3: \`task3_Master BTC Defense-caption.srt\`
`;

    fs.writeFileSync(outputPath, outputContent, 'utf-8');
    console.log(`\n✅ Revised VSL script saved: ${outputPath}\n`);

    // Optional: Generate SRT format
    console.log('💡 Tip: You can use this script as-is in text format when inserting into DM.');
    console.log('   If SRT format is needed, use a separate conversion script.\n');

  } catch (error: any) {
    console.error('❌ 生成エラー:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);

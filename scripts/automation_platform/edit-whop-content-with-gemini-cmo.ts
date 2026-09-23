#!/usr/bin/env tsx
/**
 * Whopコンテンツ編集スクリプト（Gemini CMO依頼）
 * 文字数制限に合わせてWhopコンテンツを編集
 * 
 * 文字数制限:
 * - Headline: 30字
 * - Description: 1500字（プレーンテキストのみ）
 * - Features: 140字×5項目
 * - FAQ: (質問255字+回答255字)×5項目
 */

import { callGemini3Pro } from '../api/unified-api.js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function editWhopContentWithGeminiCMO() {
  console.log('📢 Gemini CMOにWhopコンテンツ編集を依頼します...\n');

  // 現在のWhopコンテンツを読み込む
  const whopContentPath = join(__dirname, '..', 'data', 'whop-content-all-languages-improved.md');
  const whopContent = readFileSync(whopContentPath, 'utf-8');

  // VSLスクリプトを読み込む（参考情報として）
  const vslScriptPath = join(__dirname, '..', '..', 'Downloads', 'VSL_Two Young Men Story.srt');
  let vslScript = '';
  try {
    vslScript = readFileSync(vslScriptPath, 'utf-8');
  } catch (error) {
    console.log('⚠️ VSLスクリプトが見つかりませんでした（参考情報として使用）\n');
  }

  // Gemini CMOへのプロンプトを作成
  const prompt = `あなたはGemini CMO（gemini-3-flash-preview）です。Trap Defence BTCのWhopプロダクトページコンテンツを、以下の文字数制限に正確に合わせて編集してください。

## 📋 文字数制限（厳守）

- **Headline**: 30字（正確に30字）
- **Description**: 1500字（プレーンテキストのみ、マークダウン記号なし）
- **Features**: 140字×5項目（現在7項目→5項目に削減）
- **FAQ**: (質問255字+回答255字)×5項目（現在8項目→5項目に削減）

## 📝 現在のコンテンツ（EN版）

\`\`\`markdown
${whopContent.substring(0, 10000)}...
\`\`\`

## 🎬 VSLスクリプト（参考情報）

以下のVSLスクリプトが実装済みです。このストーリーと整合性を保ちながら編集してください。

\`\`\`
${vslScript}
\`\`\`

## 🎯 編集指示

### 1. Headline（30字）
- 現在のHeadlineを30字に正確に調整
- インパクトと明確さを維持
- 「4 AI-Powered Intelligence」のメッセージを含める

### 2. Description（1500字、プレーンテキストのみ）
- マークダウン記号（**、-、1.など）をすべて削除
- プレーンテキストのみで**正確に1500字**に調整（1500字を超えない、1500字未満でもOK）
- VSLスクリプトの「Two young men」ストーリーを活用
- 「4 AI Models Working Together」と「5 Key Benefits」を明確に伝える
- **文字数をカウントして、1500字を超えないように厳密に調整**

### 3. Features（140字×5項目）
- 現在7項目→5項目に削減
- 各項目を140字に正確に調整
- 最も重要な5つのベネフィットを選択
- 優先順位：
  1. Trap Defense Engine
  2. Information Priority（3秒で理解）
  3. Story Format（記憶に残る）
  4. News Program Format（自然な理解）
  5. 70% Victory Preparation Strategy

### 4. FAQ（質問255字+回答255字）×5項目
- 現在8項目→5項目に削減
- 各質問を**最大255字**に調整（短くてもOK、255字を超えない）
- 各回答を**最大255字**に調整（短くてもOK、255字を超えない）
- 最も重要な5つの質問を選択
- **各質問と回答の文字数をカウントして、255字を超えないように厳密に調整**
- 優先順位：
  1. How is Trap Defence BTC different from other AI signal services?
  2. What are the 5 key benefits?
  3. Is this suitable for beginners?
  4. What is the 'Trap Defense Engine'?
  5. What is the '70% Victory Preparation Strategy'?

## 📊 出力形式

**重要**: 出力は必ず英語で、以下のJSON形式のみを出力してください。説明文やコメントは一切不要です。JSONのみを出力してください。

\`\`\`json
{
  "headline": "30 characters exactly in English",
  "description": "Exactly 1500 characters in plain text English (no markdown symbols, no formatting)",
  "features": [
    "Exactly 140 characters in English for Feature 1",
    "Exactly 140 characters in English for Feature 2",
    "Exactly 140 characters in English for Feature 3",
    "Exactly 140 characters in English for Feature 4",
    "Exactly 140 characters in English for Feature 5"
  ],
  "faq": [
    {
      "question": "Maximum 255 characters in English for Question 1",
      "answer": "Maximum 255 characters in English for Answer 1"
    },
    {
      "question": "Maximum 255 characters in English for Question 2",
      "answer": "Maximum 255 characters in English for Answer 2"
    },
    {
      "question": "Maximum 255 characters in English for Question 3",
      "answer": "Maximum 255 characters in English for Answer 3"
    },
    {
      "question": "Maximum 255 characters in English for Question 4",
      "answer": "Maximum 255 characters in English for Answer 4"
    },
    {
      "question": "Maximum 255 characters in English for Question 5",
      "answer": "Maximum 255 characters in English for Answer 5"
    }
  ],
  "characterCounts": {
    "headline": 30,
    "description": 1500,
    "features": [140, 140, 140, 140, 140],
    "faq": {
      "questions": [255, 255, 255, 255, 255],
      "answers": [255, 255, 255, 255, 255]
    }
  }
}
\`\`\`

**CRITICAL**: 
1. Output ONLY valid JSON, no explanations, no comments, no markdown formatting outside the JSON
2. All content must be in English
3. **STRICTLY adhere to character limits - COUNT CHARACTERS CAREFULLY**
4. Description must be **EXACTLY 1500 characters or less** (plain text only, no markdown symbols like **, -, 1., etc.)
5. Features must be **EXACTLY 140 characters each** (5 features total)
6. FAQ questions must be **MAXIMUM 255 characters each** (can be shorter)
7. FAQ answers must be **MAXIMUM 255 characters each** (can be shorter)
8. **Before outputting, count the actual characters in each field and ensure they meet the limits**

**Please edit and output the JSON only.**`;

  try {
    console.log('🔄 Gemini CMOに編集依頼を送信しています...\n');
    
    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'low', // 高速化のためlowに変更
      temperature: 0.7,
      maxOutputTokens: 32000 // さらに増やす
    });

    console.log('✅ Gemini CMO編集完了\n');
    console.log('='.repeat(80));
    console.log('📊 Gemini CMO編集結果');
    console.log('='.repeat(80));
    console.log(result.text);
    console.log('='.repeat(80));
    console.log(`\n📈 使用トークン: ${JSON.stringify(result.usage, null, 2)}`);
    console.log(`🧠 Thinking Level: ${result.thinkingLevel}\n`);

    // JSONを抽出してパース
    let jsonContent: any = null;
    try {
      const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/) || result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        jsonContent = JSON.parse(jsonText);
        console.log('✅ JSONパース成功\n');
        console.log('📊 文字数確認:');
        console.log(`  Headline: ${jsonContent.headline?.length || 0}字 (目標: 30字)`);
        console.log(`  Description: ${jsonContent.description?.length || 0}字 (目標: 1500字)`);
        console.log(`  Features: ${jsonContent.features?.map((f: string, i: number) => `${i+1}: ${f.length}字`).join(', ') || 'N/A'}`);
        console.log(`  FAQ: ${jsonContent.faq?.map((q: any, i: number) => `Q${i+1}: ${q.question?.length || 0}字, A${i+1}: ${q.answer?.length || 0}字`).join(', ') || 'N/A'}\n`);
      } else {
        console.log('⚠️ JSONが見つかりませんでした\n');
      }
    } catch (error: any) {
      console.log(`⚠️ JSONパースエラー: ${error.message}\n`);
    }

    // 編集結果をファイルに保存
    const outputPath = join(__dirname, '..', 'docs', 'WHOP_EN_EDITED_BY_GEMINI_CMO.md');
    const editedContent = `# Whop EN版コンテンツ - Gemini CMO編集版

**編集日時**: ${new Date().toISOString()}
**編集者**: Gemini CMO（gemini-3-flash-preview）
**文字数制限**:
- Headline: 30字
- Description: 1500字（プレーンテキストのみ）
- Features: 140字×5項目
- FAQ: (質問255字+回答255字)×5項目

---

## 📊 編集結果

${result.text}

---

## 📈 使用トークン

\`\`\`json
${JSON.stringify(result.usage, null, 2)}
\`\`\`

**Thinking Level**: ${result.thinkingLevel}

---

**作成者**: Gemini CMO（gemini-3-flash-preview）  
**依頼者**: COO（Cursor/Composer 1）
`;

    writeFileSync(outputPath, editedContent, 'utf-8');
    console.log(`✅ 編集結果を保存しました: ${outputPath}\n`);

    // JSONがパースできた場合は、別ファイルにも保存
    if (jsonContent) {
      const jsonPath = join(__dirname, '..', 'docs', 'WHOP_EN_EDITED_BY_GEMINI_CMO.json');
      writeFileSync(jsonPath, JSON.stringify(jsonContent, null, 2), 'utf-8');
      console.log(`✅ JSON形式でも保存しました: ${jsonPath}\n`);
    }

    return result;
  } catch (error: any) {
    console.error('❌ Gemini CMO編集依頼エラー:', error.message);
    throw error;
  }
}

editWhopContentWithGeminiCMO()
  .then(() => {
    console.log('✅ Gemini CMO編集依頼完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  });

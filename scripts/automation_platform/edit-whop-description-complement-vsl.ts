#!/usr/bin/env tsx
/**
 * Whop Description編集スクリプト（Gemini CMO依頼）
 * VSLと補完し合うようにDescriptionを再編集
 * 
 * VSLの役割: ストーリーと感情的な訴求
 * Descriptionの役割: 具体的な機能説明、4つのAIの詳細、5つのベネフィットの詳細、技術的な説明
 */

import { callGemini3Pro } from '../api/unified-api.js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function editDescriptionComplementVSL() {
  console.log('📢 Gemini CMOにDescription編集を依頼します（VSL補完版）...\n');

  // VSLスクリプトを読み込む
  const vslScriptPath = join(__dirname, '..', '..', 'Downloads', 'VSL_Two Young Men Story.srt');
  const vslScript = readFileSync(vslScriptPath, 'utf-8');

  // 現在のDescriptionを読み込む
  const currentDescPath = join(__dirname, '..', 'docs', 'WHOP_EN_COPY_PASTE_READY_FINAL.md');
  const currentDesc = readFileSync(currentDescPath, 'utf-8');

  // Gemini CMOへのプロンプトを作成
  const prompt = `あなたはGemini CMO（gemini-3-flash-preview）です。WhopプロダクトページのDescriptionを、VSLスクリプトと補完し合うように再編集してください。

## 🎬 VSLスクリプトの内容（既に伝えられている内容）

\`\`\`
${vslScript}
\`\`\`

**VSLで既に伝えられている内容**:
- Two young menのストーリー（対比）
- クジラの罠で全資産を失う vs 防御で利益を得る
- 70%の時間は何もしない規律
- 90%の確信を持って動く
- 高解像度の防御
- 感情的な訴求（FOMO、感情が敵になる）

## 📝 現在のDescription（重複している）

\`\`\`
${currentDesc.match(/```\n([\s\S]*?)\n```/)?.[1] || 'N/A'}
\`\`\`

## 🎯 編集指示

### VSLとDescriptionの役割分担

**VSLの役割**:
- ストーリーと感情的な訴求
- 「Two young men」の対比
- 感情的な共感（FOMO、恐怖、希望）

**Descriptionの役割**:
- **具体的な機能説明**（VSLでは触れていない詳細）
- **4つのAIモデルの詳細な説明**（各AIの具体的な役割と機能）
- **5つのベネフィットの詳細**（なぜそれらが価値があるのか）
- **技術的な説明**（Trap Score、オンチェーンデータ、センチメント分析など）
- **実用的な情報**（どのように使うか、何が得られるか）

### 編集方針

1. **VSLのストーリーは繰り返さない**
   - 「Two young men」のストーリーはVSLで既に伝えられているので、Descriptionでは触れない
   - 代わりに、そのストーリーの「教訓」や「システムの詳細」を説明する

2. **4つのAIモデルの詳細を説明**
   - CryptoQuant: オンチェーンデータの具体的な活用方法
   - Grok: センチメント分析の具体的な価値
   - GPT: メンタルトレーニングの具体的な効果
   - Gemini: コンテンツ構造化の具体的なベネフィット

3. **5つのベネフィットの詳細を説明**
   - 情報の優先順位: なぜ3秒で理解できるのか
   - ストーリー形式: なぜ記憶に残るのか
   - ニュース番組形式: なぜ自然に理解できるのか
   - 70%勝利準備戦略: なぜ「待機」が「勝利準備」なのか
   - 明確な行動喚起: なぜ重要なのか

4. **技術的な詳細を追加**
   - Trap Score 0-100の意味
   - オンチェーンデータの活用
   - センチメント分析の精度
   - 証拠ベースの判断

5. **実用的な情報を追加**
   - どのように使うか
   - 何が得られるか
   - なぜ他のサービスと違うのか

## 📊 出力形式

**重要**: 出力は必ず英語で、以下のJSON形式のみを出力してください。説明文やコメントは一切不要です。JSONのみを出力してください。

\`\`\`json
{
  "description": "Exactly 1500 characters or less in plain text English (no markdown symbols, no formatting). Focus on technical details, 4 AI models' specific roles, 5 benefits' detailed explanations, and practical information. Do NOT repeat the VSL story."
}
\`\`\`

**CRITICAL**: 
1. Output ONLY valid JSON, no explanations, no comments, no markdown formatting outside the JSON
2. All content must be in English
3. **EXACTLY 1500 characters or less** (plain text only, no markdown symbols like **, -, 1., etc.)
4. **Do NOT repeat the VSL story** - focus on technical details and practical information
5. **Complement the VSL** - provide information that VSL doesn't cover
6. **Count characters carefully** - ensure 1500 characters or less

**Please edit and output the JSON only.**`;

  try {
    console.log('🔄 Gemini CMOに編集依頼を送信しています...\n');
    
    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'high',
      temperature: 0.7,
      maxOutputTokens: 8000
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
        console.log(`  Description: ${jsonContent.description?.length || 0}字 (目標: 1500字以内)\n`);
      } else {
        console.log('⚠️ JSONが見つかりませんでした\n');
      }
    } catch (error: any) {
      console.log(`⚠️ JSONパースエラー: ${error.message}\n`);
    }

    // 編集結果をファイルに保存
    const outputPath = join(__dirname, '..', 'docs', 'WHOP_DESCRIPTION_COMPLEMENT_VSL.md');
    const editedContent = `# Whop Description - VSL補完版（Gemini CMO編集）

**編集日時**: ${new Date().toISOString()}
**編集者**: Gemini CMO（gemini-3-flash-preview）
**目的**: VSLと補完し合うようにDescriptionを再編集

---

## 🎬 VSLの役割

- ストーリーと感情的な訴求
- 「Two young men」の対比
- 感情的な共感（FOMO、恐怖、希望）

## 📝 Descriptionの役割

- 具体的な機能説明
- 4つのAIモデルの詳細な説明
- 5つのベネフィットの詳細
- 技術的な説明
- 実用的な情報

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
    if (jsonContent && jsonContent.description) {
      const finalPath = join(__dirname, '..', 'docs', 'WHOP_EN_COPY_PASTE_READY_FINAL.md');
      const finalContent = readFileSync(finalPath, 'utf-8');
      
      // Descriptionを置き換え
      const updatedContent = finalContent.replace(
        /```\n([\s\S]*?)\n```\n\n\*\*文字数\*\*: 1499字 ✅/,
        `\`\`\`\n${jsonContent.description}\n\`\`\`\n\n**文字数**: ${jsonContent.description.length}字 ✅`
      );
      
      writeFileSync(finalPath, updatedContent, 'utf-8');
      console.log(`✅ 最終ファイルを更新しました: ${finalPath}\n`);
    }

    return result;
  } catch (error: any) {
    console.error('❌ Gemini CMO編集依頼エラー:', error.message);
    throw error;
  }
}

editDescriptionComplementVSL()
  .then(() => {
    console.log('✅ Gemini CMO編集依頼完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  });

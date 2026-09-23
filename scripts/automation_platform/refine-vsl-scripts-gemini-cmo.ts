#!/usr/bin/env tsx
/**
 * VSL1 & VSL2 スクリプト修正 - Gemini CMO（gemini-3-flash-preview）
 * COOラフ → Gemini CMO修正 → COO最終確定
 */

import { callGemini3Pro } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function refineVSLScripts() {
  console.log('📋 Gemini CMO（gemini-3-flash-preview）がVSLスクリプトを修正中...\n');

  // COOラフを読み込む
  const draftPath = join(__dirname, '..', 'docs', 'VSL1_VSL2_SCRIPT_DRAFT.md');
  let draftContent = '';
  if (fs.existsSync(draftPath)) {
    draftContent = fs.readFileSync(draftPath, 'utf-8');
  }

  // Gemini CMOレビューを読み込む
  const reviewPath = join(__dirname, '..', 'docs', 'VSL_FLOW_REVIEW_GEMINI_CMO.md');
  let reviewContent = '';
  if (fs.existsSync(reviewPath)) {
    reviewContent = fs.readFileSync(reviewPath, 'utf-8').substring(0, 3000);
  }

  const prompt = `【VSL1 & VSL2 スクリプト修正 - Gemini CMO（gemini-3-flash-preview）】

あなたは最高マーケティング責任者（CMO）として、COOが作成したVSL1とVSL2のラフ案をマーケティング視点から修正してください。

## 目的

- **VSL2（フロントエンド）**: ミニマム版（無料）へのオプトイン誘導（Telegram/X投稿用）
- **VSL1（バックエンド）**: ミニマム版ユーザーを有料版へコンバージョン（Telegram参加後24-48時間）

## COOラフ案

${draftContent}

## 過去のレビュー結果（参考）

${reviewContent}

## 修正依頼事項

以下の観点から、COOラフ案を修正してください：

### 1. VSL2（フロントエンド）の修正
- 「Minimum Edition」の言及が自然で効果的か？
- 無料オプトインへのCTAが明確で魅力的か？
- 感情的な訴求（Two Young Men Story）が維持されているか？
- Telegram/X投稿というチャネルに適した長さ・構成か？

### 2. VSL1（バックエンド）の修正
- ミニマム版ユーザーへの言及が自然か？
- Whale Trapの危険性の説明が効果的か？
- DEFEND50キャンペーンの訴求が明確か？
- 有料版へのコンバージョンCTAが効果的か？

### 3. 全体的な改善
- 2つのVSLの一貫性は保たれているか？
- ストーリーの流れは自然か？
- CTAが明確で行動を促すか？

## 出力形式

以下の構造でJSON形式で出力してください：

\`\`\`json
{
  "refinedScripts": {
    "vsl2": {
      "script": "SRT形式のスクリプト（タイムスタンプ付き）",
      "changes": ["変更点1", "変更点2"],
      "rationale": "変更理由"
    },
    "vsl1": {
      "script": "SRT形式のスクリプト（タイムスタンプ付き）",
      "changes": ["変更点1", "変更点2"],
      "rationale": "変更理由"
    },
    "overallImprovements": "全体的な改善点"
  }
}
\`\`\`

英語で、マーケティングの専門知識を活用した修正案を作成してください。`;

  try {
    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'high',
      temperature: 0.8,
      maxOutputTokens: 4096,
    });

    const refinedText = result.text.trim();
    console.log('✅ Gemini CMOの修正完了\n');
    console.log('='.repeat(80));
    console.log('Gemini CMO修正案:');
    console.log('='.repeat(80));
    console.log(refinedText);
    console.log('='.repeat(80));

    // JSONを抽出（```json と ``` の間）
    let jsonData: any = null;
    const jsonMatch = refinedText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        jsonData = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.warn('⚠️ JSON解析エラー:', e);
      }
    }

    // ファイルに保存
    const outputPath = join(__dirname, '..', 'docs', 'VSL1_VSL2_SCRIPT_GEMINI_CMO_REFINED.md');
    const outputContent = `# VSL1 & VSL2 スクリプト - Gemini CMO修正案

**作成日時**: ${new Date().toISOString()}
**修正者**: Gemini CMO（gemini-3-flash-preview）
**プロセス**: COOラフ → Gemini CMO修正 → COO最終確定

---

## 🔍 Gemini CMO修正案

${refinedText}

---

## 📊 詳細なJSONデータ

\`\`\`json
${JSON.stringify(jsonData || { raw: refinedText }, null, 2)}
\`\`\`

---

**修正者**: Gemini CMO（gemini-3-flash-preview）
**修正日時**: ${new Date().toISOString()}
**次のステップ**: COO（Cursor/Composer 1）が最終確定
`;

    fs.writeFileSync(outputPath, outputContent, 'utf-8');
    console.log(`\n✅ 修正案を保存しました: ${outputPath}`);

    return jsonData || { raw: refinedText };
  } catch (error: any) {
    console.error(`❌ エラー:`, error.message);
    throw error;
  }
}

refineVSLScripts()
  .then(() => {
    console.log('\n✅ VSLスクリプト修正完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  });

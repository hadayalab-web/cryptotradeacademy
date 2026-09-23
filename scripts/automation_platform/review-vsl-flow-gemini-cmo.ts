#!/usr/bin/env tsx
/**
 * VSL流れ・構成レビュー - Gemini CMO（gemini-3-flash-preview）
 * 2つのVSLの流れ・構成が適切かどうかをマーケティング視点からレビュー
 */

import { callGemini3Pro } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function reviewVSLFlow() {
  console.log('📋 Gemini CMO（gemini-3-flash-preview）がVSL流れ・構成をレビュー中...\n');

  // VSLファイルを読み込む
  const defend50Path = 'C:\\Users\\chiba\\Downloads\\DEFEND50-caption.srt';
  const twoYoungMenPath = 'C:\\Users\\chiba\\Downloads\\VSL_Two Young Men Story.srt';

  let defend50Content = '';
  let twoYoungMenContent = '';

  if (fs.existsSync(defend50Path)) {
    defend50Content = fs.readFileSync(defend50Path, 'utf-8');
  }

  if (fs.existsSync(twoYoungMenPath)) {
    twoYoungMenContent = fs.readFileSync(twoYoungMenPath, 'utf-8');
  }

  const prompt = `【VSL流れ・構成レビュー - Gemini CMO（gemini-3-flash-preview）】

あなたは最高マーケティング責任者（CMO）として、2つのVSLの流れ・構成をマーケティング視点からレビューしてください。

## 目的

ミニマム版（無料）へのオプトイン誘導を目的とした、Telegram/X投稿用のVSL戦略です。
LP・広告は使用せず、Grokリスト収集 + Telegram/X投稿のみでミニマム版への参加を促します。

## VSL 1: DEFEND50キャンペーン用

**YouTube URL**: https://youtu.be/6Z7AfE9FSy4
**総時間**: 約75秒（1分15秒）
**内容**: 50%OFFキャンペーン、先着50名限定、DEFEND50コード

**SRT内容**:
${defend50Content}

## VSL 2: Two Young Men Story（基本ストーリー）

**総時間**: 約1分8秒
**内容**: 2人の若者の対比（ハンター vs ディフェンダー）

**SRT内容**:
${twoYoungMenContent}

## 使用シナリオ

1. **今回の戦略**: Grokリスト収集 + TG/X投稿のみ（LP・広告不使用）
2. **VSL 1**: DEFEND50キャンペーン用（50%OFF、先着50名限定）
3. **VSL 2**: Two Young Men Story（基本ストーリー）
4. **CTA**: ミニマム版（無料）への参加 → Whopプロダクトページ

## レビュー依頼事項

以下の観点から、2つのVSLの流れ・構成が適切かどうかを評価してください：

### 1. ストーリーの流れ
- VSL 1（DEFEND50）とVSL 2（Two Young Men Story）の順序は適切か？
- 2つのVSLの内容に矛盾や不整合はないか？
- ストーリーの流れは自然で、感情的な訴求が効果的か？

### 2. マーケティング戦略の整合性
- ミニマム版（無料）へのオプトイン誘導という目的に適しているか？
- 50%OFFキャンペーン（DEFEND50）とミニマム版（無料）の関係性は明確か？
- Telegram/X投稿というチャネルに適した構成か？

### 3. CTA（Call to Action）の明確性
- ミニマム版（無料）への参加を促すCTAは明確か？
- DEFEND50キャンペーンとミニマム版の関係性は理解しやすいか？
- ユーザーの行動を促す流れになっているか？

### 4. 改善提案
- 流れ・構成に問題がある場合、具体的な改善提案をしてください
- より効果的な順序や構成があれば、提案してください

## 出力形式

以下の構造でJSON形式で出力してください：

\`\`\`json
{
  "review": {
    "overallAssessment": "総合評価（適切/要改善/不適切）",
    "storyFlow": {
      "assessment": "ストーリーの流れの評価",
      "issues": ["問題点1", "問題点2"],
      "strengths": ["強み1", "強み2"]
    },
    "marketingStrategyAlignment": {
      "assessment": "マーケティング戦略との整合性の評価",
      "issues": ["問題点1", "問題点2"],
      "strengths": ["強み1", "強み2"]
    },
    "ctaClarity": {
      "assessment": "CTAの明確性の評価",
      "issues": ["問題点1", "問題点2"],
      "strengths": ["強み1", "強み2"]
    },
    "recommendations": {
      "order": "VSLの順序に関する推奨事項",
      "content": "コンテンツに関する推奨事項",
      "cta": "CTAに関する推奨事項",
      "overall": "全体的な改善提案"
    },
    "finalVerdict": "最終判断と理由"
  }
}
\`\`\`

英語で、マーケティングの専門知識を活用したレビューを作成してください。`;

  try {
    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'high',
      temperature: 0.8,
      maxOutputTokens: 4096,
    });

    const reviewText = result.text.trim();
    console.log('✅ Gemini CMOのレビュー完了\n');
    console.log('='.repeat(80));
    console.log('Gemini CMOレビュー:');
    console.log('='.repeat(80));
    console.log(reviewText);
    console.log('='.repeat(80));

    // JSONを抽出（```json と ``` の間）
    let jsonData: any = null;
    const jsonMatch = reviewText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        jsonData = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.warn('⚠️ JSON解析エラー:', e);
      }
    }

    // ファイルに保存
    const outputPath = join(__dirname, '..', 'docs', 'VSL_FLOW_REVIEW_GEMINI_CMO.md');
    const outputContent = `# VSL流れ・構成レビュー - Gemini CMO

**作成日時**: ${new Date().toISOString()}
**レビュー者**: Gemini CMO（gemini-3-flash-preview）
**目的**: ミニマム版オプトイン誘導のためのVSL流れ・構成の評価

---

## 📋 レビュー対象

### VSL 1: DEFEND50キャンペーン用
- **YouTube URL**: https://youtu.be/6Z7AfE9FSy4
- **SRTファイル**: \`c:\\Users\\chiba\\Downloads\\DEFEND50-caption.srt\`
- **総時間**: 約75秒（1分15秒）
- **内容**: 50%OFFキャンペーン、先着50名限定、DEFEND50コード

### VSL 2: Two Young Men Story（基本ストーリー）
- **SRTファイル**: \`c:\\Users\\chiba\\Downloads\\VSL_Two Young Men Story.srt\`
- **総時間**: 約1分8秒
- **内容**: 2人の若者の対比（ハンター vs ディフェンダー）

---

## 🔍 Gemini CMOレビュー結果

${reviewText}

---

## 📊 詳細なJSONデータ

\`\`\`json
${JSON.stringify(jsonData || { raw: reviewText }, null, 2)}
\`\`\`

---

**レビュー者**: Gemini CMO（gemini-3-flash-preview）
**レビュー日時**: ${new Date().toISOString()}
`;

    fs.writeFileSync(outputPath, outputContent, 'utf-8');
    console.log(`\n✅ レビューを保存しました: ${outputPath}`);

    return jsonData || { raw: reviewText };
  } catch (error: any) {
    console.error(`❌ エラー:`, error.message);
    throw error;
  }
}

reviewVSLFlow()
  .then(() => {
    console.log('\n✅ VSL流れ・構成レビュー完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  });

#!/usr/bin/env tsx
/**
 * VSL3 YouTube実装レビュー - Gemini CMO（gemini-3-flash-preview）
 * Whopページ用VSL3の完成度をマーケティング視点からレビュー
 */

import { callGemini3Pro } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function reviewVSL3YouTube() {
  console.log('📋 Gemini CMO（gemini-3-flash-preview）がVSL3 YouTube実装をレビュー中...\n');

  // VSL3のSRTファイルを読み込む
  const vsl3Path = 'C:\\Users\\chiba\\Downloads\\VSL3_Trap Defence BTC_whop.srt';
  let vsl3Content = '';
  if (fs.existsSync(vsl3Path)) {
    vsl3Content = fs.readFileSync(vsl3Path, 'utf-8');
  }

  // Whopプロダクトページの情報を読み込む
  const whopUrl = 'https://whop.com/aio-media-llc/trap-defence-btc-en/';

  const prompt = `【VSL3 YouTube実装レビュー - Gemini CMO（gemini-3-flash-preview）】

あなたは最高マーケティング責任者（CMO）として、Whopページ用のVSL3の完成度をマーケティング視点からレビューしてください。

## VSL3情報

**YouTube URL**: https://youtu.be/vjz896hTPPw
**目的**: Whopページ用（有料版へのコンバージョン）
**SRTファイル内容**:
${vsl3Content}

**Whopプロダクトページ**: ${whopUrl}

## レビュー依頼事項

以下の観点から、VSL3の完成度を評価してください：

### 1. ストーリー構成
- 「Two Young Men Story」の効果的な活用
- 感情的な訴求の強さ
- ストーリーの流れと自然さ
- 視聴者の感情を動かす力

### 2. マーケティング戦略の整合性
- Whopページ用として適切か？
- 有料版へのコンバージョンを促す構成か？
- 価値提案の明確さ
- ユニークセリングプロポジション（USP）の伝達

### 3. CTA（Call to Action）の効果性
- CTAの明確さとタイミング
- 行動を促す力
- Whopページへの自然な導線

### 4. 完成度の評価
- プロフェッショナルな品質か？
- マーケティングベストプラクティスに準拠しているか？
- 改善の余地があるか？それとも完成度が高いか？

### 5. 他のVSLとの比較
- VSL1（無料オプトイン誘導用）との関係性
- VSL2（Whopプロモコード使用アピール）との関係性
- 3つのVSLの統合的な効果

## 出力形式

以下の構造でJSON形式で出力してください：

\`\`\`json
{
  "review": {
    "overallAssessment": "総合評価（完成度が高い/要改善/不適切）",
    "completionLevel": "完成度の評価（1-10スケール）",
    "storyStructure": {
      "assessment": "ストーリー構成の評価",
      "strengths": ["強み1", "強み2"],
      "weaknesses": ["弱み1", "弱み2"]
    },
    "marketingStrategyAlignment": {
      "assessment": "マーケティング戦略との整合性の評価",
      "strengths": ["強み1", "強み2"],
      "weaknesses": ["弱み1", "弱み2"]
    },
    "ctaEffectiveness": {
      "assessment": "CTAの効果性の評価",
      "strengths": ["強み1", "強み2"],
      "weaknesses": ["弱み1", "弱み2"]
    },
    "professionalQuality": {
      "assessment": "プロフェッショナルな品質の評価",
      "strengths": ["強み1", "強み2"],
      "weaknesses": ["弱み1", "弱み2"]
    },
    "comparisonWithOtherVSLs": {
      "vsl1Relationship": "VSL1との関係性",
      "vsl2Relationship": "VSL2との関係性",
      "integratedEffectiveness": "3つのVSLの統合的な効果"
    },
    "recommendations": {
      "improvements": ["改善提案1", "改善提案2"],
      "bestPractices": "ベストプラクティスとして評価できる点",
      "overall": "全体的な評価と推奨事項"
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
    const outputPath = join(__dirname, '..', 'docs', 'VSL3_YOUTUBE_REVIEW_GEMINI_CMO.md');
    const outputContent = `# VSL3 YouTube実装レビュー - Gemini CMO

**作成日時**: ${new Date().toISOString()}
**レビュー者**: Gemini CMO（gemini-3-flash-preview）
**目的**: Whopページ用VSL3の完成度評価

---

## 📋 レビュー対象

### VSL3: Whopページ用
- **YouTube URL**: https://youtu.be/vjz896hTPPw
- **SRTファイル**: \`c:\\Users\\chiba\\Downloads\\VSL3_Trap Defence BTC_whop.srt\`
- **目的**: Whopページ用（有料版へのコンバージョン）
- **Whopプロダクトページ**: https://whop.com/aio-media-llc/trap-defence-btc-en/

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

reviewVSL3YouTube()
  .then(() => {
    console.log('\n✅ VSL3 YouTube実装レビュー完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  });

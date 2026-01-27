#!/usr/bin/env node
/**
 * Premium Tierローンチ戦略のGPT実装設計書生成 - Week 1: X投稿機能のみ
 */

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set');
  process.exit(1);
}

const openaiClient = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

function loadExistingDocuments() {
  const docsDir = path.join(__dirname, '../docs');
  const reportsDir = path.join(__dirname, '../docs/reports');
  
  let enhancedStrategy = '';
  let grokGeminiAnalysis = '';
  
  try {
    const enhancedPath = path.join(docsDir, 'PREMIUM_TIER_LAUNCH_STRATEGY_ENHANCED.md');
    if (fs.existsSync(enhancedPath)) {
      enhancedStrategy = fs.readFileSync(enhancedPath, 'utf-8');
    }
  } catch (error) {
    console.warn('⚠️ Enhanced strategy not found:', error.message);
  }
  
  try {
    const files = fs.readdirSync(reportsDir);
    const analysisFiles = files.filter(f => f.startsWith('premium-launch-grok-gemini-analysis-'));
    if (analysisFiles.length > 0) {
      const latestFile = analysisFiles.sort().reverse()[0];
      const analysisPath = path.join(reportsDir, latestFile);
      grokGeminiAnalysis = fs.readFileSync(analysisPath, 'utf-8');
    }
  } catch (error) {
    console.warn('⚠️ Grok×Gemini analysis not found:', error.message);
  }
  
  return { enhancedStrategy, grokGeminiAnalysis };
}

async function generateWeek1XPostStrategy() {
  const prompt = `あなたはNode.js/JavaScriptの実装設計の専門家です。Trap Defence BTC Premium Tierの**Week 1: X投稿機能（api/x-post-premium-tier-cron.js）**のみを、Cursor（AIコードエディタ）が**即座に実装できる**詳細な技術設計書として作成してください。

## 実装要件

### X投稿機能（api/x-post-premium-tier-cron.js）
- **完全なコード実装**（既存パターンを踏襲）
- 関数シグネチャ: \`async function postPremiumTierAnnouncement(lang, phase)\`
- メッセージ生成ロジック（Grok×Gemini分析に基づく）
- A/Bテスト実装（既存パターンと同じ構造）
- エラーハンドリング、リトライロジック

## 既存コードベースの実装パターン（必須参照）

### パターン1: X投稿API（api/x-post-minimal-version.js）
\`\`\`javascript
module.exports = async function handler(req, res) {
  const xStatus = getXConfigStatus();
  if (!xStatus.postingEnabled) return { success: false };
  const alreadyPosted = await hasPostedToday(dateString, lang);
  if (alreadyPosted) return { success: false, skipped: true };
  const langTemplates = loadUserTemplates(lang);
  const message = langTemplates.formatMessage({ trapScore, priceUsd, ... });
  const useWhopFirst = Math.random() < 0.5;
  const thread = splitTextForThread(message);
  const firstTweet = await postTweet(thread[0]);
  for (let i = 1; i < thread.length; i++) {
    await replyToTweet(firstTweet.id, thread[i]);
  }
  await logPostSuccess({ lang, abTestVariant, ... });
  return { success: true };
}
\`\`\`

## 出力形式（必須）

Markdown形式で、以下のセクションを**すべて**含めてください：

1. **概要**: X投稿機能の実装設計書の目的、スコープ、前提条件
2. **ファイル構造**: 完全なコード実装（コピー&ペーストで動作するレベル）
3. **関数シグネチャ**: パラメータ、戻り値、JSDocコメント
4. **エラーハンドリング**: try-catch、フォールバック、ログ記録
5. **テスト方法**: 具体的なテストコード例
6. **Cron設定**: vercel.jsonへの追加設定（完全なJSON）

## 重要な制約

1. **既存パターンを100%踏襲**: 上記パターン1を必ず参照
2. **完全なコード実装**: 関数の骨組みではなく、動作する完全なコード
3. **6言語対応**: すべての機能で6言語（en, ja, es, pt-br, ar, ko）をサポート
4. **エラーハンドリング**: try-catch、フォールバック、ログ記録を含める
5. **型安全性**: JSDocコメントで型を明示

日本語で回答してください。`;

  try {
    console.log('🔄 GPTでWeek 1 X投稿機能の実装設計書を生成中...');
    
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'あなたはNode.js/JavaScriptの実装設計の専門家です。Cursor（AIコードエディタ）が**即座に実装できる**詳細な技術設計書を作成します。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 4000,
      temperature: 0.7,
    });

    const strategy = response.choices[0]?.message?.content;
    
    if (!strategy || strategy.trim().length === 0) {
      return { success: false, error: 'Empty response from GPT' };
    }
    
    console.log('✅ GPT Week 1 X投稿機能実装設計書生成完了');
    console.log(`📝 生成された文字数: ${strategy.length}文字`);
    
    return { success: true, strategy, model: 'gpt-5.2-2025-12-11' };
  } catch (error) {
    console.error('❌ GPT Week 1 X投稿機能実装設計書生成エラー:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('🚀 Premium Tierローンチ戦略のGPT実装設計書生成 - Week 1: X投稿機能');
  console.log('='.repeat(80));
  console.log('');

  const result = await generateWeek1XPostStrategy();

  if (!result.success) {
    console.error('❌ 実装設計書生成に失敗しました');
    process.exit(1);
  }

  const outputDir = path.join(__dirname, '../docs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const outputFile = path.join(outputDir, `PREMIUM_TIER_IMPLEMENTATION_WEEK1_XPOST_${timestamp}.md`);

  const output = `# Trap Defence BTC Premium Tier 実装設計書 - Week 1: X投稿機能（GPT生成）

**作成日時**: ${new Date().toISOString()}
**生成モデル**: ${result.model}

---

${result.strategy}

---

**生成日時**: ${new Date().toISOString()}
`;

  fs.writeFileSync(outputFile, output, 'utf-8');
  console.log(`✅ 実装設計書を保存しました: ${outputFile}`);
  console.log('='.repeat(80));
}

main().catch((error) => {
  console.error('❌ エラー:', error);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Premium Tierローンチ戦略のGPT実装設計書生成 - Week 4のみ
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

async function generateWeek4Strategy(enhancedStrategy, grokGeminiAnalysis) {
  const prompt = `あなたはNode.js/JavaScriptの実装設計の専門家です。Trap Defence BTC Premium Tierの**Week 4: 正式ローンチ**のみを、Cursor（AIコードエディタ）が**即座に実装できる**詳細な技術設計書として作成してください。

## Week 4: 正式ローンチの実装要件

**重要**: 以下のすべてを含めてください。コード例は**実際に動作する完全な実装**であること。

### 4.1 ローンチ日特別機能（api/premium-launch-day.js）
- **完全なコード実装**
- 3連投ロジック、優先アクセス管理、オファー適用

## 既存コードベースの実装パターン（必須参照）

### パターン1: X投稿API（api/x-post-minimal-version.js）
\`\`\`javascript
const thread = splitTextForThread(message);
const firstTweet = await postTweet(thread[0]);
for (let i = 1; i < thread.length; i++) {
  await replyToTweet(firstTweet.id, thread[i]);
}
\`\`\`

## 出力形式（必須）

Markdown形式で、以下のセクションを**すべて**含めてください：

1. **概要**: Week 4実装設計書の目的、スコープ、前提条件
2. **アーキテクチャ概要**: ディレクトリ構造、ファイル依存関係図、データフロー図
3. **Week 4の詳細実装設計**: 各ファイルの完全なコード実装、関数シグネチャ、エラーハンドリング、テスト方法
4. **データモデル**: 優先アクセス管理のデータ構造（JSONスキーマ）
5. **API設計**: エンドポイント定義、認証・認可
6. **Cron設定**: vercel.jsonへの追加設定（完全なJSON）、実行タイミングの根拠
7. **環境変数**: 必要な環境変数のリスト
8. **実装チェックリスト**: ファイル単位の実装項目、依存関係の順序
9. **テスト計画**: ユニットテストコード例、統合テストシナリオ、手動テスト手順
10. **デプロイメント計画**: 段階的デプロイ手順（具体的なコマンド）、ロールバック手順

## 重要な制約

1. **既存パターンを100%踏襲**: 既存のスレッド投稿パターンを参照
2. **完全なコード実装**: 動作する完全なコード
3. **6言語対応**: すべての機能で6言語（en, ja, es, pt-br, ar, ko）をサポート
4. **エラーハンドリング**: try-catch、フォールバック、ログ記録を含める
5. **型安全性**: JSDocコメントで型を明示

日本語で回答してください。`;

  try {
    console.log('🔄 GPTでWeek 4実装設計書を生成中...');
    
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
      max_completion_tokens: 6000,
      temperature: 0.7,
    });

    const strategy = response.choices[0]?.message?.content;
    
    if (!strategy || strategy.trim().length === 0) {
      return { success: false, error: 'Empty response from GPT' };
    }
    
    console.log('✅ GPT Week 4実装設計書生成完了');
    console.log(`📝 生成された文字数: ${strategy.length}文字`);
    
    return { success: true, strategy, model: 'gpt-5.2-2025-12-11' };
  } catch (error) {
    console.error('❌ GPT Week 4実装設計書生成エラー:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('🚀 Premium Tierローンチ戦略のGPT実装設計書生成 - Week 4');
  console.log('='.repeat(80));
  console.log('');

  const { enhancedStrategy, grokGeminiAnalysis } = loadExistingDocuments();
  
  if (!enhancedStrategy && !grokGeminiAnalysis) {
    console.error('❌ 既存ドキュメントが見つかりません');
    process.exit(1);
  }

  const result = await generateWeek4Strategy(enhancedStrategy, grokGeminiAnalysis);

  if (!result.success) {
    console.error('❌ 実装設計書生成に失敗しました');
    process.exit(1);
  }

  const outputDir = path.join(__dirname, '../docs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const outputFile = path.join(outputDir, `PREMIUM_TIER_IMPLEMENTATION_WEEK4_${timestamp}.md`);

  const output = `# Trap Defence BTC Premium Tier 実装設計書 - Week 4（GPT生成）

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

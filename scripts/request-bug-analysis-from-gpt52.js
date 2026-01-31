#!/usr/bin/env node
// scripts/request-bug-analysis-from-gpt52.js
// GPT-5.2-2025-12-11に504タイムアウトとモジュールパスエラーの分析を依頼

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

/**
 * GPT-5.2-2025-12-11にバグ分析を依頼
 */
async function requestBugAnalysis() {
  // 関連ファイルを読み込む
  const cronJs = fs.readFileSync(path.join(__dirname, '../api/cron.js'), 'utf-8');
  const xQuoteRepostJs = fs.readFileSync(path.join(__dirname, '../api/x-quote-repost.js'), 'utf-8');
  const grokClientJs = fs.readFileSync(path.join(__dirname, '../services/grok/client.js'), 'utf-8');
  
  // エラーログ（テスト結果から取得）
  const errorLogs = `
## エラーログ

### 1. /api/cron
- エラー: Cannot find module '../shared/contentFilters'
- 発生箇所: services/telegram/messages/user/ja/regular.ja.js
- 修正済み: ../shared → ../../shared に修正

### 2. /api/x-quote-repost-en
- エラー: success: false が返される（dryRun: trueの場合も）
- 504タイムアウトが発生
- 修正済み: dryRunも成功とみなすように修正、タイムアウトチェックを5秒に短縮

### 3. タイムアウト問題
- Grok API呼び出しに30秒タイムアウト設定を追加
- 最適化処理に15秒タイムアウト設定を追加
- 早期リターン（タイムアウトチェック）を5秒に短縮
`;

  const prompt = `あなたはGPT-5.2-2025-12-11です。Vercel Serverless Functionsで実行されるNode.jsアプリケーションのバグ分析を依頼します。

## 問題の概要

1. **504タイムアウト**: Vercel Functionsの60秒制限を超過
2. **モジュールパスエラー**: Cannot find module '../shared/contentFilters'
3. **success判定ロジック**: dryRun: trueの場合も処理自体は成功しているが、success: falseが返される

## 修正済み内容

### 1. モジュールパスエラー修正
- services/telegram/messages/user/*/regular.*.js: ../shared → ../../shared に修正

### 2. success判定ロジック修正
- api/x-quote-repost.js: dryRunも成功とみなすように修正、dry_run_countメトリクスを追加

### 3. タイムアウト対策
- services/grok/client.js: Grok API呼び出しに30秒タイムアウト設定を追加
- api/x-quote-repost.js: 最適化処理に15秒タイムアウト設定を追加、早期リターンを5秒に短縮

## 関連コード

### api/cron.js（抜粋）
\`\`\`javascript
${cronJs.substring(0, 2000)}...
\`\`\`

### api/x-quote-repost.js（抜粋）
\`\`\`javascript
${xQuoteRepostJs.substring(0, 2000)}...
\`\`\`

### services/grok/client.js（抜粋）
\`\`\`javascript
${grokClientJs.substring(0, 2000)}...
\`\`\`

## 分析依頼事項

1. **504タイムアウトの根本原因分析**
   - Vercel Functionsの60秒制限を超過する原因を特定
   - Grok API呼び出し、最適化処理、その他の処理時間を分析
   - タイムアウト対策が適切かどうかを評価

2. **モジュールパスエラーの再発防止**
   - モジュールパスが正しく解決されているか確認
   - 他の類似エラーがないかチェック

3. **success判定ロジックの改善提案**
   - dryRunの扱いが適切かどうか
   - メトリクスの設計が適切かどうか

4. **パフォーマンス最適化提案**
   - 処理時間を短縮する方法
   - 並列処理の活用
   - キャッシュの活用

5. **その他の潜在的な問題**
   - エラーハンドリングの改善点
   - ログ出力の改善点
   - デバッグのしやすさ

以下のJSON形式で出力してください：
{
  "rootCauseAnalysis": {
    "timeoutIssues": ["原因1", "原因2", ...],
    "modulePathIssues": ["問題1", "問題2", ...],
    "successLogicIssues": ["問題1", "問題2", ...]
  },
  "fixes": [
    {
      "priority": "CRITICAL|HIGH|MEDIUM|LOW",
      "issue": "問題の説明",
      "fix": "修正方法の説明",
      "code": "修正コード（該当する場合）"
    }
  ],
  "optimizations": [
    {
      "area": "最適化領域",
      "suggestion": "最適化提案",
      "expectedImprovement": "期待される改善"
    }
  ],
  "additionalRecommendations": ["推奨事項1", "推奨事項2", ...]
}`;

  try {
    console.log('🔄 GPT-5.2-2025-12-11にバグ分析を依頼中...\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'You are GPT-5.2-2025-12-11, an expert at analyzing Node.js serverless function bugs, performance issues, and code quality. Provide detailed, actionable analysis with specific code fixes.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 4000,
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from GPT-5.2');
    }

    const analysis = JSON.parse(response);

    // 結果をファイルに保存
    const outputPath = path.join(__dirname, '../docs/GPT52_BUG_ANALYSIS_2026-01-31.json');
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2), 'utf-8');

    console.log('✅ GPT-5.2-2025-12-11による分析完了');
    console.log(`📄 結果を保存: ${outputPath}\n`);

    // サマリーを表示
    console.log('📊 分析結果サマリー');
    console.log('='.repeat(80));
    
    if (analysis.rootCauseAnalysis) {
      console.log('\n🔍 根本原因分析:');
      if (analysis.rootCauseAnalysis.timeoutIssues) {
        console.log('  - タイムアウト問題:', analysis.rootCauseAnalysis.timeoutIssues.length, '件');
      }
      if (analysis.rootCauseAnalysis.modulePathIssues) {
        console.log('  - モジュールパス問題:', analysis.rootCauseAnalysis.modulePathIssues.length, '件');
      }
      if (analysis.rootCauseAnalysis.successLogicIssues) {
        console.log('  - success判定ロジック問題:', analysis.rootCauseAnalysis.successLogicIssues.length, '件');
      }
    }

    if (analysis.fixes) {
      console.log('\n🔧 修正提案:', analysis.fixes.length, '件');
      analysis.fixes.forEach((fix, index) => {
        console.log(`  ${index + 1}. [${fix.priority}] ${fix.issue}`);
      });
    }

    if (analysis.optimizations) {
      console.log('\n⚡ 最適化提案:', analysis.optimizations.length, '件');
      analysis.optimizations.forEach((opt, index) => {
        console.log(`  ${index + 1}. ${opt.area}: ${opt.suggestion}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('詳細は上記のJSONファイルを確認してください。');

    return analysis;
  } catch (error) {
    console.error('❌ GPT-5.2-2025-12-11分析エラー:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// 実行
if (require.main === module) {
  requestBugAnalysis()
    .then(() => {
      console.log('\n✅ 分析完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 分析失敗:', error.message);
      process.exit(1);
    });
}

module.exports = { requestBugAnalysis };

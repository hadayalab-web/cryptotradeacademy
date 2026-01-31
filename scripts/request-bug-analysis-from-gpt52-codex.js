#!/usr/bin/env node
// scripts/request-bug-analysis-from-gpt52-codex.js
// GPT-5.2-Codexに504タイムアウトとパフォーマンス問題の分析を依頼

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
 * GPT-5.2-Codexにバグ分析を依頼
 */
async function requestBugAnalysisFromCodex() {
  // 関連ファイルを読み込む
  const cronJs = fs.readFileSync(path.join(__dirname, '../api/cron.js'), 'utf-8');
  const xQuoteRepostJs = fs.readFileSync(path.join(__dirname, '../api/x-quote-repost.js'), 'utf-8');
  const grokClientJs = fs.readFileSync(path.join(__dirname, '../services/grok/client.js'), 'utf-8');
  const contentOptimizerJs = fs.readFileSync(path.join(__dirname, '../services/x/contentOptimizer.js'), 'utf-8');
  
  // テスト結果
  const testResults = `
## テスト結果（2026-01-31）

### 成功
- /api/x-quote-repost-en: HTTP 200 ✅

### 504タイムアウト
- /api/cron: HTTP 504 ❌
- /api/x-quote-repost-ko: HTTP 504 ❌
- /api/x-quote-repost-ja: HTTP 504 ❌
- /api/x-quote-repost-es: HTTP 504 ❌

### 既存の修正
1. Grok API呼び出しに30秒タイムアウト設定を追加
2. 最適化処理に15秒タイムアウト設定を追加
3. 早期リターン（タイムアウトチェック）を5秒に短縮
4. モジュールパスエラー修正（../shared → ../../shared）
5. success判定ロジック修正（dryRunも成功とみなす）

### 問題
- ENは成功しているが、他の言語（KO, JA, ES）で504タイムアウトが発生
- /api/cronでも504タイムアウトが発生
- Vercel Functionsの60秒制限を超過している
`;

  const prompt = `You are GPT-5.2-Codex, an expert at code review, bug detection, and performance optimization for Node.js serverless functions.

## Problem Summary

We have a Vercel Serverless Functions application that is experiencing 504 timeouts (60-second limit exceeded) for multiple endpoints:

1. **Success**: /api/x-quote-repost-en returns HTTP 200
2. **Failures**: 
   - /api/cron: HTTP 504
   - /api/x-quote-repost-ko: HTTP 504
   - /api/x-quote-repost-ja: HTTP 504
   - /api/x-quote-repost-es: HTTP 504

## Context

- **Platform**: Vercel Serverless Functions (60-second execution limit)
- **Language**: Node.js
- **Issue**: Some endpoints timeout while others succeed (EN works, but KO/JA/ES fail)

## Already Applied Fixes

1. Added 30-second timeout to Grok API calls
2. Added 15-second timeout to optimization processing
3. Reduced early return threshold from 10s to 5s
4. Fixed module path errors (../shared → ../../shared)
5. Fixed success determination logic (dryRun also counts as success)

## Code Files

### api/cron.js (excerpt)
\`\`\`javascript
${cronJs.substring(0, 3000)}...
\`\`\`

### api/x-quote-repost.js (excerpt)
\`\`\`javascript
${xQuoteRepostJs.substring(0, 3000)}...
\`\`\`

### services/grok/client.js (excerpt)
\`\`\`javascript
${grokClientJs.substring(0, 2000)}...
\`\`\`

### services/x/contentOptimizer.js (excerpt)
\`\`\`javascript
${contentOptimizerJs.substring(0, 2000)}...
\`\`\`

## Analysis Request

As GPT-5.2-Codex, please analyze:

1. **Root Cause Analysis**
   - Why does EN succeed but KO/JA/ES fail?
   - What causes /api/cron to timeout?
   - Identify performance bottlenecks and slow operations
   - Analyze processing time differences between languages

2. **Code Review & Bug Detection**
   - Find any bugs, inefficiencies, or anti-patterns
   - Identify blocking operations that could cause timeouts
   - Check for memory leaks or resource exhaustion
   - Review error handling and retry logic

3. **Performance Optimization**
   - Suggest ways to reduce execution time
   - Propose parallelization opportunities
   - Recommend caching strategies
   - Identify unnecessary operations

4. **Specific Fixes**
   - Provide concrete code fixes for timeout issues
   - Suggest architectural improvements
   - Recommend timeout handling strategies

5. **Language-Specific Issues**
   - Why might KO/JA/ES be slower than EN?
   - Are there language-specific processing differences?
   - Check for language-specific bottlenecks

Please provide your analysis in the following JSON format:
{
  "rootCauseAnalysis": {
    "whyEnSucceedsButOthersFail": "Explanation",
    "cronTimeoutCause": "Explanation",
    "performanceBottlenecks": ["Bottleneck 1", "Bottleneck 2", ...],
    "processingTimeDifferences": {
      "en": "Why EN is fast",
      "ko": "Why KO is slow",
      "ja": "Why JA is slow",
      "es": "Why ES is slow"
    }
  },
  "bugsFound": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "file": "file path",
      "line": "line number or range",
      "issue": "Bug description",
      "impact": "Impact on performance/timeout",
      "fix": "Fix description",
      "code": "Fixed code (if applicable)"
    }
  ],
  "performanceOptimizations": [
    {
      "priority": "CRITICAL|HIGH|MEDIUM|LOW",
      "area": "Optimization area",
      "currentTime": "Current processing time estimate",
      "optimization": "Optimization description",
      "expectedTime": "Expected processing time after optimization",
      "code": "Optimized code (if applicable)"
    }
  ],
  "specificFixes": [
    {
      "priority": "CRITICAL|HIGH|MEDIUM|LOW",
      "file": "file path",
      "issue": "Issue description",
      "fix": "Fix description",
      "code": "Fixed code"
    }
  ],
  "recommendations": [
    {
      "category": "Architecture|Performance|Error Handling|Monitoring",
      "recommendation": "Recommendation text",
      "rationale": "Why this helps"
    }
  ]
}`;

  try {
    console.log('🔄 GPT-5.2-Codexにバグ分析を依頼中...\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2-codex',
      messages: [
        {
          role: 'system',
          content: 'You are GPT-5.2-Codex, an expert code reviewer and bug detector specializing in Node.js serverless functions, performance optimization, and timeout issues. Provide detailed, actionable analysis with specific code fixes.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 4000,
      temperature: 0.2, // Lower temperature for more focused code analysis
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from GPT-5.2-Codex');
    }

    const analysis = JSON.parse(response);

    // 結果をファイルに保存
    const outputPath = path.join(__dirname, '../docs/GPT52_CODEX_BUG_ANALYSIS_2026-01-31.json');
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2), 'utf-8');

    console.log('✅ GPT-5.2-Codexによる分析完了');
    console.log(`📄 結果を保存: ${outputPath}\n`);

    // サマリーを表示
    console.log('📊 分析結果サマリー');
    console.log('='.repeat(80));
    
    if (analysis.rootCauseAnalysis) {
      console.log('\n🔍 根本原因分析:');
      console.log('  - EN成功・他失敗の理由:', analysis.rootCauseAnalysis.whyEnSucceedsButOthersFail);
      console.log('  - /api/cronタイムアウト原因:', analysis.rootCauseAnalysis.cronTimeoutCause);
      if (analysis.rootCauseAnalysis.performanceBottlenecks) {
        console.log('  - パフォーマンスボトルネック:', analysis.rootCauseAnalysis.performanceBottlenecks.length, '件');
      }
    }

    if (analysis.bugsFound) {
      console.log('\n🐛 発見されたバグ:', analysis.bugsFound.length, '件');
      analysis.bugsFound.forEach((bug, index) => {
        console.log(`  ${index + 1}. [${bug.severity}] ${bug.file}:${bug.line} - ${bug.issue}`);
      });
    }

    if (analysis.performanceOptimizations) {
      console.log('\n⚡ パフォーマンス最適化:', analysis.performanceOptimizations.length, '件');
      analysis.performanceOptimizations.forEach((opt, index) => {
        console.log(`  ${index + 1}. [${opt.priority}] ${opt.area}: ${opt.optimization}`);
        console.log(`     現在: ${opt.currentTime} → 最適化後: ${opt.expectedTime}`);
      });
    }

    if (analysis.specificFixes) {
      console.log('\n🔧 具体的な修正:', analysis.specificFixes.length, '件');
      analysis.specificFixes.forEach((fix, index) => {
        console.log(`  ${index + 1}. [${fix.priority}] ${fix.file}: ${fix.issue}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('詳細は上記のJSONファイルを確認してください。');

    return analysis;
  } catch (error) {
    console.error('❌ GPT-5.2-Codex分析エラー:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// 実行
if (require.main === module) {
  requestBugAnalysisFromCodex()
    .then(() => {
      console.log('\n✅ 分析完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 分析失敗:', error.message);
      process.exit(1);
    });
}

module.exports = { requestBugAnalysisFromCodex };

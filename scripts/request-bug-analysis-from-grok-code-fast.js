#!/usr/bin/env node
// scripts/request-bug-analysis-from-grok-code-fast.js
// Grok-Code-Fast-1に504タイムアウトのリアルタイム分析を依頼

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is not set');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: XAI_BASE_URL,
});

/**
 * Grok-Code-Fast-1にバグ分析を依頼（高速・リアルタイム重視）
 */
async function requestBugAnalysisFromGrokCodeFast() {
  // テスト結果とログの要点を読み込む
  const testResults = `
## テスト結果（2026-01-31）

### 成功
- /api/x-quote-repost-en: HTTP 200 ✅

### 504タイムアウト（Vercel Functions 60秒制限超過）
- /api/cron: HTTP 504 ❌
- /api/x-quote-repost-ko: HTTP 504 ❌
- /api/x-quote-repost-ja: HTTP 504 ❌
- /api/x-quote-repost-es: HTTP 504 ❌

### 重要な観察
- ENは成功しているが、他の言語（KO/JA/ES）は失敗
- 同じコードパスなのに言語によって結果が異なる
- 既にタイムアウト対策を追加済み（Grok API 30秒、最適化処理 15秒、早期リターン 5秒）
`;

  // 関連コードの要点のみ（高速処理のため）
  const codeSnippets = `
## 関連コードの要点

### api/x-quote-repost.js
- 言語ごとにpostQuoteRepostsForLangを呼び出し
- Grok API呼び出し（30秒タイムアウト設定済み）
- optimizeContentAndFunnel呼び出し（15秒タイムアウト設定済み）
- 早期リターン（5秒未満でスキップ）

### api/cron.js
- 複数の言語をループ処理
- GPT API呼び出し
- Grok API呼び出し
- CryptoQuant API呼び出し
- 各言語ごとにテンプレート読み込み

### 問題の仮説
1. 言語ごとの処理時間差（ENは速い、KO/JA/ESは遅い）
2. 並列処理ができていない可能性
3. 不要な処理が実行されている可能性
4. メモリリークやリソース枯渇の可能性
`;

  const prompt = `You are Grok-Code-Fast-1, an expert at fast, real-time debugging and performance optimization for Node.js serverless functions.

## Current Situation

We have 504 timeouts (60-second limit exceeded) on Vercel Serverless Functions:

**Success**: /api/x-quote-repost-en returns HTTP 200
**Failures**: 
- /api/cron: HTTP 504
- /api/x-quote-repost-ko: HTTP 504  
- /api/x-quote-repost-ja: HTTP 504
- /api/x-quote-repost-es: HTTP 504

## Key Observation

EN succeeds but KO/JA/ES fail - same code path but different results by language.

## Already Applied Fixes

1. Added 30-second timeout to Grok API calls
2. Added 15-second timeout to optimization processing  
3. Reduced early return threshold from 10s to 5s
4. Fixed module path errors
5. Fixed success determination logic

## Your Task

As Grok-Code-Fast-1, focus on **fast, actionable fixes**:

1. **Quick Root Cause**: Why does EN succeed but KO/JA/ES fail? What's different?
2. **Performance Bottlenecks**: Identify the slowest operations causing timeouts
3. **Quick Wins**: Suggest immediate optimizations (parallelization, caching, skipping unnecessary work)
4. **Code Fixes**: Provide specific, copy-paste ready code fixes

## Output Format

Provide a concise JSON response:

{
  "quickRootCause": "Why EN succeeds but others fail (1-2 sentences)",
  "performanceBottlenecks": [
    {
      "operation": "Operation name",
      "estimatedTime": "Time estimate",
      "impact": "HIGH|MEDIUM|LOW"
    }
  ],
  "quickWins": [
    {
      "priority": "CRITICAL|HIGH|MEDIUM",
      "fix": "Quick fix description",
      "expectedTimeSave": "Expected time saved",
      "code": "Code snippet (if applicable)"
    }
  ],
  "immediateActions": [
    "Action 1",
    "Action 2",
    "Action 3"
  ],
  "codeFixes": [
    {
      "file": "file path",
      "issue": "Issue",
      "fix": "Fix code"
    }
  ]
}

Be FAST and ACTIONABLE. Focus on what can be fixed NOW.`;

  try {
    console.log('⚡ Grok-Code-Fast-1に高速分析を依頼中...\n');

    const completion = await openai.chat.completions.create({
      model: 'grok-code-fast-1',
      messages: [
        {
          role: 'system',
          content: 'You are Grok-Code-Fast-1, optimized for fast, real-time debugging. Provide quick, actionable fixes. Focus on speed and immediate solutions.',
        },
        {
          role: 'user',
          content: `${testResults}\n\n${codeSnippets}\n\n${prompt}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000, // 高速処理のため短め
      temperature: 0.1, // 低めで一貫性重視
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from Grok-Code-Fast-1');
    }

    const analysis = JSON.parse(response);

    // 結果をファイルに保存
    const outputPath = path.join(__dirname, '../docs/GROK_CODE_FAST_ANALYSIS_2026-01-31.json');
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2), 'utf-8');

    console.log('✅ Grok-Code-Fast-1による高速分析完了');
    console.log(`📄 結果を保存: ${outputPath}\n`);

    // サマリーを表示
    console.log('⚡ 高速分析結果サマリー');
    console.log('='.repeat(80));
    
    if (analysis.quickRootCause) {
      console.log('\n🔍 根本原因（簡潔）:');
      console.log(`  ${analysis.quickRootCause}`);
    }

    if (analysis.performanceBottlenecks) {
      console.log('\n🐌 パフォーマンスボトルネック:');
      analysis.performanceBottlenecks.forEach((bottleneck, index) => {
        console.log(`  ${index + 1}. [${bottleneck.impact}] ${bottleneck.operation} (推定: ${bottleneck.estimatedTime})`);
      });
    }

    if (analysis.quickWins) {
      console.log('\n⚡ クイックウィン（即座に実行可能）:');
      analysis.quickWins.forEach((win, index) => {
        console.log(`  ${index + 1}. [${win.priority}] ${win.fix}`);
        console.log(`     期待される時間短縮: ${win.expectedTimeSave}`);
      });
    }

    if (analysis.immediateActions) {
      console.log('\n🎯 即座に実行すべきアクション:');
      analysis.immediateActions.forEach((action, index) => {
        console.log(`  ${index + 1}. ${action}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('詳細は上記のJSONファイルを確認してください。');

    return analysis;
  } catch (error) {
    console.error('❌ Grok-Code-Fast-1分析エラー:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// 実行
if (require.main === module) {
  requestBugAnalysisFromGrokCodeFast()
    .then(() => {
      console.log('\n✅ 高速分析完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 分析失敗:', error.message);
      process.exit(1);
    });
}

module.exports = { requestBugAnalysisFromGrokCodeFast };

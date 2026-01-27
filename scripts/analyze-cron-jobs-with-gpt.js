// scripts/analyze-cron-jobs-with-gpt.js
// GPT-5.2-2025-12-11を使ってCron Jobsの問題原因を分析

const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';
const MODEL = 'gpt-5.2-2025-12-11';

const OUTPUT_DIR = path.join(__dirname, '../docs/reports');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'cron-jobs-gpt-analysis.md');

// 出力ディレクトリが存在しない場合は作成
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 既存の分析レポートを読み込む
 */
function loadAnalysisReports() {
  const reports = {};
  
  const reportFiles = [
    'logs-result-3-analysis.md',
    'cron-jobs-execution-analysis.md',
    'x-quote-repost-detailed-analysis.md',
    'quote-repost-flow-analysis.md',
    'webhook-logs-detailed-analysis.md',
    'logs-result-3-summary.md',
  ];
  
  reportFiles.forEach(file => {
    const filePath = path.join(OUTPUT_DIR, file);
    if (fs.existsSync(filePath)) {
      try {
        reports[file] = fs.readFileSync(filePath, 'utf-8');
      } catch (error) {
        console.warn(`⚠️ レポートファイルの読み込みに失敗: ${file}`, error.message);
      }
    }
  });
  
  return reports;
}

/**
 * GPT APIを呼び出して分析を実行
 */
async function analyzeWithGPT(reports) {
  console.log('🤖 GPT-5.2-2025-12-11でCron Jobsの問題原因を分析中...\n');
  
  // 重要な情報のみを抽出
  const summaryReport = reports['logs-result-3-summary.md'] || '';
  const cronReport = reports['cron-jobs-execution-analysis.md'] || '';
  const flowReport = reports['quote-repost-flow-analysis.md'] || '';
  
  // 各レポートから重要な部分のみを抽出（短縮）
  const summaryText = summaryReport.substring(0, 2000);
  const cronText = cronReport.substring(0, 2000);
  const flowText = flowReport.substring(0, 1500);
  
  const prompt = `あなたは経験豊富なソフトウェアエンジニアです。以下のログ分析結果を基に、Cron Jobsが正常に動いていない根本原因を徹底的に分析してください。

## 問題の概要
- Cron Jobsは実行されているが、処理が正常に完了していない
- X APIへの投稿が0件
- Assignment to constant variableエラーが9件発生
- GPT APIエラーが19件発生
- 実行フロー: エンドポイント呼び出し277件(100%) → 言語処理開始4件(1.4%) → インフルエンサー取得完了18件(6.5%) → ローテーション選択0件(0%) → インフルエンサーループ開始0件(0%) → X API呼び出し0件(0%)

## 分析レポート（要約）
${summaryText}

## Cron Jobs実行状況
${cronText}

## 実行フロー分析
${flowText}

## 分析してほしいこと
1. **根本原因の特定**
   - なぜCron Jobsは実行されているが、処理が正常に完了していないのか？
   - なぜX APIへの投稿が0件なのか？
   - Assignment to constant variableエラーが発生している理由は？
   - GPT APIエラーが発生している理由は？

2. **実行フローの問題点**
   - エンドポイント呼び出し: 277件（100%）
   - 言語処理開始: 4件（1.4%）
   - インフルエンサー取得完了: 18件（6.5%）
   - ローテーション選択結果: 0件（0%）
   - インフルエンサーループ開始: 0件（0%）
   - X API呼び出し前: 0件（0%）
   
   この実行フローから、どの段階で処理が止まっているか？

3. **エラーパターンの分析**
   - Assignment to constant variableエラー: 9件（ko: 2件, ar: 2件, pt-br: 2件, es: 3件）
   - GPT APIエラー: 19件（OpenAI API error: 400）
   - これらのエラーが発生している根本原因は？

4. **修正方法の提案**
   - 各問題に対する具体的な修正方法
   - 優先順位の高い修正から順に提案
   - 修正後の検証方法

5. **予防策の提案**
   - 今後同様の問題が発生しないようにするための予防策
   - 監視とアラートの強化方法
   - デバッグログの追加方法

## 出力形式
Markdown形式で、以下のセクションを含めてください：
- 実行サマリー
- 根本原因の分析
- 実行フローの問題点
- エラーパターンの分析
- 修正方法の提案
- 予防策の提案
- 優先順位付きアクションアイテム

日本語で回答してください。`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'あなたは経験豊富なソフトウェアエンジニアで、ログ分析と問題解決の専門家です。詳細な分析と具体的な解決策を提供してください。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_completion_tokens: 6000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    
    console.log('📥 GPT APIレスポンス:', JSON.stringify(data, null, 2).substring(0, 500));
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ 無効なレスポンス:', JSON.stringify(data, null, 2));
      throw new Error('Invalid response from OpenAI API');
    }

    const content = data.choices[0].message.content;
    
    // デバッグ: レスポンスの詳細を確認
    console.log('📥 レスポンス詳細:', {
      finish_reason: data.choices[0].finish_reason,
      content_length: content ? content.length : 0,
      usage: data.usage,
    });
    
    if (!content || content.trim().length === 0) {
      console.warn('⚠️ レスポンスの内容が空です');
      console.warn('📥 完全なレスポンス:', JSON.stringify(data, null, 2));
      
      // finish_reasonが"length"の場合は、トークン制限に達した可能性
      if (data.choices[0].finish_reason === 'length') {
        return '⚠️ GPT APIのレスポンスがトークン制限に達しました。max_completion_tokensを増やすか、プロンプトを短縮してください。';
      }
      
      return 'GPT APIからのレスポンスが空でした。APIの呼び出しは成功しましたが、分析結果が返されませんでした。';
    }

    return content;
  } catch (error) {
    console.error('❌ GPT API呼び出しエラー:', error.message);
    throw error;
  }
}

/**
 * 分析結果をMarkdown形式で保存
 */
function saveAnalysis(gptAnalysis) {
  const lines = [];
  
  lines.push('# Cron Jobs問題原因分析レポート（GPT-5.2-2025-12-11）');
  lines.push(`**作成日時**: ${new Date().toISOString()}`);
  lines.push(`**モデル**: ${MODEL}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(gptAnalysis);
  
  const report = lines.join('\n');
  fs.writeFileSync(OUTPUT_FILE, report, 'utf-8');
  
  return report;
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('📊 Cron Jobsの問題原因をGPT-5.2-2025-12-11で分析中...\n');
    
    // 既存の分析レポートを読み込む
    console.log('📁 分析レポートを読み込み中...');
    const reports = loadAnalysisReports();
    console.log(`✅ ${Object.keys(reports).length}件のレポートを読み込みました\n`);
    
    if (Object.keys(reports).length === 0) {
      console.error('❌ 分析レポートが見つかりません。');
      console.error('   先に以下のスクリプトを実行してください:');
      console.error('   - scripts/analyze-logs-result-3.js');
      console.error('   - scripts/analyze-cron-jobs-execution.js');
      console.error('   - scripts/analyze-x-quote-repost-logs.js');
      console.error('   - scripts/analyze-quote-repost-flow.js');
      process.exit(1);
    }
    
    // GPT APIで分析
    console.log('🤖 GPT-5.2-2025-12-11で分析中...');
    const gptAnalysis = await analyzeWithGPT(reports);
    
    // 分析結果を保存
    console.log('\n💾 分析結果を保存中...');
    const report = saveAnalysis(gptAnalysis);
    console.log(`✅ レポートを保存しました: ${OUTPUT_FILE}\n`);
    
    // 分析結果の一部を表示
    console.log('📊 GPT分析結果サマリー:');
    console.log('─'.repeat(80));
    const preview = gptAnalysis.substring(0, 1000);
    console.log(preview);
    if (gptAnalysis.length > 1000) {
      console.log('\n... (続きはレポートファイルを参照してください)');
    }
    console.log('─'.repeat(80));
    console.log('');
    
    console.log('✅ 分析完了');
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  main();
}

module.exports = { analyzeWithGPT, saveAnalysis };

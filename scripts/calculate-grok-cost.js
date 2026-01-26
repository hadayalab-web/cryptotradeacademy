// scripts/calculate-grok-cost.js
// Grok APIのコスト計算

/**
 * Grok APIのクレジット消費（画像の料金表より）
 */
const GROK_CREDIT_COSTS = {
  // コンテキスト入力: 0.000005 credits per token
  contextInput: 0.000005,
  // コンテキスト出力: 0.000015 credits per token
  contextOutput: 0.000015,
  // チャット: 0.05 credits per call
  chat: 0.05,
};

// 1クレジット = 約$0.53（画像の例: $2.15 / 4.05 credits ≈ $0.53）
const CREDIT_TO_USD = 0.53;

/**
 * トークン数を推定（簡易版）
 */
function estimateTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  // 日本語: 約2文字/token、英語: 約4文字/token
  // プロンプトは日本語と英語が混在しているため、平均3文字/tokenとする
  return Math.ceil(text.length / 3);
}

/**
 * ask-grok-optimize-hotlist.jsのコストを計算
 */
/**
 * ask-grok-optimize-hotlist.jsのコストを計算
 */
function calculateCurrentScriptCost() {
  // プロンプトの長さを推定（実際のプロンプトから）
  // プロンプトは約3500文字、システムプロンプトは約150文字
  const promptLength = 3500; // 約3500文字（実際のプロンプトの長さ）
  const systemPromptLength = 150; // 約150文字
  
  // トークン数推定: 日本語と英語が混在しているため、平均3文字/token
  const inputTokens = Math.ceil((promptLength + systemPromptLength) / 3);
  const outputTokens = 4000; // max_tokens: 4000
  
  const inputCost = inputTokens * GROK_CREDIT_COSTS.contextInput;
  const outputCost = outputTokens * GROK_CREDIT_COSTS.contextOutput;
  const totalCredits = inputCost + outputCost;
  const totalUSD = totalCredits * CREDIT_TO_USD;
  
  return {
    inputTokens,
    outputTokens,
    inputCredits: inputCost,
    outputCredits: outputCost,
    totalCredits,
    totalUSD,
  };
}

/**
 * 1回の実行コスト
 */
const singleRunCost = calculateCurrentScriptCost();

console.log('📊 Grok APIコスト計算\n');
console.log('=== 現在のスクリプト（ask-grok-optimize-hotlist.js）===');
console.log(`入力トークン: ${singleRunCost.inputTokens.toLocaleString()}`);
console.log(`出力トークン: ${singleRunCost.outputTokens.toLocaleString()}`);
console.log(`入力コスト: ${singleRunCost.inputCredits.toFixed(6)} credits ($${(singleRunCost.inputCredits * CREDIT_TO_USD).toFixed(4)})`);
console.log(`出力コスト: ${singleRunCost.outputCredits.toFixed(6)} credits ($${(singleRunCost.outputCredits * CREDIT_TO_USD).toFixed(4)})`);
console.log(`合計: ${singleRunCost.totalCredits.toFixed(6)} credits ($${singleRunCost.totalUSD.toFixed(4)})`);
console.log('');

// 月次コスト（1日1回実行）
const monthlyCost = singleRunCost.totalUSD * 30;
console.log('=== 月次コスト（1日1回実行）===');
console.log(`30日: $${monthlyCost.toFixed(2)}`);
console.log('');

// 提案された戦略でのコスト
console.log('=== Grok戦略実装時のコスト ===');
console.log('（エンゲージメント追跡、ティア分類、最適化などでGrok APIを呼び出す場合）\n');

// エンゲージメント追跡（6時間ごと、1日4回）
const engagementTrackingPerDay = 4;
const engagementTrackingCost = singleRunCost.totalUSD * engagementTrackingPerDay;
console.log(`エンゲージメント追跡（6時間ごと、1日4回）: $${engagementTrackingCost.toFixed(2)}/日`);

// ティア分類（1日1回）
const tierClassificationCost = singleRunCost.totalUSD;
console.log(`ティア分類（1日1回）: $${tierClassificationCost.toFixed(2)}/日`);

// 最適化分析（週1回）
const weeklyOptimizationCost = singleRunCost.totalUSD / 7;
console.log(`最適化分析（週1回）: $${weeklyOptimizationCost.toFixed(2)}/日`);

const totalDailyCost = engagementTrackingCost + tierClassificationCost + weeklyOptimizationCost;
const totalMonthlyCost = totalDailyCost * 30;

console.log('');
console.log(`合計（1日）: $${totalDailyCost.toFixed(2)}`);
console.log(`合計（30日）: $${totalMonthlyCost.toFixed(2)}`);
console.log('');

// 引用リポストテキスト生成のコスト（generateQuoteRepostText）
console.log('=== 引用リポストテキスト生成（generateQuoteRepostText）===');
// 1回の引用リポスト生成は短いプロンプトなので、約500トークン入力、200トークン出力と仮定
const quoteRepostInputTokens = 500;
const quoteRepostOutputTokens = 200;
const quoteRepostInputCost = quoteRepostInputTokens * GROK_CREDIT_COSTS.contextInput;
const quoteRepostOutputCost = quoteRepostOutputTokens * GROK_CREDIT_COSTS.contextOutput;
const quoteRepostTotalCredits = quoteRepostInputCost + quoteRepostOutputCost;
const quoteRepostTotalUSD = quoteRepostTotalCredits * CREDIT_TO_USD;

console.log(`1回の生成: ${quoteRepostTotalCredits.toFixed(6)} credits ($${quoteRepostTotalUSD.toFixed(4)})`);

// 現在の投稿数（42回/日）
const currentQuoteRepostsPerDay = 42;
const currentQuoteRepostDailyCost = quoteRepostTotalUSD * currentQuoteRepostsPerDay;
console.log(`現在（42回/日）: $${currentQuoteRepostDailyCost.toFixed(2)}/日`);

// 提案された投稿数（500回/日）
const proposedQuoteRepostsPerDay = 500;
const proposedQuoteRepostDailyCost = quoteRepostTotalUSD * proposedQuoteRepostsPerDay;
console.log(`提案（500回/日）: $${proposedQuoteRepostDailyCost.toFixed(2)}/日`);

console.log('');
console.log('=== 総コスト（月次）===');
const totalMonthlyWithQuoteReposts = totalMonthlyCost + (proposedQuoteRepostDailyCost * 30);
console.log(`戦略実装コスト: $${totalMonthlyCost.toFixed(2)}`);
console.log(`引用リポスト生成（500回/日）: $${(proposedQuoteRepostDailyCost * 30).toFixed(2)}`);
console.log(`合計: $${totalMonthlyWithQuoteReposts.toFixed(2)}/月`);
